/**
 * Pruebas deterministas (sin base de datos) de la regla de seguridad de
 * empresa afiliada en el registro de mantenimientos.
 *
 * Cubren:
 *  - Que el campo `empresa` enviado por el cliente se DESCARTA (whitelist).
 *  - Que el servicio usa la empresa del usuario autenticado, no la del body.
 *  - Que sin empresa afiliada no se puede registrar.
 */
import { ValidationPipe, BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import { CreateMantenimientoDto } from './dto/create-mantenimiento.dto';
import { MantenimientosService } from './mantenimientos.service';

const BODY_VALIDO = {
  equipo: '0123456789abcdef01234567',
  periodo: 'mensual',
  tipoTrabajo: 'preventivo',
  descripcionTrabajo: 'Limpieza general.',
  repuestosObservaciones: '',
  estadoEquipoResultante: 'funcionando',
  fechaMantenimiento: '2026-08-20',
  horaInicio: '08:00',
  horaFin: '09:00',
};

describe('Seguridad de empresa afiliada en mantenimientos', () => {
  it('el ValidationPipe descarta cualquier `empresa` enviada en el body', async () => {
    const pipe = new ValidationPipe({ whitelist: true, transform: true });
    const out: any = await pipe.transform(
      { ...BODY_VALIDO, empresa: 'EMPRESA_B_FORJADA' },
      { type: 'body', metatype: CreateMantenimientoDto },
    );
    expect(out.empresa).toBeUndefined(); // el atacante no puede colar la empresa
    expect(out.equipo).toBe(BODY_VALIDO.equipo);
  });

  it('el servicio guarda la empresa del usuario autenticado, no la del body', async () => {
    const empresaDelUsuario = new Types.ObjectId().toString();

    // Modelo Mongoose simulado: constructor que captura el payload + findOne.
    let capturado: any = null;
    const modelo: any = function (payload: any) {
      capturado = payload;
      return {
        save: async () => ({ ...payload, populate: async () => ({ ...payload }) }),
      };
    };
    modelo.findOne = () => ({ exec: async () => null }); // sin duplicado

    const equiposService: any = {
      actualizarEstado: jest.fn().mockResolvedValue(undefined),
      findOne: jest.fn().mockResolvedValue({ categoria: '' }),
    };
    const costosService: any = { costoVigente: jest.fn().mockResolvedValue(0) };
    const service = new MantenimientosService(modelo, equiposService, costosService);

    // El DTO NO trae empresa; la empresa llega como 3er argumento (del token).
    const dto: any = { ...BODY_VALIDO };
    const guardado: any = await service.create(dto, new Types.ObjectId().toString(), empresaDelUsuario);

    expect(capturado.empresa.toString()).toBe(empresaDelUsuario);
    expect(guardado.empresa.toString()).toBe(empresaDelUsuario);
    expect(equiposService.actualizarEstado).toHaveBeenCalledWith(dto.equipo, 'ACTIVO');
  });

  it('sin empresa afiliada, el registro es rechazado', async () => {
    const modelo: any = function () { return { save: async () => ({}) }; };
    modelo.findOne = () => ({ exec: async () => null });
    const service = new MantenimientosService(
      modelo,
      { actualizarEstado: jest.fn() } as any,
      { costoVigente: jest.fn() } as any,
    );

    await expect(
      service.create({ ...BODY_VALIDO } as any, new Types.ObjectId().toString(), undefined),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
