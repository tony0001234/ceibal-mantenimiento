// =====================================================================
// Regla ÚNICA de precio del mantenimiento según el tipo de trabajo y el
// periodo. Se usa en el backend (registro, edición, reportes, exportaciones)
// y su equivalente en el frontend (data/constants.js) para que la pantalla,
// el PDF y el Excel coincidan siempre.
//
//  - Preventivo            -> 'automatico' : precio de la config. de costos.
//  - Correctivo            -> 'manual'     : lo ingresa el usuario.
//  - Llamada de emergencia -> 'ninguno'    : sin precio.
//  - Evaluación interna    -> 'ninguno'    : sin precio.
//  - Periodo "garantía"    -> 'ninguno'    : sin precio (trabajo cubierto),
//                                            sin importar el tipo.
// =====================================================================

export type ModoPrecio = 'automatico' | 'manual' | 'ninguno';

export function modoPrecio(tipoTrabajo: string, periodo?: string): ModoPrecio {
  if (periodo === 'garantia') return 'ninguno';
  if (tipoTrabajo === 'preventivo') return 'automatico';
  if (tipoTrabajo === 'correctivo') return 'manual';
  return 'ninguno';
}

// ¿Corresponde mostrar/almacenar un precio para este mantenimiento?
export function precioAplica(tipoTrabajo: string, periodo?: string): boolean {
  return modoPrecio(tipoTrabajo, periodo) !== 'ninguno';
}
