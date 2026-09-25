import { IsInt, IsNumber, IsOptional, IsPositive, IsString, MaxLength, Min } from 'class-validator';

export class UpdateVehicleDto {
  @IsOptional() @IsString() @MaxLength(100)
  trim?: string;

  @IsOptional() @IsString() @MaxLength(50)
  color?: string;

  @IsOptional() @IsInt() @Min(0)
  mileage?: number;

  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @IsPositive()
  listPrice?: number;
}
