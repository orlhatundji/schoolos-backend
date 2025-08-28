import { ApiProperty } from '@nestjs/swagger';

export class DeleteDepartmentResult {
  @ApiProperty({ description: 'Success status' })
  success: boolean;

  @ApiProperty({ description: 'Success message' })
  message: string;

  constructor(data: { message: string }) {
    this.success = true;
    this.message = data.message;
  }
}
