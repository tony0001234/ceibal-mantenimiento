import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request = require('supertest');
import { AppController } from '../src/app.controller';
import { AppService } from '../src/app.service';

// Smoke e2e del endpoint de salud. Es independiente de la base de datos, por lo
// que se prueba con un modulo minimo (AppController + AppService) y NO requiere
// MongoDB en memoria. Reemplaza al scaffolding que esperaba "Hello World!".
describe('AppController (e2e) — salud', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  it('/ (GET) responde 200 con el estado del servicio', async () => {
    const res = await request(app.getHttpServer()).get('/').expect(200);
    expect(res.body.estado).toBe('activo');
    expect(res.body.documentacion).toBe('/docs');
    expect(typeof res.body.hora).toBe('string');
  });
});
