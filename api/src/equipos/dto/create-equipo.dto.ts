import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import {
  TIPOS_EQUIPO,
  SUBTIPOS_EQUIPO,
  MARCAS_EQUIPO,
  ESTADOS_EQUIPO,
  CRITICIDADES_EQUIPO,
} from '../schemas/equipo.schema';

export class CreateEquipoDto {
  @IsString()
  @IsNotEmpty({ message: 'El numero de bien es obligatorio.' })
  codigoInventario: string;

  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsEnum(TIPOS_EQUIPO, { message: 'Tipo de equipo invalido.' })
  tipoEquipo: string;

  @IsEnum(SUBTIPOS_EQUIPO, { message: 'Subtipo invalido.' })
  subTipo: string;

  @IsEnum(MARCAS_EQUIPO, { message: 'Marca invalida.' })
  marca: string;

  @IsString()
  @IsNotEmpty({ message: 'El numero de serie es obligatorio.' })
  serie: string;

  @IsString()
  @IsNotEmpty()
  ubicacion: string;

  @IsOptional()
  @IsEnum(ESTADOS_EQUIPO)
  estado?: string;

  @IsOptional()
  @IsEnum(CRITICIDADES_EQUIPO)
  criticidad?: string;
}
