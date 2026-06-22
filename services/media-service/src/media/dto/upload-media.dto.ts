import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { MediaCategory } from '../media.entity';

export class UploadMediaDto {
  @ApiProperty({
    enum: MediaCategory,
    example: MediaCategory.IMAGE,
    description: 'Loại file: image | document | code',
  })
  @IsEnum(MediaCategory, {
    message: `category phải là một trong: ${Object.values(MediaCategory).join(', ')}`,
  })
  category: MediaCategory;
}
