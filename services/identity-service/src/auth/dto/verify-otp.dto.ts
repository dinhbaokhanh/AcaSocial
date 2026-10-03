import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, Length, Matches, MaxLength, MinLength } from 'class-validator';

export class VerifyOtpDto {
  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '482910', description: 'Mã OTP 6 chữ số nhận qua email' })
  @IsNotEmpty()
  @Length(6, 6)
  otp: string;

  @ApiProperty({ example: 'john_doe', description: 'Tên đăng nhập được xác lập sau khi xác minh email' })
  @IsNotEmpty()
  @MinLength(5)
  @MaxLength(20)
  @Matches(/^[a-z0-9_]+$/)
  username: string;
}
