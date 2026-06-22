import { ApiProperty } from '@nestjs/swagger';
import { IsUrl } from 'class-validator';

export class UpdateAvatarDto {
  @ApiProperty({ example: 'https://res.cloudinary.com/demo/image/upload/sample.jpg', description: 'URL ảnh đại diện từ Cloudinary' })
  @IsUrl({}, { message: 'avatarUrl phải là URL hợp lệ' })
  avatarUrl: string;
}
