import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { MantenimientosService } from './mantenimientos.service';
import { CreateMantenimientoDto } from './dto/create-mantenimiento.dto';
import { UpdateMantenimientoDto } from './dto/update-mantenimiento.dto';

@Controller('mantenimientos')
export class MantenimientosController {
  constructor(private readonly mantenimientosService: MantenimientosService) {}

  @Post()
  create(@Body() createMantenimientoDto: CreateMantenimientoDto) {
    return this.mantenimientosService.create(createMantenimientoDto);
  }

  @Get()
  findAll() {
    return this.mantenimientosService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.mantenimientosService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateMantenimientoDto: UpdateMantenimientoDto) {
    return this.mantenimientosService.update(+id, updateMantenimientoDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.mantenimientosService.remove(+id);
  }
}
