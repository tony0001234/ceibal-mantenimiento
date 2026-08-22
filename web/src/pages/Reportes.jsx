import { useState, useMemo } from 'react';
import { EQUIPOS, TIPOS_MANTENIMIENTO, MANTENIMIENTOS } from '../data/mockData';
import EstadoBadge from '../components/EstadoBadge';
import DemoBanner from '../components/DemoBanner';

// Generación de reportes (RF07) y plantilla de reporte (5.3.4).
// Filtros por rango de fechas, equipo o tipo; resumen + detalle línea por línea;
// exportación simulada a PDF / Excel.
export default function Reportes() {
  const [filtros, setFiltros] = useState({ desde: '2026-08-01', hasta: '2026-08-31', equipoId: '', tipo: '' });
  const [generado, setGenerado] = useState(false);

  const resultados = useMemo(() => {
    return MANTENIMIENTOS.filter((m) => {
      return (!filtros.desde || m.fecha >= filtros.desde)
        && (!filtros.hasta || m.fecha <= filtros.hasta)
        && (!filtros.equipoId || String(m.equipoId) === String(filtros.equipoId))
        && (!filtros.tipo || m.tipo === filtros.tipo);
    }).sort((a, b) => a.fecha.localeCompare(b.fecha));
  }, [filtros]);

  const resumen = useMemo(() => {
    const porTipo = {};
    TIPOS_MANTENIMIENTO.forEach((t) => { porTipo[t] = 0; });
    resultados.forEach((m) => { porTipo[m.tipo] = (porTipo[m.tipo] || 0) + 1; });
    const equiposAtendidos = new Set(resultados.map((m) => m.equipoId)).size;
    return { porTipo, equiposAtendidos, total: resultados.length };
  }, [resultados]);

  const equipoFiltro = EQUIPOS.find((e) => String(e.id) === String(filtros.equipoId));
  const set = (k, v) => { setFiltros({ ...filtros, [k]: v }); setGenerado(false); };

  return (
    <>
      <h1 className="titulo-pantalla mb-1">Reportes</h1>
      <p className="texto-auxiliar mb-3">Genere un reporte de mantenimientos filtrado por fecha, equipo o tipo, listo para entregar a auditoría.</p>
      <DemoBanner texto="Prototipo de demostración: la exportación a PDF/Excel es simulada." />

      {/* Filtros */}
      <div className="card mb-3">
        <div className="card-header py-2 titulo-seccion">Filtros del reporte</div>
        <div className="card-body">
          <div className="row g-3 align-items-end">
            <div className="col-6 col-md-3">
              <label className="form-label">Desde</label>
              <input type="date" className="form-control" value={filtros.desde} onChange={(e) => set('desde', e.target.value)} />
            </div>
            <div className="col-6 col-md-3">
              <label className="form-label">Hasta</label>
              <input type="date" className="form-control" value={filtros.hasta} onChange={(e) => set('hasta', e.target.value)} />
            </div>
            <div className="col-12 col-md-3">
              <label className="form-label">Equipo</label>
              <select className="form-select" value={filtros.equipoId} onChange={(e) => set('equipoId', e.target.value)}>
                <option value="">Todos</option>
                {EQUIPOS.map((e) => <option key={e.id} value={e.id}>{e.codigo} — {e.nombre}</option>)}
              </select>
            </div>
            <div className="col-12 col-md-3">
              <label className="form-label">Tipo de mantenimiento</label>
              <select className="form-select" value={filtros.tipo} onChange={(e) => set('tipo', e.target.value)}>
                <option value="">Todos</option>
                {TIPOS_MANTENIMIENTO.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className="d-flex gap-2 mt-3">
            <button className="btn btn-primary" onClick={() => setGenerado(true)}><i className="bi bi-search me-1" />Generar reporte</button>
            <button className="btn btn-outline-danger" disabled={!generado} onClick={() => alert('Prototipo NO funcional: aquí se descargaría el reporte en PDF (RF07).')}><i className="bi bi-file-earmark-pdf me-1" />Exportar PDF</button>
            <button className="btn btn-outline-success" disabled={!generado} onClick={() => alert('Prototipo NO funcional: aquí se descargaría el reporte en Excel (RF07).')}><i className="bi bi-file-earmark-excel me-1" />Exportar Excel</button>
          </div>
        </div>
      </div>

      {!generado && (
        <div className="text-center texto-auxiliar py-5">
          <i className="bi bi-file-earmark-bar-graph d-block mb-2" style={{ fontSize: '38px', opacity: .3 }} />
          Configure los filtros y presione «Generar reporte» para ver la vista previa.
        </div>
      )}

      {/* Vista previa de la plantilla (5.3.4) — 6 bloques fijos */}
      {generado && (
        <div className="reporte-doc">
          {/* Bloque 1: encabezado institucional */}
          <div className="d-flex justify-content-between align-items-start border-bottom pb-3 mb-3">
            <div className="d-flex gap-2 align-items-center">
              <div className="brand-emblem" style={{ background: 'var(--ceibal-azul-600)', color: '#fff' }}><i className="bi bi-stack" /></div>
              <div>
                <div className="fw-bold" style={{ color: 'var(--ceibal-azul-900)' }}>IGSS — Hospital General de Accidentes «Ceibal»</div>
                <div className="texto-auxiliar">Área de Mantenimiento · Sistema de Control de Mantenimiento</div>
              </div>
            </div>
            <div className="text-end texto-auxiliar">
              <div><strong>Reporte N.º</strong> R-2026-0812</div>
              <div>Emitido: 2026-08-20</div>
            </div>
          </div>

          {/* Bloque 2: título con periodo */}
          <h2 className="text-center titulo-seccion mb-1">Reporte de mantenimientos realizados</h2>
          <p className="text-center texto-auxiliar mb-3">Período consultado: {filtros.desde} al {filtros.hasta}</p>

          {/* Bloque 3: filtros aplicados */}
          <div className="mb-3" style={{ fontSize: '13.5px' }}>
            <strong>Filtros aplicados:</strong>{' '}
            Equipo: {equipoFiltro ? `${equipoFiltro.codigo} — ${equipoFiltro.nombre}` : 'Todos'} ·{' '}
            Tipo: {filtros.tipo || 'Todos'}
          </div>

          {/* Bloque 4: resumen cuantitativo */}
          <div className="row g-2 mb-3">
            <div className="col-12"><strong style={{ fontSize: '14px' }}>Resumen del período</strong></div>
            <div className="col-6 col-md-3"><div className="border rounded p-2 text-center"><div className="fw-bold fs-5">{resumen.total}</div><div className="texto-auxiliar">Mantenimientos</div></div></div>
            <div className="col-6 col-md-3"><div className="border rounded p-2 text-center"><div className="fw-bold fs-5">{resumen.equiposAtendidos}</div><div className="texto-auxiliar">Equipos atendidos</div></div></div>
            {TIPOS_MANTENIMIENTO.map((t) => (
              <div className="col-6 col-md-3" key={t}><div className="border rounded p-2 text-center"><div className="fw-bold fs-5">{resumen.porTipo[t] || 0}</div><div className="texto-auxiliar">{t}</div></div></div>
            )).slice(0, 2)}
          </div>

          {/* Bloque 5: detalle tabulado */}
          <strong style={{ fontSize: '14px' }}>Detalle de mantenimientos</strong>
          <div className="table-responsive mt-1 mb-3">
            <table className="table table-sm table-bordered">
              <thead><tr><th>N.º</th><th>Fecha</th><th>Equipo</th><th>Tipo</th><th>Técnico</th><th>Estado final</th></tr></thead>
              <tbody>
                {resultados.length === 0 && <tr><td colSpan={6} className="text-center texto-auxiliar">Sin registros en el período seleccionado.</td></tr>}
                {resultados.map((m) => (
                  <tr key={m.id}><td>{m.id}</td><td>{m.fecha}</td><td style={{ fontSize: '12.5px' }}>{m.equipo}</td><td>{m.tipo}</td><td>{m.tecnico}</td><td><EstadoBadge estado={m.estadoFinal} /></td></tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Bloque 6: indicadores del período + firmas + pie */}
          <div className="row mt-5 pt-4">
            <div className="col-6 text-center"><div className="reporte-firma mx-auto">Elaboró — Área de Mantenimiento</div></div>
            <div className="col-6 text-center"><div className="reporte-firma mx-auto">Visto bueno — Supervisión</div></div>
          </div>
          <div className="text-center texto-auxiliar border-top mt-4 pt-2">
            Sistema de Control de Mantenimiento — Hospital «Ceibal» (IGSS) · Página 1 de 1
          </div>
        </div>
      )}
    </>
  );
}
