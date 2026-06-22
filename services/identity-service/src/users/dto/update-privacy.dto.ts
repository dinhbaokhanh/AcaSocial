import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { Privacy } from '../user.entity';

export class UpdatePrivacyDto {
  @ApiProperty({ enum: Privacy, example: Privacy.PUBLIC, description: '"public" hoặc "private"' })
  @IsEnum(Privacy)
  privacy: Privacy;
}
