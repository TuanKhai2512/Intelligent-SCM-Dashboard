import { IsIn, IsNumber, IsOptional, IsPositive, IsString, Matches, MaxLength } from 'class-validator';
import {
  ACTION_STATUSES,
  NOTE_MAX_LENGTH,
  SUGGESTION_CODES,
  type ActionStatus,
  type SuggestionCode,
} from '@ims/shared';

export const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export class CreateActionDto {
  @IsIn(ACTION_STATUSES)
  status: ActionStatus;

  @IsOptional() @IsString() @MaxLength(NOTE_MAX_LENGTH)
  note?: string;

  @IsOptional() @Matches(DATE_ONLY, { message: 'targetDate must be YYYY-MM-DD' })
  targetDate?: string;

  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @IsPositive()
  newPrice?: number;

  @IsOptional() @IsIn(SUGGESTION_CODES)
  suggestionCode?: SuggestionCode;
}
