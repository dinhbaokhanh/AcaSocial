import { Privacy, Role } from '../user.entity';

/**
 * UserProfileDto định nghĩa chính xác những gì được trả về cho client.
 * Chỉ expose những field frontend thực sự cần — không lộ jti, updatedAt, deletedAt.
 */
export class UserProfileDto {
  id: string;
  fullName: string;
  email: string;
  dateOfBirth: Date | null;
  avatarUrl: string | null;
  privacy: Privacy;
  role: Role;
  isVerified: boolean;
  createdAt: Date;
}
