import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
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

  const config = new DocumentBuilder()
    .setTitle('Identity Service API')
    .setDescription(
      'Quản lý xác thực người dùng: đăng ký, đăng nhập, OTP, JWT và thông tin cá nhân.',
    )
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'access-token',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  await app.listen(process.env.PORT ?? 8081);
}
bootstrap();
