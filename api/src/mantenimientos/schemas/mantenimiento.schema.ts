import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type MantenimientoDocument = Mantenimiento & Document;

// collection: 'mantenimiento' (singular) para coincidir con la coleccion validada.
// El validador exige TODOS estos campos; horaInicio/horaFin son de tipo date.
@Schema({ timestamps: true, collection: 'mantenimiento' })
export class Mantenimiento {
  @Prop({ type: Types.ObjectId, ref: 'Equipo', required: true })
  equipo: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Usuario', required: true })
  tecnico: Types.ObjectId;

  // Obligatorio segun el validador (siempre se asocia una empresa/proveedor,
  // incluida la empresa interna del hospital).
  @Prop({ type: Types.ObjectId, ref: 'Empresa', required: true })
  empresa: Types.ObjectId;

  @Prop({ required: true, enum: ['mensual', 'cuatrimestral', 'garantia'] })
  periodo: string;

  @Prop({
    required: true,
    enum: ['preventivo', 'correctivo', 'llamada_emergencia', 'evaluacion_interna'],
  })
  tipoTrabajo: string;

  @Prop({ required: true, trim: true })
  descripcionTrabajo: string;

  // El validador de MongoDB exige que el campo EXISTA (string), pero admite
  // cadena vacia. Por eso NO se usa `required` de Mongoose (rechazaria ''),
  // solo `default: ''` para garantizar que siempre esté presente.
  @Prop({ trim: true, default: '' })
  repuestosObservaciones: string;

  @Prop({ required: true, enum: ['funcionando', 'fuera_de_servicio'] })
  estadoEquipoResultante: string;

  @Prop({ required: true })
  fechaMantenimiento: Date;

  // Fecha/hora completas (tipo date): permiten calcular el MTTR (RF08).
  @Prop({ required: true })
  horaInicio: Date;

  @Prop({ required: true })
  horaFin: Date;
}

export const MantenimientoSchema = SchemaFactory.createForClass(Mantenimiento);

// Indice para la deteccion de duplicados (RF05): mismo equipo + fecha.
MantenimientoSchema.index({ equipo: 1, fechaMantenimiento: 1 });
