import { ArrayMaxSize, ArrayUnique, IsArray, IsString, Matches } from 'class-validator';

export class ResolveUsernamesDto {
  @IsArray() @ArrayMaxSize(20) @ArrayUnique()
  @IsString({ each: true }) @Matches(/^[a-zA-Z0-9_]{3,20}$/, { each: true })
  usernames: string[];
}
