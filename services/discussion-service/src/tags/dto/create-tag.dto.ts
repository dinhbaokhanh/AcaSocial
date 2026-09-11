import { Transform } from 'class-transformer';
import { IsString, Length, Matches, ValidateIf } from 'class-validator';
export class CreateTagDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(1, 100)
  name: string;
  @ValidateIf((_, v) => v !== undefined)
  @IsString()
  @Length(1, 120)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  slug?: string;
  @ValidateIf((_, v) => v !== undefined)
  @IsString()
  @Length(0, 2000)
  description?: string;
}
