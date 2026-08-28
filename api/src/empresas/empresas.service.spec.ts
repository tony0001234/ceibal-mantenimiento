import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { EmpresasService } from './empresas.service';
import { Empresa } from './schema/empresa.schema';

describe('EmpresasService', () => {
  let service: EmpresasService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmpresasService,
        { provide: getModelToken(Empresa.name), useValue: {} },
      ],
    }).compile();

    service = module.get<EmpresasService>(EmpresasService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
