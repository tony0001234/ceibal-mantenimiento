import { Test, TestingModule } from '@nestjs/testing';
import { MantenimientosController } from './mantenimientos.controller';
import { MantenimientosService } from './mantenimientos.service';

describe('MantenimientosController', () => {
  let controller: MantenimientosController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MantenimientosController],
      providers: [MantenimientosService],
    }).compile();

    controller = module.get<MantenimientosController>(MantenimientosController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
