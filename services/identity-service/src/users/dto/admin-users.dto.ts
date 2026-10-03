import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Length, Max, Min } from 'class-validator';
import { Role } from '../user.entity';

export class AdminUserListDto {
  @Type(() => Number) @IsInt() @Min(1) page = 1;
  @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsEnum(Role) role?: Role;
}

export class ChangeUserRoleDto {
  @IsEnum(Role) role: Role;
  @IsString() @Length(5, 500) reason: string;
}
