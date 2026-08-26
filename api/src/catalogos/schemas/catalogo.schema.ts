import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CatalogoDocument = Catalogo & Document;

// Catalogos EDITABLES desde Administracion:
//  - tipoEquipo, subTipo, marca, ubicacion  (texto libre controlado)
// estado y criticidad NO son catalogos editables: son listas fijas del sistema.
export const TIPOS_CATALOGO = [
  'tipoEquipo',
  'subTipo',
  'marca',
  'ubicacion',
] as const;

@Schema({ timestamps: true, collection: 'catalogo' })
export class Catalogo {
  @Prop({ required: true, enum: TIPOS_CATALOGO })
  tipo: string;

  @Prop({ required: true, trim: true })
  valor: string;

  // Solo para tipo 'subTipo': el tipoEquipo (valor) al que pertenece.
  @Prop({ trim: true, default: null })
  padre: string | null;

  @Prop({ default: true })
  activo: boolean;
}

export const CatalogoSchema = SchemaFactory.createForClass(Catalogo);

// Evita duplicados dentro de un mismo tipo (y padre, para subtipos).
CatalogoSchema.index({ tipo: 1, valor: 1, padre: 1 }, { unique: true });
