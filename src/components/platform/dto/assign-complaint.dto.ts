import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class AssignComplaintDto {
  @ApiProperty({ description: 'SystemAdmin id to assign the complaint to' })
  @IsUUID()
  systemAdminId!: string;
}
