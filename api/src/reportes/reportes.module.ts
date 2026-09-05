import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ReportesService } from './reportes.service';
import { ReportesController } from './reportes.controller';
import {
  Mantenimiento,
  MantenimientoSchema,
} from '../mantenimientos/schemas/mantenimiento.schema';
import { Equipo, EquipoSchema } from '../equipos/schemas/equipo.schema';
import { Catalogo, CatalogoSchema } from '../catalogos/schemas/catalogo.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Mantenimiento.name, schema: MantenimientoSchema },
      { name: Equipo.name, schema: EquipoSchema },
      { name: Catalogo.name, schema: CatalogoSchema },
    ]),
  ],
  controllers: [ReportesController],
  providers: [ReportesService],
})
export class ReportesModule {}
