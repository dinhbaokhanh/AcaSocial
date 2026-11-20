import { Module } from "@nestjs/common";
import { RecoveryOperationsRepository } from "../../repository/recovery/recovery-operations.repository";
import { RecoveryRepository } from "../../repository/recovery/recovery.repository";
import { ReputationModule } from "../reputation/reputation.module";
import { RecoveryOperationsService } from "./recovery-operations.service";
import { RecoveryService } from "./recovery.service";

@Module({
  imports: [ReputationModule],
  providers: [
    RecoveryRepository,
    RecoveryOperationsRepository,
    RecoveryService,
    RecoveryOperationsService,
  ],
  exports: [RecoveryService, RecoveryOperationsService],
})
export class RecoveryModule {}
