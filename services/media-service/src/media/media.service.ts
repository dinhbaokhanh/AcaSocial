import * as crypto from 'crypto';
import { extname } from 'path';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CloudinaryService } from './cloudinary.service';
import { MediaResponseDto } from './dto/media-response.dto';
import { UploadMediaDto } from './dto/upload-media.dto';
import { MediaAsset } from './media.entity';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MediaService {
  constructor(
    @InjectRepository(MediaAsset)
    private mediaRepo: Repository<MediaAsset>,
    private cloudinaryService: CloudinaryService,
    private readonly config: ConfigService,
  ) {}

  async upload(
    file: Express.Multer.File,
    dto: UploadMediaDto,
    userId: string,
  ): Promise<MediaResponseDto> {
    // Hash theo content (không phải tên file) để detect duplicate dù đổi tên
    const sha256Hash = crypto
      .createHash('sha256')
      .update(userId + '\0')
      .update(file.buffer)
      .digest('hex');

    // Nếu file đã tồn tại và chưa bị xóa → trả lại record cũ, không upload lại
    const existing = await this.mediaRepo.findOne({
      where: { sha256Hash, uploadedBy: userId },
    });
    if (existing && !existing.deletedAt) {
      return this.toDto(existing);
    }

    // Upload Cloudinary trước — nếu fail thì không ghi DB để tránh orphan record
    let cloudinaryResult: Awaited<ReturnType<CloudinaryService['upload']>>;
    try {
      cloudinaryResult = await this.cloudinaryService.upload(
        file.buffer,
        dto.category,
      );
    } catch (err) {
      throw new InternalServerErrorException(
        'Không thể upload file lên CDN. Vui lòng thử lại.',
      );
    }

    const asset = this.mediaRepo.create({
      originalName: file.originalname.slice(0, 255),
      publicId: cloudinaryResult.public_id,
      secureUrl: cloudinaryResult.secure_url,
      format:
        cloudinaryResult.format ||
        extname(file.originalname).slice(1, 21).toLowerCase() ||
        'bin',
      mimeType: file.mimetype,
      category: dto.category,
      sizeBytes: file.size,
      sha256Hash,
      uploadedBy: userId,
    });

    const saved = await this.mediaRepo.save(asset);
    return this.toDto(saved);
  }

  async findOne(id: string): Promise<MediaResponseDto> {
    const asset = await this.mediaRepo.findOne({ where: { id } });

    if (!asset || asset.deletedAt) {
      throw new NotFoundException(
        `Media với id "${id}" không tồn tại hoặc đã bị xóa`,
      );
    }

    return this.toDto(asset);
  }

  async delete(
    id: string,
    userId: string,
    userRole: string,
  ): Promise<{ message: string }> {
    const asset = await this.mediaRepo.findOne({ where: { id } });

    if (!asset || asset.deletedAt) {
      throw new NotFoundException(
        `Media với id "${id}" không tồn tại hoặc đã bị xóa`,
      );
    }

    // Chỉ chủ file, admin hoặc moderator mới được xóa
    const isOwner = asset.uploadedBy === userId;
    const isPrivileged = userRole === 'admin' || userRole === 'moderator';

    if (!isOwner && !isPrivileged) {
      throw new ForbiddenException('Bạn không có quyền xóa file này');
    }

    let usage: Response;
    try {
      usage = await fetch(
        `${this.config.get('DISCUSSION_SERVICE_URL', 'http://localhost:8084')}/internal/attachments/${id}/usage`,
        {
          headers: {
            'X-Internal-Token': this.config.get('INTERNAL_SERVICE_TOKEN', ''),
          },
          signal: AbortSignal.timeout(3000),
        },
      );
    } catch {
      throw new ServiceUnavailableException('Cannot verify attachment usage');
    }
    if (!usage.ok)
      throw new ServiceUnavailableException('Cannot verify attachment usage');
    const references = (await usage.json()) as { count: number };
    if (references.count > 0)
      throw new BadRequestException(
        'Remove this file from its posts before deleting it',
      );
    await this.cloudinaryService.destroy(asset.publicId, asset.category);

    // Soft delete: ghi lại ai xóa và lúc nào thay vì xóa bản ghi
    asset.deletedAt = new Date();
    asset.deletedBy = userId;
    await this.mediaRepo.save(asset);

    return { message: 'Xóa file thành công' };
  }

  // Chỉ expose field cần thiết, ẩn publicId và sha256Hash
  private toDto(asset: MediaAsset): MediaResponseDto {
    return {
      id: asset.id,
      originalName: asset.originalName,
      secureUrl: asset.secureUrl,
      format: asset.format,
      mimeType: asset.mimeType,
      category: asset.category,
      sizeBytes: asset.sizeBytes,
      uploadedBy: asset.uploadedBy,
      createdAt: asset.createdAt,
    };
  }
}
