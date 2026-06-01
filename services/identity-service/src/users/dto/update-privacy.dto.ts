import { IsEnum } from 'class-validator';
import { Privacy } from '../user.entity';

export class UpdatePrivacyDto {
  @IsEnum(Privacy)
  privacy: Privacy;
}
