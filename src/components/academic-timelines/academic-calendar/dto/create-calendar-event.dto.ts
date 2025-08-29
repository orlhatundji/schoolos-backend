import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsDateString, IsOptional, IsUUID } from 'class-validator';

export class CreateCalendarEventDto {
  @ApiProperty({
    description: 'Title of the calendar event',
    example: 'First Term Begins',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: 'Academic session ID',
    example: 'uuid',
  })
  @IsUUID()
  @IsNotEmpty()
  academicSessionId: string;

  @ApiProperty({
    description: 'Start date of the event',
    example: '2024-09-01T00:00:00.000Z',
  })
  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @ApiProperty({
    description: 'End date of the event (optional)',
    example: '2024-09-01T23:59:59.000Z',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  endDate?: string;
}
