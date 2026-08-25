import { PartialType } from '@nestjs/mapped-types';
import { CreateUsuarioDto } from './create-usuario.dto';

// Todos los campos opcionales; la contrasena solo se actualiza si se envia.
export class UpdateUsuarioDto extends PartialType(CreateUsuarioDto) {}
