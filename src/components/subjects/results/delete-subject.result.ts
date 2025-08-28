import { ApiProperty } from '@nestjs/swagger';

export class DeleteSubjectResult {
  @ApiProperty({
    description: 'Success message',
    example: 'Subject deleted successfully',
  })
  message: string;

  constructor(data: any) {
    this.message = data.message || 'Subject deleted successfully';
  }
}
