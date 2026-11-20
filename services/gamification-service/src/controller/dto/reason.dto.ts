import { Transform } from "class-transformer";
import { IsString, Length } from "class-validator";

export class ReasonDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? value.trim() : value,
  )
  @IsString()
  @Length(5, 1000)
  reason: string;
}
