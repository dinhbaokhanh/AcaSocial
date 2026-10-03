import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';
import { CatalogStatus } from './entities';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;
const code = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toUpperCase() : value;

export class ListDto {
  @Type(() => Number) @IsInt() @Min(1) page = 1;
  @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
}

export class CatalogDto {
  @Transform(code) @IsString() @Length(1, 40) @Matches(/^[A-Z0-9_-]+$/) code: string;
  @Transform(trim) @IsString() @Length(2, 200) name: string;
  @IsOptional() @Transform(trim) @IsString() @Length(0, 10000) description?: string;
  @IsOptional() @IsEnum(CatalogStatus) status?: CatalogStatus;
}

export class CurriculumDto {
  @IsUUID() majorId: string;
  @Transform(trim) @IsString() @Length(1, 40) version: string;
  @IsInt() @Min(2000) @Max(2200) effectiveYear: number;
  @IsOptional() @IsEnum(['draft', 'active', 'retired']) status?: 'draft' | 'active' | 'retired';
}

export class CurriculumCourseDto {
  @IsUUID() curriculumId: string;
  @IsUUID() courseId: string;
  @IsEnum(['required', 'elective']) courseType: 'required' | 'elective';
  @ValidateIf((_, value) => value !== undefined && value !== null)
  @IsInt() @Min(1) @Max(20) recommendedSemester?: number | null;
  @IsOptional() @IsInt() @Min(0) displayOrder?: number;
}

export class TopicDto {
  @Transform(code) @IsString() @Length(1, 80) @Matches(/^[A-Z0-9_-]+$/) code: string;
  @Transform(trim) @IsString() @Length(2, 160) name: string;
  @IsOptional() @Transform(trim) @IsString() @Length(0, 10000) description?: string;
  @ValidateIf((_, value) => value !== undefined && value !== null) @IsUUID() parentTopicId?: string | null;
  @IsOptional() @IsEnum(CatalogStatus) status?: CatalogStatus;
}

export class CourseTopicItemDto {
  @IsUUID() topicId: string;
  @IsOptional() @IsNumber() @Min(0) @Max(1) relevanceWeight?: number;
}

export class SetCourseTopicsDto {
  @IsArray() topics: CourseTopicItemDto[];
}

export class UpdateCatalogDto {
  @IsOptional() @Transform(trim) @IsString() @Length(2, 200) name?: string;
  @IsOptional() @Transform(trim) @IsString() @Length(0, 10000) description?: string;
  @IsOptional() @IsEnum(CatalogStatus) status?: CatalogStatus;
}

export class UpdateTopicDto extends UpdateCatalogDto {
  @ValidateIf((_, value) => value !== undefined && value !== null) @IsUUID()
  parentTopicId?: string | null;
}

export class CurriculumStatusDto {
  @IsEnum(['draft', 'active', 'retired']) status: 'draft' | 'active' | 'retired';
}
