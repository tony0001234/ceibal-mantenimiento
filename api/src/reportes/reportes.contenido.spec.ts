/**
 * Pruebas deterministas (sin base de datos) del contenido configurable del
 * reporte de mantenimientos: columnas del detalle y gráficas incluidas, tanto
 * en la vista previa como en el Excel y el PDF.
 */
import { Types } from 'mongoose';
import { ReportesService } from './reportes.service';
import {
  COLUMNAS_POR_DEFECTO,
  COLUMNAS_REPORTE,
  resolverColumnas,
  resolverGraficas,
  resolverResumen,
} from './columnas.util';

const claves = (cols: { clave: string }[]) => cols.map((c) => c.clave);

// Las columnas que el reporte mostraba antes de ser configurable.
const DE_SIEMPRE = [
  'fecha', 'equipo', 'ubicacion', 'tipo', 'tecnico', 'empresa', 'costo', 'estado',
];

describe('resolverColumnas / resolverGraficas', () => {
  it('sin parámetro devuelve las columnas de siempre, en su orden', () => {
    expect(claves(resolverColumnas(undefined))).toEqual(DE_SIEMPRE);
    expect(COLUMNAS_POR_DEFECTO).toEqual(DE_SIEMPRE);
  });

  it('respeta la selección y la ordena según el catálogo', () => {
    expect(claves(resolverColumnas('descripcion, fecha,equipo'))).toEqual([
      'fecha', 'equipo', 'descripcion',
    ]);
  });

  it('ignora claves desconocidas', () => {
    expect(claves(resolverColumnas('fecha,__proto__,inventada'))).toEqual(['fecha']);
  });

  it('sin ninguna columna válida vuelve a las de siempre', () => {
    expect(claves(resolverColumnas(''))).toEqual(DE_SIEMPRE);
    expect(claves(resolverColumnas('inventada'))).toEqual(DE_SIEMPRE);
  });

  it('ofrece la descripción del trabajo y las demás columnas nuevas, sin marcar', () => {
    const nuevas = COLUMNAS_REPORTE.filter((c) => !c.porDefecto).map((c) => c.clave);
    expect(nuevas).toEqual([
      'serie', 'marca', 'periodo', 'horaInicio', 'horaFin', 'duracion',
      'descripcion', 'repuestos',
    ]);
  });

  it('gráficas: sin parámetro las tres; vacío ninguna; selección parcial', () => {
    expect(resolverGraficas(undefined)).toEqual(['costo', 'emergencias', 'reparaciones']);
    expect(resolverGraficas('')).toEqual([]);
    expect(resolverGraficas('reparaciones,costo,otra')).toEqual(['costo', 'reparaciones']);
  });
});

// ---------- Servicio con un modelo de mantenimientos simulado ----------
const MANTS = [
  {
    _id: new Types.ObjectId(),
    equipo: { _id: new Types.ObjectId(), codigoInventario: '0048CF89', nombre: 'Aire Split', ubicacion: 'Radiologia', serie: 'SN-1', marca: 'York' },
    tecnico: { nombre: 'Pablo Garcia' },
    empresa: { nombre: 'Interno IGSS' },
    periodo: 'mensual',
    tipoTrabajo: 'correctivo',
    descripcionTrabajo: 'Cambio de capacitor del compresor.',
    repuestosObservaciones: 'Capacitor 45uF',
    estadoEquipoResultante: 'funcionando',
    fechaMantenimiento: new Date('2026-08-20'),
    horaInicio: new Date('2026-08-20T08:00:00'),
    horaFin: new Date('2026-08-20T09:30:00'),
    costoMantenimiento: 350,
  },
  {
    _id: new Types.ObjectId(),
    equipo: { _id: new Types.ObjectId(), codigoInventario: '0113LM22', nombre: 'Refrigeradora', ubicacion: 'Laboratorio', serie: '', marca: 'LG' },
    tecnico: { nombre: 'Rosa Lopez' },
    empresa: { nombre: 'Frio Industrial S.A.' },
    periodo: 'garantia',
    tipoTrabajo: 'llamada_emergencia',
    descripcionTrabajo: 'Fuga de refrigerante.',
    repuestosObservaciones: '',
    estadoEquipoResultante: 'fuera_de_servicio',
    fechaMantenimiento: new Date('2026-08-21'),
    horaInicio: new Date('2026-08-21T10:00:00'),
    horaFin: new Date('2026-08-21T10:45:00'),
    costoMantenimiento: 0,
  },
];

