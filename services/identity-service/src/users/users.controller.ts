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

@UseGuards(JwtAuthGuard)
@Controller('users/me')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  getProfile(@Request() req) {
    return this.usersService.getProfile(req.user);
  }

  @Patch('profile')
  updateProfile(@Request() req, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(req.user, dto);
  }

  @Patch('avatar')
  @UseInterceptors(
    FileInterceptor('avatar', {
      limits: { fileSize: 5 * 1024 * 1024 },
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

  @Patch('change-password')
  changePassword(@Request() req, @Body() dto: ChangePasswordDto) {
    return this.usersService.changePassword(req.user, dto, req.user.jti);
  }

  @Post('change-email/request')
  requestChangeEmail(@Request() req, @Body() dto: RequestChangeEmailDto) {
    return this.usersService.requestChangeEmail(req.user, dto);
  }

  @Post('change-email/resend')
  resendChangeEmailOtp(@Request() req, @Body() dto: RequestChangeEmailDto) {
    return this.usersService.requestChangeEmail(req.user, dto);
  }

  @Post('change-email/confirm')
  confirmChangeEmail(@Request() req, @Body() dto: ConfirmChangeEmailDto) {
    return this.usersService.confirmChangeEmail(req.user, dto);
  }

  @Patch('privacy')
  updatePrivacy(@Request() req, @Body() dto: UpdatePrivacyDto) {
    return this.usersService.updatePrivacy(req.user, dto);
  }

  @Delete()
  deleteAccount(@Request() req, @Body() dto: DeleteAccountDto) {
    return this.usersService.deleteAccount(req.user, dto, req.user.jti);
  }
}
