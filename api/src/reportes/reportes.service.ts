import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as ExcelJS from 'exceljs';
import PDFDocument = require('pdfkit');
import {
  Mantenimiento,
  MantenimientoDocument,
} from '../mantenimientos/schemas/mantenimiento.schema';
import {
  Equipo,
  EquipoDocument,
  CATEGORIAS_MANTENIMIENTO,
} from '../equipos/schemas/equipo.schema';
import {
  Catalogo,
  CatalogoDocument,
} from '../catalogos/schemas/catalogo.schema';
import { precioAplica } from '../mantenimientos/precio.util';
import { generarImagenesGraficas } from './graficas.util';
import {
  ColumnaReporte,
  resolverColumnas,
  resolverGraficas,
  resolverResumen,
} from './columnas.util';

// Etiqueta legible de una categoría / periodicidad de mantenimiento. Para las
// categorías fijas usa su etiqueta; para las creadas por el usuario, el valor.
const CATEGORIA_LABEL: Record<string, string> = Object.fromEntries(
  CATEGORIAS_MANTENIMIENTO.map((c) => [c.valor, c.label]),
);
const etiquetaCategoria = (valor: string): string =>
  CATEGORIA_LABEL[valor] || valor;

const ETIQUETA_TIPO: Record<string, string> = {
  preventivo: 'Preventivo',
  correctivo: 'Correctivo',
  llamada_emergencia: 'Llamada de emergencia',
  evaluacion_interna: 'Evaluacion interna',
};
const ETIQUETA_ESTADO: Record<string, string> = {
  funcionando: 'Funcionando',
  fuera_de_servicio: 'Fuera de servicio',
};
const ETIQUETA_PERIODO: Record<string, string> = {
  mensual: 'Mensual',
  cuatrimestral: 'Cuatrimestral',
  garantia: 'Garantia',
};
const ETIQUETA_ESTADO_EQUIPO: Record<string, string> = {
  ACTIVO: 'Activo',
  MANTENIMIENTO: 'En mantenimiento',
  INACTIVO: 'Fuera de servicio',
  BAJA: 'Dado de baja',
};

// Paleta institucional (coherente con la web).
const AZUL = '#1B4B8A';
const AZUL_OSCURO = '#0F2C55';
const GRIS_SUAVE = '#F4F7FB';
const GRIS_BORDE = '#D6DEE8';
const VERDE = '#1B8A4B';
const ROJO = '#C0392B';
const AMBAR = '#B7791F';

export interface FiltrosReporte {
  desde?: string;
  hasta?: string;
  equipo?: string;
  tipoTrabajo?: string;
  // 'true' => incluir todos los equipos que NO estan dados de baja.
  excluirBaja?: string;
  // Filtros por atributos del equipo (los mismos del buscador de equipos).
  buscar?: string;
  tipoEquipo?: string;
  subTipo?: string;
  marca?: string;
  estado?: string;
  ubicacion?: string;
  categoria?: string;
  // Contenido del reporte (ver columnas.util.ts): claves separadas por coma.
  // Sin `columnas` se usan las de por defecto; sin `graficas`, las tres.
  // Sin `resumen`/`graficas` se incluye lo pertinente al tipo de trabajo.
  columnas?: string;
  graficas?: string;
  resumen?: string;
}

// Gráficas diarias disponibles (misma definición para el PDF y el Excel).
const GRAFICAS_DEF = {
  costo: { titulo: 'Costo por día', encabezado: 'Costo (Q)', color: AZUL, argb: 'FF1B4B8A', ejeY: 'Costo (Q)', moneda: true },
  emergencias: { titulo: 'Llamadas de emergencia por día', encabezado: 'Llamadas de emergencia', color: ROJO, argb: 'FFC0392B', ejeY: 'N.º de llamadas', moneda: false },
  reparaciones: { titulo: 'Reparaciones por día', encabezado: 'Reparaciones', color: AMBAR, argb: 'FFB7791F', ejeY: 'N.º de reparaciones', moneda: false },
} as const;

const escaparRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export interface FiltrosEquipos {
  desde?: string;
  hasta?: string;
}

@Injectable()
export class ReportesService {
  constructor(
    @InjectModel(Mantenimiento.name)
    private mantenimientoModel: Model<MantenimientoDocument>,
    @InjectModel(Equipo.name) private equipoModel: Model<EquipoDocument>,
    @InjectModel(Catalogo.name) private catalogoModel: Model<CatalogoDocument>,
  ) {}

  // Costo APLICABLE de un mantenimiento para reportes: 0 si el tipo/periodo no
  // lleva precio (emergencia, evaluación interna o garantía). Así la pantalla,
  // el PDF y el Excel muestran el precio solo cuando corresponde.
  private costoAplicable(m: any): number {
    return precioAplica(m.tipoTrabajo, m.periodo)
      ? Number(m.costoMantenimiento) || 0
      : 0;
  }

  private horasEntre(hi?: Date, hf?: Date): number | null {
    if (!hi || !hf) return null;
    const ms = new Date(hf).getTime() - new Date(hi).getTime();
    return ms > 0 ? ms / 3_600_000 : null;
  }

  private async construirFiltro(f: FiltrosReporte) {
    const filtro: any = {};
    // Condiciones sobre el equipo: selección puntual, "solo en alta" y los
    // atributos del buscador de equipos. Se resuelven a una lista de ids.
    const condEquipo: any[] = [];
    if (f.excluirBaja === 'true' && !f.equipo) condEquipo.push({ estado: { $ne: 'BAJA' } });
    if (f.tipoEquipo) condEquipo.push({ tipoEquipo: f.tipoEquipo });
    if (f.subTipo) condEquipo.push({ subTipo: f.subTipo });
    if (f.marca) condEquipo.push({ marca: f.marca });
    if (f.estado) condEquipo.push({ estado: f.estado });
    if (f.ubicacion) condEquipo.push({ ubicacion: f.ubicacion });
    if (f.categoria) condEquipo.push({ categoria: f.categoria });
    if (f.buscar?.trim()) {
      const rx = new RegExp(escaparRegex(f.buscar.trim()), 'i');
      condEquipo.push({
        $or: [{ codigoInventario: rx }, { nombre: rx }, { serie: rx }, { ubicacion: rx }],
      });
    }
    if (condEquipo.length === 0) {
      if (f.equipo) filtro.equipo = new Types.ObjectId(f.equipo);
    } else {
      if (f.equipo) condEquipo.push({ _id: new Types.ObjectId(f.equipo) });
      const ids = await this.equipoModel.find({ $and: condEquipo }).distinct('_id');
      filtro.equipo = { $in: ids };
    }
    if (f.tipoTrabajo) filtro.tipoTrabajo = f.tipoTrabajo;
    if (f.desde || f.hasta) {
      filtro.fechaMantenimiento = {};
      if (f.desde) filtro.fechaMantenimiento.$gte = new Date(f.desde);
      if (f.hasta) {
        const fin = new Date(f.hasta);
        fin.setHours(0, 0, 0, 0);
        fin.setDate(fin.getDate() + 1);
        filtro.fechaMantenimiento.$lt = fin;
      }
    }
    return filtro;
  }

  private fechaCorta(d: Date | string): string {
    return new Date(d).toISOString().slice(0, 10);
  }

  // Tiempo medio (en minutos) de un conjunto de mantenimientos, según la
  // duración horaInicio→horaFin. Fuente y lógica ÚNICAS reutilizadas por el
  // Dashboard y por los reportes (web, Excel y PDF) para el preventivo y el MTTR.
  private promedioMinutos(mants: any[]): number {
    const dur = mants
      .map((m) => this.horasEntre(m.horaInicio, m.horaFin))
      .filter((h): h is number => h !== null);
    return dur.length
      ? Math.round((dur.reduce((a, b) => a + b, 0) / dur.length) * 60)
      : 0;
  }

