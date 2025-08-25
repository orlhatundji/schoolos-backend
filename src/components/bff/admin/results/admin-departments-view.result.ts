import { ApiProperty } from '@nestjs/swagger';
import { DepartmentsViewData } from '../types';

export class DepartmentStatsResult {
  @ApiProperty({ description: 'Total number of departments in the school' })
  totalDepartments: number;

  @ApiProperty({ description: 'Number of active departments' })
  activeDepartments: number;

  @ApiProperty({ description: 'Number of archived departments' })
  archivedDepartments: number;

  @ApiProperty({ description: 'Number of departments with HOD assigned' })
  departmentsWithHOD: number;

  @ApiProperty({ description: 'Number of departments without HOD assigned' })
  departmentsWithoutHOD: number;
}

export class DepartmentInfoResult {
  @ApiProperty({ description: 'Department ID' })
  id: string;

  @ApiProperty({ description: 'Department name' })
  name: string;

  @ApiProperty({ description: 'Three character department code' })
  code: string;

  @ApiProperty({ description: 'Head of Department name', nullable: true })
  hodName: string | null;

  @ApiProperty({ description: 'Head of Department ID', nullable: true })
  hodId: string | null;

  @ApiProperty({ description: 'Number of subjects in this department' })
  subjectsCount: number;

  @ApiProperty({ description: 'Number of classes in this department' })
  classesCount: number;

  @ApiProperty({ description: 'Number of teachers in this department' })
  teachersCount: number;

  @ApiProperty({ 
    description: 'Department status',
    enum: ['active', 'archived']
  })
  status: 'active' | 'archived';

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;
}

export class AdminDepartmentsViewResult {
  @ApiProperty({ description: 'Success status' })
  success: boolean;

  @ApiProperty({ type: DepartmentStatsResult, description: 'Department statistics' })
  stats: DepartmentStatsResult;

  @ApiProperty({ type: [DepartmentInfoResult], description: 'List of departments' })
  departments: DepartmentInfoResult[];

  constructor(data: DepartmentsViewData) {
    this.success = true;
    this.stats = data.stats;
    this.departments = data.departments;
  }
}
