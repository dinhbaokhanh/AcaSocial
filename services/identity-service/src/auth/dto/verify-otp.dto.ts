import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, Length } from 'class-validator';

export class VerifyOtpDto {
  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '482910', description: 'Mã OTP 6 chữ số nhận qua email' })
  @IsNotEmpty()
  @Length(6, 6)
  otp: string;
}
