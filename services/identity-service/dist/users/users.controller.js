"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const change_password_dto_1 = require("./dto/change-password.dto");
const change_email_dto_1 = require("./dto/change-email.dto");
const delete_account_dto_1 = require("./dto/delete-account.dto");
const update_privacy_dto_1 = require("./dto/update-privacy.dto");
const update_profile_dto_1 = require("./dto/update-profile.dto");
const users_service_1 = require("./users.service");
let UsersController = class UsersController {
    constructor(usersService) {
        this.usersService = usersService;
    }
    getProfile(req) {
        return this.usersService.getProfile(req.user);
    }
    updateProfile(req, dto) {
        return this.usersService.updateProfile(req.user, dto);
    }
    uploadAvatar(req, file) {
        return this.usersService.uploadAvatar(req.user, file);
    }
    changePassword(req, dto) {
        return this.usersService.changePassword(req.user, dto, req.user.jti);
    }
    requestChangeEmail(req, dto) {
        return this.usersService.requestChangeEmail(req.user, dto);
    }
    resendChangeEmailOtp(req, dto) {
        return this.usersService.requestChangeEmail(req.user, dto);
    }
    confirmChangeEmail(req, dto) {
        return this.usersService.confirmChangeEmail(req.user, dto);
    }
    updatePrivacy(req, dto) {
        return this.usersService.updatePrivacy(req.user, dto);
    }
    deleteAccount(req, dto) {
        return this.usersService.deleteAccount(req.user, dto, req.user.jti);
    }
};
exports.UsersController = UsersController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "getProfile", null);
__decorate([
    (0, common_1.Patch)('profile'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, update_profile_dto_1.UpdateProfileDto]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "updateProfile", null);
__decorate([
    (0, common_1.Patch)('avatar'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('avatar', {
        limits: { fileSize: 5 * 1024 * 1024 },
        fileFilter: (_, file, cb) => {
            if (!file.mimetype.match(/^image\/(jpeg|png|gif|webp)$/)) {
                return cb(new Error('Only image files are allowed'), false);
            }
            cb(null, true);
        },
    })),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "uploadAvatar", null);
__decorate([
    (0, common_1.Patch)('change-password'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, change_password_dto_1.ChangePasswordDto]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "changePassword", null);
__decorate([
    (0, common_1.Post)('change-email/request'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, change_email_dto_1.RequestChangeEmailDto]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "requestChangeEmail", null);
__decorate([
    (0, common_1.Post)('change-email/resend'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, change_email_dto_1.RequestChangeEmailDto]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "resendChangeEmailOtp", null);
__decorate([
    (0, common_1.Post)('change-email/confirm'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, change_email_dto_1.ConfirmChangeEmailDto]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "confirmChangeEmail", null);
__decorate([
    (0, common_1.Patch)('privacy'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, update_privacy_dto_1.UpdatePrivacyDto]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "updatePrivacy", null);
__decorate([
    (0, common_1.Delete)(),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, delete_account_dto_1.DeleteAccountDto]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "deleteAccount", null);
exports.UsersController = UsersController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('users/me'),
    __metadata("design:paramtypes", [users_service_1.UsersService])
], UsersController);
//# sourceMappingURL=users.controller.js.map