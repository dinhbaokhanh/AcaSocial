import { IsUUID } from "class-validator";
import type { RebuildRequest } from "../../service/reconciliation/reconciliation.service";
import { ReasonDto } from "../dto/reason.dto";

export class RebuildDto extends ReasonDto implements RebuildRequest {
  @IsUUID() userId: string;
  @IsUUID() idempotencyKey: string;
  @IsUUID() previewJobId: string;
}
