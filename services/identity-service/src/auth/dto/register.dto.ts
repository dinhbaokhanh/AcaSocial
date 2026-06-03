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
  // Username: 3-30 ký tự, chỉ chữ thường, số và dấu gạch dưới
  // Dùng để mention (@username) và hiển thị trên profile URL
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(30)
  @Matches(/^[a-z0-9_]+$/, {
    message: 'Username chỉ được chứa chữ thường, số và dấu gạch dưới (_)',
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
