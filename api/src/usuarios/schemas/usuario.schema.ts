import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type UsuarioDocument = Usuario & Document;

export const ROLES = ['tecnico', 'supervisor', 'administrador', 'auditor'] as const;
export type Rol = (typeof ROLES)[number];

// collection: 'usuario' (singular) para coincidir con la coleccion validada.
@Schema({ timestamps: true, collection: 'usuario' })
export class Usuario {
  @Prop({ required: true, trim: true })
  nombre: string;

  @Prop({ required: true, unique: true, trim: true, lowercase: true })
  correo: string;

  @Prop({ required: true, select: false })
  contrasenaHash: string;

  @Prop({ required: true, enum: ROLES, default: 'tecnico' })
  rol: Rol;

  // Empresa afiliada del usuario (regla de negocio: toda persona pertenece a
  // una empresa). El NIT y el telefono viven en la empresa referenciada.
  // El validador de "usuario" no lo exige, pero la app SI (DTO).
  @Prop({ type: Types.ObjectId, ref: 'Empresa', required: true })
  empresa: Types.ObjectId;

  @Prop({ required: true, default: true })
  activo: boolean;
}

export const UsuarioSchema = SchemaFactory.createForClass(Usuario);
