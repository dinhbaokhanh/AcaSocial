import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { MailService } from '../mail/mail.service';
import { OtpService } from '../otp/otp.service';
import { RefreshToken } from './refresh-token.entity';
import { User } from './user.entity';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ConfirmChangeEmailDto, RequestChangeEmailDto } from './dto/change-email.dto';
import { DeleteAccountDto } from './dto/delete-account.dto';
import { UpdatePrivacyDto } from './dto/update-privacy.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
export declare class UsersService {
    private userRepo;
    private refreshTokenRepo;
    private config;
    private mailService;
    private otpService;
    private redis;
    constructor(userRepo: Repository<User>, refreshTokenRepo: Repository<RefreshToken>, config: ConfigService, mailService: MailService, otpService: OtpService);
    getProfile(user: User): {
        id: string;
        fullName: string;
        dateOfBirth: Date;
        email: string;
        avatarUrl: string;
        privacy: import("./user.entity").Privacy;
        isVerified: boolean;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date;
        refreshTokens: RefreshToken[];
    };
    updateProfile(user: User, dto: UpdateProfileDto): Promise<User>;
    uploadAvatar(user: User, file: Express.Multer.File): Promise<{
        avatarUrl: string;
    }>;
    changePassword(user: User, dto: ChangePasswordDto, jti: string): Promise<{
        message: string;
    }>;
    requestChangeEmail(user: User, dto: RequestChangeEmailDto): Promise<{
        message: string;
    }>;
    confirmChangeEmail(user: User, dto: ConfirmChangeEmailDto): Promise<{
        message: string;
    }>;
    updatePrivacy(user: User, dto: UpdatePrivacyDto): Promise<{
        message: string;
    }>;
    deleteAccount(user: User, dto: DeleteAccountDto, jti: string): Promise<{
        message: string;
    }>;
    private parseTtl;
}
