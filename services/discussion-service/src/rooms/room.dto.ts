import { Transform, Type } from 'class-transformer';
import {
  IsDate,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  IsInt,
  Min,
  Max,
  Length,
  Matches,
  ValidateIf,
} from 'class-validator';
import { PostingPolicy, RoomType, RoomVisibility } from './room.entity';

export class CreateRoomDto {
  @IsOptional() @IsEnum(['direct', 'approval']) reviewPolicy?:
    'direct' | 'approval';
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsString()
  @Length(3, 100)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  slug: string;
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(3, 200)
  name: string;
  @IsOptional() @IsString() @Length(0, 10000) description?: string;
  @IsEnum(RoomType) roomType: RoomType;
  @ValidateIf((_, value) => value !== undefined && value !== null)
  @IsUUID()
  parentRoomId?: string | null;
  @ValidateIf((_, value) => value !== undefined && value !== null)
  @IsUUID()
  majorId?: string | null;
  @ValidateIf((_, value) => value !== undefined && value !== null)
  @IsUUID()
  curriculumCourseId?: string | null;
  @IsOptional() @IsEnum(RoomVisibility) visibility?: RoomVisibility;
  @IsOptional() @IsEnum(PostingPolicy) postingPolicy?: PostingPolicy;
  @IsOptional()
  @IsEnum(['open', 'approval', 'invite_only'])
  membershipPolicy?: 'open' | 'approval' | 'invite_only';
  @IsOptional() @Type(() => Date) @IsDate() startAt?: Date;
  @IsOptional() @Type(() => Date) @IsDate() endAt?: Date;
}

export class JoinRoomDto {
  @IsOptional() @IsString() message?: string;
}

export class CreateRoomRuleDto {
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsString()
  @Length(2, 40)
  @Matches(/^[A-Z0-9_-]+$/)
  ruleCode: string;
  @IsString() @Length(3, 160) title: string;
  @IsString() @Length(10, 5000) description: string;
  @IsEnum(['low', 'medium', 'high']) severity: 'low' | 'medium' | 'high';
}

export class UpdateMembershipDto {
  @IsOptional()
  @IsEnum(['inherit', 'direct', 'approval', 'blocked'])
  postPermission?: 'inherit' | 'direct' | 'approval' | 'blocked';
  @IsEnum(['owner', 'moderator', 'contributor', 'member'])
  role: 'owner' | 'moderator' | 'contributor' | 'member';
  @IsEnum(['pending', 'active', 'muted', 'banned', 'left'])
  status: 'pending' | 'active' | 'muted' | 'banned' | 'left';
}

export class UpdateRoomPolicyDto {
  @IsEnum(['direct', 'approval']) reviewPolicy: 'direct' | 'approval';
  @IsOptional() @IsBoolean() policyLocked?: boolean;
}

export class UpdateRoomStatusDto {
  @IsEnum(['active', 'read_only', 'archived']) status:
    'active' | 'read_only' | 'archived';
}
