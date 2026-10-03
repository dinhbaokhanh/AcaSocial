import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MailModule } from '../mail/mail.module';
import { OtpModule } from '../otp/otp.module';
import { RefreshToken } from './refresh-token.entity';
import { User } from './user.entity';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { InternalUsersController } from './internal-users.controller';
import { AdminUsersController } from './admin-users.controller';
import { UserRoleAudit } from './role-audit.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, RefreshToken, UserRoleAudit]), MailModule, OtpModule],
  controllers: [UsersController, InternalUsersController, AdminUsersController],
  providers: [UsersService],
})
export class UsersModule {}
