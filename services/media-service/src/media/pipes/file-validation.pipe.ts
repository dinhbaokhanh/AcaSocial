import {
  BadRequestException,
  Injectable,
  PipeTransform,
} from '@nestjs/common';
import * as path from 'path';
import { MediaCategory } from '../media.entity';

/*
 * Validate file theo 2 lớp: extension whitelist → MIME type whitelist.
 *
 * Ngoại lệ category CODE: bỏ qua MIME check vì browser/OS gán MIME
 * không nhất quán cho source code (.ts → 'video/mp2t', .py → 'text/plain'...).
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
  [MediaCategory.CODE]: [], // không check MIME cho code file
};

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

@Injectable()
export class FileValidationPipe implements PipeTransform {
  constructor(private readonly category: MediaCategory) {}

  transform(file: Express.Multer.File): Express.Multer.File {
    if (!file) {
      throw new BadRequestException('Không có file nào được gửi lên');
    }

    // Lớp 1: extension
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExt = ALLOWED_EXTENSIONS[this.category];
    if (!allowedExt.includes(ext)) {
      throw new BadRequestException(
        `Extension "${ext}" không hợp lệ cho category "${this.category}". ` +
        `Chỉ chấp nhận: ${allowedExt.join(', ')}`,
      );
    }

    // Lớp 2: MIME type (bỏ qua cho CODE)
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
