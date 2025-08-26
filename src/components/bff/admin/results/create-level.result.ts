import { ApiProperty } from '@nestjs/swagger';

export class CreateLevelResult {
  @ApiProperty({ description: 'Level ID' })
  id: string;

  @ApiProperty({ description: 'Level name' })
  name: string;

  @ApiProperty({ description: 'Level code' })
  code: string;

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
    schoolId: string;
    createdAt: Date;
    updatedAt: Date;
  }) {
    this.id = data.id;
    this.name = data.name;
    this.code = data.code;
    this.schoolId = data.schoolId;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }
}
