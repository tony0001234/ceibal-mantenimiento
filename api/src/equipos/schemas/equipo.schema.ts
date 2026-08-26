import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type EquipoDocument = Equipo & Document;

// Valores INICIALES sugeridos (para poblar los catalogos). tipoEquipo, subTipo
// y marca ahora son CATALOGOS EDITABLES (texto libre validado contra el catalogo
// en el frontend), por eso el validador de "equipo" ya no los restringe por enum.
export const TIPOS_EQUIPO = ['Refrigeración'] as const;
export const SUBTIPOS_EQUIPO = [
  'Split',
  'Mini-split',
  'Cassette',
  'Ventana',
  'Paquete',
] as const;
export const MARCAS_EQUIPO = [
  'Rheem', 'Tempstar', 'York', 'Comfortstar', 'Lennox', 'Adina',
  'Mcquay Daikin', 'Fedders', 'Aireone', 'Primiumcool', 'S/M',
  'Pretul', 'Premium', 'Innovair', 'Everwell',
] as const;

// estado y criticidad SIGUEN siendo listas fijas (la logica del sistema y los
// reportes dependen de estos valores exactos).
export const ESTADOS_EQUIPO = ['ACTIVO', 'INACTIVO', 'MANTENIMIENTO', 'BAJA'] as const;
export const CRITICIDADES_EQUIPO = ['BAJA', 'MEDIA', 'ALTA', 'CRITICA'] as const;

@Schema({ timestamps: true, collection: 'equipo' })
export class Equipo {
  @Prop({ required: true, unique: true, trim: true })
  codigoInventario: string;

  @Prop({ required: true, trim: true })
  nombre: string;

  // Catalogo editable (sin enum en el validador).
  @Prop({ required: true, trim: true })
  tipoEquipo: string;

  @Prop({ required: true, trim: true })
  subTipo: string;

  @Prop({ required: true, trim: true })
  marca: string;

  @Prop({ required: true, trim: true })
  serie: string;

  @Prop({ required: true, trim: true })
  ubicacion: string;

  // Fijos (sistema).
  @Prop({ required: true, enum: ESTADOS_EQUIPO, default: 'ACTIVO' })
  estado: string;

  @Prop({ required: true, enum: CRITICIDADES_EQUIPO, default: 'MEDIA' })
  criticidad: string;
}

export const EquipoSchema = SchemaFactory.createForClass(Equipo);
