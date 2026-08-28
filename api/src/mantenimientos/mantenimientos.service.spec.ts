import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { MantenimientosService } from './mantenimientos.service';
import { Mantenimiento } from './schemas/mantenimiento.schema';
import { EquiposService } from '../equipos/equipos.service';

// MantenimientosService inyecta el modelo Mantenimiento y EquiposService
// (para actualizar el estado del equipo). Ambos se mockean.
describe('MantenimientosService', () => {
  let service: MantenimientosService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MantenimientosService,
        { provide: getModelToken(Mantenimiento.name), useValue: {} },
        { provide: EquiposService, useValue: { actualizarEstado: jest.fn() } },
      ],
    }).compile();

    service = module.get<MantenimientosService>(MantenimientosService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
