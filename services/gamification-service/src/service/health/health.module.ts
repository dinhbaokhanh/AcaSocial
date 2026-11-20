import { Module } from "@nestjs/common";
import { HealthRepository } from "../../repository/health/health.repository";
import { WorkerModule } from "../worker/worker.module";
import { HealthService } from "./health.service";

@Module({
  imports: [WorkerModule],
  providers: [HealthRepository, HealthService],
  exports: [HealthService],
})
export class HealthModule {}