  // Serie diaria del período: por cada día (mismo formato de fecha que el
  // detalle del reporte, para que las gráficas coincidan con los datos), acumula
  //  - costo:        suma de costoMantenimiento de los mantenimientos de ese día.
  //  - emergencias:  n.º de mantenimientos tipo 'llamada_emergencia'.
  //  - reparaciones: n.º de mantenimientos correctivos ('correctivo').
  //    (Las llamadas de emergencia se cuentan aparte, en su propia serie.)
  // Usa datos reales; los días sin actividad quedan en 0.
  private serieDiaria(
    mants: any[],
    inicioISO?: string,
    finISO?: string,
  ): {
    fecha: string;
    dia: number;
    costo: number;
    emergencias: number;
    reparaciones: number;
  }[] {
    // Rango: usa las fechas indicadas o, en su defecto, el mínimo/máximo de los datos.
    const fechasDatos = mants.map((m) => this.fechaCorta(m.fechaMantenimiento));
    const desde = inicioISO || (fechasDatos.length ? fechasDatos.reduce((a, b) => (a < b ? a : b)) : undefined);
    const hasta = finISO || (fechasDatos.length ? fechasDatos.reduce((a, b) => (a > b ? a : b)) : undefined);
    if (!desde || !hasta || desde > hasta) return [];

    const MAX_DIAS = 366; // Cota de seguridad para rangos muy amplios.
    const dias: any[] = [];
    const cursor = new Date(desde + 'T00:00:00.000Z');
    const fin = new Date(hasta + 'T00:00:00.000Z');
    while (cursor <= fin && dias.length < MAX_DIAS) {
      dias.push({
        fecha: cursor.toISOString().slice(0, 10),
        dia: cursor.getUTCDate(),
        costo: 0,
        emergencias: 0,
        reparaciones: 0,
      });
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    const indice = new Map<string, number>(dias.map((d, i) => [d.fecha, i]));
    for (const m of mants) {
      const i = indice.get(this.fechaCorta(m.fechaMantenimiento));
      if (i === undefined) continue;
      dias[i].costo += this.costoAplicable(m);
      if (m.tipoTrabajo === 'llamada_emergencia') dias[i].emergencias += 1;
      if (m.tipoTrabajo === 'correctivo') dias[i].reparaciones += 1;
    }
    for (const d of dias) d.costo = Math.round(d.costo * 100) / 100;
    return dias;
  }

  // Formato de quetzales con separador de miles y 2 decimales (para el PDF).
  private quetzales(n: number): string {
    const [ent, dec] = (Number(n) || 0).toFixed(2).split('.');
    return 'Q' + ent.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + '.' + dec;
  }

  // Marcas "redondas" del eje Y (0, paso, 2·paso, … máximo).
  private marcasEjeY(max: number, entero: boolean): number[] {
    if (max <= 0) return [0, 1];
    let base = max / 4;
    if (entero) base = Math.max(1, base);
    const mag = Math.pow(10, Math.floor(Math.log10(base)));
    const norm = base / mag;
    let paso =
      mag * (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10);
    if (entero) paso = Math.max(1, Math.round(paso));
    const tope = Math.ceil(max / paso) * paso;
    const marcas: number[] = [];
    for (let v = 0; v <= tope + 1e-9; v += paso) {
      marcas.push(entero ? Math.round(v) : Math.round(v * 100) / 100);
    }
    return marcas;
  }

  // Dibuja en el PDF una gráfica de barras (una serie) con ejes, barras,
  // etiquetas de día y leyenda de ejes. Devuelve la coordenada Y siguiente.
  // Usa los MISMOS datos (seriesDiarias) y colores que las gráficas de la web.
  private dibujarGraficaBarras(
    doc: any,
    o: {
      x: number; y: number; w: number; h: number;
      titulo: string; datos: any[]; campo: string; color: string;
      ejeY: string; moneda?: boolean;
    },
  ): number {
    const { x, y, w, h, titulo, datos, campo, color, ejeY, moneda } = o;
    doc.fillColor(AZUL_OSCURO).font('Helvetica-Bold').fontSize(9.5)
      .text(titulo, x, y, { width: w, lineBreak: false });

    const plotTop = y + 15;
    const labelW = 42;                    // espacio para las marcas del eje Y
    const plotX = x + labelW;
    const plotW = w - labelW - 4;
    const baseY = plotTop + h;
    const max = Math.max(1, ...datos.map((d) => Number(d[campo]) || 0));
    const marcas = this.marcasEjeY(max, !moneda);
    const tope = marcas[marcas.length - 1] || 1;

    // Ejes
    doc.strokeColor(GRIS_BORDE).lineWidth(0.6)
      .moveTo(plotX, plotTop).lineTo(plotX, baseY).stroke()
      .moveTo(plotX, baseY).lineTo(plotX + plotW, baseY).stroke();

    // Marcas y líneas guía del eje Y (TODAS las cantidades)
    doc.font('Helvetica').fontSize(7).fillColor('#8894A6');
    marcas.forEach((t) => {
      const yy = baseY - (t / tope) * h;
      doc.strokeColor('#EEF2F7').lineWidth(0.5)
        .moveTo(plotX, yy).lineTo(plotX + plotW, yy).stroke();
      doc.fillColor('#8894A6')
        .text(moneda ? this.quetzales(t) : String(t), x, yy - 3, { width: labelW - 5, align: 'right', lineBreak: false });
    });

    // Barras
    const n = datos.length;
    const gap = n > 20 ? 1.5 : 3;
    const bw = Math.max(1.5, (plotW - gap * n) / n);
    datos.forEach((d, i) => {
      const v = Number(d[campo]) || 0;
      if (v <= 0) return;
      const bh = (v / tope) * h;
      const bx = plotX + gap / 2 + i * (bw + gap);
      doc.fillColor(color).rect(bx, baseY - bh, bw, bh).fill();
    });

    // Etiquetas del eje X (día del mes), espaciadas para no amontonarse
    doc.font('Helvetica').fontSize(6.5).fillColor('#8894A6');
    const step = Math.max(1, Math.ceil(n / 12));
    datos.forEach((d, i) => {
      if (i % step === 0 || i === n - 1) {
        const bx = plotX + gap / 2 + i * (bw + gap);
        doc.text(String(d.dia), bx - 3, baseY + 2, { width: bw + 6, align: 'center', lineBreak: false });
      }
    });

    // Leyenda de ejes
    doc.font('Helvetica').fontSize(6.5).fillColor('#8894A6')
      .text(`Día del mes  ·  ${ejeY}`, plotX, baseY + 11, { width: plotW, align: 'center', lineBreak: false });

    return baseY + 22;
  }

  private hora(d?: Date): string {
    if (!d) return '—';
    const x = new Date(d);
    return `${String(x.getHours()).padStart(2, '0')}:${String(x.getMinutes()).padStart(2, '0')}`;
  }

  // ---------- Panel de indicadores / Dashboard (RF08) ----------
  async indicadores() {
    const ahora = new Date();
    // Límites del mes en UTC-medianoche, coherentes con cómo se almacenan las
    // fechas (new Date('YYYY-MM-DD') = UTC) y con la vista de Reportes. Antes se
    // usaba medianoche LOCAL, por lo que en zonas con desfase negativo (p. ej.
    // Guatemala, UTC-6) los registros del día 1 (guardados a las 00:00 UTC)
    // quedaban fuera del mes y no aparecían en el panel ni en sus gráficas.
    const inicioMes = new Date(Date.UTC(ahora.getFullYear(), ahora.getMonth(), 1));
    const finMes = new Date(Date.UTC(ahora.getFullYear(), ahora.getMonth() + 1, 1));

    const equiposRegistrados = await this.equipoModel
      .countDocuments({ estado: { $ne: 'BAJA' } })
      .exec();
    const equiposFuera = await this.equipoModel
      .countDocuments({ estado: 'INACTIVO' })
      .exec();

    const mantsMes = await this.mantenimientoModel
      .find({ fechaMantenimiento: { $gte: inicioMes, $lt: finMes } })
      .exec();

    // MTTR expresado en MINUTOS (req 2): promedio de la duración
    // horaInicio→horaFin de correctivos + emergencias (misma lógica que resumen).
    const correctivos = mantsMes.filter(
      (m) =>
        m.tipoTrabajo === 'correctivo' ||
        m.tipoTrabajo === 'llamada_emergencia',
    );
    const mttrMinutos = this.promedioMinutos(correctivos);

    // Tiempo medio de mantenimiento PREVENTIVO, también en MINUTOS (req 2).
    const preventivos = mantsMes.filter((m) => m.tipoTrabajo === 'preventivo');
    const preventivoMinutos = this.promedioMinutos(preventivos);

    // Numero de llamadas de emergencia registradas en el mes en curso.
    const emergenciasMes = mantsMes.filter(
      (m) => m.tipoTrabajo === 'llamada_emergencia',
    ).length;

    // Serie diaria del mes en curso (para las gráficas del Dashboard):
    // costo, emergencias y reparaciones por día, desde el 1.º del mes hasta hoy
    // (acotado al último día del mes, por si la hora UTC ya cruzó a otro mes).
    const inicioISO = this.fechaCorta(inicioMes);
    const finMesISO = this.fechaCorta(new Date(finMes.getTime() - 86_400_000));
    const hoyISO = this.fechaCorta(ahora);
    const finSerieISO = hoyISO < finMesISO ? hoyISO : finMesISO;
    const seriesDiarias = this.serieDiaria(mantsMes, inicioISO, finSerieISO);

    const tipos = Object.keys(ETIQUETA_TIPO);
    const distribucionTipo = tipos.map((t) => ({
      tipo: ETIQUETA_TIPO[t],
      clave: t,
      cantidad: mantsMes.filter((m) => m.tipoTrabajo === t).length,
    }));

    const ultimos = await this.mantenimientoModel
      .find()
      .sort({ fechaMantenimiento: -1, createdAt: -1 })
      .limit(5)
      .populate([
        { path: 'equipo', select: 'codigoInventario nombre' },
        { path: 'tecnico', select: 'nombre' },
      ])
      .exec();

    // Avance de mantenimiento por periodicidad (categoría de cada equipo).
    // Dinámico: agrupa los equipos activos por su categoría/periodicidad y
    // cuenta cuántos ya tienen un mantenimiento en el mes en curso.
    const periodicidades = await this.avancePorPeriodicidad(mantsMes as any);

    return {
      equiposRegistrados,
      equiposFuera,
      mantenimientosMes: mantsMes.length,
      mttrMinutos,
      preventivoMinutos,
      emergenciasMes,
      distribucionTipo,
      seriesDiarias,
      periodicidades,
      ultimos,
    };
  }

  // Calcula, por cada periodicidad (categoría del equipo), el total de equipos
  // y cuántos ya tienen mantenimiento en el mes en curso, con su porcentaje.
  // Incluye periodicidades fijas y las creadas en el catálogo aunque tengan 0
  // equipos (aparecen automáticamente). Controla el caso total = 0.
  private async avancePorPeriodicidad(
    mantsMes: any[],
  ): Promise<
    {
      categoria: string;
      label: string;
      total: number;
      conMantenimiento: number;
      porcentaje: number;
    }[]
  > {
    // Equipos activos (no dados de baja) con periodicidad asignada.
    const equipos: any[] = await this.equipoModel
      .find({ estado: { $ne: 'BAJA' }, categoria: { $nin: ['', null] } })
      .select('_id categoria')
      .lean()
      .exec();

    // Ids de equipos con al menos un mantenimiento en el mes en curso.
    const idsConMant = new Set(
      mantsMes.map((m) => String(m.equipo?._id ?? m.equipo)),
    );

    const agg = new Map<string, { total: number; conMant: number }>();
    for (const e of equipos) {
      const cat = e.categoria;
      const r = agg.get(cat) || { total: 0, conMant: 0 };
      r.total += 1;
      if (idsConMant.has(String(e._id))) r.conMant += 1;
      agg.set(cat, r);
    }

    // Universo de periodicidades: fijas + catálogo + las presentes en equipos.
    const catDocs: any[] = await this.catalogoModel
      .find({ tipo: 'categoria', activo: true })
      .select('valor')
      .lean()
      .exec();
    const universo = new Set<string>([
      ...CATEGORIAS_MANTENIMIENTO.map((c) => c.valor),
      ...catDocs.map((d) => (d.valor || '').trim()).filter(Boolean),
      ...agg.keys(),
    ]);

    return [...universo]
      .map((cat) => {
        const r = agg.get(cat) || { total: 0, conMant: 0 };
        const porcentaje =
          r.total > 0 ? Math.round((r.conMant / r.total) * 100) : 0;
        return {
          categoria: cat,
          label: etiquetaCategoria(cat),
          total: r.total,
          conMantenimiento: r.conMant,
          porcentaje,
        };
      })
      .sort((a, b) => b.total - a.total || a.label.localeCompare(b.label));
  }

  // ---------- Vista previa del reporte (RF07) ----------
  async preview(f: FiltrosReporte) {
    const filtro = await this.construirFiltro(f);
    const docs = await this.mantenimientoModel
      .find(filtro)
      .sort({ fechaMantenimiento: 1 })
      .populate([
        {
          path: 'equipo',
          select: 'codigoInventario nombre subTipo ubicacion serie marca',
        },
        { path: 'tecnico', select: 'nombre' },
        { path: 'empresa', select: 'nombre' },
      ])
      .exec();

    // Las horas y la duración se entregan ya calculadas por el servidor, para
    // que la pantalla muestre exactamente lo mismo que el PDF y el Excel (sin
    // depender de la zona horaria del navegador).
    const resultados: any[] = docs.map((d: any) => {
      const m = typeof d.toObject === 'function' ? d.toObject() : d;
      return {
        ...m,
        horaInicioTexto: this.hora(m.horaInicio),
        horaFinTexto: this.hora(m.horaFin),
        duracionMinutos: this.duracionMinutos(m),
      };
    });

    return { resultados, resumen: this.resumen(resultados, f) };
  }

  // Duración del mantenimiento en minutos (null si no puede calcularse).
  private duracionMinutos(m: any): number | null {
    const h = this.horasEntre(m.horaInicio, m.horaFin);
    return h === null ? null : Math.round(h * 60);
  }

  // Texto de cada columna configurable del detalle para un mantenimiento.
  // Fuente única de los valores que imprimen el PDF y el Excel.
  private celdasDetalle(m: any): Record<string, string> {
    const dur = this.duracionMinutos(m);
    return {
      fecha: this.fechaCorta(m.fechaMantenimiento),
      bien: m.equipo?.codigoInventario || '—',
      equipo: m.equipo?.nombre || '—',
      serie: m.equipo?.serie || '—',
      marca: m.equipo?.marca || '—',
      ubicacion: m.equipo?.ubicacion || '—',
      tipo: ETIQUETA_TIPO[m.tipoTrabajo] || m.tipoTrabajo,
      periodo: ETIQUETA_PERIODO[m.periodo] || m.periodo || '—',
      tecnico: m.tecnico?.nombre || '—',
      empresa: m.empresa?.nombre || '—',
      horaInicio: this.hora(m.horaInicio),
      horaFin: this.hora(m.horaFin),
      duracion: dur === null ? '—' : String(dur),
      descripcion: (m.descripcionTrabajo || '').trim() || '—',
      repuestos: (m.repuestosObservaciones || '').trim() || '—',
      costo: precioAplica(m.tipoTrabajo, m.periodo)
        ? this.quetzales(Number(m.costoMantenimiento) || 0)
        : '—',
      estado: ETIQUETA_ESTADO[m.estadoEquipoResultante] || m.estadoEquipoResultante,
    };
  }

  // Resumen cuantitativo del periodo (totales, equipos atendidos, MTTR, etc.).
  private resumen(resultados: any[], f: FiltrosReporte = {}) {
    const porTipo: Record<string, number> = {};
    Object.values(ETIQUETA_TIPO).forEach((t) => (porTipo[t] = 0));
    resultados.forEach((m) => {
      const et = ETIQUETA_TIPO[m.tipoTrabajo] || m.tipoTrabajo;
      porTipo[et] = (porTipo[et] || 0) + 1;
    });
    const equiposAtendidos = new Set(
      resultados.map((m) => String((m.equipo as any)?._id ?? m.equipo)),
    ).size;

    const fueraDeServicio = resultados.filter(
      (m) => m.estadoEquipoResultante === 'fuera_de_servicio',
    ).length;

    // MTTR del periodo (correctivos + emergencias), en MINUTOS (req 2).
    const mttrMinutos = this.promedioMinutos(
      resultados.filter(
        (m) =>
          m.tipoTrabajo === 'correctivo' ||
          m.tipoTrabajo === 'llamada_emergencia',
      ),
    );

    // Tiempo medio de mantenimiento PREVENTIVO del periodo, en MINUTOS.
    // Misma lógica y fuente que el Dashboard: la web, el Excel y el PDF lo toman
    // de aquí, por lo que el valor es idéntico en las tres salidas.
    const preventivoMinutos = this.promedioMinutos(
      resultados.filter((m) => m.tipoTrabajo === 'preventivo'),
    );

    // Costo total del periodo: suma de los costos APLICABLES (preventivo y
    // correctivo). Emergencias, evaluaciones internas y trabajos en garantía no
    // suman porque no llevan precio.
    const costoTotal =
      Math.round(
        resultados.reduce((a, m) => a + this.costoAplicable(m), 0) * 100,
      ) / 100;

    // Serie diaria del periodo (para las gráficas de Reportes): usa el rango del
    // filtro y, si no se indicó, el mínimo/máximo de fechas de los resultados.
    const seriesDiarias = this.serieDiaria(resultados, f.desde, f.hasta);

    return {
      porTipo,
      equiposAtendidos,
      total: resultados.length,
      fueraDeServicio,
      mttrMinutos,
      preventivoMinutos,
      costoTotal,
      seriesDiarias,
    };
  }

  private descripcionFiltros(f: FiltrosReporte, resultados: any[]): string {
    const eq =
      f.equipo && resultados[0]?.equipo
        ? `${resultados[0].equipo.codigoInventario} - ${resultados[0].equipo.nombre}`
        : 'Todos';
    const tipo = f.tipoTrabajo ? ETIQUETA_TIPO[f.tipoTrabajo] : 'Todos';
    const partes = [`Equipo: ${f.excluirBaja === 'true' && !f.equipo ? 'Todos los equipos en alta' : eq}`, `Tipo: ${tipo}`];
    // Solo se listan los filtros de equipo que se usaron.
    if (f.buscar?.trim()) partes.push(`Búsqueda: «${f.buscar.trim()}»`);
    if (f.tipoEquipo) partes.push(`Tipo de equipo: ${f.tipoEquipo}`);
    if (f.subTipo) partes.push(`Subtipo: ${f.subTipo}`);
    if (f.marca) partes.push(`Marca: ${f.marca}`);
    if (f.ubicacion) partes.push(`Ubicación: ${f.ubicacion}`);
    if (f.estado) partes.push(`Estado del equipo: ${ETIQUETA_ESTADO_EQUIPO[f.estado] || f.estado}`);
    if (f.categoria) partes.push(`Periodicidad: ${etiquetaCategoria(f.categoria)}`);
    return partes.join('   |   ');
  }

  // ==================== Exportacion a Excel (RF07) ====================
  async generarExcel(f: FiltrosReporte): Promise<ExcelJS.Workbook> {
    const { resultados, resumen } = await this.preview(f);
    const wb = new ExcelJS.Workbook();
    wb.creator = 'Sistema de Control de Mantenimiento - Hospital Ceibal (IGSS)';
    wb.created = new Date();
    const ws = wb.addWorksheet('Mantenimientos', {
      views: [{ state: 'frozen', ySplit: 10 }],
    });

    const fill = (argb: string) => ({
      type: 'pattern' as const,
      pattern: 'solid' as const,
      fgColor: { argb },
    });
    const A = 'FF1B4B8A';

    // Encabezado institucional
    ws.mergeCells('A1:I1');
    ws.getCell('A1').value =
      'IGSS - Hospital General de Accidentes «Ceibal»';
    ws.getCell('A1').font = { bold: true, size: 14, color: { argb: A } };
    ws.mergeCells('A2:I2');
    ws.getCell('A2').value =
      'Area de Mantenimiento - Reporte de mantenimientos realizados';
    ws.getCell('A2').font = { size: 11, color: { argb: 'FF555555' } };
    ws.mergeCells('A3:I3');
    ws.getCell('A3').value = `Periodo: ${f.desde || 'inicio'} al ${f.hasta || 'hoy'}   |   Emitido: ${this.fechaCorta(new Date())}`;
    ws.mergeCells('A4:I4');
    ws.getCell('A4').value = `Filtros:  ${this.descripcionFiltros(f, resultados)}`;
    ws.getCell('A4').font = { italic: true, size: 10 };

    // Resumen del periodo
    ws.getCell('A6').value = 'Resumen del periodo';
    ws.getCell('A6').font = { bold: true, size: 12, color: { argb: A } };
    // Solo los recuadros elegidos (o los pertinentes al tipo filtrado). El
    // desglose por tipo se omite cuando el reporte ya es de un solo tipo.
    const recuadros = resolverResumen(f.resumen, f.tipoTrabajo);
    const RESUMEN_EXCEL: Record<string, [string, number | string]> = {
      total: ['Total de mantenimientos', resumen.total],
      equipos: ['Equipos atendidos', resumen.equiposAtendidos],
      fuera: ['Intervenciones que dejaron equipo fuera de servicio', resumen.fueraDeServicio],
      mttr: ['MTTR del periodo (min)', resumen.mttrMinutos],
      preventivo: ['Tiempo medio de mantenimiento preventivo (min)', resumen.preventivoMinutos],
      costo: ['Costo total del periodo (Q)', resumen.costoTotal],
    };
    const resumenPares: [string, number | string][] = [
      ...recuadros.map((r) => RESUMEN_EXCEL[r]),
      ...(f.tipoTrabajo
        ? []
        : Object.entries(resumen.porTipo).map(
            ([t, c]) => [`  · ${t}`, c] as [string, number],
          )),
    ];
    if (resumenPares.length === 0) ws.getCell('A6').value = null;
    let fila = 7;
    resumenPares.forEach(([k, v]) => {
      ws.getCell(`A${fila}`).value = k;
      ws.getCell(`B${fila}`).value = v as any;
      ws.getCell(`B${fila}`).font = { bold: true };
      fila++;
    });

    // Tabla de detalle. Las columnas son las elegidas en el reporte; el N.o de
    // registro va siempre primero.
    const inicioTabla = fila + 1;
    const elegidas = resolverColumnas(f.columnas);
    type ColExcel = { h: string; w: number; clave: string };
    const colsExcel: ColExcel[] = [{ h: 'N.o', w: 8, clave: '_id' }];
    elegidas.forEach((c) => {
      colsExcel.push({ h: c.label, w: c.anchoExcel, clave: c.clave });
    });
    const nCols = colsExcel.length;

    const hRow = ws.getRow(inicioTabla);
    colsExcel.forEach((col, i) => {
      const c = hRow.getCell(i + 1);
      c.value = col.h;
      c.fill = fill(A);
      c.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      c.alignment = { vertical: 'middle' };
      c.border = { bottom: { style: 'thin', color: { argb: 'FFAAAAAA' } } };
    });

    resultados.forEach((m: any, idx: number) => {
      const r = ws.getRow(inicioTabla + 1 + idx);
      const textos = this.celdasDetalle(m);
      colsExcel.forEach((col, i) => {
        const c = r.getCell(i + 1);
        if (col.clave === '_id') {
          c.value = String(m._id).slice(-6);
        } else if (col.clave === 'costo') {
          // Precio solo cuando corresponde (preventivo/correctivo, no en garantía).
          if (precioAplica(m.tipoTrabajo, m.periodo)) {
            c.value = Number(m.costoMantenimiento) || 0;
            c.numFmt = '"Q"#,##0.00';
          } else {
            c.value = '—';
          }
          c.alignment = { horizontal: 'right' };
        } else if (col.clave === 'duracion') {
          const dur = this.duracionMinutos(m);
          c.value = dur === null ? '—' : dur;
          c.alignment = { horizontal: 'right' };
        } else if (col.clave === 'estado') {
          c.value = textos.estado;
          c.font = {
            bold: true,
            color: {
              argb: m.estadoEquipoResultante === 'funcionando' ? 'FF1B8A4B' : 'FFC0392B',
            },
          };
        } else {
          c.value = textos[col.clave];
          // Los textos largos se ajustan dentro de la celda.
          if (col.clave === 'descripcion' || col.clave === 'repuestos') {
            c.alignment = { wrapText: true, vertical: 'top' };
          }
        }
        if (idx % 2 === 1) c.fill = fill('FFF4F7FB');
      });
    });

    if (resultados.length === 0) {
      ws.getRow(inicioTabla + 1).getCell(1).value =
        'Sin registros en el periodo seleccionado.';
    }

    // Anchos y autofiltro
    colsExcel.forEach((col, i) => (ws.getColumn(i + 1).width = col.w));
    ws.autoFilter = {
      from: { row: inicioTabla, column: 1 },
      to: { row: inicioTabla, column: nCols },
    };
    ws.views = [{ state: 'frozen', ySplit: inicioTabla }];

    // Gráficas elegidas en el reporte. Sin ninguna, se omiten las hojas
    // «Por dia» y «Graficas» (son los datos y las imágenes de esas gráficas).
    const graficas = resolverGraficas(f.graficas, f.tipoTrabajo);
    const serieDias: any[] = resumen.seriesDiarias || [];
    if (graficas.length === 0) return wb;

    // -------- Hoja "Por día" (mismos datos que las gráficas de Reportes) --------
    // Permite verificar que las gráficas coinciden con los datos del reporte.
    const wsDia = wb.addWorksheet('Por dia', {
      views: [{ state: 'frozen', ySplit: 2 }],
    });
    const nDia = graficas.length + 1;
    wsDia.mergeCells(1, 1, 1, Math.max(2, nDia));
    wsDia.getCell('A1').value = 'Detalle diario del periodo (costo y conteos)';
    wsDia.getCell('A1').font = { bold: true, size: 12, color: { argb: A } };
    const hDia = wsDia.getRow(2);
    ['Dia', ...graficas.map((g) => GRAFICAS_DEF[g].encabezado)].forEach((h, i) => {
      const c = hDia.getCell(i + 1);
      c.value = h;
      // Encabezados con el color de cada gráfica (para identificarlas).
      c.fill = fill(i === 0 ? A : GRAFICAS_DEF[graficas[i - 1]].argb);
      c.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    });
    serieDias.forEach((d: any, idx: number) => {
      const r = wsDia.getRow(3 + idx);
      r.getCell(1).value = d.fecha;
      graficas.forEach((g, i) => {
        const c = r.getCell(i + 2);
        c.value = d[g];
        if (GRAFICAS_DEF[g].moneda) {
          c.numFmt = '"Q"#,##0.00';
          c.alignment = { horizontal: 'right' };
        }
      });
      if (idx % 2 === 1) for (let i = 1; i <= nDia; i++) r.getCell(i).fill = fill('FFF4F7FB');
    });
    if (serieDias.length === 0) {
      wsDia.getCell('A3').value = 'Sin datos en el periodo seleccionado.';
    }
    wsDia.getColumn(1).width = 14;
    graficas.forEach((g, i) => {
      wsDia.getColumn(i + 2).width = g === 'emergencias' ? 26 : 16;
    });

    // Barras de datos (gráficas nativas de Excel dentro de la celda): cada
    // columna numérica se convierte en un mini-gráfico de barras por día, con el
    // mismo color que las gráficas de la aplicación.
    if (serieDias.length > 0) {
      const ultima = 2 + serieDias.length; // datos: filas 3..(2+nDias)
      graficas.forEach((g, i) => {
        const col = wsDia.getColumn(i + 2).letter;
        wsDia.addConditionalFormatting({
          ref: `${col}3:${col}${ultima}`,
          rules: [
            {
              type: 'dataBar',
              gradient: false,
              cfvo: [{ type: 'num', value: 0 }, { type: 'max' }],
              color: { argb: GRAFICAS_DEF[g].argb },
            } as any,
          ],
        });
      });
    }

    // -------- Hoja "Graficas": imágenes idénticas a las del PDF y la app --------
    const imgs = generarImagenesGraficas(serieDias as any);
    if (imgs) {
      const wsG = wb.addWorksheet('Graficas');
      wsG.getColumn(1).width = 2;
      wsG.getCell('B1').value = 'Gráficas de actividad diaria del período';
      wsG.getCell('B1').font = { bold: true, size: 12, color: { argb: A } };
      const anchoPx = 620;
      const altoPx = Math.round((anchoPx * 300) / 820); // conserva el aspecto 820×300
      graficas.forEach((g, i) => {
        const id = wb.addImage({ buffer: imgs[g] as any, extension: 'png' });
        wsG.addImage(id, {
          tl: { col: 1, row: 2 + i * 12 },
          ext: { width: anchoPx, height: altoPx },
        });
      });
    }

    return wb;
  }

  // ==================== Exportacion a PDF (RF07) ====================
  async generarPdf(f: FiltrosReporte): Promise<Buffer> {
    const { resultados, resumen } = await this.preview(f);

    // Columnas y gráficas elegidas. Si las columnas no caben en una hoja
    // vertical (ancho útil ≈ 515 pt), el documento se genera en horizontal.
    const columnas = resolverColumnas(f.columnas);
    const graficas = resolverGraficas(f.graficas, f.tipoTrabajo);
    const recuadros = resolverResumen(f.resumen, f.tipoTrabajo);
    const anchoBase = columnas.reduce((a, c) => a + c.ancho, 0);
    const horizontal = anchoBase > 585;

    return new Promise((resolve) => {
      const doc = new PDFDocument({
        margin: 40,
        size: 'A4',
        layout: horizontal ? 'landscape' : 'portrait',
        bufferPages: true,
      });
      const chunks: Buffer[] = [];
      doc.on('data', (c) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      const pageW = doc.page.width;
      const left = doc.page.margins.left;
      const right = pageW - doc.page.margins.right;
      const contentW = right - left;
      const bottomLimit = doc.page.height - 72;

      // ---------- Encabezado institucional (banda azul) ----------
      const drawEncabezado = () => {
        doc.rect(0, 0, pageW, 82).fill(AZUL);
        // "logo"
        doc.roundedRect(left, 20, 42, 42, 6).fill('#FFFFFF');
        doc.fillColor(AZUL).fontSize(22).font('Helvetica-Bold')
          .text('C', left, 30, { width: 42, align: 'center' });
        doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(14)
          .text('IGSS — Hospital General de Accidentes «Ceibal»', left + 54, 24, { width: contentW - 54 });
        doc.font('Helvetica').fontSize(10).fillColor('#DCE6F5')
          .text('Área de Mantenimiento · Sistema de Control de Mantenimiento', left + 54, 44, { width: contentW - 54 });
        doc.y = 98;
      };

      drawEncabezado();

      // ---------- Titulo y metadatos ----------
      doc.fillColor(AZUL_OSCURO).font('Helvetica-Bold').fontSize(15)
        .text('Reporte de mantenimientos realizados', left, doc.y, { width: contentW, align: 'center' });
      doc.moveDown(0.2);
      doc.fillColor('#555').font('Helvetica').fontSize(10)
        .text(`Período consultado: ${f.desde || 'inicio'} al ${f.hasta || 'hoy'}    ·    Emitido: ${this.fechaCorta(new Date())}`,
          { width: contentW, align: 'center' });
      doc.moveDown(0.15);
      doc.fillColor('#666').fontSize(9)
        .text(`Filtros aplicados:  ${this.descripcionFiltros(f, resultados)}`,
          { width: contentW, align: 'center' });
      doc.moveDown(0.8);

      // ---------- Tarjetas de resumen ----------
      // Solo los recuadros elegidos (o los pertinentes al tipo filtrado).
      const TARJETAS: Record<string, { label: string; val: string }> = {
        total: { label: 'Mantenimientos', val: String(resumen.total) },
        equipos: { label: 'Equipos atendidos', val: String(resumen.equiposAtendidos) },
        fuera: { label: 'Fuera de servicio', val: String(resumen.fueraDeServicio) },
        mttr: { label: 'MTTR (min)', val: String(resumen.mttrMinutos) },
        preventivo: { label: 'Prev. (min)', val: String(resumen.preventivoMinutos ?? 0) },
        costo: { label: 'Costo total', val: this.quetzales(resumen.costoTotal ?? 0) },
      };
      const tarjetas = recuadros.map((r) => TARJETAS[r]);
      const gap = 10;
      const cardH = 50;
      // Con pocos recuadros no se estiran a todo el ancho: se limitan y centran.
      const cardW = Math.min(
        150,
        (contentW - gap * (tarjetas.length - 1)) / Math.max(1, tarjetas.length),
      );
      const anchoTarjetas = tarjetas.length * cardW + gap * (tarjetas.length - 1);
      const xTarjetas = left + (contentW - anchoTarjetas) / 2;
      const cardY = doc.y;
      tarjetas.forEach((t, i) => {
        const x = xTarjetas + i * (cardW + gap);
        doc.roundedRect(x, cardY, cardW, cardH, 6).fillAndStroke(GRIS_SUAVE, GRIS_BORDE);
        // Fuente del valor adaptativa: los importes largos (p. ej. Q88,800.00)
        // se reducen para no invadir la etiqueta ni desbordar la tarjeta.
        const fsVal = t.val.length > 8 ? 12 : t.val.length > 5 ? 15 : 18;
        doc.fillColor(AZUL).font('Helvetica-Bold').fontSize(fsVal)
          .text(t.val, x + 3, cardY + 9, { width: cardW - 6, align: 'center' });
        doc.fillColor('#555').font('Helvetica').fontSize(8)
          .text(t.label, x + 3, cardY + 34, { width: cardW - 6, align: 'center' });
      });
      if (tarjetas.length) doc.y = cardY + cardH + 14;

      // ---------- Distribucion por tipo ----------
      // Se omite cuando el reporte ya está filtrado a un solo tipo de trabajo.
      if (!f.tipoTrabajo) {
      doc.fillColor(AZUL_OSCURO).font('Helvetica-Bold').fontSize(11)
        .text('Distribución por tipo de mantenimiento', left, doc.y);
      doc.moveDown(0.3);
      const chipY = doc.y;
      let chipX = left;
      Object.entries(resumen.porTipo).forEach(([t, c]) => {
        const texto = `${t}: ${c}`;
        const w = doc.font('Helvetica').fontSize(9).widthOfString(texto) + 16;
        if (chipX + w > right) { chipX = left; doc.y += 20; }
        doc.roundedRect(chipX, doc.y, w, 15, 7).fillAndStroke('#EAF0F8', GRIS_BORDE);
        doc.fillColor(AZUL_OSCURO).text(texto, chipX + 8, doc.y + 3.5);
        chipX += w + 8;
      });
      doc.y += 26;
      }

      // ---------- Gráficas diarias del período ----------
      // Costo, llamadas de emergencia y reparaciones por día. Se incrustan como
      // IMÁGENES (idénticas a las del Excel y a la app). Si no se pueden generar
      // las imágenes, se dibuja un respaldo vectorial equivalente.
      const serie = resumen.seriesDiarias || [];
      if (serie.length && graficas.length) {
        const imgs = generarImagenesGraficas(serie as any);
        // En horizontal la imagen no ocupa todo el ancho: se limita y se centra
        // para no gastar una página entera por gráfica.
        const anchoImg = Math.min(contentW, 515);
        const xImg = left + (contentW - anchoImg) / 2;
        // Salto de página si no cabe el encabezado + al menos una gráfica.
        const altoImg = (anchoImg * 300) / 820; // aspecto 820×300
        const primerBloque = imgs ? altoImg + 10 : 93;
        if (doc.y + 20 + primerBloque > bottomLimit) {
          doc.addPage();
          doc.y = doc.page.margins.top;
        }
        doc.fillColor(AZUL_OSCURO).font('Helvetica-Bold').fontSize(11)
          .text('Actividad diaria del período', left, doc.y);
        doc.moveDown(0.3);

        if (imgs) {
          graficas.forEach((g) => {
            if (doc.y + altoImg + 8 > bottomLimit) {
              doc.addPage();
              doc.y = doc.page.margins.top;
            }
            doc.image(imgs[g], xImg, doc.y, { width: anchoImg });
            doc.y += altoImg + 8;
          });
        } else {
          const chartH = 56;
          const bloque = 15 + chartH + 22;
          let cy = doc.y;
          graficas.forEach((clave) => {
            const g = GRAFICAS_DEF[clave];
            if (cy + bloque > bottomLimit) {
              doc.addPage();
              cy = doc.page.margins.top;
            }
            cy = this.dibujarGraficaBarras(doc, {
              x: left, y: cy, w: contentW, h: chartH,
              titulo: g.titulo, datos: serie, campo: clave,
              color: g.color, ejeY: g.ejeY, moneda: g.moneda,
            });
          });
          doc.y = cy + 6;
        }
      }

      // ---------- Tabla de detalle ----------
      // Las columnas elegidas se reparten todo el ancho útil, en proporción a
      // su ancho base. Si hay que comprimirlas mucho, se reduce la letra.
      // Al comprimir, las columnas de dato corto (fecha, horas, importes)
      // conservan su ancho y solo ceden espacio las de texto.
      const rigidas = columnas.filter((c) => c.anchoMin);
      const anchoRigido = rigidas.reduce((a, c) => a + (c.anchoMin || 0), 0);
      const anchoFlexible = anchoBase - rigidas.reduce((a, c) => a + c.ancho, 0);
      const comprimir = anchoBase > contentW && anchoFlexible > 0;
      const escala = comprimir
        ? (contentW - anchoRigido) / anchoFlexible
        : contentW / anchoBase;
      const cols = columnas.map((c: ColumnaReporte) => ({
        key: c.clave,
        label: c.label,
        w: comprimir && c.anchoMin ? c.anchoMin : c.ancho * escala,
        align: c.align,
      }));
      const fsCelda = escala < 0.7 ? 7 : escala < 0.8 ? 7.5 : escala < 0.9 ? 8 : 8.5;
      const fsEnc = escala < 0.7 ? 7.5 : escala < 0.8 ? 8 : 9;
      const padX = escala < 0.7 ? 3 : escala < 0.8 ? 3.5 : 5;

      const drawHeaderRow = () => {
        const y = doc.y;
        // Alto según el encabezado más largo (puede ocupar dos líneas).
        doc.font('Helvetica-Bold').fontSize(fsEnc);
        let hEnc = 20;
        cols.forEach((c) => {
          const h = doc.heightOfString(c.label, { width: c.w - padX * 2 });
          hEnc = Math.max(hEnc, h + 11);
        });
        doc.rect(left, y, contentW, hEnc).fill(AZUL);
        let x = left;
        doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(fsEnc);
        cols.forEach((c) => {
          doc.text(c.label, x + padX, y + 6, { width: c.w - padX * 2, align: c.align });
          x += c.w;
        });
        doc.y = y + hEnc;
      };

      // Evita que el título del detalle quede al pie de la página tras las gráficas.
      if (doc.y + 60 > bottomLimit) {
        doc.addPage();
        doc.y = doc.page.margins.top;
      }
      doc.fillColor(AZUL_OSCURO).font('Helvetica-Bold').fontSize(11)
        .text('Detalle de mantenimientos', left, doc.y);
      doc.moveDown(0.3);
      drawHeaderRow();

      doc.font('Helvetica').fontSize(fsCelda);
      if (resultados.length === 0) {
        doc.fillColor('#777').text('Sin registros en el período seleccionado.', left + padX, doc.y + 6);
        doc.y += 22;
      }

      resultados.forEach((m: any, idx: number) => {
        const cells = this.celdasDetalle(m);
        // Altura de fila segun el contenido mas alto
        doc.font('Helvetica').fontSize(fsCelda);
        let rowH = 14;
        cols.forEach((c) => {
          const h = doc.heightOfString(cells[c.key], { width: c.w - padX * 2 });
          rowH = Math.max(rowH, h + 8);
        });
        // Salto de pagina
        if (doc.y + rowH > bottomLimit) {
          doc.addPage();
          doc.y = doc.page.margins.top;
          drawHeaderRow();
          doc.font('Helvetica').fontSize(fsCelda);
        }
        const y = doc.y;
        if (idx % 2 === 1) doc.rect(left, y, contentW, rowH).fill(GRIS_SUAVE);
        let x = left;
        cols.forEach((c) => {
          if (c.key === 'estado') {
            doc.fillColor(
              m.estadoEquipoResultante === 'funcionando' ? VERDE : ROJO,
            ).font('Helvetica-Bold');
          } else {
            doc.fillColor('#222').font('Helvetica');
          }
          doc.fontSize(fsCelda).text(cells[c.key], x + padX, y + 4, {
            width: c.w - padX * 2,
            align: c.align,
          });
          x += c.w;
        });
        // linea separadora
        doc.moveTo(left, y + rowH).lineTo(right, y + rowH).strokeColor(GRIS_BORDE).lineWidth(0.5).stroke();
        doc.y = y + rowH;
      });

      // ---------- Firmas ----------
      if (doc.y + 90 > bottomLimit) { doc.addPage(); doc.y = doc.page.margins.top; }
      doc.moveDown(3);
      const firmaY = doc.y;
      const mitad = contentW / 2;
      doc.strokeColor('#999').lineWidth(0.7);
      doc.moveTo(left + 20, firmaY).lineTo(left + mitad - 20, firmaY).stroke();
      doc.moveTo(left + mitad + 20, firmaY).lineTo(right - 20, firmaY).stroke();
      doc.fillColor('#333').font('Helvetica').fontSize(9);
      doc.text('Elaboró — Área de Mantenimiento', left, firmaY + 5, { width: mitad, align: 'center' });
      doc.text('Visto bueno — Supervisión', left + mitad, firmaY + 5, { width: mitad, align: 'center' });

      // ---------- Pie de pagina con numeracion ----------
      const range = doc.bufferedPageRange();
      for (let i = 0; i < range.count; i++) {
        doc.switchToPage(range.start + i);
        const y = doc.page.height - 60;
        doc.strokeColor(GRIS_BORDE).lineWidth(0.5)
          .moveTo(left, y).lineTo(right, y).stroke();
        doc.fillColor('#888').font('Helvetica').fontSize(8);
        doc.text('Sistema de Control de Mantenimiento — Hospital «Ceibal» (IGSS)', left, y + 6, {
          width: contentW / 2, align: 'left', lineBreak: false,
        });
        doc.text(`Página ${i + 1} de ${range.count}`, left + contentW / 2, y + 6, {
          width: contentW / 2, align: 'right', lineBreak: false,
        });
      }

      doc.end();
    });
  }

  // ==================== Reporte de equipos EN ALTA (inventario) ====================
  // "En alta" = todos los equipos cuyo estado no sea BAJA.
  async equiposReporte(f: FiltrosEquipos = {}) {
    const filtro: any = { estado: { $ne: 'BAJA' } };
    // Filtro opcional por fecha de alta del equipo (createdAt).
    if (f.desde || f.hasta) {
      filtro.createdAt = {};
      if (f.desde) filtro.createdAt.$gte = new Date(f.desde);
      if (f.hasta) {
        const fin = new Date(f.hasta);
        fin.setHours(0, 0, 0, 0);
        fin.setDate(fin.getDate() + 1);
        filtro.createdAt.$lt = fin;
      }
    }
    const equipos = await this.equipoModel
      .find(filtro)
      .sort({ ubicacion: 1, codigoInventario: 1 })
      .exec();

    const cont = (est: string) => equipos.filter((e) => e.estado === est).length;
    const contCrit = (c: string) =>
      equipos.filter((e) => e.criticidad === c).length;

    const resumen = {
      total: equipos.length,
      activos: cont('ACTIVO'),
      enMantenimiento: cont('MANTENIMIENTO'),
      fueraDeServicio: cont('INACTIVO'),
      porCriticidad: {
        CRITICA: contCrit('CRITICA'),
        ALTA: contCrit('ALTA'),
        MEDIA: contCrit('MEDIA'),
        BAJA: contCrit('BAJA'),
      },
    };
    return { equipos, resumen };
  }

  async generarEquiposExcel(f: FiltrosEquipos = {}): Promise<ExcelJS.Workbook> {
    const { equipos, resumen } = await this.equiposReporte(f);
    const wb = new ExcelJS.Workbook();
    wb.creator = 'Sistema de Control de Mantenimiento - Hospital Ceibal (IGSS)';
    wb.created = new Date();
    const ws = wb.addWorksheet('Equipos en alta');
    const A = 'FF1B4B8A';
    const fill = (argb: string) => ({
      type: 'pattern' as const,
      pattern: 'solid' as const,
      fgColor: { argb },
    });

    ws.mergeCells('A1:G1');
    ws.getCell('A1').value = 'IGSS - Hospital General de Accidentes «Ceibal»';
    ws.getCell('A1').font = { bold: true, size: 14, color: { argb: A } };
    ws.mergeCells('A2:G2');
    ws.getCell('A2').value =
      'Area de Mantenimiento - Inventario de equipos en alta';
    ws.getCell('A2').font = { size: 11, color: { argb: 'FF555555' } };
    ws.mergeCells('A3:G3');
    const rango = f.desde || f.hasta
      ? `Alta del equipo: ${f.desde || 'inicio'} al ${f.hasta || 'hoy'}   |   `
      : '';
    ws.getCell('A3').value = `${rango}Emitido: ${this.fechaCorta(new Date())}`;

    ws.getCell('A5').value = 'Resumen';
    ws.getCell('A5').font = { bold: true, size: 12, color: { argb: A } };
    const pares: [string, number][] = [
      ['Total de equipos en alta', resumen.total],
      ['Activos', resumen.activos],
      ['En mantenimiento', resumen.enMantenimiento],
      ['Fuera de servicio', resumen.fueraDeServicio],
      ['Criticidad CRITICA', resumen.porCriticidad.CRITICA],
      ['Criticidad ALTA', resumen.porCriticidad.ALTA],
    ];
    let fila = 6;
    pares.forEach(([k, v]) => {
      ws.getCell(`A${fila}`).value = k;
      ws.getCell(`B${fila}`).value = v;
      ws.getCell(`B${fila}`).font = { bold: true };
      fila++;
    });

    const inicio = fila + 1;
    const headers = [
      'N.o de bien', 'Nombre', 'Marca', 'Serie', 'Ubicacion', 'Estado', 'Criticidad',
    ];
    const hRow = ws.getRow(inicio);
    headers.forEach((h, i) => {
      const c = hRow.getCell(i + 1);
      c.value = h;
      c.fill = fill(A);
      c.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    });
    equipos.forEach((e: any, idx: number) => {
      const r = ws.getRow(inicio + 1 + idx);
      r.getCell(1).value = e.codigoInventario;
      r.getCell(2).value = e.nombre;
      r.getCell(3).value = e.marca;
      r.getCell(4).value = e.serie;
      r.getCell(5).value = e.ubicacion;
      const cEst = r.getCell(6);
      cEst.value = ETIQUETA_ESTADO_EQUIPO[e.estado] || e.estado;
      cEst.font = {
        bold: true,
        color: {
          argb:
            e.estado === 'ACTIVO'
              ? 'FF1B8A4B'
              : e.estado === 'INACTIVO'
                ? 'FFC0392B'
                : 'FFB7791F',
        },
      };
      r.getCell(7).value = e.criticidad;
      if (idx % 2 === 1) for (let i = 1; i <= 7; i++) r.getCell(i).fill = fill('FFF4F7FB');
    });
    if (equipos.length === 0) {
      ws.getRow(inicio + 1).getCell(1).value = 'No hay equipos en alta.';
    }
    const anchos = [14, 34, 16, 18, 22, 18, 12];
    anchos.forEach((w, i) => (ws.getColumn(i + 1).width = w));
    ws.autoFilter = {
      from: { row: inicio, column: 1 },
      to: { row: inicio, column: 7 },
    };
    ws.views = [{ state: 'frozen', ySplit: inicio }];
    return wb;
  }

  async generarEquiposPdf(f: FiltrosEquipos = {}): Promise<Buffer> {
    const { equipos, resumen } = await this.equiposReporte(f);

    return new Promise((resolve) => {
      const doc = new PDFDocument({ margin: 40, size: 'A4', bufferPages: true });
      const chunks: Buffer[] = [];
      doc.on('data', (c) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      const pageW = doc.page.width;
      const left = doc.page.margins.left;
      const right = pageW - doc.page.margins.right;
      const contentW = right - left;
      const bottomLimit = doc.page.height - 72;

      // Banda de encabezado
      doc.rect(0, 0, pageW, 82).fill(AZUL);
      doc.roundedRect(left, 20, 42, 42, 6).fill('#FFFFFF');
      doc.fillColor(AZUL).fontSize(22).font('Helvetica-Bold')
        .text('C', left, 30, { width: 42, align: 'center' });
      doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(14)
        .text('IGSS — Hospital General de Accidentes «Ceibal»', left + 54, 24, { width: contentW - 54 });
      doc.font('Helvetica').fontSize(10).fillColor('#DCE6F5')
        .text('Área de Mantenimiento · Sistema de Control de Mantenimiento', left + 54, 44, { width: contentW - 54 });
      doc.y = 98;

      doc.fillColor(AZUL_OSCURO).font('Helvetica-Bold').fontSize(15)
        .text('Inventario de equipos en alta', left, doc.y, { width: contentW, align: 'center' });
      doc.moveDown(0.2);
      const rangoTxt =
        f.desde || f.hasta
          ? `Alta del equipo: ${f.desde || 'inicio'} al ${f.hasta || 'hoy'}    ·    `
          : '';
      doc.fillColor('#555').font('Helvetica').fontSize(10)
        .text(`Equipos que no están dados de baja    ·    ${rangoTxt}Emitido: ${this.fechaCorta(new Date())}`,
          { width: contentW, align: 'center' });
      doc.moveDown(0.8);

      // Tarjetas de resumen
      const tarjetas = [
        { label: 'Equipos en alta', val: String(resumen.total) },
        { label: 'Activos', val: String(resumen.activos) },
        { label: 'En mantenimiento', val: String(resumen.enMantenimiento) },
        { label: 'Fuera de servicio', val: String(resumen.fueraDeServicio) },
      ];
      const gap = 10;
      const cardW = (contentW - gap * (tarjetas.length - 1)) / tarjetas.length;
      const cardY = doc.y;
      tarjetas.forEach((t, i) => {
        const x = left + i * (cardW + gap);
        doc.roundedRect(x, cardY, cardW, 46, 6).fillAndStroke(GRIS_SUAVE, GRIS_BORDE);
        doc.fillColor(AZUL).font('Helvetica-Bold').fontSize(18)
          .text(t.val, x, cardY + 7, { width: cardW, align: 'center' });
        doc.fillColor('#555').font('Helvetica').fontSize(8)
          .text(t.label, x, cardY + 30, { width: cardW, align: 'center' });
      });
      doc.y = cardY + 46 + 14;

      // Chips por criticidad
      doc.fillColor(AZUL_OSCURO).font('Helvetica-Bold').fontSize(11)
        .text('Por criticidad', left, doc.y);
      doc.moveDown(0.3);
      let chipX = left;
      Object.entries(resumen.porCriticidad).forEach(([k, c]) => {
        const texto = `${k}: ${c}`;
        const w = doc.font('Helvetica').fontSize(9).widthOfString(texto) + 16;
        if (chipX + w > right) { chipX = left; doc.y += 20; }
        doc.roundedRect(chipX, doc.y, w, 15, 7).fillAndStroke('#EAF0F8', GRIS_BORDE);
        doc.fillColor(AZUL_OSCURO).text(texto, chipX + 8, doc.y + 3.5);
        chipX += w + 8;
      });
      doc.y += 26;

      // Tabla
      const cols = [
        { key: 'codigo', label: 'N.º de bien', w: 58 },
        { key: 'nombre', label: 'Nombre', w: 110 },
        { key: 'marca', label: 'Marca', w: 58 },
        { key: 'serie', label: 'Serie', w: 62 },
        { key: 'ubicacion', label: 'Ubicación', w: 78 },
        { key: 'estado', label: 'Estado', w: 78 },
        { key: 'criticidad', label: 'Criticidad', w: contentW - 58 - 110 - 58 - 62 - 78 - 78 },
      ];
      const padX = 5;
      const drawHeaderRow = () => {
        const y = doc.y;
        doc.rect(left, y, contentW, 20).fill(AZUL);
        let x = left;
        doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(9);
        cols.forEach((c) => {
          doc.text(c.label, x + padX, y + 6, { width: c.w - padX * 2 });
          x += c.w;
        });
        doc.y = y + 20;
      };

      doc.fillColor(AZUL_OSCURO).font('Helvetica-Bold').fontSize(11)
        .text('Detalle de equipos', left, doc.y);
      doc.moveDown(0.3);
      drawHeaderRow();
      doc.font('Helvetica').fontSize(8.5);
      if (equipos.length === 0) {
        doc.fillColor('#777').text('No hay equipos en alta.', left + padX, doc.y + 6);
        doc.y += 22;
      }

      const colorEstado = (est: string) =>
        est === 'ACTIVO' ? VERDE : est === 'INACTIVO' ? ROJO : AMBAR;

      equipos.forEach((e: any, idx: number) => {
        const cells: Record<string, string> = {
          codigo: e.codigoInventario,
          nombre: e.nombre,
          marca: e.marca,
          serie: e.serie,
          ubicacion: e.ubicacion,
          estado: ETIQUETA_ESTADO_EQUIPO[e.estado] || e.estado,
          criticidad: e.criticidad,
        };
        doc.font('Helvetica').fontSize(8.5);
        let rowH = 14;
        cols.forEach((c) => {
          const h = doc.heightOfString(cells[c.key], { width: c.w - padX * 2 });
          rowH = Math.max(rowH, h + 8);
        });
        if (doc.y + rowH > bottomLimit) {
          doc.addPage();
          doc.y = doc.page.margins.top;
          drawHeaderRow();
          doc.font('Helvetica').fontSize(8.5);
        }
        const y = doc.y;
        if (idx % 2 === 1) doc.rect(left, y, contentW, rowH).fill(GRIS_SUAVE);
        let x = left;
        cols.forEach((c) => {
          if (c.key === 'estado') {
            doc.fillColor(colorEstado(e.estado)).font('Helvetica-Bold');
          } else {
            doc.fillColor('#222').font('Helvetica');
          }
          doc.fontSize(8.5).text(cells[c.key], x + padX, y + 4, { width: c.w - padX * 2 });
          x += c.w;
        });
        doc.moveTo(left, y + rowH).lineTo(right, y + rowH).strokeColor(GRIS_BORDE).lineWidth(0.5).stroke();
        doc.y = y + rowH;
      });

      // Pie con numeracion
      const range = doc.bufferedPageRange();
      for (let i = 0; i < range.count; i++) {
        doc.switchToPage(range.start + i);
        const y = doc.page.height - 60;
        doc.strokeColor(GRIS_BORDE).lineWidth(0.5)
          .moveTo(left, y).lineTo(right, y).stroke();
        doc.fillColor('#888').font('Helvetica').fontSize(8);
        doc.text('Sistema de Control de Mantenimiento — Hospital «Ceibal» (IGSS)', left, y + 6, {
          width: contentW / 2, align: 'left', lineBreak: false,
        });
        doc.text(`Página ${i + 1} de ${range.count}`, left + contentW / 2, y + 6, {
          width: contentW / 2, align: 'right', lineBreak: false,
        });
      }

      doc.end();
    });
  }
}
