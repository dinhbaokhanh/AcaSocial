import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsNumber,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

/** POST /discussions/tag-suggestions — nội dung bài đang soạn. */
export class SuggestTagsDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(0, 300)
  title: string;
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(1, 20000)
  content: string;
}

export class SuggestedTagDto {
  @IsUUID('all') tagId: string;
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(-1)
  @Max(1)
  score: number;
}

/**
 * Các tag AI đã gợi ý cho người dùng lúc soạn bài, gửi kèm khi tạo bài để lưu
 * lại tag nào được chấp nhận / bỏ qua (dữ liệu đánh giá và huấn luyện).
 */
export class AiSuggestionDto {
  @IsString() @Length(1, 100) model: string;
  // Hợp các lần gợi ý trong lúc soạn (gợi ý đổi theo nội dung đang gõ).
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => SuggestedTagDto)
  tags: SuggestedTagDto[];
}
