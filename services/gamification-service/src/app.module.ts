import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ControllerModule } from "./controller/controller.module";
import { DatabaseModule } from "./database/database.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    ControllerModule,
  ],
})
export class AppModule {}
