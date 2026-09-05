import { PartialType } from '@nestjs/mapped-types';
import { CreateMantenimientoDto } from './create-mantenimiento.dto';

// Edición de un mantenimiento existente (RF06 / Historial). Hereda las MISMAS
// validaciones del registro; todos los campos son opcionales para permitir
// correcciones parciales, pero el formulario de edición envía el registro
// completo. La regla de precio se vuelve a aplicar en el servicio.
export class UpdateMantenimientoDto extends PartialType(CreateMantenimientoDto) {}
