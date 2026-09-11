import { Global, Module } from '@nestjs/common';
import { ContentPresenter } from './content-presenter';
import { MediaReferenceService } from './media-reference.service';

@Global()
@Module({
  providers: [ContentPresenter, MediaReferenceService],
  exports: [ContentPresenter, MediaReferenceService],
})
export class ContentModule {}
