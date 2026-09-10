import { IsBoolean, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateCommentDto {
  @IsString()
  @IsNotEmpty({ message: 'Nội dung bình luận không được để trống' })
  content: string;

  // Nếu là reply, truyền UUID của comment cha
  @IsOptional()
  @IsUUID('all')
  parentCommentId?: string;

  @IsOptional()
  @IsBoolean()
  isAnonymous?: boolean;
}
