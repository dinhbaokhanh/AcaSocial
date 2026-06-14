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

/**
 * MediaController — xử lý 3 endpoint:
 *
 * POST   /media/upload    — Upload file (yêu cầu JWT, mọi role đều được)
 * GET    /media/:id       — Lấy metadata (public, không cần JWT)
 * DELETE /media/:id       — Xóa mềm (yêu cầu JWT, phải là chủ file hoặc admin/moderator)
 *
 * X-User-ID và X-User-Role được inject bởi Gateway sau khi verify JWT.
 * Service này KHÔNG tự verify JWT — đó là trách nhiệm của Gateway.
 * Đây là pattern đúng trong microservices: trust internal headers from gateway.
 */
@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  // ─────────────────────────────────────────────
  //  POST /media/upload
  // ─────────────────────────────────────────────

  /**
   * Upload một file lên CDN.
   *
   * Request format: multipart/form-data
   *   - file     : binary file field
   *   - category : 'image' | 'document' | 'code'
   *
   * Thứ tự middleware:
   * 1. FileInterceptor parse multipart, giữ file trong RAM (memoryStorage)
   * 2. FileValidationPipe validate extension + MIME type
   * 3. Service xử lý: hash → duplicate check → upload Cloudinary → ghi DB
   */
  @Post('upload')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor('file', {
      /**
       * memoryStorage: file buffer giữ trong RAM, không ghi disk.
       * Lý do chọn: không cần disk I/O, buffer thẳng lên Cloudinary stream.
       * Trade-off: tăng RAM usage → giảm nhẹ bằng giới hạn fileSize 10MB.
       */
      storage: multer.memoryStorage(),
      limits: {
        fileSize: MAX_FILE_SIZE_BYTES, // 10MB
        files: 1,                       // Chỉ 1 file mỗi request
      },
      fileFilter: (_req, file, cb) => {
        // multer fileFilter chỉ check sự tồn tại của file
        // Validation thực sự được thực hiện trong FileValidationPipe
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
    // Đọc category từ body (form-data field)
    const categoryRaw = req.body?.category as string;

    // Validate category trước khi tạo DTO
    if (!Object.values(MediaCategory).includes(categoryRaw as MediaCategory)) {
      throw new BadRequestException(
        `category không hợp lệ. Chỉ chấp nhận: ${Object.values(MediaCategory).join(', ')}`,
      );
    }
    const category = categoryRaw as MediaCategory;

    // Chạy FileValidationPipe thủ công (cần truyền category động)
    const validationPipe = new FileValidationPipe(category);
    const validatedFile  = validationPipe.transform(file);

    const dto: UploadMediaDto = { category };

    // X-User-ID đã được Gateway inject sau khi verify JWT
    const userId = req.headers['x-user-id'] as string;

    return this.mediaService.upload(validatedFile, dto, userId);
  }

  // ─────────────────────────────────────────────
  //  GET /media/:id
  // ─────────────────────────────────────────────

  /**
   * Lấy metadata của một media asset.
   *
   * Public endpoint — không cần JWT.
   * Lý do: Cloudinary URL đã public, nhưng metadata (uploadedBy, category, size)
   * cần được truy vấn riêng qua DB.
   *
   * ParseUUIDPipe tự validate :id là UUID hợp lệ → 400 nếu không phải UUID.
   * Điều này ngăn SQL injection và request rác trước khi vào service.
   */
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.mediaService.findOne(id);
  }

  // ─────────────────────────────────────────────
  //  DELETE /media/:id
  // ─────────────────────────────────────────────

  /**
   * Xóa mềm một media asset.
   *
   * Yêu cầu JWT (được check ở Gateway, không ở đây).
   * Service kiểm tra ownership: chỉ chủ file hoặc admin/moderator mới xóa được.
   *
   * :id là internal UUID — không phải Cloudinary publicId.
   * Lý do: publicId chứa dấu "/" gây lỗi URL encode/decode.
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  delete(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request,
  ) {
    const userId   = req.headers['x-user-id']   as string;
    const userRole = req.headers['x-user-role']  as string ?? '';

    return this.mediaService.delete(id, userId, userRole);
  }
}
