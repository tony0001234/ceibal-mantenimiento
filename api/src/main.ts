import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS: autoriza el/los origen(es) del frontend.
  //  - FRONTEND_URL admite varios origenes separados por coma.
  //  - Se normaliza cada valor (se quitan espacios y la barra final) para evitar
  //    el error tipico de "No 'Access-Control-Allow-Origin'" por un simple "/".
  //  - Ademas se permiten los despliegues en *.vercel.app (produccion y preview)
  //    y localhost, de modo que un olvido de FRONTEND_URL no rompa el login.
  const origenesPermitidos = (process.env.FRONTEND_URL ?? 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim().replace(/\/+$/, ''))
    .filter(Boolean);

  app.enableCors({
    origin: (origin, callback) => {
      // Sin cabecera Origin (curl, Postman, health checks): se permite.
      if (!origin) return callback(null, true);
      const limpio = origin.replace(/\/+$/, '');
      let host = '';
      try {
        host = new URL(limpio).hostname;
      } catch {
        host = '';
      }
      const permitido =
        origenesPermitidos.includes(limpio) ||
        host === 'localhost' ||
        host.endsWith('.vercel.app');
      // No se lanza error para no responder 500; si no esta permitido,
      // simplemente no se envia la cabecera y el navegador lo bloquea.
      return callback(null, permitido);
    },
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
