import { IsString, IsUUID, Length } from 'class-validator';
export class MergeTagDto {
  @IsUUID() targetTagId: string;
  @IsString() @Length(5, 500) reason: string;
}
export class TagStatusDto {
  @IsString() @Length(5, 500) reason: string;
}
