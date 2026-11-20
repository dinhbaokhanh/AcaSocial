import { Module } from "@nestjs/common";
import { WorkerRepository } from "../../repository/worker/worker.repository";
import { ReconciliationModule } from "../reconciliation/reconciliation.module";
import { RecoveryModule } from "../recovery/recovery.module";
import { ReputationModule } from "../reputation/reputation.module";
import { GamificationWorker } from "./gamification.worker";

@Module({
  imports: [ReconciliationModule, RecoveryModule, ReputationModule],
  providers: [WorkerRepository, GamificationWorker],
  exports: [GamificationWorker],
})
export class WorkerModule {}
