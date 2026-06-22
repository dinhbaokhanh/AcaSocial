import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, Matches, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({ example: 'OldPassword123' })
  @IsNotEmpty()
  currentPassword: string;

  @ApiProperty({ example: 'NewPassword456', description: 'Tối thiểu 8 ký tự, gồm chữ hoa, chữ thường và số' })
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Password must contain uppercase, lowercase and number',
  })
  newPassword: string;

  @ApiProperty({ example: 'NewPassword456', description: 'Xác nhận mật khẩu mới (phải trùng với newPassword)' })
  @IsNotEmpty()
  confirmPassword: string;
}
