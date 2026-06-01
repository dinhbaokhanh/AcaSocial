import { IsDateString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';

export class UpdateProfileDto {
  @IsNotEmpty()
  @MaxLength(100)
  fullName: string;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;
}
