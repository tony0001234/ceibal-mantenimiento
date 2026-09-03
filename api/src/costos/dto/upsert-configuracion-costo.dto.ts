import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsNotEmpty,
  Min,
} from 'class-validator';

// DTO para crear/editar una configuración de costo (req 3, 8).
// El costoCalculado NO se recibe del cliente: lo calcula el backend con la
// fórmula (monto / equipos) / periodos, para centralizar el cálculo.
export class UpsertConfiguracionCostoDto {
  @IsString()
  @IsNotEmpty({ message: 'Seleccione la categoría de equipos.' })
  categoria: string;

  @IsNumber({}, { message: 'El monto ofertado debe ser numérico.' })
  @IsPositive({ message: 'El monto ofertado debe ser mayor que 0.' })
  montoOfertado: number;

  @IsNumber({}, { message: 'La cantidad de equipos debe ser numérica.' })
  @IsPositive({ message: 'La cantidad de equipos debe ser mayor que 0.' })
  cantidadEquipos: number;

  @IsString()
  @IsNotEmpty({ message: 'Indique la periodicidad.' })
  periodicidad: string;

  @IsNumber({}, { message: 'El número de períodos debe ser numérico.' })
  @Min(1, { message: 'El número de períodos debe ser mayor que 0.' })
  numeroPeriodos: number;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
