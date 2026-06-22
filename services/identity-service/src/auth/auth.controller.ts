import {
  Body,
  Controller,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { IsEmail } from 'class-validator';
import { AuthService } from './auth.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { ApiProperty } from '@nestjs/swagger';

class ResendOtpDto {
  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  email: string;
}

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Đăng ký tài khoản mới', description: 'Tạo tài khoản chưa kích hoạt và gửi OTP xác thực về email.' })
  @ApiResponse({ status: 201, description: 'Đăng ký thành công, OTP đã gửi.' })
  @ApiResponse({ status: 409, description: 'Email hoặc username đã tồn tại.' })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('verify-otp')
  @ApiOperation({ summary: 'Xác minh OTP đăng ký', description: 'Kích hoạt tài khoản bằng OTP nhận qua email.' })
  @ApiResponse({ status: 200, description: 'Tài khoản đã được kích hoạt.' })
  @ApiResponse({ status: 400, description: 'OTP sai hoặc đã hết hạn.' })
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyRegisterOtp(dto);
  }

  @Post('resend-otp')
  @ApiOperation({ summary: 'Gửi lại OTP đăng ký' })
  @ApiResponse({ status: 200, description: 'OTP đã được gửi lại.' })
  resendOtp(@Body() dto: ResendOtpDto) {
    return this.authService.resendOtp(dto.email);
  }

  @Post('login')
  @ApiOperation({ summary: 'Đăng nhập', description: 'Chấp nhận email hoặc username.' })
  @ApiResponse({ status: 200, description: 'Trả về accessToken và refreshToken.' })
  @ApiResponse({ status: 401, description: 'Sai thông tin đăng nhập hoặc tài khoản chưa xác thực.' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Làm mới access token', description: 'Đổi refreshToken lấy cặp token mới. Token cũ bị thu hồi ngay.' })
  @ApiResponse({ status: 200, description: 'Trả về cặp token mới.' })
  @ApiResponse({ status: 401, description: 'Refresh token không hợp lệ hoặc đã hết hạn.' })
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Đăng xuất', description: 'Blacklist JTI của access token hiện tại và thu hồi toàn bộ refresh token.' })
  @ApiResponse({ status: 200, description: 'Đăng xuất thành công.' })
  @ApiResponse({ status: 401, description: 'Token không hợp lệ.' })
  logout(@Request() req) {
    return this.authService.logout(req.user.id, req.user.jti);
  }

  @Post('forgot-password')
  @ApiOperation({ summary: 'Quên mật khẩu (bước 1)', description: 'Gửi OTP về email để xác minh danh tính. TTL 10 phút.' })
  @ApiResponse({ status: 200, description: 'OTP đã được gửi.' })
  @ApiResponse({ status: 404, description: 'Email không tồn tại trong hệ thống.' })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Đặt lại mật khẩu (bước 2)', description: 'Xác minh OTP rồi cập nhật mật khẩu mới. Toàn bộ refresh token bị thu hồi.' })
  @ApiResponse({ status: 200, description: 'Mật khẩu đã được đặt lại.' })
  @ApiResponse({ status: 400, description: 'OTP sai hoặc đã hết hạn.' })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }
}
