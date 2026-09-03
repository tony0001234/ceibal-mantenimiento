import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CostosService } from './costos.service';
import { UpsertConfiguracionCostoDto } from './dto/upsert-configuracion-costo.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import {
  CATEGORIAS_MANTENIMIENTO,
} from '../equipos/schemas/equipo.schema';
import { PERIODICIDADES } from './schemas/configuracion-costo.schema';

// Configuración y cálculo del costo de mantenimiento por categoría (req 3-8).
// Módulo restringido al rol administrador (req 6).
@ApiTags('costos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('administrador')
@Controller('costos')
export class CostosController {
  constructor(private readonly costosService: CostosService) {}

  // Catálogos de apoyo para el formulario (categorías y periodicidades).
  @Get('opciones')
  opciones() {
    return {
      categorias: CATEGORIAS_MANTENIMIENTO,
      periodicidades: PERIODICIDADES,
    };
  }

  @Get()
  findAll() {
    return this.costosService.findAll();
  }

  // Costo vigente por categoría (solo lectura). Disponible para todos los roles
  // porque el registro de mantenimiento (técnico/supervisor) necesita mostrarlo.
  // No expone la configuración completa, solo el costo por mantenimiento.
  @Roles('administrador', 'supervisor', 'tecnico', 'auditor')
  @Get('vigente')
  async vigente(@Query('categoria') categoria: string) {
    return { categoria, costo: await this.costosService.costoVigente(categoria) };
  }

  // Sugiere la cantidad de equipos (no dados de baja) de una categoría.
  @Get('conteo')
  async conteo(@Query('categoria') categoria: string) {
    return { categoria, cantidad: await this.costosService.contarEquipos(categoria) };
  }

  @Post()
  upsert(@Body() dto: UpsertConfiguracionCostoDto) {
    return this.costosService.upsert(dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.costosService.remove(id);
  }
}
