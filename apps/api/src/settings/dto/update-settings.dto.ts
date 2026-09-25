import { IsInt, IsNumber, IsOptional, IsTimeZone, Max, Min } from 'class-validator';

export class UpdateSettingsDto {
  @IsOptional() @IsInt() @Min(60) @Max(365)
  agingThresholdDays?: number;

  @IsOptional() @IsInt() @Min(1) @Max(90)
  staleActionDays?: number;

  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0)
  dailyHoldingCost?: number;

  @IsOptional() @IsTimeZone()
  timezone?: string;
}
