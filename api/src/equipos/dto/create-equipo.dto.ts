import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ESTADOS_EQUIPO, CRITICIDADES_EQUIPO } from '../schemas/equipo.schema';

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
  // Texto libre: las categorías son extensibles desde el módulo de Costos.
  @IsOptional()
  @IsString()
  categoria?: string;
}
