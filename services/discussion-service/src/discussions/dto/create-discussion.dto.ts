import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
  ArrayUnique,
  IsString,
  Length,
  IsUUID,
  IsBoolean,
  IsEnum,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { PostType } from '../enums/post-type.enum';
import { AiSuggestionDto } from './tag-suggestion.dto';
export class CreateDiscussionDto {
  @IsUUID('all')
  roomId: string;
  @ValidateIf((_, v) => v !== undefined)
  @IsUUID('all')
  majorCourseId?: string;
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(10, 300)
  title: string;
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(20, 100000)
  content: string;
  @IsEnum(PostType) postType: PostType;
  @ValidateIf((_, v) => v !== undefined)
  @IsArray()
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
  @ValidateIf((_, v) => v !== undefined)
  @ValidateNested()
  @Type(() => AiSuggestionDto)
  aiSuggestion?: AiSuggestionDto;
}
