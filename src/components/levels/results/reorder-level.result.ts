import { ApiProperty } from '@nestjs/swagger';

export class ReorderLevelResult {
  @ApiProperty({
    description: 'Success status of the reorder operation',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Message describing the result',
    example: 'Level reordered successfully',
  })
  message: string;

  @ApiProperty({
    description: 'The updated level data',
    type: 'object',
    properties: {
      id: { type: 'string', example: 'uuid' },
      name: { type: 'string', example: 'JSS1' },
      code: { type: 'string', example: 'JSS' },
      order: { type: 'number', example: 2 },
    },
  })
  data: {
    id: string;
    name: string;
    code: string;
    order: number;
  };

  constructor(data: { id: string; name: string; code: string; order: number }) {
    this.success = true;
    this.message = 'Level reordered successfully';
    this.data = data;
  }
}
