import { Type } from "class-transformer";
import { IsInt, Max, Min } from "class-validator";

import type { Pagination } from "../../service/pagination";

export class PaginationDto implements Pagination {
  @Type(() => Number) @IsInt() @Min(1) @Max(100000) page = 1;
  @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
}
