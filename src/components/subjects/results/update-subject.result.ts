import { ApiProperty } from '@nestjs/swagger';

export class UpdateSubjectResult {
  @ApiProperty({
    description: 'Success message',
    example: 'Subject updated successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Updated subject data',
    type: 'object',
    additionalProperties: true,
  })
  data: any;

  constructor(data: any) {
    this.message = 'Subject updated successfully';
    this.data = data;
  }
}
