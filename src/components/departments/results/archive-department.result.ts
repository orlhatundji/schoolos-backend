import { ApiProperty } from '@nestjs/swagger';

export class ArchiveDepartmentResult {
  @ApiProperty({ description: 'Success status' })
  success: boolean;

  @ApiProperty({ description: 'Department ID' })
  id: string;

  @ApiProperty({ description: 'Archive status' })
  isArchived: boolean;

  @ApiProperty({ description: 'Success message' })
  message: string;

  constructor(data: { id: string; deletedAt: Date | null }) {
    this.success = true;
    this.id = data.id;
    this.isArchived = data.deletedAt !== null;
    this.message = 'Department archived successfully';
  }
}
