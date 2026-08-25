import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

// El validador de la coleccion "empresa" exige nombre, nit, correo y telefono.
export class CreateEmpresaDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre de la empresa es obligatorio.' })
  nombre: string;

  @IsString()
  @IsNotEmpty({ message: 'El NIT es obligatorio.' })
  nit: string;

  @IsString()
  @IsNotEmpty({ message: 'El correo es obligatorio.' })
  correo: string;

  @IsString()
  @IsNotEmpty({ message: 'El telefono es obligatorio.' })
  telefono: string;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
