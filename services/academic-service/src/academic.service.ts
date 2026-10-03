import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityTarget, In, ObjectLiteral } from 'typeorm';
import {
  CatalogStatus,
  Course,
  CourseTopic,
  Curriculum,
  CurriculumCourse,
  Major,
  Topic,
} from './entities';
import {
  CatalogDto,
  CourseTopicItemDto,
  CurriculumCourseDto,
  CurriculumDto,
  ListDto,
  TopicDto,
  UpdateCatalogDto,
  UpdateTopicDto,
} from './academic.dto';

@Injectable()
export class AcademicService {
  constructor(private readonly db: DataSource) {}

  private async paged<T extends ObjectLiteral>(entity: EntityTarget<T>, query: ListDto) {
    const [data, totalItems] = await this.db.getRepository(entity).findAndCount({
      order: { createdAt: 'DESC' } as never,
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    });
    return { data, meta: { ...query, totalItems, totalPages: Math.ceil(totalItems / query.limit) } };
  }

  majors(query: ListDto) { return this.paged(Major, query); }
  courses(query: ListDto) { return this.paged(Course, query); }
  topics(query: ListDto) { return this.paged(Topic, query); }

  curricula(majorId: string) {
    return this.db.getRepository(Curriculum).find({
      where: { majorId },
      order: { effectiveYear: 'DESC', version: 'DESC' },
    });
  }

  curriculumCourses(curriculumId: string) {
    return this.db.getRepository(CurriculumCourse).find({
      where: { curriculumId },
      relations: ['course'],
      order: { displayOrder: 'ASC' },
    });
  }

  courseTopics(courseId: string) {
    return this.db.getRepository(CourseTopic).find({
      where: { courseId },
      relations: ['topic'],
    });
  }

  async createCatalog(kind: 'major' | 'course', dto: CatalogDto) {
    const entity = kind === 'major' ? Major : Course;
    try {
      return await this.db.getRepository(entity).save(
        this.db.getRepository(entity).create({ ...dto, description: dto.description ?? '' }),
      );
    } catch (error) {
      if ((error as { code?: string }).code === '23505')
        throw new ConflictException(`${kind} code already exists`);
      throw error;
    }
  }

  async updateCatalog(kind: 'major' | 'course', id: string, dto: UpdateCatalogDto) {
    const entity = kind === 'major' ? Major : Course;
    const item = await this.db.getRepository(entity).findOneBy({ id } as never);
    if (!item) throw new NotFoundException(`${kind} not found`);
    Object.assign(item, dto);
    return this.db.getRepository(entity).save(item);
  }

  async updateTopic(id: string, dto: UpdateTopicDto) {
    const topic = await this.db.getRepository(Topic).findOneBy({ id });
    if (!topic) throw new NotFoundException('Topic not found');
    if (dto.parentTopicId === id) throw new BadRequestException('Topic cannot be its own parent');
    if (dto.parentTopicId) await this.exists(Topic, dto.parentTopicId, 'Parent topic');
    Object.assign(topic, dto);
    return this.db.getRepository(Topic).save(topic);
  }

  async updateCurriculumStatus(id: string, status: 'draft' | 'active' | 'retired') {
    const curriculum = await this.db.getRepository(Curriculum).findOneBy({ id });
    if (!curriculum) throw new NotFoundException('Curriculum not found');
    if (status === 'active') {
      const other = await this.db.getRepository(Curriculum).findOneBy({ majorId: curriculum.majorId, status: 'active' });
      if (other && other.id !== id) throw new ConflictException('This major already has an active curriculum');
    }
    curriculum.status = status;
    return this.db.getRepository(Curriculum).save(curriculum);
  }

  async createCurriculum(dto: CurriculumDto) {
    await this.exists(Major, dto.majorId, 'Major');
    return this.db.getRepository(Curriculum).save(
      this.db.getRepository(Curriculum).create({ ...dto, status: dto.status ?? 'draft' }),
    );
  }

  async addCurriculumCourse(dto: CurriculumCourseDto) {
    await Promise.all([
      this.exists(Curriculum, dto.curriculumId, 'Curriculum'),
      this.exists(Course, dto.courseId, 'Course'),
    ]);
    try {
      return await this.db.getRepository(CurriculumCourse).save(
        this.db.getRepository(CurriculumCourse).create({
          ...dto,
          recommendedSemester: dto.recommendedSemester ?? null,
          displayOrder: dto.displayOrder ?? 0,
        }),
      );
    } catch (error) {
      if ((error as { code?: string }).code === '23505')
        throw new ConflictException('Course already belongs to this curriculum');
      throw error;
    }
  }

  async createTopic(dto: TopicDto) {
    if (dto.parentTopicId) await this.exists(Topic, dto.parentTopicId, 'Parent topic');
    return this.db.getRepository(Topic).save(
      this.db.getRepository(Topic).create({
        ...dto,
        description: dto.description ?? '',
        parentTopicId: dto.parentTopicId ?? null,
      }),
    );
  }

  async setCourseTopics(courseId: string, items: CourseTopicItemDto[]) {
    await this.exists(Course, courseId, 'Course');
    const ids = [...new Set(items.map((item) => item.topicId))];
    if (ids.length !== items.length) throw new BadRequestException('Duplicate topic');
    const topics = ids.length ? await this.db.getRepository(Topic).findBy({ id: In(ids) }) : [];
    if (topics.length !== ids.length || topics.some((topic) => topic.status !== CatalogStatus.ACTIVE))
      throw new BadRequestException('One or more active topics do not exist');
    return this.db.transaction(async (manager) => {
      await manager.delete(CourseTopic, { courseId });
      if (items.length)
        await manager.insert(
          CourseTopic,
          items.map((item) => ({ courseId, topicId: item.topicId, relevanceWeight: item.relevanceWeight ?? 1 })),
        );
      return manager.getRepository(CourseTopic).find({ where: { courseId }, relations: ['topic'] });
    });
  }

  async context(curriculumCourseId: string) {
    const item = await this.db.getRepository(CurriculumCourse).findOne({
      where: { id: curriculumCourseId },
      relations: ['course', 'curriculum', 'curriculum.major'],
    });
    if (!item) throw new NotFoundException('Curriculum course not found');
    if (item.course.status !== CatalogStatus.ACTIVE || item.curriculum.status !== 'active' || item.curriculum.major.status !== CatalogStatus.ACTIVE)
      throw new NotFoundException('Active academic context not found');
    const topicRows = await this.db.getRepository(CourseTopic).find({
      where: { courseId: item.courseId },
      relations: ['topic'],
    });
    return {
      curriculumCourseId: item.id,
      majorId: item.curriculum.majorId,
      curriculumId: item.curriculumId,
      courseId: item.courseId,
      major: item.curriculum.major,
      curriculum: item.curriculum,
      course: item.course,
      allowedTopics: topicRows.filter((row) => row.topic.status === CatalogStatus.ACTIVE),
    };
  }

  async major(id: string) {
    const major = await this.db.getRepository(Major).findOneBy({ id });
    if (!major || major.status !== CatalogStatus.ACTIVE)
      throw new NotFoundException('Active major not found');
    return major;
  }

  private async exists<T extends ObjectLiteral>(entity: EntityTarget<T>, id: string, label: string) {
    if (!(await this.db.getRepository(entity).exist({ where: { id } as never })))
      throw new NotFoundException(`${label} not found`);
  }
}
