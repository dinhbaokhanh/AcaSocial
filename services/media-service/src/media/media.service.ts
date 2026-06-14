import * as crypto from 'crypto';
import {
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CloudinaryService } from './cloudinary.service';
import { MediaResponseDto } from './dto/media-response.dto';
import { UploadMediaDto } from './dto/upload-media.dto';
import { MediaAsset } from './media.entity';

/**
 * MediaService xử lý toàn bộ business logic của media upload/query/delete.
 *
 * 5 vấn đề được giải quyết trong service này:
 *
 * [FIX-1] Ownership check trong delete()
 *   DELETE chỉ check JWT hợp lệ (ở gateway) là chưa đủ.
 *   Service phải verify uploadedBy === userId trước khi xóa.
 *   Admin/Moderator có thể bypass để kiểm duyệt nội dung.
 *
 * [FIX-2] UUID làm path param, không dùng publicId
 *   Cloudinary public_id chứa dấu "/" gây lỗi URL parse.
 *   Tất cả API dùng internal UUID (id), service tự lookup publicId từ DB.
 *
 * [FIX-3] SHA-256 idempotency trong upload()
 *   Hash file buffer trước khi upload, check trùng trong DB.
 *   Cùng file → trả record cũ, không tốn Cloudinary storage.
 *
 * [FIX-4] Cloudinary-first, DB-second để tránh orphan record
 *   Ghi DB chỉ sau khi Cloudinary upload thành công.
 *   Nếu Cloudinary fail → throw exception, DB sạch.
 *
 * [FIX-5] Soft delete với đầy đủ audit trail
 *   deletedAt + deletedBy thay vì hard delete.
 *   Ai xóa, lúc nào, đều được ghi lại.
 */
@Injectable()
export class MediaService {
  constructor(
    @InjectRepository(MediaAsset)
    private mediaRepo: Repository<MediaAsset>,
    private cloudinaryService: CloudinaryService,
  ) {}

  // ─────────────────────────────────────────────
  //  UPLOAD
  // ─────────────────────────────────────────────

  /**
   * Upload file lên Cloudinary và lưu metadata vào DB.
   *
   * Thứ tự xử lý quan trọng:
   * 1. Hash → check duplicate (tránh lãng phí storage)
   * 2. Upload Cloudinary (có thể fail)
   * 3. Ghi DB (chỉ sau khi step 2 thành công)
   *
   * @param file   - File từ multer (đã qua FileValidationPipe)
   * @param dto    - Chứa category
   * @param userId - UUID từ X-User-ID header (Gateway inject sau khi verify JWT)
   */
  async upload(
    file: Express.Multer.File,
    dto: UploadMediaDto,
    userId: string,
  ): Promise<MediaResponseDto> {
    // [FIX-3] Tính SHA-256 hash của content — không phải filename
    // content hash đảm bảo cùng file dù đổi tên vẫn bị detect là duplicate
    const sha256Hash = crypto
      .createHash('sha256')
      .update(file.buffer)
      .digest('hex');

    // [FIX-3] Check duplicate: nếu đã có record active với hash này → trả lại record cũ
    const existing = await this.mediaRepo.findOne({
      where: { sha256Hash },
    });
    if (existing && !existing.deletedAt) {
      // Idempotent: cùng file upload lại → cùng kết quả, không tốn storage
      return this.toDto(existing);
    }

    // [FIX-4] Upload Cloudinary TRƯỚC — nếu fail thì không ghi DB
    let cloudinaryResult: Awaited<ReturnType<CloudinaryService['upload']>>;
    try {
      cloudinaryResult = await this.cloudinaryService.upload(file.buffer, dto.category);
    } catch (err) {
      // Re-throw rõ ràng với message giải thích — không để lộ internal error
      throw new InternalServerErrorException(
        'Không thể upload file lên CDN. Vui lòng thử lại. Không có thay đổi nào được lưu.',
      );
    }

    // [FIX-4] Chỉ ghi DB sau khi Cloudinary xác nhận thành công
    const asset = this.mediaRepo.create({
      publicId:   cloudinaryResult.public_id,
      secureUrl:  cloudinaryResult.secure_url,
      format:     cloudinaryResult.format,
      mimeType:   file.mimetype,
      category:   dto.category,
      sizeBytes:  file.size,
      sha256Hash,
      uploadedBy: userId,
    });

    const saved = await this.mediaRepo.save(asset);
    return this.toDto(saved);
  }