const crearServicio = (mants: any[] = MANTS) => {
  const mantenimientoModel: any = {
    find: () => ({
      sort: () => ({ populate: () => ({ exec: async () => mants }) }),
    }),
  };
  return new ReportesService(mantenimientoModel, {} as any, {} as any);
};

const RANGO = { desde: '2026-08-20', hasta: '2026-08-21' };

// Encabezados de la tabla de detalle de la hoja principal del Excel.
const encabezadosExcel = (wb: any): string[] => {
  const ws = wb.getWorksheet('Mantenimientos');
  let fila: any = null;
  ws.eachRow((r: any) => {
    if (!fila && r.getCell(1).value === 'N.o') fila = r;
  });
  const out: string[] = [];
  fila.eachCell((c: any) => out.push(String(c.value)));
  return out;
};
const filaDatosExcel = (wb: any, n = 1): any[] => {
  const ws = wb.getWorksheet('Mantenimientos');
  let num = 0;
  ws.eachRow((r: any, i: number) => {
    if (!num && r.getCell(1).value === 'N.o') num = i;
  });
  const out: any[] = [];
  ws.getRow(num + n).eachCell((c: any) => out.push(c.value));
  return out;
};

describe('Vista previa del reporte', () => {
  it('entrega las horas y la duración ya calculadas', async () => {
    const { resultados, resumen } = await crearServicio().preview(RANGO);
    expect(resultados).toHaveLength(2);
    expect(resultados[0].horaInicioTexto).toBe('08:00');
    expect(resultados[0].horaFinTexto).toBe('09:30');
    expect(resultados[0].duracionMinutos).toBe(90);
    expect(resultados[1].duracionMinutos).toBe(45);
    // Conserva los datos de siempre y el resumen no cambia.
    expect(resultados[0].descripcionTrabajo).toBe('Cambio de capacitor del compresor.');
    expect(resumen.total).toBe(2);
    expect(resumen.costoTotal).toBe(350);
    expect(resumen.seriesDiarias).toHaveLength(2);
  });

  it('un horario invertido (registro antiguo) queda sin duración', async () => {
    const malo = { ...MANTS[0], horaInicio: MANTS[0].horaFin, horaFin: MANTS[0].horaInicio };
    const { resultados } = await crearServicio([malo]).preview(RANGO);
    expect(resultados[0].duracionMinutos).toBeNull();
  });
});

describe('Excel del reporte', () => {
  it('sin selección lleva las columnas de siempre y las hojas de gráficas', async () => {
    const wb = await crearServicio().generarExcel(RANGO);
    expect(encabezadosExcel(wb)).toEqual([
      'N.o', 'Fecha', 'N.o de bien', 'Equipo', 'Ubicación', 'Tipo', 'Técnico',
      'Empresa', 'Costo (Q)', 'Estado final',
    ]);
    expect(wb.getWorksheet('Por dia')).toBeDefined();
    const fila = filaDatosExcel(wb);
    expect(fila.slice(1)).toEqual([
      '2026-08-20', '0048CF89', 'Aire Split', 'Radiologia', 'Correctivo',
      'Pablo Garcia', 'Interno IGSS', 350, 'Funcionando',
    ]);
  });

  it('solo incluye las columnas marcadas, con la descripción del trabajo', async () => {
    const wb = await crearServicio().generarExcel({
      ...RANGO,
      columnas: 'fecha,duracion,descripcion,repuestos,horaInicio,horaFin',
    });
    expect(encabezadosExcel(wb)).toEqual([
      'N.o', 'Fecha', 'Entrada', 'Salida', 'Duración (min)',
      'Descripción del trabajo', 'Repuestos / observaciones',
    ]);
    expect(filaDatosExcel(wb).slice(1)).toEqual([
      '2026-08-20', '08:00', '09:30', 90,
      'Cambio de capacitor del compresor.', 'Capacitor 45uF',
    ]);
    // Emergencia en garantía: sin repuestos.
    expect(filaDatosExcel(wb, 2).slice(1)).toEqual([
      '2026-08-21', '10:00', '10:45', 45, 'Fuga de refrigerante.', '—',
    ]);
  });

  it('todas las columnas a la vez', async () => {
    const wb = await crearServicio().generarExcel({
      ...RANGO,
      columnas: COLUMNAS_REPORTE.map((c) => c.clave).join(','),
    });
    // N.o + 16 columnas, con «Equipo» separado en dos.
    expect(encabezadosExcel(wb)).toHaveLength(18);
    // El costo no aplica a una emergencia en garantía.
    const fila2 = filaDatosExcel(wb, 2);
    expect(fila2[fila2.length - 2]).toBe('—');
  });

  it('sin gráficas marcadas omite las hojas «Por dia» y «Graficas»', async () => {
    const wb = await crearServicio().generarExcel({ ...RANGO, graficas: '' });
    expect(wb.worksheets.map((w: any) => w.name)).toEqual(['Mantenimientos']);
  });

  it('la hoja «Por dia» solo lleva las gráficas marcadas', async () => {
    const wb = await crearServicio().generarExcel({ ...RANGO, graficas: 'reparaciones,costo' });
    const ws: any = wb.getWorksheet('Por dia');
    const enc: string[] = [];
    ws.getRow(2).eachCell((c: any) => enc.push(String(c.value)));
    expect(enc).toEqual(['Dia', 'Costo (Q)', 'Reparaciones']);
    const dia1: any[] = [];
    ws.getRow(3).eachCell((c: any) => dia1.push(c.value));
    expect(dia1).toEqual(['2026-08-20', 350, 1]);
  });

  it('sin registros no falla', async () => {
    const wb = await crearServicio([]).generarExcel({ ...RANGO, columnas: 'fecha,descripcion' });
    expect(encabezadosExcel(wb)).toEqual(['N.o', 'Fecha', 'Descripción del trabajo']);
  });
});

