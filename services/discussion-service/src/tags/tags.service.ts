import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tag } from './entities/tag.entity';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';
import { FilterTagDto } from './dto/filter-tag.dto';
import { PaginatedResult } from '../common/pagination/paginated-result.interface';

@Injectable()
export class TagsService {
  constructor(
    @InjectRepository(Tag)
    private readonly tagRepo: Repository<Tag>,
  ) {}

  /**
   * Tạo Tag mới.
   * Nếu không truyền slug, sẽ tự động generate từ name.
   */
  async create(dto: CreateTagDto): Promise<Tag> {
    const slug = dto.slug || this.generateSlug(dto.name);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))
      throw new BadRequestException('Tag name must produce a valid slug');

    const tag = this.tagRepo.create({
      name: dto.name,
      slug,
      description: dto.description,
    });

    try {
      return await this.tagRepo.save(tag);
    } catch (error: any) {
      this.handleDuplicateError(error);
      throw error;
    }
  }

  /**
   * Danh sách Tag (dùng cho cả Public và Admin).
   * Mặc định sắp xếp theo usage_count giảm dần (trending).
   */
  async findAll(filter: FilterTagDto): Promise<PaginatedResult<Tag>> {
    const { page = 1, limit = 20, search } = filter;

    const qb = this.tagRepo.createQueryBuilder('t');

    if (search) {
      qb.andWhere('t.name ILIKE :search', { search: `%${search}%` });
    }

    // Luôn ưu tiên tag được dùng nhiều nhất lên đầu
    qb.orderBy('t.usageCount', 'DESC').addOrderBy('t.createdAt', 'DESC');

    const totalItems = await qb.getCount();
    const data = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return {
      data,
      meta: {
        page,
        limit,
        totalItems,
        totalPages: Math.ceil(totalItems / limit),
      },
    };
  }

  /**
   * Chi tiết 1 Tag
   */
  async findOne(id: string): Promise<Tag> {
    const tag = await this.tagRepo.findOneBy({ id });
    if (!tag) {
      throw new NotFoundException('Tag not found');
    }
    return tag;
  }

  /**
   * Cập nhật Tag (Admin/Mod).
   */
  async update(id: string, dto: UpdateTagDto): Promise<Tag> {
    try {
      return await this.tagRepo.manager.transaction(async (manager) => {
        const tag = await manager.findOne(Tag, {
          where: { id },
          lock: { mode: 'pessimistic_write' },
        });
        if (!tag) throw new NotFoundException('Tag not found');
        // URLs remain stable when a tag is renamed.
        if (dto.slug !== undefined && dto.slug !== tag.slug)
          throw new BadRequestException('Tag slugs cannot be changed');
        if (dto.name !== undefined) tag.name = dto.name;
        if (dto.description !== undefined) tag.description = dto.description;
        await manager.save(tag);
        return tag;
      });
    } catch (error: any) {
      this.handleDuplicateError(error);
      throw error;
    }
  }

  /**
   * Xóa Tag (Admin/Mod).
   * QUAN TRỌNG: Không cho phép xóa nếu usage_count > 0.
   */
  async remove(id: string): Promise<{ message: string }> {
    await this.tagRepo.manager.transaction(async (manager) => {
      const tag = await manager.findOne(Tag, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!tag) throw new NotFoundException('Tag not found');
      const used = await manager.query(
        'SELECT 1 FROM discussion_tags dt JOIN discussions d ON d.id=dt.discussion_id WHERE dt.tag_id=$1 AND d.deleted_at IS NULL LIMIT 1',
        [id],
      );
      if (used.length)
        throw new BadRequestException(
          'Cannot delete tag that is currently in use',
        );
      await manager.query('DELETE FROM discussion_tags WHERE tag_id=$1', [id]);
      await manager.remove(tag);
    });
    return { message: 'Tag deleted successfully' };
  }

  // ===== Helpers =====

  /**
   * Sinh URL-friendly slug từ text.
   * Xử lý tốt các ký tự đặc biệt của ngành IT như C++, C#.
   */
  private generateSlug(text: string): string {
    return text
      .toLowerCase()
      .replace(/đ/g, 'd')
      .replace(/\+/g, 'p') // C++ -> cpp
      .replace(/#/g, 'sharp') // C# -> csharp
      .normalize('NFD') // Chuẩn hóa unicode
      .replace(/[\u0300-\u036f]/g, '') // Bỏ dấu tiếng Việt
      .replace(/[^a-z0-9]+/g, '-') // Thay ký tự không hợp lệ bằng gạch ngang
      .replace(/^-+|-+$/g, ''); // Bỏ gạch ngang ở đầu và cuối
  }

  /**
   * Bắt lỗi duplicate unique constraint từ PostgreSQL (code 23505)
   */
  private handleDuplicateError(error: any) {
    if (error.code === '23505') {
      throw new ConflictException('Tag name or slug already exists');
    }
  }
}
