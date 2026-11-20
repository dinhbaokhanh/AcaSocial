import { Injectable } from "@nestjs/common";
import { DataSource, type EntityManager } from "typeorm";

export type DatabaseTransaction = Pick<EntityManager, "query">;

@Injectable()
export class TransactionManager {
  constructor(private readonly db: DataSource) {}

  run<T>(operation: (transaction: DatabaseTransaction) => Promise<T>) {
    return this.db.transaction(operation);
  }

  repeatableRead<T>(
    operation: (transaction: DatabaseTransaction) => Promise<T>,
  ) {
    return this.db.transaction("REPEATABLE READ", operation);
  }
}
