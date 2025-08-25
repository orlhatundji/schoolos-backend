import { Injectable, BadRequestException } from '@nestjs/common';

import { PrismaService } from '../../../../prisma';
import { AdminsViewData } from '../types';

@Injectable()
export class BffAdminAdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getAdminsViewData(userId: string): Promise<AdminsViewData> {
    // First, get the user's school ID
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { schoolId: true },
    });

    if (!user?.schoolId) {
      throw new BadRequestException('User not found or not associated with a school');
    }

    const schoolId = user.schoolId;

    // Get all users who are admins for this school
    const adminUsers = await this.prisma.user.findMany({
      where: {
        schoolId,
        type: {
          in: ['ADMIN', 'SUPER_ADMIN'],
        },
        deletedAt: null,
      },
      include: {
        admin: true,
      },
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
    });

    // Get all teachers who are HODs for this school
    const hodUsers = await this.prisma.user.findMany({
      where: {
        schoolId,
        type: 'TEACHER',
        deletedAt: null,
        teacher: {
          hod: {
            some: {
              deletedAt: null,
              department: {
                schoolId,
                deletedAt: null,
              },
            },
          },
        },
      },
      include: {
        teacher: {
          include: {
            hod: {
              include: {
                department: {
                  select: {
                    name: true,
                    code: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
    });

    // Get HOD count (teachers who are heads of departments)
    const hodCount = await this.prisma.hod.count({
      where: {
        department: {
          schoolId,
          deletedAt: null,
        },
        deletedAt: null,
      },
    });

    // Calculate statistics
    const totalAdmins = adminUsers.length + hodUsers.length;
    const activeAdmins =
      adminUsers.filter((admin) => !admin.admin?.deletedAt).length + hodUsers.length;
    const inactiveAdmins = adminUsers.filter((admin) => admin.admin?.deletedAt).length;
    const suspendedAdmins = 0; // No suspended status in current schema

    // Process admin data for the list
    const adminsData = [
      // Regular admins
      ...adminUsers.map((adminUser) => {
        const status: 'active' | 'inactive' | 'suspended' = adminUser.admin?.deletedAt
          ? 'inactive'
          : 'active';

        return {
          id: adminUser.id,
          name: `${adminUser.firstName} ${adminUser.lastName}`,
          role: adminUser.admin?.isSuper ? 'Super Admin' : 'Admin',
          department: null, // Admins don't belong to departments
          status,
          lastLoginAt: adminUser.lastLoginAt,
          createdAt: adminUser.createdAt,
        };
      }),
      // HODs (teachers with administrative responsibilities)
      ...hodUsers.map((hodUser) => {
        const hodDepartment = hodUser.teacher?.hod?.[0]?.department;

        return {
          id: hodUser.id,
          name: `${hodUser.firstName} ${hodUser.lastName}`,
          role: 'HOD',
          department: hodDepartment ? `${hodDepartment.name} (${hodDepartment.code})` : null,
          status: 'active' as const,
          lastLoginAt: hodUser.lastLoginAt,
          createdAt: hodUser.createdAt,
        };
      }),
    ];

    return {
      stats: {
        totalAdmins,
        activeAdmins,
        inactiveAdmins,
        suspendedAdmins,
        hodCount,
      },
      admins: adminsData,
    };
  }
}
