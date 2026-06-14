import { IsUrl } from 'class-validator';

export class UpdateAvatarDto {
  @IsUrl({}, { message: 'avatarUrl phải là URL hợp lệ' })
  avatarUrl: string;
}
