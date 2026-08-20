import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
 
export type EquipoDocument = Equipo & Document;
 
@Schema({ timestamps: true })
export class Equipo {
  @Prop({ required: true, unique: true, trim: true })
  codigoInventario: string;
 
  @Prop({ required: true, trim: true })
  nombre: string;
 
  @Prop({ required: true })
  tipoEquipo: string;
 
  @Prop()
  subtipo: string;
 
  @Prop({ required: true })
  marca: string;
 
  @Prop()
  modelo: string;
 
  @Prop({ required: true })
  ubicacion: string;
 
  @Prop({ enum: ['operativo', 'fuera_de_servicio', 'en_mantenimiento'], default: 'operativo' })
  estado: string;
 
  @Prop({ enum: ['alta', 'media', 'baja'], default: 'media' })
  criticidad: string;
}
 
export const EquipoSchema = SchemaFactory.createForClass(Equipo);