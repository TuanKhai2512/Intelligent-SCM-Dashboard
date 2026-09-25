import { IsISO8601, IsNumber, IsOptional, IsPositive } from 'class-validator';

export class CloseVehicleDto {
  @IsNumber({ maxDecimalPlaces: 2 }) @IsPositive()
  salePrice: number;

  @IsOptional() @IsISO8601()
  soldAt?: string;
}
