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
import { MantenimientosService } from './mantenimientos.service';
import { CreateMantenimientoDto } from './dto/create-mantenimiento.dto';
import { UpdateMantenimientoDto } from './dto/update-mantenimiento.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UsuarioActual } from '../common/decorators/usuario-actual.decorator';

// Bitacora digital de mantenimiento (RF03-RF06).
@ApiTags('mantenimientos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('mantenimientos')
export class MantenimientosController {
  constructor(private readonly mantenimientosService: MantenimientosService) {}

  // El tecnico y la empresa se toman automaticamente del usuario autenticado
  // (RF03 + regla de afiliacion). El cliente no puede elegir otra empresa.
  @Post()
  create(
    @Body() dto: CreateMantenimientoDto,
    @UsuarioActual() user: any,
  ) {
    return this.mantenimientosService.create(dto, user.id, user?.empresa?.id);
  }

  @Get()
  findAll(
    @Query('equipo') equipo?: string,
    @Query('tipoTrabajo') tipoTrabajo?: string,
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
    @Query('limite') limite?: string,
    // Filtros por atributos del equipo (mismos que la pestaña Equipos).
    @Query('buscar') buscar?: string,
    @Query('tipoEquipo') tipoEquipo?: string,
    @Query('subTipo') subTipo?: string,
    @Query('marca') marca?: string,
    @Query('estado') estado?: string,
    @Query('ubicacion') ubicacion?: string,
    @Query('categoria') categoria?: string,
  ) {
    return this.mantenimientosService.findAll({
      equipo,
      tipoTrabajo,
      desde,
      hasta,
      limite: limite ? Number(limite) : undefined,
      buscar,
      tipoEquipo,
      subTipo,
      marca,
      estado,
      ubicacion,
      categoria,
    });
  }

  // Edición de un registro histórico (RF06). Solo administrador y supervisor.
  @Roles('administrador', 'supervisor')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateMantenimientoDto) {
    return this.mantenimientosService.update(id, dto);
  }

  // RF05: verificacion de posible duplicado (usada en vivo por el formulario).
  @Get('duplicado')
  async duplicado(
    @Query('equipo') equipo: string,
    @Query('fecha') fecha: string,
  ) {
    if (!equipo || !fecha) return { duplicado: false };
    const registro = await this.mantenimientosService.buscarDuplicado(
      equipo,
      fecha,
    );
    return {
      duplicado: !!registro,
      registroId: registro?._id ?? null,
    };
  }
}
