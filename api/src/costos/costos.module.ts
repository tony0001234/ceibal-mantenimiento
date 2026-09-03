import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CostosService } from './costos.service';
import { CostosController } from './costos.controller';
import {
  ConfiguracionCosto,
  ConfiguracionCostoSchema,
} from './schemas/configuracion-costo.schema';
import { Equipo, EquipoSchema } from '../equipos/schemas/equipo.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ConfiguracionCosto.name, schema: ConfiguracionCostoSchema },
      { name: Equipo.name, schema: EquipoSchema },
    ]),
  ],
  controllers: [CostosController],
  providers: [CostosService],
  exports: [CostosService],
})
export class CostosModule {}
