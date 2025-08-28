import { ApiProperty } from '@nestjs/swagger';

export class CreateSubjectResult {
  @ApiProperty({
    description: 'Success message',
    example: 'Subject created successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Created subject data',
    type: 'object',
    additionalProperties: true,
  })
  data: any;

  constructor(data: any) {
    this.message = 'Subject created successfully';
    this.data = data;
  }
}
