import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsDateString,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';

export class RegisterDto {
  @IsNotEmpty()
  @MinLength(5, { message: 'Nice name but Username should have 5-20 characters' })
  @MaxLength(20, { message: 'Nice name but Username should have 5-20 characters' })
  @Matches(/^[a-z0-9_]+$/, {
    message: 'Username should contain letters, numbers and "_".',
  })
  username: string;

  @IsNotEmpty()
  @MaxLength(100)
  fullName: string;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @IsEmail()
  email: string;

  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Password must contain uppercase, lowercase and number',
  })
  password: string;
}
