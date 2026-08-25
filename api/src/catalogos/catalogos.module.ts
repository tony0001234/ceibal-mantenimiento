import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CatalogosService } from './catalogos.service';
import { CatalogosController } from './catalogos.controller';
import { Catalogo, CatalogoSchema } from './schemas/catalogo.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Catalogo.name, schema: CatalogoSchema },
    ]),
  ],
  controllers: [CatalogosController],
  providers: [CatalogosService],
  exports: [CatalogosService],
})
export class CatalogosModule {}
