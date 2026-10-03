import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { AcademicService } from './academic.service';
import {
  CatalogDto,
  CurriculumCourseDto,
  CurriculumDto,
  ListDto,
  SetCourseTopicsDto,
  TopicDto,
  UpdateCatalogDto,
  UpdateTopicDto,
  CurriculumStatusDto,
} from './academic.dto';
import { InternalTokenGuard, requireAdmin, userFromRequest } from './access';

@Controller()
export class AcademicController {
  constructor(private readonly service: AcademicService) {}

  @Get('majors') majors(@Query() query: ListDto) { return this.service.majors(query); }
  @Get('courses') courses(@Query() query: ListDto) { return this.service.courses(query); }
  @Get('topics') topics(@Query() query: ListDto) { return this.service.topics(query); }
  @Get('majors/:id/curricula')
  curricula(@Param('id', ParseUUIDPipe) id: string) { return this.service.curricula(id); }
  @Get('curricula/:id/courses')
  curriculumCourses(@Param('id', ParseUUIDPipe) id: string) { return this.service.curriculumCourses(id); }
  @Get('courses/:id/topics')
  courseTopics(@Param('id', ParseUUIDPipe) id: string) { return this.service.courseTopics(id); }

  @Post('majors')
  createMajor(@Req() req: Request, @Body() dto: CatalogDto) {
    requireAdmin(userFromRequest(req as never));
    return this.service.createCatalog('major', dto);
  }

  @Post('courses')
  createCourse(@Req() req: Request, @Body() dto: CatalogDto) {
    requireAdmin(userFromRequest(req as never));
    return this.service.createCatalog('course', dto);
  }

  @Post('curricula')
  createCurriculum(@Req() req: Request, @Body() dto: CurriculumDto) {
    requireAdmin(userFromRequest(req as never));
    return this.service.createCurriculum(dto);
  }

  @Post('curriculum-courses')
  addCurriculumCourse(@Req() req: Request, @Body() dto: CurriculumCourseDto) {
    requireAdmin(userFromRequest(req as never));
    return this.service.addCurriculumCourse(dto);
  }

  @Post('topics')
  createTopic(@Req() req: Request, @Body() dto: TopicDto) {
    requireAdmin(userFromRequest(req as never));
    return this.service.createTopic(dto);
  }

  @Put('courses/:id/topics')
  setCourseTopics(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetCourseTopicsDto,
  ) {
    requireAdmin(userFromRequest(req as never));
    return this.service.setCourseTopics(id, dto.topics);
  }

  @Patch('majors/:id')
  updateMajor(@Req() req: Request, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCatalogDto) {
    requireAdmin(userFromRequest(req as never)); return this.service.updateCatalog('major', id, dto);
  }

  @Patch('courses/:id')
  updateCourse(@Req() req: Request, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCatalogDto) {
    requireAdmin(userFromRequest(req as never)); return this.service.updateCatalog('course', id, dto);
  }

  @Patch('topics/:id')
  updateTopic(@Req() req: Request, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateTopicDto) {
    requireAdmin(userFromRequest(req as never)); return this.service.updateTopic(id, dto);
  }

  @Patch('curricula/:id/status')
  updateCurriculumStatus(@Req() req: Request, @Param('id', ParseUUIDPipe) id: string, @Body() dto: CurriculumStatusDto) {
    requireAdmin(userFromRequest(req as never)); return this.service.updateCurriculumStatus(id, dto.status);
  }

  @Get('internal/academic/contexts/:id')
  @UseGuards(InternalTokenGuard)
  context(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.context(id);
  }

  @Get('internal/academic/majors/:id')
  @UseGuards(InternalTokenGuard)
  major(@Param('id', ParseUUIDPipe) id: string) { return this.service.major(id); }
}
