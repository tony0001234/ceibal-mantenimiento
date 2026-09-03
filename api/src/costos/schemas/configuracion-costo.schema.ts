import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ConfiguracionCostoDocument = ConfiguracionCosto & Document;

// Número de períodos (visitas) por defecto según la periodicidad del contrato.
// El contrato cubre varios meses con una visita mensual obligatoria, por lo que
// el "número de períodos" equivale al número de visitas del contrato:
//   Mensual -> 1, Trimestral -> 3, Cuatrimestral -> 4.
// El usuario puede agregar otras periodicidades e indicar su número de períodos.
export const PERIODICIDADES = [
  { valor: 'Mensual', periodos: 1 },
  { valor: 'Trimestral', periodos: 3 },
  { valor: 'Cuatrimestral', periodos: 4 },
] as const;

// Configuración de costo por categoría/grupo de contrato de mantenimiento.
// Existe UNA configuración vigente por categoría (índice único), de modo que
// no haya costos distintos para la misma categoría (centralización del cálculo).
@Schema({ timestamps: true, collection: 'configuracioncosto' })
export class ConfiguracionCosto {
  // Categoría del contrato (única). Ej.: mensual_ac, cuatrimestral_ac, refrigeracion.
  @Prop({ required: true, unique: true, trim: true })
  categoria: string;

  // Monto total ofertado del contrato (Q).
  @Prop({ required: true, min: 0.01 })
  montoOfertado: number;

  // Cantidad de equipos incluidos en el contrato/listado.
  @Prop({ required: true, min: 1 })
  cantidadEquipos: number;

  // Etiqueta de la periodicidad (Mensual, Trimestral, Cuatrimestral u otra).
  @Prop({ required: true, trim: true })
  periodicidad: string;

  // Número de períodos (visitas) del contrato. Mayor que 0.
  @Prop({ required: true, min: 1 })
  numeroPeriodos: number;

  // Costo por mantenimiento calculado = (monto / equipos) / periodos.
  // Se persiste para que el snapshot y los reportes no recalculen.
  @Prop({ required: true, min: 0 })
  costoCalculado: number;

  @Prop({ default: true })
  activo: boolean;
}

export const ConfiguracionCostoSchema =
  SchemaFactory.createForClass(ConfiguracionCosto);
