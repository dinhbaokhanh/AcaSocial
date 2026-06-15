import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // CORS không cần thiết ở đây vì service này chỉ nhận traffic từ API Gateway.
  // CORS cho client bên ngoài đã được Gateway xử lý (CORSProvider middleware).

  await app.listen(process.env.PORT ?? 8081);
}
bootstrap();

