import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { MantenimientosService } from './mantenimientos.service';
import { Mantenimiento } from './schemas/mantenimiento.schema';
import { EquiposService } from '../equipos/equipos.service';
import { CostosService } from '../costos/costos.service';

// MantenimientosService inyecta el modelo Mantenimiento y EquiposService
// (para actualizar el estado del equipo). Ambos se mockean.
describe('MantenimientosService', () => {
  let service: MantenimientosService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MantenimientosService,
        { provide: getModelToken(Mantenimiento.name), useValue: {} },
        { provide: EquiposService, useValue: { actualizarEstado: jest.fn(), findOne: jest.fn() } },
        { provide: CostosService, useValue: { costoVigente: jest.fn().mockResolvedValue(0) } },
      ],
    }).compile();

    service = module.get<MantenimientosService>(MantenimientosService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

// Edición de un correctivo sin enviar costoManual: el precio ya registrado se
// conserva. Un PATCH directo a la API sin el precio no debe dejarlo en 0.
describe('MantenimientosService.update (precio del correctivo)', () => {
  const equipoId = new Types.ObjectId().toString();

  function crearServicio(actual: any) {
    let cambios: any;
    const modelo: any = {
      findById: jest.fn().mockReturnValue({ exec: () => Promise.resolve(actual) }),
      findByIdAndUpdate: jest.fn().mockImplementation((_id, c) => {
        cambios = c;
        return { populate: () => ({ exec: () => Promise.resolve({ ...actual, ...c }) }) };
      }),
      findOne: jest.fn().mockReturnValue({ sort: () => ({ exec: () => Promise.resolve(null) }) }),
    };
    const equipos = { findOne: jest.fn().mockResolvedValue({ categoria: 'mensual_ac', estado: 'ACTIVO' }), actualizarEstado: jest.fn() };
    const costos = { costoVigente: jest.fn().mockResolvedValue(100) };
    const service = new MantenimientosService(modelo, equipos as any, costos as any);
    return { service, cambios: () => cambios };
  }

  const correctivo = {
    _id: 'm1',
    equipo: new Types.ObjectId(equipoId),
    tipoTrabajo: 'correctivo',
    periodo: 'mensual',
    fechaMantenimiento: new Date('2026-10-15'),
    costoMantenimiento: 300,
  };

  it('conserva el precio si el correctivo se edita sin costoManual', async () => {
    const { service, cambios } = crearServicio({ ...correctivo });
    await service.update('m1', { estadoEquipoResultante: 'funcionando' } as any);
    expect(cambios().costoMantenimiento).toBe(300);
  });

  it('usa el nuevo precio cuando se envía costoManual', async () => {
    const { service, cambios } = crearServicio({ ...correctivo });
    await service.update('m1', { costoManual: 450 } as any);
    expect(cambios().costoMantenimiento).toBe(450);
  });

  it('un preventivo que pasa a correctivo sin precio queda en 0', async () => {
    const { service, cambios } = crearServicio({ ...correctivo, tipoTrabajo: 'preventivo', costoMantenimiento: 100 });
    await service.update('m1', { tipoTrabajo: 'correctivo' } as any);
    expect(cambios().costoMantenimiento).toBe(0);
  });

  it('un correctivo que pasa a garantía queda sin precio', async () => {
    const { service, cambios } = crearServicio({ ...correctivo });
    await service.update('m1', { periodo: 'garantia' } as any);
    expect(cambios().costoMantenimiento).toBe(0);
  });
});
