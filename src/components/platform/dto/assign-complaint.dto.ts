import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignComplaintDto {
  @ApiProperty({ description: 'System admin ID to assign complaint to' })
  @IsUUID()
  assignedToId: string;
}
