import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
} from '@nestjs/common';
import { MediaService } from './media.service';
@Controller('internal/media')
export class InternalMediaController {
  constructor(private readonly media: MediaService) {}
  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.media.findOne(id);
  }
}
