import {
  BadRequestException,
  Injectable,
  PipeTransform,
} from '@nestjs/common';
import * as path from 'path';
import { MediaCategory } from '../media.entity';

/**
 * FileValidationPipe — validate file theo 2 lớp độc lập:
 *
 * Lớp 1: Extension whitelist
 *   Kiểm tra phần mở rộng file (từ filename gốc của client).
 *
 * Lớp 2: MIME type whitelist
 *   Kiểm tra MIME type do browser/OS gửi trong Content-Type của multipart.
 *
 * NGOẠI LỆ CODE files:
 *   Browser và OS gán MIME type tùy tiện cho source code:
 *   - .py → 'text/plain' (Windows) hoặc 'text/x-python' (Linux/Mac)
 *   - .ts → 'video/mp2t' (nhầm với MPEG-2 Transport Stream)
 *   - .go → 'text/plain' hoặc 'application/octet-stream'
 */

const ALLOWED_EXTENSIONS: Record<MediaCategory, string[]> = {
  [MediaCategory.IMAGE]:    ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
  [MediaCategory.DOCUMENT]: ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx'],
  [MediaCategory.CODE]:     [
    '.js', '.ts', '.jsx', '.tsx',
    '.py', '.java', '.go', '.rs', '.c', '.cpp', '.cs', '.rb', '.php',
    '.html', '.css', '.scss', '.less',
    '.json', '.yaml', '.yml', '.xml', '.toml',
    '.sql', '.sh', '.bash', '.zsh',
    '.md', '.txt',
  ],
};

const ALLOWED_MIMETYPES: Record<MediaCategory, string[]> = {
  [MediaCategory.IMAGE]: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
  ],
  [MediaCategory.DOCUMENT]: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  ],
  // CODE: bỏ qua MIME check — xem JSDoc bên trên
  [MediaCategory.CODE]: [],
};

/** File size giới hạn: 10MB */
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

@Injectable()
export class FileValidationPipe implements PipeTransform {
  constructor(private readonly category: MediaCategory) {}

  transform(file: Express.Multer.File): Express.Multer.File {
    if (!file) {
      throw new BadRequestException('Không có file nào được gửi lên');
    }

    // --- Lớp 1: Extension ---
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExt = ALLOWED_EXTENSIONS[this.category];
    if (!allowedExt.includes(ext)) {
      throw new BadRequestException(
        `Extension "${ext}" không được phép cho category "${this.category}". ` +
        `Chỉ chấp nhận: ${allowedExt.join(', ')}`,
      );
    }

    // --- Lớp 2: MIME type (bỏ qua cho CODE — xem lý do trong JSDoc) ---
    if (this.category !== MediaCategory.CODE) {
      const allowedMime = ALLOWED_MIMETYPES[this.category];
      if (!allowedMime.includes(file.mimetype)) {
        throw new BadRequestException(
          `MIME type "${file.mimetype}" không hợp lệ cho category "${this.category}". ` +
          `Chỉ chấp nhận: ${allowedMime.join(', ')}`,
        );
      }
    }

    return file;
  }
}
