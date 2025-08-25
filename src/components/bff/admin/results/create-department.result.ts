import { ApiProperty } from '@nestjs/swagger';

export class CreateDepartmentResult {
  @ApiProperty({ description: 'Success status' })
  success: boolean;

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

  @ApiProperty({ description: 'School ID' })
  schoolId: string;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;

  constructor(data: {
    id: string;
    name: string;
    code: string;
    hodName: string | null;
    hodId: string | null;
    schoolId: string;
    createdAt: Date;
    updatedAt: Date;
  }) {
    this.success = true;
    this.id = data.id;
    this.name = data.name;
    this.code = data.code;
    this.hodName = data.hodName;
    this.hodId = data.hodId;
    this.schoolId = data.schoolId;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }
}
