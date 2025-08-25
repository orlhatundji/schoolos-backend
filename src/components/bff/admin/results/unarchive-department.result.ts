import { ApiProperty } from '@nestjs/swagger';

export class UnarchiveDepartmentResult {
  @ApiProperty({ description: 'Success status' })
  success: boolean;

  @ApiProperty({ description: 'Success message' })
  message: string;

  @ApiProperty({ description: 'Unarchived department ID' })
  id: string;

  constructor(data: { success: boolean; message: string; id: string }) {
    this.success = data.success;
    this.message = data.message;
    this.id = data.id;
  }
}
