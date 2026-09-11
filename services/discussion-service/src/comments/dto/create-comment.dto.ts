import { Transform } from 'class-transformer';
import {
  IsString,
  Length,
  IsUUID,
  IsBoolean,
  ValidateIf,
} from 'class-validator';
export class CreateCommentDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(1, 20000)
  content: string;
  @ValidateIf((_, v) => v !== undefined)
  @IsUUID('all')
  parentCommentId?: string;
  @ValidateIf((_, v) => v !== undefined) @IsBoolean() isAnonymous?: boolean;
}
