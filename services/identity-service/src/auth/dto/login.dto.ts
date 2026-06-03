import { IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  // Chấp nhận cả email lẫn username — service tự phân biệt dựa vào ký tự '@'
  @IsString()
  @IsNotEmpty()
  identifier: string;

  @IsNotEmpty()
  password: string;
}
