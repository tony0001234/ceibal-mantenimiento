/**
 * Pruebas deterministas (sin base de datos) del servicio de catalogos editables.
 *  - subTipo exige un padre (tipoEquipo).
 *  - un valor normal (marca) se crea con padre null.
 *  - un valor duplicado es rechazado.
 */
import { BadRequestException, ConflictException } from '@nestjs/common';
import { CatalogosService } from './catalogos.service';

function modeloConFindOne(resultado: any) {
  let capturado: any = null;
  const modelo: any = function (payload: any) {
    capturado = payload;
    return { save: async () => ({ ...payload, _id: 'x' }) };
  };
  modelo.findOne = () => Promise.resolve(resultado);
  modelo.__payload = () => capturado;
  return modelo;
}

describe('CatalogosService', () => {
  it('rechaza un subTipo sin padre', async () => {
    const service = new CatalogosService(modeloConFindOne(null));
    await expect(
      service.create({ tipo: 'subTipo', valor: 'Cassette' } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('crea un subTipo con su padre (tipoEquipo)', async () => {
    const modelo = modeloConFindOne(null);
    const service = new CatalogosService(modelo);
    await service.create({ tipo: 'subTipo', valor: 'Cassette', padre: 'Refrigeración' } as any);
    expect(modelo.__payload().padre).toBe('Refrigeración');
    expect(modelo.__payload().valor).toBe('Cassette');
  });

  it('crea una marca con padre null', async () => {
    const modelo = modeloConFindOne(null);
    const service = new CatalogosService(modelo);
    await service.create({ tipo: 'marca', valor: 'York' } as any);
    expect(modelo.__payload().padre).toBeNull();
  });

  it('rechaza un valor duplicado', async () => {
    const service = new CatalogosService(modeloConFindOne({ _id: 'ya-existe' }));
    await expect(
      service.create({ tipo: 'marca', valor: 'York' } as any),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
