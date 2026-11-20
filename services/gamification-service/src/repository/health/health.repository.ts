import { Injectable } from "@nestjs/common";
import { DataSource } from "typeorm";

@Injectable()
export class HealthRepository {
  constructor(private readonly db: DataSource) {}

  ping() {
    return this.db.query("SELECT 1");
  }
}
