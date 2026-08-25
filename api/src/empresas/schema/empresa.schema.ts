import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type EmpresaDocument = Empresa & Document;

// collection: 'empresa' (singular) para coincidir con la coleccion validada.
// El validador exige nombre, nit, correo, telefono y activo.
@Schema({ timestamps: true, collection: 'empresa' })
export class Empresa {
  @Prop({ required: true, trim: true })
  nombre: string;

  @Prop({ required: true, trim: true })
  nit: string;

  @Prop({ required: true, trim: true })
  correo: string;

  @Prop({ required: true, trim: true })
  telefono: string;

  @Prop({ required: true, default: true })
  activo: boolean;
}

export const EmpresaSchema = SchemaFactory.createForClass(Empresa);
