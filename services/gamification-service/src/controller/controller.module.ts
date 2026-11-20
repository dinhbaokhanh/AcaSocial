import { Module } from "@nestjs/common";
import { HealthModule } from "../service/health/health.module";
import { ReconciliationModule } from "../service/reconciliation/reconciliation.module";
import { RecoveryModule } from "../service/recovery/recovery.module";
import { ReputationModule } from "../service/reputation/reputation.module";
import { RulesModule } from "../service/rules/rules.module";
import { HealthController } from "./health/health.controller";
import { ReconciliationController } from "./reconciliation/reconciliation.controller";
import { RecoveryController } from "./recovery/recovery.controller";
import { ReputationController } from "./reputation/reputation.controller";
import { RulesController } from "./rules/rules.controller";

@Module({
  imports: [
    ReputationModule,
    RulesModule,
    ReconciliationModule,
    RecoveryModule,
    HealthModule,
  ],
  controllers: [
    ReputationController,
    RulesController,
    ReconciliationController,
    RecoveryController,
    HealthController,
  ],
})
export class ControllerModule {}
