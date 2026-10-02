/**
 * Pruebas deterministas (sin base de datos) de los filtros de equipo del
 * reporte de mantenimientos: los atributos del equipo se resuelven a una lista
 * de ids y se combinan con la selección puntual y con "solo equipos en alta".
 */
import { Types } from 'mongoose';
import { ReportesService } from './reportes.service';

// Modelo de equipos simulado: captura la consulta y devuelve ids fijos.
const crearServicio = (ids: Types.ObjectId[] = []) => {
  const consultas: any[] = [];
  const equipoModel: any = {
    find: (q: any) => {
      consultas.push(q);
      return { distinct: async () => ids };
    },
  };
  const service = new ReportesService({} as any, equipoModel, {} as any);
  const filtro = (f: any) => (service as any).construirFiltro(f);
  return { filtro, consultas };
};

describe('Filtros de equipo del reporte de mantenimientos', () => {
  it('sin filtros de equipo no consulta equipos', async () => {
    const { filtro, consultas } = crearServicio();
    const f = await filtro({ tipoTrabajo: 'preventivo' });
    expect(consultas).toHaveLength(0);
    expect(f).toEqual({ tipoTrabajo: 'preventivo' });
  });

  it('un equipo puntual sin otros filtros filtra por su id', async () => {
    const id = new Types.ObjectId();
    const { filtro, consultas } = crearServicio();
    const f = await filtro({ equipo: String(id) });
    expect(consultas).toHaveLength(0);
    expect(String(f.equipo)).toBe(String(id));
  });

  it('combina todos los atributos del equipo en una sola consulta', async () => {
    const ids = [new Types.ObjectId(), new Types.ObjectId()];
    const { filtro, consultas } = crearServicio(ids);
    const f = await filtro({
      buscar: 'radio(logía)',
      tipoEquipo: 'Refrigeración',
      subTipo: 'Split',
      marca: 'York',
      estado: 'ACTIVO',
      ubicacion: 'Radiologia',
      categoria: 'mensual_ac',
    });
    const cond = consultas[0].$and;
    expect(cond).toEqual(
      expect.arrayContaining([
        { tipoEquipo: 'Refrigeración' },
        { subTipo: 'Split' },
        { marca: 'York' },
        { estado: 'ACTIVO' },
        { ubicacion: 'Radiologia' },
        { categoria: 'mensual_ac' },
      ]),
    );
    // La búsqueda escapa caracteres especiales de expresión regular.
    const busqueda = cond.find((c: any) => c.$or);
    expect(busqueda.$or[0].codigoInventario.test('radio(logía)')).toBe(true);
    expect(f.equipo).toEqual({ $in: ids });
  });

  it('"solo en alta" excluye los equipos dados de baja junto con los atributos', async () => {
    const { filtro, consultas } = crearServicio();
    await filtro({ excluirBaja: 'true', marca: 'York' });
    expect(consultas[0].$and).toEqual(
      expect.arrayContaining([{ estado: { $ne: 'BAJA' } }, { marca: 'York' }]),
    );
  });

  it('un equipo puntual con atributos exige que cumpla ambos', async () => {
    const id = new Types.ObjectId();
    const { filtro, consultas } = crearServicio();
    await filtro({ equipo: String(id), ubicacion: 'Radiologia' });
    const cond = consultas[0].$and;
    expect(cond).toContainEqual({ ubicacion: 'Radiologia' });
    expect(String(cond.find((c: any) => c._id)._id)).toBe(String(id));
  });
});
