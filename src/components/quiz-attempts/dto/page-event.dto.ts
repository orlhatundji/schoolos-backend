import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsIn, IsString } from 'class-validator';

export class PageEventDto {
  @ApiProperty({ enum: ['HIDDEN', 'VISIBLE', 'BLUR', 'FOCUS', 'PASTE'] })
  @IsString()
  @IsIn(['HIDDEN', 'VISIBLE', 'BLUR', 'FOCUS', 'PASTE'])
  event: 'HIDDEN' | 'VISIBLE' | 'BLUR' | 'FOCUS' | 'PASTE';

  @ApiProperty({ description: 'Client timestamp (ISO). Server also records its own.' })
  @IsDateString()
  ts: string;
}
