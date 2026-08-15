import { Injectable } from '@nestjs/common';
import { CreateMantenimientoDto } from './dto/create-mantenimiento.dto';
import { UpdateMantenimientoDto } from './dto/update-mantenimiento.dto';

@Injectable()
export class MantenimientosService {
  create(createMantenimientoDto: CreateMantenimientoDto) {
    return 'This action adds a new mantenimiento';
  }

  findAll() {
    return `This action returns all mantenimientos`;
  }

  findOne(id: number) {
    return `This action returns a #${id} mantenimiento`;
  }

  update(id: number, updateMantenimientoDto: UpdateMantenimientoDto) {
    return `This action updates a #${id} mantenimiento`;
  }

  remove(id: number) {
    return `This action removes a #${id} mantenimiento`;
  }
}
