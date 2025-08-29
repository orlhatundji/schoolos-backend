import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsDateString } from 'class-validator';

export class UpdateCalendarEventDto {
  @ApiProperty({
    description: 'Title of the calendar event',
    example: 'First Term Begins',
    required: false,
  })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiProperty({
    description: 'Start date of the event',
    example: '2024-09-01T00:00:00.000Z',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiProperty({
    description: 'End date of the event',
    example: '2024-09-01T23:59:59.000Z',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  endDate?: string;
}
