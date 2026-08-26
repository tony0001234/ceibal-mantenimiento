import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { ROLES } from '../schemas/usuario.schema';

export class CreateUsuarioDto {
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsEmail({}, { message: 'El correo no tiene un formato valido.' })
  correo: string;

  @IsString()
  @MinLength(6, { message: 'La contrasena debe tener al menos 6 caracteres.' })
  contrasena: string;

  @IsEnum(ROLES, { message: 'Rol invalido.' })
  rol: string;

  // Empresa afiliada (obligatoria): id de una empresa existente.
  @IsMongoId({ message: 'Seleccione una empresa afiliada valida.' })
  empresa: string;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
