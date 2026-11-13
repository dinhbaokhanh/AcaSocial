import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { InternalTokenGuard } from './notifications/internal-token.guard';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();
  // Chặn mọi request không đến từ Gateway (thiếu/sai X-Internal-Token).
  app.useGlobalGuards(new InternalTokenGuard(app.get(ConfigService)));
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  await app.listen(process.env.PORT ?? 8085);
}

void bootstrap();
