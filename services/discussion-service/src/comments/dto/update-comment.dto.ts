import { Transform } from 'class-transformer';
import { IsString, Length, IsBoolean, ValidateIf } from 'class-validator';
export class UpdateCommentDto {
  @ValidateIf((_, v) => v !== undefined)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(1, 20000)
  content?: string;
  @ValidateIf((_, v) => v !== undefined) @IsBoolean() isAnonymous?: boolean;
}
