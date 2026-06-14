import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';
import * as multer from 'multer';
import { MediaCategory } from './media.entity';
import { MediaService } from './media.service';
import { FileValidationPipe, MAX_FILE_SIZE_BYTES } from './pipes/file-validation.pipe';
import { UploadMediaDto } from './dto/upload-media.dto';

@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('upload')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: multer.memoryStorage(), // giữ trong RAM, stream thẳng lên Cloudinary
      limits: {
        fileSize: MAX_FILE_SIZE_BYTES, // 10MB
        files: 1,
      },
      fileFilter: (_req, file, cb) => {
        if (!file) {
          cb(new BadRequestException('Không có file nào được gửi lên'), false);
          return;
        }
        cb(null, true);
      },
    }),
  )
  async upload(
    @Req() req: Request,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const categoryRaw = req.body?.category as string;

    if (!Object.values(MediaCategory).includes(categoryRaw as MediaCategory)) {
      throw new BadRequestException(
        `category không hợp lệ. Chỉ chấp nhận: ${Object.values(MediaCategory).join(', ')}`,
      );
    }
    const category = categoryRaw as MediaCategory;

    // Khởi tạo thủ công vì cần truyền category động vào pipe
    const validationPipe = new FileValidationPipe(category);
    const validatedFile  = validationPipe.transform(file);

    const dto: UploadMediaDto = { category };

    // X-User-ID được Gateway inject sau khi verify JWT
    const userId = req.headers['x-user-id'] as string;

    return this.mediaService.upload(validatedFile, dto, userId);
  }

  // Public endpoint — không cần JWT, chỉ lấy metadata từ DB
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.mediaService.findOne(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  delete(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request,
  ) {
    const userId   = req.headers['x-user-id']  as string;
    const userRole = req.headers['x-user-role'] as string ?? '';

    return this.mediaService.delete(id, userId, userRole);
  }
}
