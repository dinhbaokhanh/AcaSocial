import { ChangePasswordDto } from './dto/change-password.dto';
import { ConfirmChangeEmailDto, RequestChangeEmailDto } from './dto/change-email.dto';
import { DeleteAccountDto } from './dto/delete-account.dto';
import { UpdatePrivacyDto } from './dto/update-privacy.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UsersService } from './users.service';
export declare class UsersController {
    private usersService;
    constructor(usersService: UsersService);
    getProfile(req: any): {
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
        refreshTokens: import("./refresh-token.entity").RefreshToken[];
    };
    updateProfile(req: any, dto: UpdateProfileDto): Promise<import("./user.entity").User>;
    uploadAvatar(req: any, file: Express.Multer.File): Promise<{
        avatarUrl: string;
    }>;
    changePassword(req: any, dto: ChangePasswordDto): Promise<{
        message: string;
    }>;
    requestChangeEmail(req: any, dto: RequestChangeEmailDto): Promise<{
        message: string;
    }>;
    resendChangeEmailOtp(req: any, dto: RequestChangeEmailDto): Promise<{
        message: string;
    }>;
    confirmChangeEmail(req: any, dto: ConfirmChangeEmailDto): Promise<{
        message: string;
    }>;
    updatePrivacy(req: any, dto: UpdatePrivacyDto): Promise<{
        message: string;
    }>;
    deleteAccount(req: any, dto: DeleteAccountDto): Promise<{
        message: string;
    }>;
}
