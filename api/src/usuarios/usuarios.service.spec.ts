import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { UsuariosService } from './usuarios.service';
import { Usuario } from './schemas/usuario.schema';
import { Empresa } from '../empresas/schema/empresa.schema';

// UsuariosService inyecta el modelo Usuario y el modelo Empresa (para validar
// la empresa afiliada). Ambos se mockean aqui.
describe('UsuariosService', () => {
  let service: UsuariosService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsuariosService,
        { provide: getModelToken(Usuario.name), useValue: {} },
        { provide: getModelToken(Empresa.name), useValue: {} },
      ],
    }).compile();

    service = module.get<UsuariosService>(UsuariosService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
