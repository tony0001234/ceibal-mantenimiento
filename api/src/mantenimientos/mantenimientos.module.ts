import { Module } from '@nestjs/common';
import { MantenimientosService } from './mantenimientos.service';
import { MantenimientosController } from './mantenimientos.controller';

@Module({
  controllers: [MantenimientosController],
  providers: [MantenimientosService],
})
export class MantenimientosModule {}
