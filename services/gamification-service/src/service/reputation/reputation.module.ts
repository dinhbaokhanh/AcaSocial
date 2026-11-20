import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { TransactionManager } from "../../database/transaction-manager";
import { ReputationInboxRepository } from "../../repository/reputation/reputation-inbox.repository";
import { ReputationScoringRepository } from "../../repository/reputation/reputation-scoring.repository";
import { ReputationRepository } from "../../repository/reputation/reputation.repository";
import { RulesModule } from "../rules/rules.module";
import { ReputationEngine } from "./reputation.engine";
import { ReputationService } from "./reputation.service";

@Module({
  imports: [RulesModule],
  providers: [
    ReputationRepository,
    ReputationInboxRepository,
    ReputationScoringRepository,
    ReputationService,
    {
      provide: ReputationEngine,
      inject: [
        ReputationInboxRepository,
        ReputationScoringRepository,
        TransactionManager,
        ConfigService,
      ],
      useFactory: (
        inbox: ReputationInboxRepository,
        scoring: ReputationScoringRepository,
        transactions: TransactionManager,
        config: ConfigService,
      ) =>
        new ReputationEngine(
          inbox,
          scoring,
          transactions,
          config.get("GAMIFICATION_NOTIFICATIONS_ENABLED", "true") === "true",
        ),
    },
  ],
  exports: [ReputationEngine, ReputationService],
})
export class ReputationModule {}
