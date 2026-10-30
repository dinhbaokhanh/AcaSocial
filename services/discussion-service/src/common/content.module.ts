import { Global, Module } from '@nestjs/common';
import { ContentPresenter } from './content-presenter';
import { MediaReferenceService } from './media-reference.service';
import { AcademicReferenceService } from './academic-reference.service';
import { MentionService } from './mention.service';
import { AiTaggingService } from './ai-tagging.service';

@Global()
@Module({
  providers: [ContentPresenter, MediaReferenceService, AcademicReferenceService, MentionService, AiTaggingService],
  exports: [ContentPresenter, MediaReferenceService, AcademicReferenceService, MentionService, AiTaggingService],
})
export class ContentModule {}
