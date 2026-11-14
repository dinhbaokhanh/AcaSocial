import {
  Body,
  Controller,
  Delete,
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
  UpdateCourseDto,
  CatalogDto,
  ListDto,
  MajorCourseDto,
  SetCourseTopicsDto,
  TopicDto,
  UpdateCatalogDto,
  UpdateTopicDto,
} from './academic.dto';
import { InternalTokenGuard, requireAdmin, userFromRequest } from './access';

@Controller()
export class AcademicController {
  constructor(private readonly service: AcademicService) {}

  @Get('majors') majors(@Query() query: ListDto) { return this.service.majors(query); }
  @Get('courses') courses(@Query() query: ListDto) { return this.service.courses(query); }
  @Get('topics') topics(@Query() query: ListDto) { return this.service.topics(query); }
  @Get('majors/:id/courses')
  majorCourses(@Param('id', ParseUUIDPipe) id: string) { return this.service.majorCourses(id); }
  @Get('courses/:id/majors')
  courseMajors(@Param('id', ParseUUIDPipe) id: string) { return this.service.courseMajors(id); }
  @Get('courses/:id/topics')
  courseTopics(@Param('id', ParseUUIDPipe) id: string) { return this.service.courseTopics(id); }

  @Post('majors')
  createMajor(@Req() req: Request, @Body() dto: CatalogDto) {
    requireAdmin(userFromRequest(req as never));
    return this.service.createCatalog('major', dto);
  }

  @Post('courses')
  createCourse(@Req() req: Request, @Body() dto: CatalogDto) {
    const actor = requireAdmin(userFromRequest(req as never));
    return this.service.createCourse(dto, actor);
  }

  @Post('major-courses')
  addMajorCourse(@Req() req: Request, @Body() dto: MajorCourseDto) {
    requireAdmin(userFromRequest(req as never));
    return this.service.addMajorCourse(dto);
  }

  @Delete('major-courses/:id')
  removeMajorCourse(@Req() req: Request, @Param('id', ParseUUIDPipe) id: string) {
    requireAdmin(userFromRequest(req as never));
    return this.service.removeMajorCourse(id);
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
  updateCourse(@Req() req: Request, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCourseDto) {
    const actor = requireAdmin(userFromRequest(req as never)); return this.service.updateCourse(id, dto, actor);
  }

  @Patch('topics/:id')
  updateTopic(@Req() req: Request, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateTopicDto) {
    requireAdmin(userFromRequest(req as never)); return this.service.updateTopic(id, dto);
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
