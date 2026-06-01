import { User } from './user.entity';
export declare class RefreshToken {
    id: string;
    tokenHash: string;
    expiresAt: Date;
    revoked: boolean;
    createdAt: Date;
    user: User;
    userId: string;
}
