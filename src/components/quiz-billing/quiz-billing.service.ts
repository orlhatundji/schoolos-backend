import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import { freeUntil, UNIT_RATE_NAIRA } from './pricing.constants';

export interface AssessmentsSettingsView {
  assessmentsEnabled: boolean;
  assessmentsEnabledAt: Date | null;
  assessmentsEnabledByName: string | null;
  freeUntil: Date;
  freeUntilReason: 'BETA' | 'FIRST_YEAR' | null;
  unitRateNaira: number;
}

export interface AssessmentsUsageView {
  month: string;
  totalAttempts: number;
  totalUnits: number;
  nominalAmountKobo: number;
  waivedAmountKobo: number;
  chargeableAmountKobo: number;
  byAssignment: Array<{
    quizAssignmentId: string;
    attempts: number;
    units: number;
    nominalAmountKobo: number;
  }>;
}

@Injectable()
export class QuizBillingService {
  constructor(private readonly prisma: PrismaService) {}

  async getSettings(userId: string): Promise<AssessmentsSettingsView> {
    const schoolId = await this.requireSchoolId(userId);
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
      select: {
        createdAt: true,
        assessmentsEnabled: true,
        assessmentsEnabledAt: true,
        assessmentsEnabledById: true,
      },
    });
    if (!school) throw new NotFoundException('School not found');

    let enabledByName: string | null = null;
    if (school.assessmentsEnabledById) {
      const u = await this.prisma.user.findUnique({
        where: { id: school.assessmentsEnabledById },
        select: { firstName: true, lastName: true },
      });
      if (u) enabledByName = `${u.firstName} ${u.lastName}`.trim();
    }

    const fu = freeUntil(school.createdAt);
    return {
      assessmentsEnabled: school.assessmentsEnabled,
      assessmentsEnabledAt: school.assessmentsEnabledAt,
      assessmentsEnabledByName: enabledByName,
      freeUntil: fu.date,
      freeUntilReason: fu.reason,
      unitRateNaira: UNIT_RATE_NAIRA,
    };
  }

  async toggleSettings(userId: string, enabled: boolean): Promise<AssessmentsSettingsView> {
    const schoolId = await this.requireSchoolId(userId);
    const now = new Date();
    await this.prisma.school.update({
      where: { id: schoolId },
      data: enabled
        ? {
            assessmentsEnabled: true,
            assessmentsEnabledAt: now,
            assessmentsEnabledById: userId,
            assessmentsDisabledAt: null,
          }
        : {
            assessmentsEnabled: false,
            assessmentsDisabledAt: now,
          },
    });
    return this.getSettings(userId);
  }

  async getUsage(userId: string, monthInput?: string): Promise<AssessmentsUsageView> {
    const schoolId = await this.requireSchoolId(userId);
    const { start, end, month } = monthRange(monthInput);

    const events = await this.prisma.quizUsageEvent.findMany({
      where: {
        schoolId,
        recordedAt: { gte: start, lt: end },
      },
      select: {
        quizAssignmentId: true,
        chargeableUnits: true,
        amountKobo: true,
        isWaived: true,
      },
    });

    const totals = events.reduce(
      (acc, e) => {
        const units = Number(e.chargeableUnits.toString());
        acc.totalAttempts += 1;
        acc.totalUnits += units;
        acc.nominalAmountKobo += e.amountKobo;
        if (e.isWaived) acc.waivedAmountKobo += e.amountKobo;
        else acc.chargeableAmountKobo += e.amountKobo;
        return acc;
      },
      {
        totalAttempts: 0,
        totalUnits: 0,
        nominalAmountKobo: 0,
        waivedAmountKobo: 0,
        chargeableAmountKobo: 0,
      },
    );

    const byMap = new Map<
      string,
      { attempts: number; units: number; nominalAmountKobo: number }
    >();
    for (const e of events) {
      const cur = byMap.get(e.quizAssignmentId) ?? {
        attempts: 0,
        units: 0,
        nominalAmountKobo: 0,
      };
      cur.attempts += 1;
      cur.units += Number(e.chargeableUnits.toString());
      cur.nominalAmountKobo += e.amountKobo;
      byMap.set(e.quizAssignmentId, cur);
    }
    const byAssignment = Array.from(byMap.entries()).map(([quizAssignmentId, v]) => ({
      quizAssignmentId,
      ...v,
    }));

    return {
      month,
      totalAttempts: totals.totalAttempts,
      totalUnits: round2(totals.totalUnits),
      nominalAmountKobo: totals.nominalAmountKobo,
      waivedAmountKobo: totals.waivedAmountKobo,
      chargeableAmountKobo: totals.chargeableAmountKobo,
      byAssignment,
    };
  }

  private async requireSchoolId(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { schoolId: true },
    });
    if (!user?.schoolId) {
      throw new ForbiddenException('User is not associated with a school');
    }
    return user.schoolId;
  }
}

export function monthRange(input?: string): { start: Date; end: Date; month: string } {
  const now = new Date();
  let year = now.getUTCFullYear();
  let monthIdx = now.getUTCMonth();
  if (input !== undefined) {
    if (!/^\d{4}-\d{2}$/.test(input)) {
      throw new BadRequestException('month must be in YYYY-MM format');
    }
    const [y, m] = input.split('-').map((p) => parseInt(p, 10));
    if (m < 1 || m > 12) {
      throw new BadRequestException('month must be between 01 and 12');
    }
    if (y < 2024 || y > 2100) {
      throw new BadRequestException('year is out of range');
    }
    year = y;
    monthIdx = m - 1;
  }
  const start = new Date(Date.UTC(year, monthIdx, 1));
  const end = new Date(Date.UTC(year, monthIdx + 1, 1));
  const month = `${year}-${String(monthIdx + 1).padStart(2, '0')}`;
  return { start, end, month };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
