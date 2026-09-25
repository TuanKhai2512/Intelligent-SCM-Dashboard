import { Transform, Type } from 'class-transformer';
import { IsIn, IsInt, IsNumber, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';
import {
  ACTION_STATUSES,
  BUCKETS,
  VEHICLE_STATUSES,
  type ActionStatus,
  type Bucket,
  type VehicleStatus,
} from '@ims/shared';
import { DEFAULT_SORT, SORT_FIELDS, type VehicleFilters } from '../vehicle-filters';

/** Accepts `?make=a&make=b` and `?make=a,b`. */
export const toArray = ({ value }: { value: unknown }) => {
  if (value === undefined || value === null || value === '') return undefined;
  const list = Array.isArray(value) ? value : String(value).split(',');
  return list.map((v) => String(v).trim()).filter(Boolean);
};

const SORT_PATTERN = new RegExp(`^(${SORT_FIELDS.join('|')}):(asc|desc)$`);

export class VehicleQueryDto implements VehicleFilters {
  @IsOptional() @Transform(toArray) @IsString({ each: true })
  make?: string[];

  @IsOptional() @Transform(toArray) @IsString({ each: true })
  model?: string[];

  @IsOptional() @Type(() => Number) @IsInt()
  yearMin?: number;

  @IsOptional() @Type(() => Number) @IsInt()
  yearMax?: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(0)
  ageMin?: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(0)
  ageMax?: number;

  @IsOptional() @Transform(toArray) @IsIn(BUCKETS, { each: true })
  bucket?: Bucket[];

  @IsOptional() @Type(() => Number) @IsNumber() @Min(0)
  priceMin?: number;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(0)
  priceMax?: number;

  @IsOptional() @Transform(toArray) @IsIn([...ACTION_STATUSES, 'NONE'], { each: true })
  actionStatus?: (ActionStatus | 'NONE')[];

  @IsOptional() @Transform(toArray) @IsIn(VEHICLE_STATUSES, { each: true })
  status?: VehicleStatus[];

  @IsOptional() @IsString() @MaxLength(100)
  q?: string;

  @IsOptional() @Matches(SORT_PATTERN, { message: `sort must be <${SORT_FIELDS.join('|')}>:<asc|desc>` })
  sort: string = DEFAULT_SORT;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page: number = 1;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  pageSize: number = 25;
}
