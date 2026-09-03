import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsuariosModule } from './usuarios/usuarios.module';
import { EmpresasModule } from './empresas/empresas.module';
import { EquiposModule } from './equipos/equipos.module';
import { MantenimientosModule } from './mantenimientos/mantenimientos.module';
import { CatalogosModule } from './catalogos/catalogos.module';
import { ReportesModule } from './reportes/reportes.module';
import { CostosModule } from './costos/costos.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('MONGODB_URI'),
      }),
    }),
    AuthModule,
    UsuariosModule,
    EmpresasModule,
    EquiposModule,
    MantenimientosModule,
    CatalogosModule,
    ReportesModule,
    CostosModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
