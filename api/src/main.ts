import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS: autoriza el origen del frontend (Fase 4 de la guia).
  app.enableCors({
    origin: process.env.FRONTEND_URL?.split(',') ?? 'http://localhost:5173',
    credentials: true,
  });

  // Validacion global (RF04): rechaza registros incompletos o con campos extra.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Documentacion interactiva de la API (Swagger) en /docs.
  const config = new DocumentBuilder()
    .setTitle('API - Mantenimiento Hospital Ceibal')
    .setDescription('Endpoints del sistema de gestion de mantenimiento (IGSS)')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`API escuchando en http://localhost:${port}  (docs: /docs)`);
}
bootstrap();
