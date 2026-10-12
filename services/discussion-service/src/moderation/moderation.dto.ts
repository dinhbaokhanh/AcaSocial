import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class ReviewContentDto {
  @IsOptional()
  @IsIn(['pending', 'approved', 'hidden'])
  expectedModerationStatus?: 'pending' | 'approved' | 'hidden';
  @IsIn(['allow', 'hide', 'hold']) decision: 'allow' | 'hide' | 'hold';
  @IsInt() @Min(1) expectedVersion: number;
  @IsString() expectedContent: string;
  @IsOptional() @IsString() @MaxLength(2000) note?: string;
}
