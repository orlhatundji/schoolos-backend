import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsBoolean, IsString, IsEnum, IsHexColor } from 'class-validator';

export class UpdateUserPreferencesDto {
  @ApiProperty({ description: 'Theme mode preference', enum: ['LIGHT', 'DARK', 'SYSTEM'], required: false })
  @IsOptional()
  @IsEnum(['LIGHT', 'DARK', 'SYSTEM'])
  themeMode?: string;

  @ApiProperty({ description: 'Color scheme type', enum: ['SCHOOL', 'CUSTOM'], required: false })
  @IsOptional()
  @IsEnum(['SCHOOL', 'CUSTOM'])
  colorSchemeType?: string;

  @ApiProperty({ description: 'School color scheme ID (e.g., default, art-deco, corporate)', required: false })
  @IsOptional()
  @IsString()
  schoolColorScheme?: string;

  @ApiProperty({ description: 'Custom color scheme ID (e.g., default, art-deco, corporate)', required: false })
  @IsOptional()
  @IsString()
  customColorScheme?: string;

  @ApiProperty({ description: 'Email notifications enabled', required: false })
  @IsOptional()
  @IsBoolean()
  emailNotifications?: boolean;

  @ApiProperty({ description: 'SMS notifications enabled', required: false })
  @IsOptional()
  @IsBoolean()
  smsNotifications?: boolean;

  @ApiProperty({ description: 'Push notifications enabled', required: false })
  @IsOptional()
  @IsBoolean()
  pushNotifications?: boolean;

  @ApiProperty({ description: 'In-app notifications enabled', required: false })
  @IsOptional()
  @IsBoolean()
  inAppNotifications?: boolean;

  @ApiProperty({ description: 'Marketing emails enabled', required: false })
  @IsOptional()
  @IsBoolean()
  marketingEmails?: boolean;
}
