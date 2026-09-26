/**
 * Pruebas deterministas (sin base de datos) de los permisos por rol que deben
 * coincidir con el menu del frontend (data/constants.js y App.jsx):
 *  - El auditor (solo lectura) consulta el panel y los reportes.
 *  - El auditor NO puede registrar mantenimientos.
 */
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { ReportesController } from '../../reportes/reportes.controller';
import { MantenimientosController } from '../../mantenimientos/mantenimientos.controller';

// Contexto HTTP simulado para invocar el guard sobre un handler concreto.
const contexto = (clase: any, handler: string, rol: string): ExecutionContext =>
  ({
    getHandler: () => clase.prototype[handler],
    getClass: () => clase,
    switchToHttp: () => ({ getRequest: () => ({ user: { rol } }) }),
  }) as any;

describe('Permisos por rol', () => {
  const guard = new RolesGuard(new Reflector());

  const ENDPOINTS_REPORTES = [
    'indicadores',
    'preview',
    'excel',
    'pdf',
    'equiposPreview',
    'equiposExcel',
    'equiposPdf',
  ];

  it.each(ENDPOINTS_REPORTES)('el auditor puede consultar reportes.%s', (handler) => {
    expect(guard.canActivate(contexto(ReportesController, handler, 'auditor'))).toBe(true);
  });

  it.each(ENDPOINTS_REPORTES)('el tecnico no puede consultar reportes.%s', (handler) => {
    expect(() => guard.canActivate(contexto(ReportesController, handler, 'tecnico'))).toThrow(
      ForbiddenException,
    );
  });

  it('el auditor no puede registrar mantenimientos', () => {
    expect(() =>
      guard.canActivate(contexto(MantenimientosController, 'create', 'auditor')),
    ).toThrow(ForbiddenException);
  });

  it.each(['administrador', 'supervisor', 'tecnico'])(
    'el rol %s puede registrar mantenimientos',
    (rol) => {
      expect(guard.canActivate(contexto(MantenimientosController, 'create', rol))).toBe(true);
    },
  );
});
