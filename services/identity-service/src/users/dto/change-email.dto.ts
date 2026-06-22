import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, Length } from 'class-validator';

export class RequestChangeEmailDto {
  @ApiProperty({ example: 'newemail@example.com', description: 'Email mới muốn chuyển sang' })
  @IsEmail()
  newEmail: string;
}

export class ConfirmChangeEmailDto {
  @ApiProperty({ example: 'newemail@example.com' })
  @IsEmail()
  newEmail: string;

  @ApiProperty({ example: '371924', description: 'Mã OTP 6 chữ số gửi đến email mới' })
  @IsNotEmpty()
  @Length(6, 6)
  otp: string;
}
