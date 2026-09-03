import { IsEnum, IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import {
  ESTADOS_EQUIPO,
  CRITICIDADES_EQUIPO,
  CATEGORIAS_MANTENIMIENTO,
} from '../schemas/equipo.schema';

// Valores válidos de categoría (incluye '' para "sin categoría").
const CATEGORIAS_VALIDAS = ['', ...CATEGORIAS_MANTENIMIENTO.map((c) => c.valor)];

export class CreateEquipoDto {
  @IsString()
  @IsNotEmpty({ message: 'El numero de bien es obligatorio.' })
  codigoInventario: string;

  @IsString()
  @IsNotEmpty()
  nombre: string;

  // tipoEquipo, subTipo y marca son catalogos editables (texto).
  @IsString()
  @IsNotEmpty({ message: 'Seleccione el tipo de equipo.' })
  tipoEquipo: string;

  @IsString()
  @IsNotEmpty({ message: 'Seleccione el subtipo.' })
  subTipo: string;

  @IsString()
  @IsNotEmpty({ message: 'Seleccione la marca.' })
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

  // Categoría de contrato / periodicidad de mantenimiento (para el costo).
  @IsOptional()
  @IsIn(CATEGORIAS_VALIDAS, { message: 'Categoría de mantenimiento inválida.' })
  categoria?: string;
}
