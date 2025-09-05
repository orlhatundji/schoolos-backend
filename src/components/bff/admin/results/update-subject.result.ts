import { ApiProperty } from '@nestjs/swagger';
import { SubjectCategory } from '@prisma/client';

export class UpdateSubjectResult {
  @ApiProperty({ description: 'Success status' })
  success: boolean;

  @ApiProperty({ description: 'Subject ID' })
  id: string;

  @ApiProperty({ description: 'Subject name' })
  name: string;

  @ApiProperty({
    description: 'Subject category',
    enum: SubjectCategory,
  })
  category: SubjectCategory;

  @ApiProperty({ description: 'Department name', nullable: true })
  department: string | null;

  @ApiProperty({ description: 'Department ID', nullable: true })
  departmentId: string | null;

  @ApiProperty({ description: 'School ID' })
  schoolId: string;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;

  constructor(data: {
    id: string;
    name: string;
    category: SubjectCategory;
    department: string | null;
    departmentId: string | null;
    schoolId: string;
    createdAt: Date;
    updatedAt: Date;
  }) {
    this.success = true;
    this.id = data.id;
    this.name = data.name;
    this.category = data.category;
    this.department = data.department;
    this.departmentId = data.departmentId;
    this.schoolId = data.schoolId;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }
}
