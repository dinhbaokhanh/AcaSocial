import { Transform } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsString,
  Length,
  Max,
  Min,
} from "class-validator";
import type { RuleUpdate } from "../../service/rules/rules";

export class RulesDto implements RuleUpdate {
  @IsInt() @Min(1) expectedVersion: number;
  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? value.trim() : value,
  )
  @IsString()
  @Length(5, 1000)
  reason: string;
  @IsInt() @Min(0) @Max(1000) upvotePoints: number;
  @IsInt() @Min(0) @Max(1000) acceptedPoints: number;
  @IsInt() @Min(0) @Max(100) publicationPoints: number;
  @IsInt() @Min(0) @Max(100000) upvoteDailyCap: number;
  @IsInt() @Min(0) @Max(100) publicationDailyCap: number;
  @IsInt() @Min(0) @Max(1000) pairDailyCap: number;
  @IsBoolean() capEnabled: boolean;
  @IsArray()
  @ArrayMinSize(3)
  @ArrayMaxSize(3)
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(10000000, { each: true })
  thresholds: number[];
}