  // ─────────────────────────────────────────────
  //  GET METADATA
  // ─────────────────────────────────────────────

  /**
   * Lấy metadata của một media asset theo internal UUID.
   * Chỉ trả về asset chưa bị xóa (deletedAt IS NULL).
   *
   * Lý do có endpoint này dù Cloudinary URL đã public:
   * Client cần biết uploadedBy, category, sizeBytes, createdAt để hiển thị
   * thông tin chi tiết — những thứ không có trong Cloudinary URL.
   */
  async findOne(id: string): Promise<MediaResponseDto> {
    const asset = await this.mediaRepo.findOne({ where: { id } });

    if (!asset || asset.deletedAt) {
      throw new NotFoundException(`Media với id "${id}" không tồn tại hoặc đã bị xóa`);
    }

    return this.toDto(asset);
  }

  // ─────────────────────────────────────────────
  //  DELETE (SOFT)
  // ─────────────────────────────────────────────

  /**
   * Xóa mềm media asset.
   *
   * Thứ tự:
   * 1. Lookup bằng UUID (không phải publicId — xem FIX-2)
   * 2. Check ownership — chỉ chủ file, admin, hoặc moderator mới xóa được
   * 3. Xóa file trên Cloudinary
   * 4. Ghi soft delete vào DB với đầy đủ audit trail
   *
   * @param id       - Internal UUID của media asset
   * @param userId   - UUID từ X-User-ID header
   * @param userRole - Role từ X-User-Role header (để admin bypass ownership check)
   */
  async delete(
    id: string,
    userId: string,
    userRole: string,
  ): Promise<{ message: string }> {
    // [FIX-2] Lookup bằng UUID — không bao giờ dùng publicId làm path param
    const asset = await this.mediaRepo.findOne({ where: { id } });

    if (!asset || asset.deletedAt) {
      throw new NotFoundException(`Media với id "${id}" không tồn tại hoặc đã bị xóa`);
    }

    // [FIX-1] Ownership check
    // Chủ file có thể xóa file của mình.
    // Admin và Moderator có thể xóa file của bất kỳ ai (kiểm duyệt nội dung vi phạm).
    const isOwner    = asset.uploadedBy === userId;
    const isPrivileged = userRole === 'admin' || userRole === 'moderator';

    if (!isOwner && !isPrivileged) {
      throw new ForbiddenException('Bạn không có quyền xóa file này');
    }

    // Xóa trên Cloudinary trước — nếu fail thì abort, DB vẫn còn record
    // (ngược với upload: ở đây Cloudinary-first để tránh ghost DB record sau khi CDN đã xóa)
    await this.cloudinaryService.destroy(asset.publicId, asset.category);

    // [FIX-5] Soft delete: ghi lại ai xóa và lúc nào — không xóa bản ghi
    asset.deletedAt = new Date();
    asset.deletedBy = userId;
    await this.mediaRepo.save(asset);

    return { message: 'Xóa file thành công' };
  }

  // ─────────────────────────────────────────────
  //  Private Helpers
  // ─────────────────────────────────────────────

  /**
   * Map entity → DTO: chỉ expose những field client cần.
   * publicId và sha256Hash được ẩn đi có chủ đích (implementation details).
   */
  private toDto(asset: MediaAsset): MediaResponseDto {
    return {
      id:         asset.id,
      secureUrl:  asset.secureUrl,
      format:     asset.format,
      mimeType:   asset.mimeType,
      category:   asset.category,
      sizeBytes:  asset.sizeBytes,
      uploadedBy: asset.uploadedBy,
      createdAt:  asset.createdAt,
    };
  }
}
