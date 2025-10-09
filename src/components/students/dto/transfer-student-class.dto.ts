import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID, IsOptional } from 'class-validator';

export class TransferStudentClassDto {
  @ApiProperty({
    description: 'ID of the target class arm to transfer the student to',
    example: 'class-arm-uuid',
  })
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  toClassArmId: string;
  
  @ApiProperty({
    description: 'Optional reason for the transfer',
    required: false,
    example: 'Student requested transfer due to schedule conflict',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}
