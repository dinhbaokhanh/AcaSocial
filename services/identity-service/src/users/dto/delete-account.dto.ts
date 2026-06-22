import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

export class DeleteAccountDto {
  @ApiProperty({ example: 'Password123', description: 'Xác nhận mật khẩu hiện tại trước khi xóa tài khoản' })
  @IsNotEmpty()
  password: string;
}