describe('PDF del reporte', () => {
  // Tamaño de la primera página, leído del propio PDF (/MediaBox [0 0 w h]).
  const tamano = (buf: Buffer) => {
    const m = /\/MediaBox \[0 0 ([\d.]+) ([\d.]+)\]/.exec(buf.toString('latin1'));
    return m ? { w: Number(m[1]), h: Number(m[2]) } : null;
  };

  it('con las columnas de siempre se genera en vertical', async () => {
    const buf = await crearServicio().generarPdf(RANGO);
    expect(buf.subarray(0, 4).toString()).toBe('%PDF');
    const t = tamano(buf)!;
    expect(t.w).toBeLessThan(t.h);
  });

  it('con todas las columnas pasa a horizontal para que quepan', async () => {
    const buf = await crearServicio().generarPdf({
      ...RANGO,
      columnas: COLUMNAS_REPORTE.map((c) => c.clave).join(','),
    });
    expect(buf.subarray(0, 4).toString()).toBe('%PDF');
    const t = tamano(buf)!;
    expect(t.w).toBeGreaterThan(t.h);
  });

  it('se genera con una sola columna, sin gráficas y sin registros', async () => {
    const una = await crearServicio().generarPdf({ ...RANGO, columnas: 'descripcion', graficas: '' });
    expect(una.subarray(0, 4).toString()).toBe('%PDF');
    const vacio = await crearServicio([]).generarPdf({ ...RANGO, graficas: 'costo' });
    expect(vacio.subarray(0, 4).toString()).toBe('%PDF');
  });

  it('sin gráficas el PDF es más liviano que con las tres', async () => {
    const con = await crearServicio().generarPdf(RANGO);
    const sin = await crearServicio().generarPdf({ ...RANGO, graficas: '' });
    expect(sin.length).toBeLessThan(con.length);
  });
});

