import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CatalogoDocument = Catalogo & Document;

// Tipos de catalogo EDITABLES. Solo "ubicacion" es editable: en el validador
// de "equipo" la ubicacion es texto libre (sin enum), por lo que representa una
// lista controlada de servicios/areas del hospital (guia Fase 1: "String (catalogo)").
// Los demas (tipoEquipo, marca, subTipo, estado, criticidad) son ENUM FIJOS en el
// validador y no se editan desde aqui.
export const TIPOS_CATALOGO = ['ubicacion'] as const;

// Coleccion propia de la aplicacion (no forma parte de las 4 colecciones
// validadas). Nombre en singular por coherencia con el resto de la BD.
@Schema({ timestamps: true, collection: 'catalogo' })
export class Catalogo {
  @Prop({ required: true, enum: TIPOS_CATALOGO })
  tipo: string;

  @Prop({ required: true, trim: true })
  valor: string;

  @Prop({ default: true })
  activo: boolean;
}

export const CatalogoSchema = SchemaFactory.createForClass(Catalogo);

// Evita valores duplicados dentro de un mismo tipo de catalogo.
CatalogoSchema.index({ tipo: 1, valor: 1 }, { unique: true });
