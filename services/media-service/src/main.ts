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
    .setTitle('Media Service API')
    .setDescription(
      'Quản lý file media: upload, lấy thông tin và xóa ảnh, tài liệu, code lên Cloudinary.',
    )
    .setVersion('1.0')
    .addApiKey(
      { type: 'apiKey', in: 'header', name: 'x-user-id' },
      'x-user-id',
    )
    .addApiKey(
      { type: 'apiKey', in: 'header', name: 'x-user-role' },
      'x-user-role',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  await app.listen(process.env.PORT ?? 8082);
}
bootstrap();
