import { RefreshToken } from './refresh-token.entity';
export declare enum Privacy {
    PUBLIC = "public",
    PRIVATE = "private"
}
export declare class User {
    id: string;
    fullName: string;
    dateOfBirth: Date;
    email: string;
    passwordHash: string;
    avatarUrl: string;
    privacy: Privacy;
    isVerified: boolean;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date;
    refreshTokens: RefreshToken[];
}
