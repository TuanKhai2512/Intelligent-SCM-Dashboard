import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';
import {
  ACTION_STATUSES,
  BULK_MAX_VEHICLES,
  NOTE_MAX_LENGTH,
  SUGGESTION_CODES,
  type ActionStatus,
  type SuggestionCode,
} from '@ims/shared';
import { DATE_ONLY } from './create-action.dto';

/** No newPrice: Price Reduced needs a price per car and is not allowed in bulk. */
export class BulkActionDto {
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(BULK_MAX_VEHICLES) @ArrayUnique() @IsUUID('all', { each: true })
  vehicleIds: string[];

  @IsIn(ACTION_STATUSES)
  status: ActionStatus;

  @IsOptional() @IsString() @MaxLength(NOTE_MAX_LENGTH)
  note?: string;

  @IsOptional() @Matches(DATE_ONLY, { message: 'targetDate must be YYYY-MM-DD' })
  targetDate?: string;

  @IsOptional() @IsIn(SUGGESTION_CODES)
  suggestionCode?: SuggestionCode;
}
