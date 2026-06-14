import { IsEnum } from 'class-validator';
import { MediaCategory } from '../media.entity';

/**
 * UploadMediaDto nhận category từ multipart form-data field.
 * File binary được xử lý riêng bởi FileInterceptor, không nằm trong DTO này.
 */
export class UploadMediaDto {
  @IsEnum(MediaCategory, {
    message: `category phải là một trong: ${Object.values(MediaCategory).join(', ')}`,
  })
  category: MediaCategory;
}
