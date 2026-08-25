import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ReportesService } from './reportes.service';
import { ReportesController } from './reportes.controller';
import {
  Mantenimiento,
  MantenimientoSchema,
} from '../mantenimientos/schemas/mantenimiento.schema';
import { Equipo, EquipoSchema } from '../equipos/schemas/equipo.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Mantenimiento.name, schema: MantenimientoSchema },
      { name: Equipo.name, schema: EquipoSchema },
    ]),
  ],
  controllers: [ReportesController],
  providers: [ReportesService],
})
export class ReportesModule {}