// ---------- Contenido pertinente según el filtro de tipo de trabajo ----------
describe('Contenido pertinente al tipo de trabajo', () => {
  it('sin filtro de tipo todo es pertinente', () => {
    expect(resolverGraficas(undefined, undefined)).toEqual(['costo', 'emergencias', 'reparaciones']);
    expect(resolverResumen(undefined, '')).toEqual([
      'total', 'equipos', 'fuera', 'mttr', 'preventivo', 'costo',
    ]);
  });

  it('llamadas de emergencia: sin costo, sin preventivo y sin reparaciones', () => {
    expect(resolverGraficas(undefined, 'llamada_emergencia')).toEqual(['emergencias']);
    expect(resolverResumen(undefined, 'llamada_emergencia')).toEqual([
      'total', 'equipos', 'fuera', 'mttr',
    ]);
  });

  it('preventivo, correctivo y evaluación interna', () => {
    expect(resolverGraficas(undefined, 'preventivo')).toEqual(['costo']);
    expect(resolverResumen(undefined, 'preventivo')).toEqual([
      'total', 'equipos', 'fuera', 'preventivo', 'costo',
    ]);
    expect(resolverGraficas(undefined, 'correctivo')).toEqual(['costo', 'reparaciones']);
    expect(resolverResumen(undefined, 'correctivo')).toEqual([
      'total', 'equipos', 'fuera', 'mttr', 'costo',
    ]);
    expect(resolverGraficas(undefined, 'evaluacion_interna')).toEqual([]);
    expect(resolverResumen(undefined, 'evaluacion_interna')).toEqual(['total', 'equipos', 'fuera']);
  });

  it('la selección del usuario manda sobre lo pertinente', () => {
    expect(resolverGraficas('costo,reparaciones', 'llamada_emergencia')).toEqual(['costo', 'reparaciones']);
    expect(resolverResumen('costo', 'llamada_emergencia')).toEqual(['costo']);
    expect(resolverResumen('ninguna', 'preventivo')).toEqual([]);
    expect(resolverResumen('', undefined)).toEqual([]);
  });

  // Etiquetas del bloque «Resumen del periodo» de la hoja principal del Excel.
  const resumenExcel = (wb: any): string[] => {
    const ws = wb.getWorksheet('Mantenimientos');
    const out: string[] = [];
    for (let i = 7; i < 30; i++) {
      const v = ws.getCell(`A${i}`).value;
      if (!v || v === 'N.o') break;
      out.push(String(v));
    }
    return out;
  };

  it('Excel sin filtro de tipo: resumen completo con desglose por tipo', async () => {
    const wb = await crearServicio().generarExcel(RANGO);
    const r = resumenExcel(wb);
    expect(r.slice(0, 6)).toEqual([
      'Total de mantenimientos',
      'Equipos atendidos',
      'Intervenciones que dejaron equipo fuera de servicio',
      'MTTR del periodo (min)',
      'Tiempo medio de mantenimiento preventivo (min)',
      'Costo total del periodo (Q)',
    ]);
    expect(r.some((x) => x.includes('Preventivo'))).toBe(true);
  });

  it('Excel filtrado por llamadas de emergencia: solo lo pertinente', async () => {
    const wb = await crearServicio().generarExcel({ ...RANGO, tipoTrabajo: 'llamada_emergencia' });
    expect(resumenExcel(wb)).toEqual([
      'Total de mantenimientos',
      'Equipos atendidos',
      'Intervenciones que dejaron equipo fuera de servicio',
      'MTTR del periodo (min)',
    ]);
    const enc: string[] = [];
    (wb.getWorksheet('Por dia') as any).getRow(2).eachCell((c: any) => enc.push(String(c.value)));
    expect(enc).toEqual(['Dia', 'Llamadas de emergencia']);
  });

  it('Excel filtrado por evaluación interna: sin hojas de gráficas', async () => {
    const wb = await crearServicio().generarExcel({ ...RANGO, tipoTrabajo: 'evaluacion_interna' });
    expect(wb.worksheets.map((w: any) => w.name)).toEqual(['Mantenimientos']);
  });

  it('Excel: lo que el usuario vuelve a marcar se respeta aunque haya filtro de tipo', async () => {
    const wb = await crearServicio().generarExcel({
      ...RANGO,
      tipoTrabajo: 'llamada_emergencia',
      resumen: 'total,costo',
      graficas: 'costo',
    });
    expect(resumenExcel(wb)).toEqual(['Total de mantenimientos', 'Costo total del periodo (Q)']);
    const enc: string[] = [];
    (wb.getWorksheet('Por dia') as any).getRow(2).eachCell((c: any) => enc.push(String(c.value)));
    expect(enc).toEqual(['Dia', 'Costo (Q)']);
  });

  it('Excel sin ningún recuadro de resumen no deja el título suelto', async () => {
    const wb = await crearServicio().generarExcel({ ...RANGO, tipoTrabajo: 'preventivo', resumen: 'ninguna' });
    expect(resumenExcel(wb)).toEqual([]);
    expect((wb.getWorksheet('Mantenimientos') as any).getCell('A6').value).toBeNull();
    expect(encabezadosExcel(wb)[0]).toBe('N.o');
  });

  it('PDF: se genera con filtro de tipo, con un solo recuadro y sin ninguno', async () => {
    for (const f of [
      { tipoTrabajo: 'llamada_emergencia' },
      { tipoTrabajo: 'evaluacion_interna' },
      { tipoTrabajo: 'correctivo', resumen: 'mttr' },
      { resumen: 'ninguna', graficas: 'ninguna' },
    ]) {
      const buf = await crearServicio().generarPdf({ ...RANGO, ...f });
      expect(buf.subarray(0, 4).toString()).toBe('%PDF');
    }
  });

  it('PDF filtrado por un tipo es más liviano que el completo', async () => {
    const completo = await crearServicio().generarPdf(RANGO);
    const emergencia = await crearServicio().generarPdf({ ...RANGO, tipoTrabajo: 'llamada_emergencia' });
    expect(emergencia.length).toBeLessThan(completo.length);
  });
});
