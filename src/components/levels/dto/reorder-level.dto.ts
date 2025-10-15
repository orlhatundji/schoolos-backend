import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';

export enum ReorderDirection {
  UP = 'up',
  DOWN = 'down',
}

export class ReorderLevelDto {
  @ApiProperty({
    description: 'Direction to move the level',
    enum: ReorderDirection,
    example: ReorderDirection.UP,
  })
  @IsEnum(ReorderDirection, { message: 'Direction must be either "up" or "down"' })
  @IsNotEmpty({ message: 'Direction is required' })
  direction: ReorderDirection;
}
