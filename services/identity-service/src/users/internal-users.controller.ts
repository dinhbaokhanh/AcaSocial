import {
  Body,
  Controller,
  Get,
  Post,
  NotFoundException,
  Param,
  ParseUUIDPipe,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { User } from './user.entity';
import { DisplayUsersDto } from './dto/display-users.dto';

// Protected by the global InternalTokenGuard; deliberately not routed by Gateway.
@Controller('internal/users')
export class InternalUsersController {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  @Post('display')
  displayMany(@Body() dto: DisplayUsersDto) {
    if (!dto.ids.length) return [];
    return this.users.find({
      where: { id: In(dto.ids) },
      select: {
        id: true,
        username: true,
        fullName: true,
        avatarUrl: true,
        role: true,
      },
    });
  }

  @Get(':id/display')
  async display(@Param('id', ParseUUIDPipe) id: string) {
    const user = await this.users.findOne({
      where: { id },
      select: { id: true, fullName: true, username: true },
    });
    if (!user) throw new NotFoundException('User not found');
    return { displayName: user.fullName || user.username };
  }
}
