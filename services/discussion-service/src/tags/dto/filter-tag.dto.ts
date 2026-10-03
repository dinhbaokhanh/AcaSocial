import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import { PaginationQueryDto } from '../../common/pagination/pagination.dto';

export class FilterTagDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  search?: string;
  @IsOptional() @Transform(({ value }) => value === 'true') @IsBoolean()
  includeInactive?: boolean;
}
