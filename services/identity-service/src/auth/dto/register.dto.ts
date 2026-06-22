import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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
  @ApiProperty({ example: 'john_doe', description: 'Tên đăng nhập (5–20 ký tự, chỉ gồm chữ thường, số và _)' })
  @IsNotEmpty()
  @MinLength(5, { message: 'Nice name but Username should have 5-20 characters' })
  @MaxLength(20, { message: 'Nice name but Username should have 5-20 characters' })
  @Matches(/^[a-z0-9_]+$/, {
    message: 'Username should contain letters, numbers and "_".',
  })
  username: string;

  @ApiProperty({ example: 'Nguyễn Văn A', description: 'Họ và tên đầy đủ' })
  @IsNotEmpty()
  @MaxLength(100)
  fullName: string;

  @ApiPropertyOptional({ example: '2000-01-15', description: 'Ngày sinh (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Password123', description: 'Tối thiểu 8 ký tự, gồm chữ hoa, chữ thường và số' })
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Password must contain uppercase, lowercase and number',
  })
  password: string;
}
