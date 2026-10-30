import { IsBoolean, IsOptional, IsString, Matches } from 'class-validator';
import { Transform } from 'class-transformer';
import { PaginationQueryDto } from '../../common/pagination/pagination.dto';

export class FilterTagDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  search?: string;
  // Tag của môn này được đưa lên đầu danh sách (room môn). Id môn trong academic_db
  // không luôn đúng chuẩn RFC (vd. cccccccc-0002-0001-…) nên chỉ kiểm tra dạng 8-4-4-4-12.
  @IsOptional()
  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
  courseId?: string;
  @IsOptional() @Transform(({ value }) => value === 'true') @IsBoolean()
  includeInactive?: boolean;
}
