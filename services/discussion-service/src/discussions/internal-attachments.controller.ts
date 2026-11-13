import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
@Controller('internal/attachments')
export class InternalAttachmentsController {
  constructor(private readonly db: DataSource) {}
  @Get(':id/usage')
  async usage(@Param('id', ParseUUIDPipe) id: string) {
    const rows = await this.db.query(
      `SELECT ((SELECT count(*) FROM discussion_media dm JOIN discussions d ON d.id=dm.discussion_id WHERE dm.media_id=$1 AND d.deleted_at IS NULL) + (SELECT count(*) FROM discussions WHERE deleted_at IS NULL AND pending_revision->'mediaIds' @> to_jsonb(ARRAY[$1::text])))::int AS count`,
      [id],
    );
    return { count: rows[0].count };
  }
}
