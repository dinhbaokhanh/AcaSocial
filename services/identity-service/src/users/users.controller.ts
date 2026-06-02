import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Post,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ConfirmChangeEmailDto, RequestChangeEmailDto } from './dto/change-email.dto';
import { DeleteAccountDto } from './dto/delete-account.dto';
import { UpdatePrivacyDto } from './dto/update-privacy.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UsersService } from './users.service';

/**
 * UsersController quản lý thông tin cá nhân của người dùng đang đăng nhập.
 * Tất cả endpoint đều yêu cầu JWT hợp lệ (@UseGuards ở cấp class).
 * req.user được inject bởi JwtStrategy sau khi xác thực token thành công.
 */
@UseGuards(JwtAuthGuard)
@Controller('users/me')
export class UsersController {
  constructor(private usersService: UsersService) {}

  // Lấy thông tin hồ sơ cá nhân (passwordHash bị lọc ra trước khi trả về)
  @Get()
  getProfile(@Request() req) {
    return this.usersService.getProfile(req.user);
  }

  // Cập nhật tên và ngày sinh
  @Patch('profile')
  updateProfile(@Request() req, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(req.user, dto);
  }

  // Upload ảnh đại diện lên Cloudinary
  // FileInterceptor xử lý multipart/form-data, giới hạn 5MB và chỉ chấp nhận ảnh
  @Patch('avatar')
  @UseInterceptors(
    FileInterceptor('avatar', {
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
      fileFilter: (_, file, cb) => {
        if (!file.mimetype.match(/^image\/(jpeg|png|gif|webp)$/)) {
          return cb(new Error('Only image files are allowed'), false);
        }
        cb(null, true);
      },
    }),
  )
  uploadAvatar(@Request() req, @UploadedFile() file: Express.Multer.File) {
    return this.usersService.uploadAvatar(req.user, file);
  }

  // Đổi mật khẩu: cần nhập mật khẩu hiện tại để xác minh.
  // Sau khi đổi, revoke toàn bộ session và blacklist token hiện tại.
  @Patch('change-password')
  changePassword(@Request() req, @Body() dto: ChangePasswordDto) {
    return this.usersService.changePassword(req.user, dto, req.user.jti);
  }

  // Bước 1 đổi email: gửi OTP xác minh đến địa chỉ email mới
  @Post('change-email/request')
  requestChangeEmail(@Request() req, @Body() dto: RequestChangeEmailDto) {
    return this.usersService.requestChangeEmail(req.user, dto);
  }

  // Gửi lại OTP đổi email nếu chưa nhận được
  @Post('change-email/resend')
  resendChangeEmailOtp(@Request() req, @Body() dto: RequestChangeEmailDto) {
    return this.usersService.requestChangeEmail(req.user, dto);
  }

  // Bước 2 đổi email: xác minh OTP rồi cập nhật email mới vào DB
  @Post('change-email/confirm')
  confirmChangeEmail(@Request() req, @Body() dto: ConfirmChangeEmailDto) {
    return this.usersService.confirmChangeEmail(req.user, dto);
  }

  // Cập nhật cài đặt quyền riêng tư (public / private)
  @Patch('privacy')
  updatePrivacy(@Request() req, @Body() dto: UpdatePrivacyDto) {
    return this.usersService.updatePrivacy(req.user, dto);
  }

  // Xóa tài khoản: cần xác nhận mật khẩu, thực hiện soft delete
  @Delete()
  deleteAccount(@Request() req, @Body() dto: DeleteAccountDto) {
    return this.usersService.deleteAccount(req.user, dto, req.user.jti);
  }
}
