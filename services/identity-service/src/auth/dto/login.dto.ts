import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'john_doe hoặc john@example.com', description: 'Email hoặc tên đăng nhập' })
  @IsString()
  @IsNotEmpty()
  identifier: string;

  @ApiProperty({ example: 'Password123' })
  @IsNotEmpty()
  password: string;
}
