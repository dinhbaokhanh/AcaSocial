import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ConfirmChangeEmailDto, RequestChangeEmailDto } from './dto/change-email.dto';
import { DeleteAccountDto } from './dto/delete-account.dto';
import { UpdateAvatarDto } from './dto/update-avatar.dto';
import { UpdatePrivacyDto } from './dto/update-privacy.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UsersService } from './users.service';

@ApiTags('Users')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('users/me')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy thông tin cá nhân' })
  @ApiResponse({ status: 200, description: 'Trả về UserProfileDto của user hiện tại.' })
  getProfile(@Request() req) {
    return this.usersService.getProfile(req.user);
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Cập nhật họ tên và ngày sinh' })
  @ApiResponse({ status: 200, description: 'Trả về profile đã cập nhật.' })
  updateProfile(@Request() req, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(req.user, dto);
  }

  @Patch('avatar')
  @ApiOperation({ summary: 'Cập nhật ảnh đại diện', description: 'Truyền URL ảnh đã upload qua media-service.' })
  @ApiResponse({ status: 200, description: 'Trả về profile với avatarUrl mới.' })
  updateAvatar(@Request() req, @Body() dto: UpdateAvatarDto) {
    return this.usersService.updateAvatar(req.user, dto.avatarUrl);
  }

  @Patch('change-password')
  @ApiOperation({ summary: 'Đổi mật khẩu', description: 'Yêu cầu mật khẩu hiện tại. Sau khi thành công, toàn bộ phiên đăng nhập bị thu hồi.' })
  @ApiResponse({ status: 200, description: 'Đổi mật khẩu thành công.' })
  @ApiResponse({ status: 400, description: 'Mật khẩu hiện tại sai hoặc mật khẩu mới không khớp.' })
  changePassword(@Request() req, @Body() dto: ChangePasswordDto) {
    return this.usersService.changePassword(req.user, dto, req.user.jti);
  }

  @Post('change-email/request')
  @ApiOperation({ summary: 'Yêu cầu đổi email (bước 1)', description: 'Gửi OTP xác minh đến email mới.' })
  @ApiResponse({ status: 200, description: 'OTP đã gửi đến email mới.' })
  @ApiResponse({ status: 409, description: 'Email mới đã được sử dụng.' })
  requestChangeEmail(@Request() req, @Body() dto: RequestChangeEmailDto) {
    return this.usersService.requestChangeEmail(req.user, dto);
  }

  @Post('change-email/resend')
  @ApiOperation({ summary: 'Gửi lại OTP đổi email' })
  resendChangeEmailOtp(@Request() req, @Body() dto: RequestChangeEmailDto) {
    return this.usersService.requestChangeEmail(req.user, dto);
  }

  @Post('change-email/confirm')
  @ApiOperation({ summary: 'Xác nhận đổi email (bước 2)', description: 'Xác minh OTP để cập nhật email mới.' })
  @ApiResponse({ status: 200, description: 'Email đã được cập nhật.' })
  @ApiResponse({ status: 400, description: 'OTP sai hoặc đã hết hạn.' })
  confirmChangeEmail(@Request() req, @Body() dto: ConfirmChangeEmailDto) {
    return this.usersService.confirmChangeEmail(req.user, dto);
  }

  @Patch('privacy')
  @ApiOperation({ summary: 'Cập nhật chế độ riêng tư', description: '"public" cho phép mọi người xem hồ sơ, "private" chỉ bản thân.' })
  @ApiResponse({ status: 200, description: 'Cài đặt riêng tư đã được cập nhật.' })
  updatePrivacy(@Request() req, @Body() dto: UpdatePrivacyDto) {
    return this.usersService.updatePrivacy(req.user, dto);
  }

  @Delete()
  @ApiOperation({ summary: 'Xóa tài khoản', description: 'Soft delete. Yêu cầu xác nhận mật khẩu. Toàn bộ phiên đăng nhập bị thu hồi.' })
  @ApiResponse({ status: 200, description: 'Tài khoản đã bị xóa.' })
  @ApiResponse({ status: 401, description: 'Mật khẩu xác nhận không đúng.' })
  deleteAccount(@Request() req, @Body() dto: DeleteAccountDto) {
    return this.usersService.deleteAccount(req.user, dto, req.user.jti);
  }
}
