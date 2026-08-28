import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  it('should be defined', () => {
    expect(appController).toBeDefined();
  });

  // El endpoint de salud reporta el servicio activo (reemplaza al antiguo
  // "Hello World" del scaffolding de NestJS).
  it('estado() reporta el servicio activo y la ruta de documentacion', () => {
    const r = appController.estado();
    expect(r.estado).toBe('activo');
    expect(r.documentacion).toBe('/docs');
    expect(typeof r.hora).toBe('string');
  });
});
