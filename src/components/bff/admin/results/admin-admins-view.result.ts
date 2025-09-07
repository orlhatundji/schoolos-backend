import { ApiProperty } from '@nestjs/swagger';

import { AdminsViewData } from '../types';

export class AdminStatsResult {
  @ApiProperty({ description: 'Total number of admins in the school' })
  totalAdmins: number;

  @ApiProperty({ description: 'Number of active admins' })
  activeAdmins: number;

  @ApiProperty({ description: 'Number of inactive admins' })
  inactiveAdmins: number;

  @ApiProperty({ description: 'Number of suspended admins' })
  suspendedAdmins: number;

  @ApiProperty({ description: 'Number of teachers who are heads of departments' })
  hodCount: number;
}

export class AdminInfoResult {
  @ApiProperty({ description: 'Admin ID' })
  id: string;

  @ApiProperty({ description: 'Admin full name' })
  name: string;

  @ApiProperty({ description: 'Admin email address' })
  email: string;

  @ApiProperty({ description: 'Admin phone number', nullable: true })
  phone: string | null;

  @ApiProperty({ description: 'Admin avatar URL', nullable: true })
  avatar: string | null;

  @ApiProperty({ description: 'Admin role' })
  role: string;

  @ApiProperty({ description: 'Department (null for admins)', nullable: true })
  department: string | null;

  @ApiProperty({
    description: 'Admin status',
    enum: ['active', 'inactive', 'suspended'],
  })
  status: 'active' | 'inactive' | 'suspended';

  @ApiProperty({ description: 'Last login timestamp', nullable: true })
  lastLoginAt: Date | null;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;
}

export class AdminAdminsViewResult {
  @ApiProperty({ description: 'Success status' })
  success: boolean;

  @ApiProperty({ type: AdminStatsResult, description: 'Admin statistics' })
  stats: AdminStatsResult;

  @ApiProperty({ type: [AdminInfoResult], description: 'List of admins' })
  admins: AdminInfoResult[];

  constructor(data: AdminsViewData) {
    this.success = true;
    this.stats = data.stats;
    this.admins = data.admins;
  }
}
