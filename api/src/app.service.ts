import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  estado() {
    return {
      servicio: 'API - Sistema de Control de Mantenimiento Hospital Ceibal (IGSS)',
      estado: 'activo',
      documentacion: '/docs',
      hora: new Date().toISOString(),
    };
  }
}
