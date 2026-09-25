import { IsString, MaxLength } from 'class-validator';
import { NOTE_MAX_LENGTH } from '@ims/shared';

export class UpdateNoteDto {
  @IsString() @MaxLength(NOTE_MAX_LENGTH)
  note: string;
}
