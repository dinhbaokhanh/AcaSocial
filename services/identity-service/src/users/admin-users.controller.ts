import { Body, Controller, ForbiddenException, Get, Param, ParseUUIDPipe, Patch, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminUserListDto, ChangeUserRoleDto } from './dto/admin-users.dto';
import { Role, User } from './user.entity';
import { UsersService } from './users.service';

@Controller('admin/users')
@UseGuards(JwtAuthGuard)
export class AdminUsersController {
  constructor(private readonly users: UsersService) {}

  private admin(req: { user: User }) {
    if (req.user.role !== Role.ADMIN) throw new ForbiddenException('Admin role required');
    return req.user;
  }

  @Get()
  list(@Request() req: { user: User }, @Query() query: AdminUserListDto) {
    this.admin(req);
    return this.users.adminList(query);
  }

  @Patch(':id/role')
  changeRole(
    @Request() req: { user: User },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ChangeUserRoleDto,
  ) {
    return this.users.changeRole(id, dto, this.admin(req));
  }

  @Get(':id/role-audits')
  audits(@Request() req: { user: User }, @Param('id', ParseUUIDPipe) id: string) {
    this.admin(req);
    return this.users.roleAudits(id);
  }
}
