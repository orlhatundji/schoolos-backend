import { IsBoolean } from 'class-validator';

export class ToggleAssessmentsDto {
  @IsBoolean()
  enabled!: boolean;
}
