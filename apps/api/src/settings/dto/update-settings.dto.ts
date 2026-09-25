import { IsInt, IsNumber, IsTimeZone, Max, Min, ValidateIf } from 'class-validator';

export class UpdateSettingsDto {
  @ValidateIf((_, v) => v !== undefined) @IsInt() @Min(60) @Max(365)
  agingThresholdDays?: number;

  @ValidateIf((_, v) => v !== undefined) @IsInt() @Min(1) @Max(90)
  staleActionDays?: number;

  @ValidateIf((_, v) => v !== undefined) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0)
  dailyHoldingCost?: number;

  @ValidateIf((_, v) => v !== undefined) @IsTimeZone()
  timezone?: string;
}
