import { Module } from "@nestjs/common";
import { ReconciliationRepository } from "../../repository/reconciliation/reconciliation.repository";
import { ReconciliationService } from "./reconciliation.service";

@Module({
  providers: [ReconciliationRepository, ReconciliationService],
  exports: [ReconciliationService],
})
export class ReconciliationModule {}
