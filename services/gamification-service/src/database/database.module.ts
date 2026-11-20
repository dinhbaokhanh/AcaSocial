import { Global, Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { InboxRetry1792300000000 } from "./migrations/inbox-retry.migration";
import { GamificationReliability1792100000000 } from "./migrations/reliability.migration";
import { ReplayPreflight1792400000000 } from "./migrations/replay-preflight.migration";
import { RewardDecisionDate1792200000000 } from "./migrations/reward-decision-date.migration";
import { GamificationSchema1792000000000 } from "./migrations/schema.migration";
import { ScopedReplay1792500000000 } from "./migrations/scoped-replay.migration";
import { TransactionManager } from "./transaction-manager";

@Global()
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: "postgres",
        host: config.get("DB_HOST", "localhost"),
        port: Number(config.get("DB_PORT", 5432)),
        username: config.get("DB_USERNAME", "postgres"),
        password: config.get("DB_PASSWORD"),
        database: config.get("DB_NAME", "gamification_db"),
        entities: [],
        synchronize: false,
        migrationsRun: true,
        migrations: [
          GamificationSchema1792000000000,
          GamificationReliability1792100000000,
          RewardDecisionDate1792200000000,
          InboxRetry1792300000000,
          ReplayPreflight1792400000000,
          ScopedReplay1792500000000,
        ],
      }),
    }),
  ],
  providers: [TransactionManager],
  exports: [TransactionManager],
})
export class DatabaseModule {}
