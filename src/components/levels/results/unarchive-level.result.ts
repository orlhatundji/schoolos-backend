import { ApiProperty } from '@nestjs/swagger';

export class UnarchiveLevelResult {
  @ApiProperty({ description: 'Success status' })
  success: boolean;

  @ApiProperty({ description: 'Level ID' })
  id: string;

  @ApiProperty({ description: 'Archive status' })
  isArchived: boolean;

  @ApiProperty({ description: 'Success message' })
  message: string;

  constructor(data: { id: string; deletedAt: Date | null }) {
    this.success = true;
    this.id = data.id;
    this.isArchived = data.deletedAt !== null;
    this.message = 'Level unarchived successfully';
  }
}
