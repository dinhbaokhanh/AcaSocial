import {
  Controller,
  Get,
  Headers,
  ForbiddenException,
  Param,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'crypto';
import { MediaService } from './media.service';
@Controller('internal/media')
export class InternalMediaController {
  constructor(
    private readonly media: MediaService,
    private readonly config: ConfigService,
  ) {}
  @Get(':id')
  get(
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
    return this.media.findOne(id);
  }
}
