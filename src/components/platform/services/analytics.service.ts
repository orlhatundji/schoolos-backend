import { Injectable } from '@nestjs/common';
import { ComplaintStatus, UserType } from '@prisma/client';

import { PrismaService } from '../../../prisma/prisma.service';
import { AnalyticsQueryDto, AnalyticsRange } from '../dto/analytics-query.dto';

type Bucket = 'day' | 'month';

interface RangeSpec {
  from: Date;
  to: Date;
  bucket: Bucket;
  /** number of buckets expected (for prefilling with zeros) */
  size: number;
}

function resolveRange(range: AnalyticsRange): RangeSpec {
  const to = new Date();
  const from = new Date();

  if (range === AnalyticsRange.M12) {
    from.setMonth(to.getMonth() - 11);
    from.setDate(1);
    from.setHours(0, 0, 0, 0);
    return { from, to, bucket: 'month', size: 12 };
  }

  const days = range === AnalyticsRange.D30 ? 30 : 90;
  from.setDate(to.getDate() - (days - 1));
  from.setHours(0, 0, 0, 0);
  return { from, to, bucket: 'day', size: days };
}

function bucketKey(date: Date, bucket: Bucket): string {
  if (bucket === 'month') {
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
  }
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

function makeEmptySeries(spec: RangeSpec): Record<string, number> {
  const out: Record<string, number> = {};
  const cursor = new Date(spec.from);
  if (spec.bucket === 'day') {
    for (let i = 0; i < spec.size; i++) {
      out[bucketKey(cursor, 'day')] = 0;
      cursor.setDate(cursor.getDate() + 1);
    }
  } else {
    for (let i = 0; i < spec.size; i++) {
      out[bucketKey(cursor, 'month')] = 0;
      cursor.setMonth(cursor.getMonth() + 1);
    }
  }
  return out;
}

function foldIntoSeries<T extends { createdAt: Date | string }>(
  rows: T[],
  spec: RangeSpec,
  valueFn?: (row: T) => number,
): { bucket: string; value: number }[] {
  const map = makeEmptySeries(spec);
  const toValue = valueFn ?? (() => 1);
  for (const row of rows) {
    const date = new Date(row.createdAt);
    const key = bucketKey(date, spec.bucket);
    if (key in map) {
      map[key] = (map[key] ?? 0) + toValue(row);
    }
  }
  return Object.entries(map).map(([bucket, value]) => ({ bucket, value }));
}

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      totalSchools,
      activeSchools,
      usersByType,
      activeUsers,
      paymentTotals,
      complaintTotals,
    ] = await Promise.all([
      this.prisma.school.count(),
      this.prisma.school.count({ where: { deletedAt: null } }),
      this.prisma.user.groupBy({
        by: ['type'],
        where: { deletedAt: null },
        _count: { _all: true },
      }),
      this.prisma.user.count({
        where: {
          deletedAt: null,
          lastLoginAt: { gte: thirtyDaysAgo },
        },
      }),
      this.prisma.studentPayment.groupBy({
        by: ['status'],
        _sum: { amount: true },
        _count: { _all: true },
      }),
      this.prisma.complaint.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
    ]);

    const userCounts: Record<UserType, number> = Object.fromEntries(
      Object.values(UserType).map((t) => [t, 0]),
    ) as Record<UserType, number>;
    for (const row of usersByType) {
      userCounts[row.type] = row._count._all;
    }

    const paymentSummary = {
      total: 0,
      collected: 0,
      pending: 0,
      overdue: 0,
      waived: 0,
    };
    for (const row of paymentTotals) {
      const amount = Number(row._sum.amount ?? 0);
      paymentSummary.total += amount;
      if (row.status === 'PAID') paymentSummary.collected += amount;
      else if (row.status === 'PENDING') paymentSummary.pending += amount;
      else if (row.status === 'OVERDUE') paymentSummary.overdue += amount;
      else if (row.status === 'WAIVED') paymentSummary.waived += amount;
    }

    const complaintCounts = Object.fromEntries(
      Object.values(ComplaintStatus).map((s) => [s, 0]),
    ) as Record<ComplaintStatus, number>;
    for (const row of complaintTotals) {
      complaintCounts[row.status] = row._count._all;
    }

    return {
      schools: {
        total: totalSchools,
        active: activeSchools,
        inactive: totalSchools - activeSchools,
      },
      users: {
        total: Object.values(userCounts).reduce((a, b) => a + b, 0),
        activeLast30d: activeUsers,
        byType: userCounts,
      },
      revenue: paymentSummary,
      complaints: complaintCounts,
    };
  }

  async getGrowth(dto: AnalyticsQueryDto) {
    const range = dto.range ?? AnalyticsRange.D90;
    const spec = resolveRange(range);

    const [schools, students, teachers, complaints] = await Promise.all([
      this.prisma.school.findMany({
        where: { createdAt: { gte: spec.from } },
        select: { createdAt: true },
      }),
      this.prisma.user.findMany({
        where: {
          createdAt: { gte: spec.from },
          type: UserType.STUDENT,
        },
        select: { createdAt: true },
      }),
      this.prisma.user.findMany({
        where: {
          createdAt: { gte: spec.from },
          type: UserType.TEACHER,
        },
        select: { createdAt: true },
      }),
      this.prisma.complaint.findMany({
        where: { createdAt: { gte: spec.from } },
        select: { createdAt: true },
      }),
    ]);

    return {
      range,
      bucket: spec.bucket,
      from: spec.from.toISOString(),
      to: spec.to.toISOString(),
      series: {
        newSchools: foldIntoSeries(schools, spec),
        newStudents: foldIntoSeries(students, spec),
        newTeachers: foldIntoSeries(teachers, spec),
        newComplaints: foldIntoSeries(complaints, spec),
      },
    };
  }

  async getRevenueTrend(dto: AnalyticsQueryDto) {
    const range = dto.range ?? AnalyticsRange.D90;
    const spec = resolveRange(range);

    const payments = await this.prisma.studentPayment.findMany({
      where: { createdAt: { gte: spec.from } },
      select: {
        createdAt: true,
        amount: true,
        status: true,
      },
    });

    const paid = payments.filter((p) => p.status === 'PAID');
    const pending = payments.filter((p) => p.status === 'PENDING');
    const overdue = payments.filter((p) => p.status === 'OVERDUE');

    const toAmount = (p: (typeof payments)[number]) => Number(p.amount);

    return {
      range,
      bucket: spec.bucket,
      from: spec.from.toISOString(),
      to: spec.to.toISOString(),
      series: {
        collected: foldIntoSeries(paid, spec, toAmount),
        pending: foldIntoSeries(pending, spec, toAmount),
        overdue: foldIntoSeries(overdue, spec, toAmount),
      },
    };
  }

  async getTopSchoolsByActivity(limit = 5) {
    const schools = await this.prisma.school.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        name: true,
        code: true,
        primaryAddress: { select: { city: true, state: true } },
        users: {
          where: { lastLoginAt: { not: null } },
          orderBy: { lastLoginAt: 'desc' },
          take: 1,
          select: { lastLoginAt: true },
        },
        _count: { select: { users: true } },
      },
    });

    const withLogin = schools
      .map((s) => ({
        id: s.id,
        name: s.name,
        code: s.code,
        city: s.primaryAddress?.city ?? null,
        state: s.primaryAddress?.state ?? null,
        userCount: s._count.users,
        lastLoginAt: s.users[0]?.lastLoginAt ?? null,
      }))
      .sort((a, b) => {
        if (!a.lastLoginAt && !b.lastLoginAt) return 0;
        if (!a.lastLoginAt) return 1;
        if (!b.lastLoginAt) return -1;
        return b.lastLoginAt.getTime() - a.lastLoginAt.getTime();
      });

    return {
      mostActive: withLogin.slice(0, limit),
      leastActive: [...withLogin].reverse().slice(0, limit),
    };
  }
}
