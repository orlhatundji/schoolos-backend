import { Injectable } from '@nestjs/common';
import {
  ComplaintCategory,
  ComplaintPriority,
  ComplaintStatus,
  Prisma,
  UserType,
} from '@prisma/client';

import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Per-school rollup: enrolment, staffing, revenue split, open complaints and
   * last login. Returns one row per school.
   */
  async getSchoolsRollup() {
    const schools = await this.prisma.school.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        name: true,
        code: true,
        createdAt: true,
        primaryAddress: {
          select: { city: true, state: true },
        },
        users: {
          where: { lastLoginAt: { not: null } },
          orderBy: { lastLoginAt: 'desc' },
          take: 1,
          select: { lastLoginAt: true },
        },
        _count: {
          select: {
            users: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const schoolIds = schools.map((s) => s.id);

    const [userCountsByType, paymentGroups, complaintGroups] = await Promise.all(
      [
        this.prisma.user.groupBy({
          by: ['schoolId', 'type'],
          where: { schoolId: { in: schoolIds }, deletedAt: null },
          _count: { _all: true },
        }),
        this.prisma.studentPayment.groupBy({
          by: ['status'],
          where: {
            student: {
              user: { schoolId: { in: schoolIds }, deletedAt: null },
            },
          },
          _sum: { amount: true },
        }),
        this.prisma.complaint.groupBy({
          by: ['schoolId', 'status'],
          where: {
            schoolId: { in: schoolIds },
            status: { in: [ComplaintStatus.OPEN, ComplaintStatus.IN_PROGRESS] },
          },
          _count: { _all: true },
        }),
      ],
    );

    // Fetch per-school payments grouped by school & status via the
    // student→user→school relation. Prisma doesn't support a grouped join, so
    // we fetch raw per-school totals through a single raw query using the
    // existing aggregate. Simplest: query each school in parallel — N small
    // queries. For a small number of schools this is fine.
    const perSchoolPayments = await Promise.all(
      schoolIds.map((id) =>
        this.prisma.studentPayment.groupBy({
          by: ['status'],
          where: { student: { user: { schoolId: id, deletedAt: null } } },
          _sum: { amount: true },
        }),
      ),
    );

    // Indexes to make lookups cheap.
    const userMap = new Map<string, Partial<Record<UserType, number>>>();
    for (const row of userCountsByType) {
      const bucket = userMap.get(row.schoolId) ?? {};
      bucket[row.type] = row._count._all;
      userMap.set(row.schoolId, bucket);
    }

    const complaintMap = new Map<string, number>();
    for (const row of complaintGroups) {
      if (!row.schoolId) continue;
      complaintMap.set(
        row.schoolId,
        (complaintMap.get(row.schoolId) ?? 0) + row._count._all,
      );
    }

    const rows = schools.map((s, idx) => {
      const users = userMap.get(s.id) ?? {};
      const payments = perSchoolPayments[idx] ?? [];

      let billed = 0;
      let collected = 0;
      let pending = 0;
      let overdue = 0;
      for (const p of payments) {
        const amount = Number(p._sum.amount ?? 0);
        billed += amount;
        if (p.status === 'PAID') collected += amount;
        else if (p.status === 'PENDING') pending += amount;
        else if (p.status === 'OVERDUE') overdue += amount;
      }

      return {
        id: s.id,
        name: s.name,
        code: s.code,
        city: s.primaryAddress?.city ?? null,
        state: s.primaryAddress?.state ?? null,
        joinedAt: s.createdAt,
        lastLoginAt: s.users[0]?.lastLoginAt ?? null,
        users: {
          total: s._count.users,
          students: users.STUDENT ?? 0,
          teachers: users.TEACHER ?? 0,
          admins: (users.ADMIN ?? 0) + (users.SUPER_ADMIN ?? 0),
        },
        revenue: {
          billed,
          collected,
          pending,
          overdue,
          collectionRate: billed > 0 ? (collected / billed) * 100 : 0,
        },
        openComplaints: complaintMap.get(s.id) ?? 0,
      };
    });

    // Platform totals derived from per-row aggregates, plus the prefetched
    // platform-wide payment total.
    const platformPayments = {
      collected: 0,
      pending: 0,
      overdue: 0,
      total: 0,
    };
    for (const row of paymentGroups) {
      const amount = Number(row._sum.amount ?? 0);
      platformPayments.total += amount;
      if (row.status === 'PAID') platformPayments.collected += amount;
      else if (row.status === 'PENDING') platformPayments.pending += amount;
      else if (row.status === 'OVERDUE') platformPayments.overdue += amount;
    }

    return {
      rows,
      totals: {
        schools: rows.length,
        students: rows.reduce((a, r) => a + r.users.students, 0),
        teachers: rows.reduce((a, r) => a + r.users.teachers, 0),
        revenue: platformPayments,
        openComplaints: rows.reduce((a, r) => a + r.openComplaints, 0),
      },
    };
  }

  /**
   * Platform-wide payments breakdown with per-school leaderboards.
   */
  async getPaymentsBreakdown() {
    const [byStatus, paidBySchool] = await Promise.all([
      this.prisma.studentPayment.groupBy({
        by: ['status'],
        _sum: { amount: true },
        _count: { _all: true },
      }),
      this.prisma.studentPayment.findMany({
        select: {
          amount: true,
          status: true,
          student: {
            select: {
              user: {
                select: {
                  school: { select: { id: true, name: true } },
                },
              },
            },
          },
        },
      }),
    ]);

    const totals: Record<
      'PAID' | 'PENDING' | 'OVERDUE' | 'PARTIAL' | 'WAIVED',
      { amount: number; count: number }
    > = {
      PAID: { amount: 0, count: 0 },
      PENDING: { amount: 0, count: 0 },
      OVERDUE: { amount: 0, count: 0 },
      PARTIAL: { amount: 0, count: 0 },
      WAIVED: { amount: 0, count: 0 },
    };
    for (const row of byStatus) {
      const bucket = totals[row.status as keyof typeof totals];
      if (bucket) {
        bucket.amount += Number(row._sum.amount ?? 0);
        bucket.count += row._count._all;
      }
    }

    interface SchoolAgg {
      id: string;
      name: string;
      collected: number;
      pending: number;
      overdue: number;
      total: number;
    }
    const perSchool = new Map<string, SchoolAgg>();
    for (const p of paidBySchool) {
      const school = p.student?.user?.school;
      if (!school) continue;
      const agg = perSchool.get(school.id) ?? {
        id: school.id,
        name: school.name,
        collected: 0,
        pending: 0,
        overdue: 0,
        total: 0,
      };
      const amount = Number(p.amount);
      agg.total += amount;
      if (p.status === 'PAID') agg.collected += amount;
      else if (p.status === 'PENDING') agg.pending += amount;
      else if (p.status === 'OVERDUE') agg.overdue += amount;
      perSchool.set(school.id, agg);
    }

    const sorted = [...perSchool.values()].sort(
      (a, b) => b.collected - a.collected,
    );

    return {
      totals,
      schools: sorted.map((s) => ({
        ...s,
        collectionRate: s.total > 0 ? (s.collected / s.total) * 100 : 0,
      })),
    };
  }

  /**
   * Open-complaint aging buckets + resolution statistics.
   */
  async getComplaintsReport() {
    const [openComplaints, resolved] = await Promise.all([
      this.prisma.complaint.findMany({
        where: {
          status: { in: [ComplaintStatus.OPEN, ComplaintStatus.IN_PROGRESS] },
        },
        select: {
          id: true,
          createdAt: true,
          priority: true,
          category: true,
        },
      }),
      this.prisma.complaint.findMany({
        where: {
          status: { in: [ComplaintStatus.RESOLVED, ComplaintStatus.CLOSED] },
          resolvedAt: { not: null },
        },
        select: {
          createdAt: true,
          resolvedAt: true,
          category: true,
          priority: true,
        },
      }),
    ]);

    const now = Date.now();
    const ageBuckets = {
      '0-1d': 0,
      '1-7d': 0,
      '7-30d': 0,
      '30d+': 0,
    };
    for (const c of openComplaints) {
      const days = (now - c.createdAt.getTime()) / (1000 * 60 * 60 * 24);
      if (days < 1) ageBuckets['0-1d'] += 1;
      else if (days < 7) ageBuckets['1-7d'] += 1;
      else if (days < 30) ageBuckets['7-30d'] += 1;
      else ageBuckets['30d+'] += 1;
    }

    const byCategory: Record<ComplaintCategory, number> = Object.fromEntries(
      Object.values(ComplaintCategory).map((c) => [c, 0]),
    ) as Record<ComplaintCategory, number>;
    const byPriority: Record<ComplaintPriority, number> = Object.fromEntries(
      Object.values(ComplaintPriority).map((p) => [p, 0]),
    ) as Record<ComplaintPriority, number>;
    for (const c of openComplaints) {
      byCategory[c.category] += 1;
      byPriority[c.priority] += 1;
    }

    // Average resolution time (in days) overall and per priority.
    const resolutionDaysAll: number[] = [];
    const resolutionDaysByPriority: Record<ComplaintPriority, number[]> = {
      LOW: [],
      MEDIUM: [],
      HIGH: [],
      URGENT: [],
    };
    for (const c of resolved) {
      if (!c.resolvedAt) continue;
      const days =
        (c.resolvedAt.getTime() - c.createdAt.getTime()) /
        (1000 * 60 * 60 * 24);
      resolutionDaysAll.push(days);
      resolutionDaysByPriority[c.priority].push(days);
    }

    const avg = (arr: number[]) =>
      arr.length === 0 ? 0 : arr.reduce((a, b) => a + b, 0) / arr.length;

    return {
      totals: {
        open: openComplaints.length,
        resolved: resolved.length,
      },
      ageBuckets,
      byCategory,
      byPriority,
      resolution: {
        avgDays: avg(resolutionDaysAll),
        byPriority: {
          LOW: avg(resolutionDaysByPriority.LOW),
          MEDIUM: avg(resolutionDaysByPriority.MEDIUM),
          HIGH: avg(resolutionDaysByPriority.HIGH),
          URGENT: avg(resolutionDaysByPriority.URGENT),
        },
      },
    };
  }
}

// Hint for Prisma inference at build time — ensures prisma types are fully loaded.
void Prisma;
