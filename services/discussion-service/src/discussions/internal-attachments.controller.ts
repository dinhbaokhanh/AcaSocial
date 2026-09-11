import {
  Controller,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { timingSafeEqual } from 'crypto';
@Controller('internal/attachments')
export class InternalAttachmentsController {
  constructor(
    private readonly db: DataSource,
    private readonly config: ConfigService,
  ) {}
  @Get(':id/usage')
  async usage(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-internal-token') token: string,
  ) {
    const expected = this.config.get<string>('INTERNAL_SERVICE_TOKEN');
    if (
      !expected ||
      typeof token !== 'string' ||
      Buffer.byteLength(token) !== Buffer.byteLength(expected) ||
      !timingSafeEqual(Buffer.from(token), Buffer.from(expected))
    )
      throw new ForbiddenException();
    const rows = await this.db.query(
      'SELECT count(*)::int AS count FROM discussion_media dm JOIN discussions d ON d.id=dm.discussion_id WHERE dm.media_id=$1 AND d.deleted_at IS NULL',
      [id],
    );
    return { count: rows[0].count };
  }
}
