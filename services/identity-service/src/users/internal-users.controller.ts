import { Controller, Get, NotFoundException, Param, ParseUUIDPipe } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';

// Protected by the global InternalTokenGuard; deliberately not routed by Gateway.
@Controller('internal/users')
export class InternalUsersController {
  constructor(@InjectRepository(User) private readonly users: Repository<User>) {}

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
