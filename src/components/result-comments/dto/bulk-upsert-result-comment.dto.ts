import { IsString, IsNotEmpty, IsOptional, IsArray, ValidateNested, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BulkUpsertResultCommentItemDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  studentId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string;
}

export class BulkUpsertResultCommentDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  classArmId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  termId?: string;

  @ApiProperty({ type: [BulkUpsertResultCommentItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkUpsertResultCommentItemDto)
  comments: BulkUpsertResultCommentItemDto[];
}
