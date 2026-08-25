import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  FiltrosEquipos,
  FiltrosReporte,
  ReportesService,
} from './reportes.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('reportes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('reportes')
export class ReportesController {
  constructor(private readonly reportesService: ReportesService) {}

  // Panel de indicadores (RF08): supervisor y administrador.
  @Roles('administrador', 'supervisor')
  @Get('indicadores')
  indicadores() {
    return this.reportesService.indicadores();
  }

  // Vista previa del reporte (RF07): supervisor y administrador.
  @Roles('administrador', 'supervisor')
  @Get('preview')
  preview(@Query() filtros: FiltrosReporte) {
    return this.reportesService.preview(filtros);
  }

  @Roles('administrador', 'supervisor')
  @Get('excel')
  async excel(@Query() filtros: FiltrosReporte, @Res() res: Response) {
    const wb = await this.reportesService.generarExcel(filtros);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=reporte-mantenimientos.xlsx',
    );
    await wb.xlsx.write(res);
    res.end();
  }

  @Roles('administrador', 'supervisor')
  @Get('pdf')
  async pdf(@Query() filtros: FiltrosReporte, @Res() res: Response) {
    const buffer = await this.reportesService.generarPdf(filtros);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=reporte-mantenimientos.pdf',
    );
    res.end(buffer);
  }

  // ---------- Reporte de equipos en alta (inventario) ----------
  @Roles('administrador', 'supervisor')
  @Get('equipos/preview')
  equiposPreview(@Query() f: FiltrosEquipos) {
    return this.reportesService.equiposReporte(f);
  }

  @Roles('administrador', 'supervisor')
  @Get('equipos/excel')
  async equiposExcel(@Query() f: FiltrosEquipos, @Res() res: Response) {
    const wb = await this.reportesService.generarEquiposExcel(f);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=reporte-equipos-en-alta.xlsx',
    );
    await wb.xlsx.write(res);
    res.end();
  }

  @Roles('administrador', 'supervisor')
  @Get('equipos/pdf')
  async equiposPdf(@Query() f: FiltrosEquipos, @Res() res: Response) {
    const buffer = await this.reportesService.generarEquiposPdf(f);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=reporte-equipos-en-alta.pdf',
    );
    res.end(buffer);
  }
}
