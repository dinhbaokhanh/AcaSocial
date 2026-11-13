import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { InternalTokenGuard } from './common/guards/internal-token.guard';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();
  // Chặn mọi request không đến từ Gateway hoặc service nội bộ (thiếu/sai X-Internal-Token).
  app.useGlobalGuards(new InternalTokenGuard(app.get(ConfigService)));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // CORS không cần thiết ở đây vì service này chỉ nhận traffic từ API Gateway.
  // CORS cho client bên ngoài đã được Gateway xử lý (CORSProvider middleware).

  await app.listen(process.env.PORT ?? 8084);
}
bootstrap();
