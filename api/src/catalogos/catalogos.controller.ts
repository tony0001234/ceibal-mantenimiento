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
import { CatalogosService } from './catalogos.service';
import { CreateCatalogoDto } from './dto/create-catalogo.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

// Catalogos editables (RF10). Lectura para cualquier rol; edicion solo admin.
@ApiTags('catalogos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('catalogos')
export class CatalogosController {
  constructor(private readonly catalogosService: CatalogosService) {}

  @Get()
  findAll(@Query('tipo') tipo?: string) {
    return this.catalogosService.findAll(tipo);
  }

  @Roles('administrador')
  @Post()
  create(@Body() dto: CreateCatalogoDto) {
    return this.catalogosService.create(dto);
  }

  @Roles('administrador')
  @Patch(':id/desactivar')
  desactivar(@Param('id') id: string) {
    return this.catalogosService.desactivar(id);
  }
}
