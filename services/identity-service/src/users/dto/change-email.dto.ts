import { IsEmail, IsNotEmpty, IsOptional, Length } from 'class-validator';

export class RequestChangeEmailDto {
  @IsEmail()
  newEmail: string;
}

export class ConfirmChangeEmailDto {
  @IsEmail()
  newEmail: string;

  @IsNotEmpty()
  @Length(6, 6)
  otp: string;
}
