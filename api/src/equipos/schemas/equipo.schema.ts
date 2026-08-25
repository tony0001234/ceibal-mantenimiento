import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type EquipoDocument = Equipo & Document;

// Valores permitidos EXACTAMENTE segun el validador de la coleccion "equipo"
// en MongoDB Atlas (no modificar sin cambiar tambien el validador de la BD).
export const TIPOS_EQUIPO = ['Refrigeración'] as const;
export const SUBTIPOS_EQUIPO = [
  'Split',
  'Mini-split',
  'Cassette',
  'Ventana',
  'Paquete',
] as const;
export const MARCAS_EQUIPO = [
  'Rheem',
  'Tempstar',
  'York',
  'Comfortstar',
  'Lennox',
  'Adina',
  'Mcquay Daikin',
  'Fedders',
  'Aireone',
  'Primiumcool',
  'S/M',
  'Pretul',
  'Premium',
  'Innovair',
  'Everwell',
] as const;
export const ESTADOS_EQUIPO = ['ACTIVO', 'INACTIVO', 'MANTENIMIENTO', 'BAJA'] as const;
export const CRITICIDADES_EQUIPO = ['BAJA', 'MEDIA', 'ALTA', 'CRITICA'] as const;

// La opcion collection: 'equipo' es OBLIGATORIA: la coleccion validada en la BD
// se llama en singular ("equipo"); sin esto Mongoose usaria "equipos" (plural).
@Schema({ timestamps: true, collection: 'equipo' })
export class Equipo {
  @Prop({ required: true, unique: true, trim: true })
  codigoInventario: string;

  @Prop({ required: true, trim: true })
  nombre: string;

  @Prop({ required: true, enum: TIPOS_EQUIPO, default: 'Refrigeración' })
  tipoEquipo: string;

  @Prop({ required: true, enum: SUBTIPOS_EQUIPO })
  subTipo: string;

  @Prop({ required: true, enum: MARCAS_EQUIPO })
  marca: string;

  @Prop({ required: true, trim: true })
  serie: string;

  @Prop({ required: true, trim: true })
  ubicacion: string;

  @Prop({ required: true, enum: ESTADOS_EQUIPO, default: 'ACTIVO' })
  estado: string;

  @Prop({ required: true, enum: CRITICIDADES_EQUIPO, default: 'MEDIA' })
  criticidad: string;
}

export const EquipoSchema = SchemaFactory.createForClass(Equipo);
