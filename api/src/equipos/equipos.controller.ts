import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { EquiposService } from './equipos.service';
import { CreateEquipoDto } from './dto/create-equipo.dto';
import { UpdateEquipoDto } from './dto/update-equipo.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

// Gestion del inventario de equipos (RF02).
@ApiTags('equipos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('equipos')
export class EquiposController {
  constructor(private readonly equiposService: EquiposService) {}

  // Crear/editar/dar de baja: solo administrador. Consultar: cualquier rol.
  @Roles('administrador')
  @Post()
  create(@Body() dto: CreateEquipoDto) {
    return this.equiposService.create(dto);
  }

  @Get()
  findAll(
    @Query('buscar') buscar?: string,
    @Query('tipoEquipo') tipoEquipo?: string,
    @Query('subTipo') subTipo?: string,
    @Query('marca') marca?: string,
    @Query('estado') estado?: string,
    @Query('ubicacion') ubicacion?: string,
  ) {
    return this.equiposService.findAll({ buscar, tipoEquipo, subTipo, marca, estado, ubicacion });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.equiposService.findOne(id);
  }

  @Roles('administrador')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateEquipoDto) {
    return this.equiposService.update(id, dto);
  }

  @Roles('administrador')
  @Patch(':id/baja')
  darDeBaja(@Param('id') id: string) {
    return this.equiposService.darDeBaja(id);
  }
}
