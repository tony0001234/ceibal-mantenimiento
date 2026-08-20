import { Module } from '@nestjs/common';
import { EquiposService } from './equipos.service';
import { EquiposController } from './equipos.controller';
import { Mongoose } from 'mongoose';
@Module({
  controllers: [EquiposController],
  providers: [EquiposService],
})

MongooseModule.forFeature([{ name: Equipo.name, schema: EquipoSchema }])

export class EquiposModule {}