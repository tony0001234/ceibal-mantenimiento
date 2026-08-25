import { useState, useEffect } from 'react';
import { equiposApi, reportesApi } from '../api/services';
import { mensajeError } from '../api/client';
import {
  TIPOS_MANTENIMIENTO, TIPO_MANT_LABEL, hoyISO, ordenarEquipos, etiquetaEquipo,
} from '../data/constants';
import EstadoBadge from '../components/EstadoBadge';

// Generacion de reportes (RF07): mantenimientos e inventario de equipos en alta.
export default function Reportes() {
  const [tab, setTab] = useState('mant');

  // ---------- Reporte de mantenimientos ----------
  const primerDiaMes = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10); };
  const [equipos, setEquipos] = useState([]);
  const [filtros, setFiltros] = useState({ desde: primerDiaMes(), hasta: hoyISO(), equipo: '', tipoTrabajo: '' });
  const [data, setData] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [descargando, setDescargando] = useState('');

  // ---------- Reporte de equipos en alta ----------
  const [inv, setInv] = useState(null); // { equipos, resumen }
  const [invCargando, setInvCargando] = useState(false);
  const [invError, setInvError] = useState('');
  const [invDescargando, setInvDescargando] = useState('');
  const [invFiltros, setInvFiltros] = useState({ desde: '', hasta: '' });

  const invParams = () => {
    const p = {};
    if (invFiltros.desde) p.desde = invFiltros.desde;
    if (invFiltros.hasta) p.hasta = invFiltros.hasta;
    return p;
  };

  useEffect(() => { equiposApi.listar().then(setEquipos).catch(() => {}); }, []);

  // Carga el inventario al abrir la pestaña y cada vez que cambian las fechas.
  useEffect(() => {
    if (tab !== 'equipos') return;
    const p = {};
    if (invFiltros.desde) p.desde = invFiltros.desde;
    if (invFiltros.hasta) p.hasta = invFiltros.hasta;
    setInvCargando(true);
    setInvError('');
    reportesApi.equiposPreview(p)
      .then(setInv)
      .catch((e) => setInvError(mensajeError(e, 'No se pudo cargar el inventario.')))
      .finally(() => setInvCargando(false));
  }, [tab, invFiltros.desde, invFiltros.hasta]);

  const paramsActuales = () => {
    const p = {};
    if (filtros.desde) p.desde = filtros.desde;
    if (filtros.hasta) p.hasta = filtros.hasta;
    if (filtros.equipo === '__ALTA__') p.excluirBaja = 'true';
    else if (filtros.equipo) p.equipo = filtros.equipo;
    if (filtros.tipoTrabajo) p.tipoTrabajo = filtros.tipoTrabajo;
    return p;
  };

  const generar = async () => {
    setCargando(true); setError('');
    try { setData(await reportesApi.preview(paramsActuales())); }
    catch (e) { setError(mensajeError(e, 'No se pudo generar el reporte.')); }
    finally { setCargando(false); }
  };

  const exportar = async (formato) => {
    setDescargando(formato); setError('');
    try { await reportesApi.descargar(formato, paramsActuales()); }
    catch (e) { setError(mensajeError(e, 'No se pudo exportar el reporte.')); }
    finally { setDescargando(''); }
  };

  const exportarEquipos = async (formato) => {
    setInvDescargando(formato); setInvError('');
    try { await reportesApi.descargarEquipos(formato, invParams()); }
    catch (e) { setInvError(mensajeError(e, 'No se pudo exportar el inventario.')); }
    finally { setInvDescargando(''); }
  };

  const set = (k, v) => { setFiltros({ ...filtros, [k]: v }); setData(null); };
  const equipoFiltro = equipos.find((e) => e._id === filtros.equipo);

  return (
    <>
      <h1 className="titulo-pantalla mb-1">Reportes</h1>
      <p className="texto-auxiliar mb-3">Genere reportes listos para entregar a auditoría, exportables a PDF y Excel.</p>

      <ul className="nav nav-tabs mb-3">
        <li className="nav-item"><button className={`nav-link ${tab === 'mant' ? 'active' : ''}`} onClick={() => setTab('mant')}><i className="bi bi-clipboard-data me-1" />Mantenimientos</button></li>
        <li className="nav-item"><button className={`nav-link ${tab === 'equipos' ? 'active' : ''}`} onClick={() => setTab('equipos')}><i className="bi bi-hdd-stack me-1" />Equipos en alta</button></li>
      </ul>

      {/* ============ PESTAÑA MANTENIMIENTOS ============ */}
      {tab === 'mant' && (
        <>
          {error && <div className="alert alert-danger py-2 px-3">{error}</div>}
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
                  <select className="form-select" value={filtros.equipo} onChange={(e) => set('equipo', e.target.value)}>
                    <option value="">Todos</option>
                    <option value="__ALTA__">Todos los equipos en alta (excluye dados de baja)</option>
                    {ordenarEquipos(equipos).map((e) => <option key={e._id} value={e._id}>{etiquetaEquipo(e)}</option>)}
                  </select>
                </div>
                <div className="col-12 col-md-3">
                  <label className="form-label">Tipo de mantenimiento</label>
                  <select className="form-select" value={filtros.tipoTrabajo} onChange={(e) => set('tipoTrabajo', e.target.value)}>
                    <option value="">Todos</option>
                    {TIPOS_MANTENIMIENTO.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="d-flex gap-2 mt-3 flex-wrap">
                <button className="btn btn-primary" onClick={generar} disabled={cargando}>
                  {cargando ? <><span className="spinner-border spinner-border-sm me-1" />Generando…</> : <><i className="bi bi-search me-1" />Generar reporte</>}
                </button>
                <button className="btn btn-outline-danger" disabled={!data || descargando} onClick={() => exportar('pdf')}>
                  {descargando === 'pdf' ? <span className="spinner-border spinner-border-sm me-1" /> : <i className="bi bi-file-earmark-pdf me-1" />}Exportar PDF
                </button>
                <button className="btn btn-outline-success" disabled={!data || descargando} onClick={() => exportar('excel')}>
                  {descargando === 'excel' ? <span className="spinner-border spinner-border-sm me-1" /> : <i className="bi bi-file-earmark-excel me-1" />}Exportar Excel
                </button>
              </div>
            </div>
          </div>

          {!data && !cargando && (
            <div className="text-center texto-auxiliar py-5">
              <i className="bi bi-file-earmark-bar-graph d-block mb-2" style={{ fontSize: '38px', opacity: .3 }} />
              Configure los filtros y presione «Generar reporte» para ver la vista previa.
            </div>
          )}

          {data && (
            <div className="reporte-doc">
              <div className="d-flex justify-content-between align-items-start border-bottom pb-3 mb-3">
                <div className="d-flex gap-2 align-items-center">
                  <div className="brand-emblem" style={{ background: 'var(--ceibal-azul-600)', color: '#fff' }}><i className="bi bi-stack" /></div>
                  <div>
                    <div className="fw-bold" style={{ color: 'var(--ceibal-azul-900)' }}>IGSS — Hospital General de Accidentes «Ceibal»</div>
                    <div className="texto-auxiliar">Área de Mantenimiento · Sistema de Control de Mantenimiento</div>
                  </div>
                </div>
                <div className="text-end texto-auxiliar"><div>Emitido: {hoyISO()}</div></div>
              </div>
              <h2 className="text-center titulo-seccion mb-1">Reporte de mantenimientos realizados</h2>
              <p className="text-center texto-auxiliar mb-3">Período consultado: {filtros.desde} al {filtros.hasta}</p>
              <div className="mb-3" style={{ fontSize: '13.5px' }}>
                <strong>Filtros aplicados:</strong>{' '}
                Equipo: {filtros.equipo === '__ALTA__'
                  ? 'Todos los equipos en alta'
                  : (equipoFiltro ? `${equipoFiltro.codigoInventario} — ${equipoFiltro.nombre}` : 'Todos')} ·{' '}
                Tipo: {filtros.tipoTrabajo ? TIPO_MANT_LABEL[filtros.tipoTrabajo] : 'Todos'}
              </div>
              <div className="row g-2 mb-3">
                <div className="col-12"><strong style={{ fontSize: '14px' }}>Resumen del período</strong></div>
                <div className="col-6 col-md-3"><div className="border rounded p-2 text-center"><div className="fw-bold fs-5">{data.resumen.total}</div><div className="texto-auxiliar">Mantenimientos</div></div></div>
                <div className="col-6 col-md-3"><div className="border rounded p-2 text-center"><div className="fw-bold fs-5">{data.resumen.equiposAtendidos}</div><div className="texto-auxiliar">Equipos atendidos</div></div></div>
                <div className="col-6 col-md-3"><div className="border rounded p-2 text-center"><div className="fw-bold fs-5">{data.resumen.fueraDeServicio ?? 0}</div><div className="texto-auxiliar">Fuera de servicio</div></div></div>
                <div className="col-6 col-md-3"><div className="border rounded p-2 text-center"><div className="fw-bold fs-5">{data.resumen.mttrHoras ?? 0} h</div><div className="texto-auxiliar">MTTR</div></div></div>
              </div>
              <strong style={{ fontSize: '14px' }}>Detalle de mantenimientos</strong>
              <div className="table-responsive mt-1 mb-3">
                <table className="table table-sm table-bordered">
                  <thead><tr><th>Fecha</th><th>Equipo</th><th>Tipo</th><th>Técnico</th><th>Empresa</th><th>Estado final</th></tr></thead>
                  <tbody>
                    {data.resultados.length === 0 && <tr><td colSpan={6} className="text-center texto-auxiliar">Sin registros en el período seleccionado.</td></tr>}
                    {data.resultados.map((m) => (
                      <tr key={m._id}>
                        <td>{m.fechaMantenimiento?.slice(0, 10)}</td>
                        <td style={{ fontSize: '12.5px' }}>{m.equipo ? `${m.equipo.codigoInventario} — ${m.equipo.nombre}` : '—'}</td>
                        <td>{TIPO_MANT_LABEL[m.tipoTrabajo] || m.tipoTrabajo}</td>
                        <td>{m.tecnico?.nombre || '—'}</td>
                        <td>{m.empresa?.nombre || '—'}</td>
                        <td><EstadoBadge estado={m.estadoEquipoResultante} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="row mt-5 pt-4">
                <div className="col-6 text-center"><div className="reporte-firma mx-auto">Elaboró — Área de Mantenimiento</div></div>
                <div className="col-6 text-center"><div className="reporte-firma mx-auto">Visto bueno — Supervisión</div></div>
              </div>
              <div className="text-center texto-auxiliar border-top mt-4 pt-2">Sistema de Control de Mantenimiento — Hospital «Ceibal» (IGSS)</div>
            </div>
          )}
        </>
      )}

      {/* ============ PESTAÑA EQUIPOS EN ALTA ============ */}
      {tab === 'equipos' && (
        <>
          {invError && <div className="alert alert-danger py-2 px-3">{invError}</div>}
          <div className="card mb-3">
            <div className="card-header py-2 titulo-seccion d-flex justify-content-between align-items-center flex-wrap gap-2">
              <span>Inventario de equipos en alta</span>
              <div className="d-flex gap-2">
                <button className="btn btn-outline-danger btn-sm" disabled={!inv || invDescargando} onClick={() => exportarEquipos('pdf')}>
                  {invDescargando === 'pdf' ? <span className="spinner-border spinner-border-sm me-1" /> : <i className="bi bi-file-earmark-pdf me-1" />}PDF
                </button>
                <button className="btn btn-outline-success btn-sm" disabled={!inv || invDescargando} onClick={() => exportarEquipos('excel')}>
                  {invDescargando === 'excel' ? <span className="spinner-border spinner-border-sm me-1" /> : <i className="bi bi-file-earmark-excel me-1" />}Excel
                </button>
              </div>
            </div>
            <div className="card-body">
              <p className="texto-auxiliar mb-3">Listado de equipos que siguen en alta (no dados de baja).</p>

              <div className="row g-2 align-items-end mb-3">
                <div className="col-6 col-md-3">
                  <label className="form-label">Desde <span className="texto-auxiliar">(fecha de alta)</span></label>
                  <input type="date" className="form-control" value={invFiltros.desde}
                    onChange={(e) => setInvFiltros({ ...invFiltros, desde: e.target.value })} />
                </div>
                <div className="col-6 col-md-3">
                  <label className="form-label">Hasta <span className="texto-auxiliar">(fecha de alta)</span></label>
                  <input type="date" className="form-control" value={invFiltros.hasta}
                    onChange={(e) => setInvFiltros({ ...invFiltros, hasta: e.target.value })} />
                </div>
                {(invFiltros.desde || invFiltros.hasta) && (
                  <div className="col-12 col-md-3">
                    <button className="btn btn-outline-secondary btn-sm" onClick={() => setInvFiltros({ desde: '', hasta: '' })}>
                      <i className="bi bi-x-lg me-1" />Quitar fechas
                    </button>
                  </div>
                )}
              </div>

              {invCargando && <div className="text-center py-4"><span className="spinner-border text-primary" /></div>}
              {inv && (
                <>
                  <div className="row g-2 mb-3">
                    <div className="col-6 col-md-3"><div className="border rounded p-2 text-center"><div className="fw-bold fs-5">{inv.resumen.total}</div><div className="texto-auxiliar">Equipos en alta</div></div></div>
                    <div className="col-6 col-md-3"><div className="border rounded p-2 text-center"><div className="fw-bold fs-5">{inv.resumen.activos}</div><div className="texto-auxiliar">Activos</div></div></div>
                    <div className="col-6 col-md-3"><div className="border rounded p-2 text-center"><div className="fw-bold fs-5">{inv.resumen.enMantenimiento}</div><div className="texto-auxiliar">En mantenimiento</div></div></div>
                    <div className="col-6 col-md-3"><div className="border rounded p-2 text-center"><div className="fw-bold fs-5">{inv.resumen.fueraDeServicio}</div><div className="texto-auxiliar">Fuera de servicio</div></div></div>
                  </div>
                  <div className="table-responsive">
                    <table className="table table-hover table-sm mb-0 align-middle">
                      <thead><tr><th>N.º de bien</th><th>Nombre</th><th>Marca</th><th>Serie</th><th>Ubicación</th><th>Estado</th><th>Criticidad</th></tr></thead>
                      <tbody>
                        {inv.equipos.length === 0 && <tr><td colSpan={7} className="text-center texto-auxiliar py-3">No hay equipos en alta.</td></tr>}
                        {inv.equipos.map((e) => (
                          <tr key={e._id}>
                            <td className="fw-semibold">{e.codigoInventario}</td>
                            <td>{e.nombre}</td>
                            <td>{e.marca}</td>
                            <td>{e.serie}</td>
                            <td>{e.ubicacion}</td>
                            <td><EstadoBadge estado={e.estado} /></td>
                            <td className="text-capitalize">{(e.criticidad || '').toLowerCase()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
