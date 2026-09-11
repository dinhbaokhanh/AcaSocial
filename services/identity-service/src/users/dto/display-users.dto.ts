import { ArrayMaxSize, ArrayUnique, IsArray, IsUUID } from 'class-validator';
export class DisplayUsersDto {
  @IsArray()
  @ArrayMaxSize(100)
  @ArrayUnique()
  @IsUUID('all', { each: true })
  ids: string[];
}
