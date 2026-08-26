import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { TIPOS_CATALOGO } from '../schemas/catalogo.schema';

export class CreateCatalogoDto {
  @IsEnum(TIPOS_CATALOGO, { message: 'Tipo de catalogo invalido.' })
  tipo: string;

  @IsString()
  @IsNotEmpty({ message: 'El valor del catalogo es obligatorio.' })
  valor: string;

  // Requerido cuando tipo === 'subTipo': el tipoEquipo padre.
  @IsOptional()
  @IsString()
  padre?: string;
}
