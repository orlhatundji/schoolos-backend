import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PlatformService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard() {
    const [
      totalSchools,
      activeSchools,
      pendingSignups,
      openComplaints,
      recentSignups,
      recentComplaints,
    ] = await Promise.all([
      this.prisma.school.count(),
      this.prisma.school.count({
        where: { deletedAt: null },
      }),
      this.prisma.schoolSignupRequest.count({
        where: { status: 'PENDING' },
      }),
      this.prisma.complaint.count({
        where: { status: { in: ['OPEN', 'IN_PROGRESS'] } },
      }),
      this.prisma.schoolSignupRequest.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          reviewer: {
            include: {
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.complaint.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          reporter: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          school: {
            select: {
              name: true,
              code: true,
            },
          },
          assignedTo: {
            include: {
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
      }),
    ]);

    return {
      stats: {
        totalSchools,
        activeSchools,
        pendingSignups,
        openComplaints,
      },
      recentSignups,
      recentComplaints,
    };
  }
}
