import { IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  // RF01: el usuario inicia sesion con su correo institucional.
  @IsString()
  @IsNotEmpty({ message: 'El correo es obligatorio.' })
  correo: string;

  @IsString()
  @IsNotEmpty({ message: 'La contrasena es obligatoria.' })
  contrasena: string;
}
