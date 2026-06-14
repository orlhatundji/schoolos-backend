import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class MarkInvoicePaidDto {
  @ApiProperty({ required: false, description: 'Free-text note (e.g. bank transfer reference)' })
  @IsOptional()
  @IsString()
  note?: string;
}
