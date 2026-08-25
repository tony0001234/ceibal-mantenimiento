import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UsuarioDocument = Usuario & Document;

// Roles segun el validador real de la coleccion "usuario" (incluye "auditor").
// El documento principal prioriza tecnico/supervisor/administrador; auditor se
// admite por compatibilidad con la base de datos (solo lectura en la interfaz).
export const ROLES = ['tecnico', 'supervisor', 'administrador', 'auditor'] as const;
export type Rol = (typeof ROLES)[number];

// collection: 'usuario' (singular) para coincidir con la coleccion validada.
@Schema({ timestamps: true, collection: 'usuario' })
export class Usuario {
  @Prop({ required: true, trim: true })
  nombre: string;

  // Correo institucional: es el identificador de inicio de sesion (RF01).
  @Prop({ required: true, unique: true, trim: true, lowercase: true })
  correo: string;

  // RNF01: nunca se guarda la contrasena en texto plano, solo su hash bcrypt.
  @Prop({ required: true, select: false })
  contrasenaHash: string;

  @Prop({ required: true, enum: ROLES, default: 'tecnico' })
  rol: Rol;

  @Prop({ required: true, default: true })
  activo: boolean;
}

export const UsuarioSchema = SchemaFactory.createForClass(Usuario);
