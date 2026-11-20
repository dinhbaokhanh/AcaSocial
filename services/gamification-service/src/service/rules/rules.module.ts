import { Module } from "@nestjs/common";
import { RulesRepository } from "../../repository/rules/rules.repository";
import { RulesService } from "./rules.service";

@Module({
  providers: [RulesRepository, RulesService],
  exports: [RulesService],
})
export class RulesModule {}
