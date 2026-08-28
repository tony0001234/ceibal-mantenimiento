import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { EquiposService } from './equipos.service';
import { Equipo } from './schemas/equipo.schema';

// Prueba de wiring: el servicio se instancia con su dependencia (el modelo)
// mockeada. No toca la base de datos.
describe('EquiposService', () => {
  let service: EquiposService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EquiposService,
        { provide: getModelToken(Equipo.name), useValue: {} },
      ],
    }).compile();

    service = module.get<EquiposService>(EquiposService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
