import { IsIn, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class ReviewContentDto {
  @IsIn(['allow', 'hide']) decision: 'allow' | 'hide';
  @IsInt() @Min(1) expectedVersion: number;
  @IsString() expectedContent: string;
  @IsOptional() @IsString() @MaxLength(2000) note?: string;
}
