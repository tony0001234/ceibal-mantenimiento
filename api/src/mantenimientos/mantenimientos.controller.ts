import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { MantenimientosService } from './mantenimientos.service';
import { CreateMantenimientoDto } from './dto/create-mantenimiento.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { UsuarioActual } from '../common/decorators/usuario-actual.decorator';

// Bitacora digital de mantenimiento (RF03-RF06).
@ApiTags('mantenimientos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('mantenimientos')
export class MantenimientosController {
  constructor(private readonly mantenimientosService: MantenimientosService) {}

  // El tecnico responsable se toma automaticamente del usuario autenticado (RF03).
  @Post()
  create(
    @Body() dto: CreateMantenimientoDto,
    @UsuarioActual('id') tecnicoId: string,
  ) {
    return this.mantenimientosService.create(dto, tecnicoId);
  }

  @Get()
  findAll(
    @Query('equipo') equipo?: string,
    @Query('tipoTrabajo') tipoTrabajo?: string,
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
    @Query('limite') limite?: string,
  ) {
    return this.mantenimientosService.findAll({
      equipo,
      tipoTrabajo,
      desde,
      hasta,
      limite: limite ? Number(limite) : undefined,
    });
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
