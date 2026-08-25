import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MantenimientosService } from './mantenimientos.service';
import { MantenimientosController } from './mantenimientos.controller';
import {
  Mantenimiento,
  MantenimientoSchema,
} from './schemas/mantenimiento.schema';
import { EquiposModule } from '../equipos/equipos.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Mantenimiento.name, schema: MantenimientoSchema },
    ]),
    EquiposModule,
  ],
  controllers: [MantenimientosController],
  providers: [MantenimientosService],
  exports: [MantenimientosService],
})
export class MantenimientosModule {}
