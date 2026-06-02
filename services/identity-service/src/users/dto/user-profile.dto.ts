import { Privacy } from '../user.entity';

/**
 * UserProfileDto định nghĩa chính xác những gì được trả về cho client.
 */
export class UserProfileDto {
  id: string;
  fullName: string;
  email: string;
  dateOfBirth: Date | null;
  avatarUrl: string | null;
  privacy: Privacy;
  isVerified: boolean;
  createdAt: Date;
}
