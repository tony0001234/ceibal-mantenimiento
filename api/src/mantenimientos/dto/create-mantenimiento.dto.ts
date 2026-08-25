import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

const HORA = /^([01]\d|2[0-3]):([0-5]\d)$/;

export class CreateMantenimientoDto {
  @IsMongoId({ message: 'Seleccione un equipo del catalogo.' })
  equipo: string;

  // Obligatorio (el validador de la BD lo exige).
  @IsMongoId({ message: 'Seleccione la empresa/proveedor.' })
  empresa: string;

  @IsEnum(['mensual', 'cuatrimestral', 'garantia'], {
    message: 'Seleccione el periodo de mantenimiento.',
  })
  periodo: string;

  @IsEnum(['preventivo', 'correctivo', 'llamada_emergencia', 'evaluacion_interna'], {
    message: 'Seleccione el tipo de mantenimiento.',
  })
  tipoTrabajo: string;

  @IsString()
  @IsNotEmpty({ message: 'Describa el trabajo realizado.' })
  descripcionTrabajo: string;

  @IsOptional()
  @IsString()
  repuestosObservaciones?: string;

  @IsEnum(['funcionando', 'fuera_de_servicio'])
  estadoEquipoResultante: string;

  @IsDateString({}, { message: 'Fecha invalida.' })
  fechaMantenimiento: string;

  // Se reciben como "HH:MM"; el backend las combina con la fecha en un Date.
  @Matches(HORA, { message: 'La hora de entrada debe tener formato HH:MM.' })
  horaInicio: string;

  @Matches(HORA, { message: 'La hora de salida debe tener formato HH:MM.' })
  horaFin: string;

  // Si el usuario confirma un posible duplicado (RF05), se reenvia en true.
  @IsOptional()
  @IsBoolean()
  confirmarDuplicado?: boolean;
}
