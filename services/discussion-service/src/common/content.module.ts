import { Global, Module } from '@nestjs/common';
import { ContentPresenter } from './content-presenter';
import { MediaReferenceService } from './media-reference.service';
import { AcademicReferenceService } from './academic-reference.service';
import { MentionService } from './mention.service';

@Global()
@Module({
  providers: [ContentPresenter, MediaReferenceService, AcademicReferenceService, MentionService],
  exports: [ContentPresenter, MediaReferenceService, AcademicReferenceService, MentionService],
})
export class ContentModule {}
