import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as ExcelJS from 'exceljs';
import PDFDocument = require('pdfkit');
import {
  Mantenimiento,
  MantenimientoDocument,
} from '../mantenimientos/schemas/mantenimiento.schema';
import { Equipo, EquipoDocument } from '../equipos/schemas/equipo.schema';

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
}

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
  ) {}

  private horasEntre(hi?: Date, hf?: Date): number | null {
    if (!hi || !hf) return null;
    const ms = new Date(hf).getTime() - new Date(hi).getTime();
    return ms > 0 ? ms / 3_600_000 : null;
  }

  private async construirFiltro(f: FiltrosReporte) {
    const filtro: any = {};
    if (f.equipo) {
      filtro.equipo = new Types.ObjectId(f.equipo);
    } else if (f.excluirBaja === 'true') {
      // Solo mantenimientos de equipos que NO estan dados de baja.
      const idsEnAlta = await this.equipoModel
        .find({ estado: { $ne: 'BAJA' } })
        .distinct('_id');
      filtro.equipo = { $in: idsEnAlta };
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
  private hora(d?: Date): string {
    if (!d) return '—';
    const x = new Date(d);
    return `${String(x.getHours()).padStart(2, '0')}:${String(x.getMinutes()).padStart(2, '0')}`;
  }

  // ---------- Panel de indicadores / Dashboard (RF08) ----------
  async indicadores() {
    const ahora = new Date();
    const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
    const finMes = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 1);

    const equiposRegistrados = await this.equipoModel
      .countDocuments({ estado: { $ne: 'BAJA' } })
      .exec();
    const equiposFuera = await this.equipoModel
      .countDocuments({ estado: 'INACTIVO' })
      .exec();

    const mantsMes = await this.mantenimientoModel
      .find({ fechaMantenimiento: { $gte: inicioMes, $lt: finMes } })
      .exec();

    const correctivos = mantsMes.filter(
      (m) =>
        m.tipoTrabajo === 'correctivo' ||
        m.tipoTrabajo === 'llamada_emergencia',
    );
    const duraciones = correctivos
      .map((m) => this.horasEntre(m.horaInicio, m.horaFin))
      .filter((h): h is number => h !== null);
    // MTTR expresado en MINUTOS (req 2). La fórmula es la misma (promedio de la
    // duración horaInicio→horaFin de correctivos + emergencias); solo cambia la
    // unidad de presentación: horas × 60, redondeado a minutos enteros.
    const mttrMinutos = duraciones.length
      ? Math.round(
          (duraciones.reduce((a, b) => a + b, 0) / duraciones.length) * 60,
        )
      : 0;

    // Tiempo medio de mantenimiento PREVENTIVO, también en MINUTOS (req 2).
    const preventivos = mantsMes.filter((m) => m.tipoTrabajo === 'preventivo');
    const durPrev = preventivos
      .map((m) => this.horasEntre(m.horaInicio, m.horaFin))
      .filter((h): h is number => h !== null);
    const preventivoMinutos = durPrev.length
      ? Math.round(
          (durPrev.reduce((a, b) => a + b, 0) / durPrev.length) * 60,
        )
      : 0;

    // Numero de llamadas de emergencia registradas en el mes en curso.
    const emergenciasMes = mantsMes.filter(
      (m) => m.tipoTrabajo === 'llamada_emergencia',
    ).length;

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

    return {
      equiposRegistrados,
      equiposFuera,
      mantenimientosMes: mantsMes.length,
      mttrMinutos,
      preventivoMinutos,
      emergenciasMes,
      distribucionTipo,
      ultimos,
    };
  }

  // ---------- Vista previa del reporte (RF07) ----------
  async preview(f: FiltrosReporte) {
    const filtro = await this.construirFiltro(f);
    const resultados = await this.mantenimientoModel
      .find(filtro)
      .sort({ fechaMantenimiento: 1 })
      .populate([
        { path: 'equipo', select: 'codigoInventario nombre subTipo ubicacion' },
        { path: 'tecnico', select: 'nombre' },
        { path: 'empresa', select: 'nombre' },
      ])
      .exec();

    return { resultados, resumen: this.resumen(resultados) };
  }

  // Resumen cuantitativo del periodo (totales, equipos atendidos, MTTR, etc.).
  private resumen(resultados: any[]) {
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
    const dur = resultados
      .filter(
        (m) =>
          m.tipoTrabajo === 'correctivo' ||
          m.tipoTrabajo === 'llamada_emergencia',
      )
      .map((m) => this.horasEntre(m.horaInicio, m.horaFin))
      .filter((h): h is number => h !== null);
    const mttrMinutos = dur.length
      ? Math.round((dur.reduce((a, b) => a + b, 0) / dur.length) * 60)
      : 0;

    // Costo total del periodo: suma de los costos históricos ya registrados en
    // cada mantenimiento (no se recalcula; req 9).
    const costoTotal =
      Math.round(
        resultados.reduce((a, m) => a + (Number(m.costoMantenimiento) || 0), 0) *
          100,
      ) / 100;

    return {
      porTipo,
      equiposAtendidos,
      total: resultados.length,
      fueraDeServicio,
      mttrMinutos,
      costoTotal,
    };
  }

  private descripcionFiltros(f: FiltrosReporte, resultados: any[]): string {
    const eq =
      f.equipo && resultados[0]?.equipo
        ? `${resultados[0].equipo.codigoInventario} - ${resultados[0].equipo.nombre}`
        : 'Todos';
    const tipo = f.tipoTrabajo ? ETIQUETA_TIPO[f.tipoTrabajo] : 'Todos';
    return `Equipo: ${eq}   |   Tipo: ${tipo}`;
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
    const resumenPares: [string, number | string][] = [
      ['Total de mantenimientos', resumen.total],
      ['Equipos atendidos', resumen.equiposAtendidos],
      ['Intervenciones que dejaron equipo fuera de servicio', resumen.fueraDeServicio],
      ['MTTR del periodo (min)', resumen.mttrMinutos],
      ['Costo total del periodo (Q)', resumen.costoTotal],
      ...Object.entries(resumen.porTipo).map(
        ([t, c]) => [`  · ${t}`, c] as [string, number],
      ),
    ];
    let fila = 7;
    resumenPares.forEach(([k, v]) => {
      ws.getCell(`A${fila}`).value = k;
      ws.getCell(`B${fila}`).value = v as any;
      ws.getCell(`B${fila}`).font = { bold: true };
      fila++;
    });

    // Tabla de detalle
    const inicioTabla = fila + 1;
    const headers = [
      'N.o', 'Fecha', 'N.o de bien', 'Equipo', 'Tipo', 'Periodo',
      'Tecnico', 'Empresa', 'Estado final', 'Costo (Q)',
    ];
    const hRow = ws.getRow(inicioTabla);
    headers.forEach((h, i) => {
      const c = hRow.getCell(i + 1);
      c.value = h;
      c.fill = fill(A);
      c.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      c.alignment = { vertical: 'middle' };
      c.border = { bottom: { style: 'thin', color: { argb: 'FFAAAAAA' } } };
    });

    resultados.forEach((m: any, idx: number) => {
      const r = ws.getRow(inicioTabla + 1 + idx);
      r.getCell(1).value = String(m._id).slice(-6);
      r.getCell(2).value = this.fechaCorta(m.fechaMantenimiento);
      r.getCell(3).value = m.equipo?.codigoInventario || '—';
      r.getCell(4).value = m.equipo?.nombre || '—';
      r.getCell(5).value = ETIQUETA_TIPO[m.tipoTrabajo] || m.tipoTrabajo;
      r.getCell(6).value = ETIQUETA_PERIODO[m.periodo] || m.periodo || '—';
      r.getCell(7).value = m.tecnico?.nombre || '—';
      r.getCell(8).value = m.empresa?.nombre || '—';
      const est = ETIQUETA_ESTADO[m.estadoEquipoResultante] || m.estadoEquipoResultante;
      const cEst = r.getCell(9);
      cEst.value = est;
      cEst.font = {
        bold: true,
        color: {
          argb: m.estadoEquipoResultante === 'funcionando' ? 'FF1B8A4B' : 'FFC0392B',
        },
      };
      const cCosto = r.getCell(10);
      cCosto.value = Number(m.costoMantenimiento) || 0;
      cCosto.numFmt = '"Q"#,##0.00';
      cCosto.alignment = { horizontal: 'right' };
      if (idx % 2 === 1) {
        for (let i = 1; i <= 10; i++) r.getCell(i).fill = fill('FFF4F7FB');
      }
    });

    if (resultados.length === 0) {
      ws.getRow(inicioTabla + 1).getCell(1).value =
        'Sin registros en el periodo seleccionado.';
    }

    // Anchos y autofiltro
    const anchos = [8, 12, 12, 34, 20, 14, 22, 26, 16, 14];
    anchos.forEach((w, i) => (ws.getColumn(i + 1).width = w));
    ws.autoFilter = {
      from: { row: inicioTabla, column: 1 },
      to: { row: inicioTabla, column: 10 },
    };
    ws.views = [{ state: 'frozen', ySplit: inicioTabla }];

    return wb;
  }

  // ==================== Exportacion a PDF (RF07) ====================
  async generarPdf(f: FiltrosReporte): Promise<Buffer> {
    const { resultados, resumen } = await this.preview(f);

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
      const tarjetas = [
        { label: 'Mantenimientos', val: String(resumen.total) },
        { label: 'Equipos atendidos', val: String(resumen.equiposAtendidos) },
        { label: 'Fuera de servicio', val: String(resumen.fueraDeServicio) },
        { label: 'MTTR (min)', val: String(resumen.mttrMinutos) },
        { label: 'Costo total', val: `Q${(resumen.costoTotal ?? 0).toFixed(2)}` },
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

      // ---------- Distribucion por tipo ----------
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

      // ---------- Tabla de detalle ----------
      const cols = [
        { key: 'fecha', label: 'Fecha', w: 48, align: 'left' as const },
        { key: 'equipo', label: 'Equipo', w: 118, align: 'left' as const },
        { key: 'tipo', label: 'Tipo', w: 66, align: 'left' as const },
        { key: 'tecnico', label: 'Técnico', w: 70, align: 'left' as const },
        { key: 'empresa', label: 'Empresa', w: 66, align: 'left' as const },
        { key: 'costo', label: 'Costo (Q)', w: 54, align: 'right' as const },
        { key: 'estado', label: 'Estado final', w: contentW - 48 - 118 - 66 - 70 - 66 - 54, align: 'left' as const },
      ];
      const padX = 5;

      const drawHeaderRow = () => {
        const y = doc.y;
        doc.rect(left, y, contentW, 20).fill(AZUL);
        let x = left;
        doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(9);
        cols.forEach((c) => {
          doc.text(c.label, x + padX, y + 6, { width: c.w - padX * 2, align: c.align });
          x += c.w;
        });
        doc.y = y + 20;
      };

      doc.fillColor(AZUL_OSCURO).font('Helvetica-Bold').fontSize(11)
        .text('Detalle de mantenimientos', left, doc.y);
      doc.moveDown(0.3);
      drawHeaderRow();

      doc.font('Helvetica').fontSize(8.5);
      if (resultados.length === 0) {
        doc.fillColor('#777').text('Sin registros en el período seleccionado.', left + padX, doc.y + 6);
        doc.y += 22;
      }

      resultados.forEach((m: any, idx: number) => {
        const cells: Record<string, string> = {
          fecha: this.fechaCorta(m.fechaMantenimiento),
          equipo: m.equipo ? `${m.equipo.codigoInventario} — ${m.equipo.nombre}` : '—',
          tipo: ETIQUETA_TIPO[m.tipoTrabajo] || m.tipoTrabajo,
          tecnico: m.tecnico?.nombre || '—',
          empresa: m.empresa?.nombre || '—',
          costo: `Q${(Number(m.costoMantenimiento) || 0).toFixed(2)}`,
          estado: ETIQUETA_ESTADO[m.estadoEquipoResultante] || m.estadoEquipoResultante,
        };
        // Altura de fila segun el contenido mas alto
        doc.font('Helvetica').fontSize(8.5);
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
          doc.font('Helvetica').fontSize(8.5);
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
          doc.fontSize(8.5).text(cells[c.key], x + padX, y + 4, {
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
