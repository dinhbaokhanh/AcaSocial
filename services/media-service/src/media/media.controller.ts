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
import {
  ApiBody,
  ApiConsumes,
  ApiHeader,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';
import * as multer from 'multer';
import { MediaCategory } from './media.entity';
import { MediaResponseDto } from './dto/media-response.dto';
import { MediaService } from './media.service';
import { FileValidationPipe, MAX_FILE_SIZE_BYTES } from './pipes/file-validation.pipe';
import { UploadMediaDto } from './dto/upload-media.dto';

@ApiTags('Media')
@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('upload')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: multer.memoryStorage(),
      limits: { fileSize: MAX_FILE_SIZE_BYTES, files: 1 },
      fileFilter: (_req, file, cb) => {
        if (!file) {
          cb(new BadRequestException('Không có file nào được gửi lên'), false);
          return;
        }
        cb(null, true);
      },
    }),
  )
  @ApiSecurity('x-user-id')
  @ApiOperation({ summary: 'Upload file', description: 'Upload ảnh, tài liệu hoặc code lên Cloudinary. Request phải có header X-User-ID (inject bởi Gateway).' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'category'],
      properties: {
        file: { type: 'string', format: 'binary', description: 'File cần upload (tối đa 10MB)' },
        category: { type: 'string', enum: Object.values(MediaCategory), example: 'image' },
      },
    },
  })
  @ApiHeader({ name: 'x-user-id', description: 'UUID của user (inject bởi API Gateway)', required: true })
  @ApiResponse({ status: 201, description: 'Upload thành công.', type: MediaResponseDto })
  @ApiResponse({ status: 400, description: 'File không hợp lệ (sai định dạng, vượt 10MB, thiếu category).' })
  async upload(@Req() req: Request, @UploadedFile() file: Express.Multer.File) {
    const categoryRaw = req.body?.category as string;

    if (!Object.values(MediaCategory).includes(categoryRaw as MediaCategory)) {
      throw new BadRequestException(
        `category không hợp lệ. Chỉ chấp nhận: ${Object.values(MediaCategory).join(', ')}`,
      );
    }
    const category = categoryRaw as MediaCategory;

    const validationPipe = new FileValidationPipe(category);
    const validatedFile = validationPipe.transform(file);

    const dto: UploadMediaDto = { category };
    const userId = req.headers['x-user-id'] as string;

    return this.mediaService.upload(validatedFile, dto, userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy thông tin media', description: 'Endpoint public — không cần JWT. Trả về metadata, không trả về nội dung file.' })
  @ApiParam({ name: 'id', description: 'UUID của media asset', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @ApiResponse({ status: 200, description: 'Trả về MediaResponseDto.', type: MediaResponseDto })
  @ApiResponse({ status: 404, description: 'Media không tồn tại hoặc đã bị xóa.' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.mediaService.findOne(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiSecurity('x-user-id')
  @ApiSecurity('x-user-role')
  @ApiOperation({ summary: 'Xóa media', description: 'Soft delete. Chỉ chủ file hoặc admin/moderator mới được xóa. File bị xóa khỏi Cloudinary ngay lập tức.' })
  @ApiParam({ name: 'id', description: 'UUID của media asset' })
  @ApiHeader({ name: 'x-user-id', description: 'UUID của user (inject bởi API Gateway)', required: true })
  @ApiHeader({ name: 'x-user-role', description: 'Role của user: student | teacher | moderator | admin', required: false })
  @ApiResponse({ status: 200, description: 'Xóa thành công.' })
  @ApiResponse({ status: 403, description: 'Không có quyền xóa file này.' })
  @ApiResponse({ status: 404, description: 'Media không tồn tại hoặc đã bị xóa.' })
  delete(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    const userId = req.headers['x-user-id'] as string;
    const userRole = req.headers['x-user-role'] as string ?? '';
    return this.mediaService.delete(id, userId, userRole);
  }
}
