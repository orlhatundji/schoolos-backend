import { ApiProperty } from '@nestjs/swagger';
import { LevelsViewData } from '../types';

export class AdminLevelsViewResult {
  @ApiProperty({ description: 'Success status' })
  success: boolean;

  @ApiProperty({ description: 'Success message' })
  message: string;

  @ApiProperty({ description: 'Levels view data' })
  data: LevelsViewData;

  constructor(data: LevelsViewData) {
    this.success = true;
    this.message = 'Levels view data retrieved successfully';
    this.data = data;
  }
}
