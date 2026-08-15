import { Test, TestingModule } from '@nestjs/testing';
import { MantenimientosService } from './mantenimientos.service';

describe('MantenimientosService', () => {
  let service: MantenimientosService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MantenimientosService],
    }).compile();

    service = module.get<MantenimientosService>(MantenimientosService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
