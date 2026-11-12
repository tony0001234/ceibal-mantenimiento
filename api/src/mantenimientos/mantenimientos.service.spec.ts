import { BadRequestException } from '@nestjs/common';
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

// Coherencia del horario: la hora de salida debe ser posterior a la de entrada.
// Un horario invertido deja la duración sin calcular y distorsiona el MTTR.
describe('MantenimientosService (coherencia del horario)', () => {
  const equipoId = new Types.ObjectId().toString();
  const tecnicoId = new Types.ObjectId().toString();
  const empresaId = new Types.ObjectId().toString();

  const BODY = {
    equipo: equipoId,
    periodo: 'mensual',
    tipoTrabajo: 'preventivo',
    descripcionTrabajo: 'Limpieza general.',
    repuestosObservaciones: '',
    estadoEquipoResultante: 'funcionando',
    fechaMantenimiento: '2026-08-20',
    horaInicio: '08:00',
    horaFin: '09:00',
  };

  function servicioCrear() {
    const guardar = jest.fn();
    const modelo: any = function (payload: any) {
      return {
        save: async () => {
          guardar(payload);
          return { ...payload, populate: async () => ({ ...payload }) };
        },
      };
    };
    modelo.findOne = () => ({ exec: async () => null });
    const equipos: any = {
      actualizarEstado: jest.fn(),
      findOne: jest.fn().mockResolvedValue({ categoria: '' }),
    };
    const costos: any = { costoVigente: jest.fn().mockResolvedValue(0) };
    return {
      service: new MantenimientosService(modelo, equipos, costos),
      guardar,
      equipos,
    };
  }

  function servicioEditar(actual: any) {
    const actualizar = jest.fn().mockImplementation((_id, c) => ({
      populate: () => ({ exec: () => Promise.resolve({ ...actual, ...c }) }),
    }));
    const modelo: any = {
      findById: jest.fn().mockReturnValue({ exec: () => Promise.resolve(actual) }),
      findByIdAndUpdate: actualizar,
      findOne: jest.fn().mockReturnValue({ sort: () => ({ exec: () => Promise.resolve(null) }) }),
    };
    const equipos: any = {
      findOne: jest.fn().mockResolvedValue({ categoria: 'mensual_ac', estado: 'ACTIVO' }),
      actualizarEstado: jest.fn(),
    };
    const costos: any = { costoVigente: jest.fn().mockResolvedValue(100) };
    return { service: new MantenimientosService(modelo, equipos, costos), actualizar };
  }

  const registro = {
    _id: 'm1',
    equipo: new Types.ObjectId(equipoId),
    tipoTrabajo: 'preventivo',
    periodo: 'mensual',
    fechaMantenimiento: new Date('2026-08-20'),
    horaInicio: new Date('2026-08-20T08:00:00'),
    horaFin: new Date('2026-08-20T09:00:00'),
    costoMantenimiento: 100,
  };

  it('crear: rechaza la hora de entrada posterior a la de salida y no guarda', async () => {
    const { service, guardar, equipos } = servicioCrear();
    await expect(
      service.create({ ...BODY, horaInicio: '10:00', horaFin: '09:00' } as any, tecnicoId, empresaId),
    ).rejects.toThrow('La hora de salida debe ser posterior a la hora de entrada.');
    expect(guardar).not.toHaveBeenCalled();
    expect(equipos.actualizarEstado).not.toHaveBeenCalled();
  });

  it('crear: rechaza la hora de entrada igual a la de salida', async () => {
    const { service, guardar } = servicioCrear();
    await expect(
      service.create({ ...BODY, horaInicio: '09:00', horaFin: '09:00' } as any, tecnicoId, empresaId),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(guardar).not.toHaveBeenCalled();
  });

  it('crear: acepta un horario coherente', async () => {
    const { service, guardar } = servicioCrear();
    await service.create({ ...BODY } as any, tecnicoId, empresaId);
    expect(guardar).toHaveBeenCalledTimes(1);
    const payload = guardar.mock.calls[0][0];
    expect(payload.horaFin.getTime()).toBeGreaterThan(payload.horaInicio.getTime());
  });

  it('editar: rechaza un horario invertido enviado completo', async () => {
    const { service, actualizar } = servicioEditar({ ...registro });
    await expect(
      service.update('m1', { horaInicio: '11:00', horaFin: '10:00' } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(actualizar).not.toHaveBeenCalled();
  });

  it('editar: rechaza una sola hora que queda invertida respecto de la guardada', async () => {
    const { service, actualizar } = servicioEditar({ ...registro });
    // La salida guardada es 09:00; mover la entrada a las 09:30 la invierte.
    await expect(
      service.update('m1', { horaInicio: '09:30' } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(actualizar).not.toHaveBeenCalled();
  });

  it('editar: acepta un horario coherente', async () => {
    const { service, actualizar } = servicioEditar({ ...registro });
    await service.update('m1', { horaInicio: '08:30', horaFin: '10:00' } as any);
    expect(actualizar).toHaveBeenCalledTimes(1);
  });

  it('editar: sin tocar las horas no bloquea un registro antiguo con horario invertido', async () => {
    const { service, actualizar } = servicioEditar({
      ...registro,
      horaInicio: new Date('2026-08-20T10:00:00'),
      horaFin: new Date('2026-08-20T09:00:00'),
    });
    await service.update('m1', { descripcionTrabajo: 'Corrección de texto.' } as any);
    expect(actualizar).toHaveBeenCalledTimes(1);
  });
});
