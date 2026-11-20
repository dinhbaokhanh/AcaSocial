import { Controller, Get } from "@nestjs/common";
import { HealthService } from "../../service/health/health.service";

@Controller("health")
export class HealthController {
  constructor(private readonly service: HealthService) {}

  @Get()
  health() {
    return this.service.health();
  }

  @Get("ready")
  ready() {
    return this.service.ready();
  }
}
