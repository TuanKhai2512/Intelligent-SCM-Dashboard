import { IsInt, IsNumber, IsOptional, IsPositive, IsString, MaxLength, Min, ValidateIf } from 'class-validator';

export class UpdateVehicleDto {
  @IsOptional() @IsString() @MaxLength(100)
  trim?: string;

  @IsOptional() @IsString() @MaxLength(50)
  color?: string;

  @ValidateIf((_, v) => v !== undefined) @IsInt() @Min(0)
  mileage?: number;

  @ValidateIf((_, v) => v !== undefined) @IsNumber({ maxDecimalPlaces: 2 }) @IsPositive()
  listPrice?: number;
}
