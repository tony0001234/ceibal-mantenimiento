import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EmpresasService } from './empresas.service';
import { EmpresasController } from './empresas.controller';
import { Empresa, EmpresaSchema } from './schema/empresa.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Empresa.name, schema: EmpresaSchema }]),
  ],
  controllers: [EmpresasController],
  providers: [EmpresasService],
  exports: [EmpresasService],
})
export class EmpresasModule {}
