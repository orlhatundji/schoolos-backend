import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsHexColor } from 'class-validator';

export class InitiateColorSchemePaymentDto {
  @ApiProperty({ description: 'Custom primary color (hex)', example: '#3b82f6' })
  @IsString()
  @IsHexColor()
  customPrimaryColor: string;

  @ApiProperty({ description: 'Custom secondary color (hex)', example: '#64748b' })
  @IsString()
  @IsHexColor()
  customSecondaryColor: string;

  @ApiProperty({ description: 'Custom accent color (hex)', example: '#f59e0b' })
  @IsString()
  @IsHexColor()
  customAccentColor: string;
}
