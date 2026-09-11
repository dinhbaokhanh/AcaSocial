import { Transform } from 'class-transformer';
import {
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
  ArrayUnique,
  IsString,
  Length,
  IsUUID,
  IsBoolean,
  ValidateIf,
} from 'class-validator';
export class UpdateDiscussionDto {
  @ValidateIf((_, v) => v !== undefined)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(10, 300)
  title?: string;
  @ValidateIf((_, v) => v !== undefined)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(20, 100000)
  content?: string;
  @ValidateIf((_, v) => v !== undefined)
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(5)
  @ArrayUnique()
  @IsUUID('all', { each: true })
  tagIds?: string[];
  @ValidateIf((_, v) => v !== undefined)
  @IsArray()
  @ArrayMaxSize(10)
  @ArrayUnique()
  @IsUUID('all', { each: true })
  mediaIds?: string[];
  @ValidateIf((_, v) => v !== undefined) @IsBoolean() isAnonymous?: boolean;
}
