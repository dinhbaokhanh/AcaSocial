import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Min,
} from 'class-validator';

export class CreateAnswerDto {
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString() @Length(20, 100000) content: string;
  @IsOptional() @IsBoolean() isAnonymous?: boolean;
}

export class UpdateAnswerDto {
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString() @Length(20, 100000) content: string;
  @IsInt() @Min(1) expectedVersion: number;
  @IsEnum(['editorial', 'semantic']) revisionType: 'editorial' | 'semantic';
}

export class AcceptAnswerDto {
  @IsUUID() answerId: string;
  @IsInt() @Min(1) expectedQuestionVersion: number;
  @IsInt() @Min(1) expectedAnswerVersion: number;
}
