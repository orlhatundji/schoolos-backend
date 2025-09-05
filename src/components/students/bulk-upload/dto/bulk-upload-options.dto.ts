import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsOptional, Max, Min } from 'class-validator';

export class BulkUploadOptionsDto {
  @ApiProperty({
    description: 'Skip duplicate records instead of failing',
    default: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  skipDuplicates?: boolean = true;

  @ApiProperty({
    description: 'Update existing records if found',
    default: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  updateExisting?: boolean = false;

  @ApiProperty({
    description: 'Number of records to process in each batch',
    default: 50,
    minimum: 10,
    maximum: 100,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(10)
  @Max(100)
  batchSize?: number = 50;

  @ApiProperty({
    description: 'Send email notifications for completion',
    default: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  sendNotifications?: boolean = true;
}
