import { useState, useEffect, useMemo, useRef } from 'react';
import { equiposApi, reportesApi, catalogosApi } from '../api/services';
import { mensajeError } from '../api/client';
import {
  TIPOS_MANTENIMIENTO, TIPO_MANT_LABEL, hoyISO, ordenarEquipos, etiquetaEquipo, fmtQ, precioAplica,
  ESTADOS_EQUIPO, combinarCategorias, categoriaLabel,
  COLUMNAS_REPORTE, COLUMNAS_REPORTE_DEFECTO, GRAFICAS_REPORTE, PERIODO_LABEL,
  RESUMEN_REPORTE, contenidoPertinente,
} from '../data/constants';

// Filtros de equipo: los mismos del buscador de equipos (Equipos / Registro).
const FILTROS_EQUIPO_VACIOS = { buscar: '', tipoEquipo: '', subTipo: '', marca: '', ubicacion: '', estado: '', categoria: '' };
import EstadoBadge from '../components/EstadoBadge';
import GraficasDiarias from '../components/GraficasDiarias';

// Cómo se pinta cada columna configurable del detalle (clave de COLUMNAS_REPORTE).
// Los valores coinciden con los que imprimen el PDF y el Excel.
const TEXTO_LARGO = { fontSize: '12.5px', minWidth: 220, whiteSpace: 'pre-wrap' };
const CELDAS = {
  fecha: { estilo: { whiteSpace: 'nowrap' }, td: (m) => m.fechaMantenimiento?.slice(0, 10) },
  bien: { estilo: { whiteSpace: 'nowrap' }, td: (m) => m.equipo?.codigoInventario || '—' },
  equipo: { estilo: { fontSize: '12.5px' }, td: (m) => m.equipo?.nombre || '—' },
  serie: { td: (m) => m.equipo?.serie || '—' },
  marca: { td: (m) => m.equipo?.marca || '—' },
  ubicacion: { td: (m) => m.equipo?.ubicacion || '—' },
  tipo: { td: (m) => TIPO_MANT_LABEL[m.tipoTrabajo] || m.tipoTrabajo },
  periodo: { td: (m) => PERIODO_LABEL[m.periodo] || m.periodo || '—' },
  tecnico: { td: (m) => m.tecnico?.nombre || '—' },
  empresa: { td: (m) => m.empresa?.nombre || '—' },
  horaInicio: { td: (m) => m.horaInicioTexto || '—' },
  horaFin: { td: (m) => m.horaFinTexto || '—' },
  duracion: { clase: 'text-end', td: (m) => (m.duracionMinutos ?? '—') },
  descripcion: { estilo: TEXTO_LARGO, td: (m) => (m.descripcionTrabajo || '').trim() || '—' },
  repuestos: { estilo: { ...TEXTO_LARGO, minWidth: 160 }, td: (m) => (m.repuestosObservaciones || '').trim() || '—' },
  costo: { clase: 'text-end', td: (m) => (precioAplica(m.tipoTrabajo, m.periodo) ? fmtQ(m.costoMantenimiento ?? 0) : '—') },
  estado: { td: (m) => <EstadoBadge estado={m.estadoEquipoResultante} /> },
};

// Generacion de reportes (RF07): mantenimientos e inventario de equipos en alta.
export default function Reportes() {
  const [tab, setTab] = useState('mant');

  // ---------- Reporte de mantenimientos ----------
  const primerDiaMes = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10); };
  const [equipos, setEquipos] = useState([]);
  const [filtros, setFiltros] = useState({ desde: primerDiaMes(), hasta: hoyISO(), equipo: '', tipoTrabajo: '', ...FILTROS_EQUIPO_VACIOS });
  const [tiposEquipo, setTiposEquipo] = useState([]);
  const [subtipos, setSubtipos] = useState([]); // {valor, padre}
  const [marcas, setMarcas] = useState([]);
  const [ubicaciones, setUbicaciones] = useState([]);
  const [catCategorias, setCatCategorias] = useState([]);
  const [data, setData] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [descargando, setDescargando] = useState('');

  // Contenido del reporte: columnas del detalle y gráficas marcadas. Aplican a
  // la vista previa al instante y se envían al exportar a PDF / Excel.
  const [columnas, setColumnas] = useState(COLUMNAS_REPORTE_DEFECTO);
  const [graficas, setGraficas] = useState(GRAFICAS_REPORTE.map((g) => g.clave));
  const [resumenSel, setResumenSel] = useState(RESUMEN_REPORTE.map((r) => r.clave));
  const alternar = (lista, setLista, clave) =>
    setLista(lista.includes(clave) ? lista.filter((c) => c !== clave) : [...lista, clave]);
  // En el orden del catálogo, sin importar el orden en que se marcaron.
  const columnasVisibles = COLUMNAS_REPORTE.filter((c) => columnas.includes(c.clave));
  const columnasPorDefecto = columnas.length === COLUMNAS_REPORTE_DEFECTO.length
    && COLUMNAS_REPORTE_DEFECTO.every((c) => columnas.includes(c));

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

  // Catálogos para los desplegables de filtro (una sola vez).
  useEffect(() => {
    catalogosApi.listar('tipoEquipo').then((d) => setTiposEquipo((d || []).map((x) => x.valor))).catch(() => {});
    catalogosApi.listar('subTipo').then((d) => setSubtipos((d || []).map((x) => ({ valor: x.valor, padre: x.padre })))).catch(() => {});
    catalogosApi.listar('marca').then((d) => setMarcas((d || []).map((x) => x.valor))).catch(() => {});
    catalogosApi.listar('ubicacion').then((d) => setUbicaciones((d || []).map((x) => x.valor))).catch(() => {});
    catalogosApi.listar('categoria').then((d) => setCatCategorias(d || [])).catch(() => {});
  }, []);
  const categorias = useMemo(() => combinarCategorias(catCategorias), [catCategorias]);
  const subtiposDisponibles = subtipos
    .filter((s) => !filtros.tipoEquipo || s.padre === filtros.tipoEquipo)
    .map((s) => s.valor);

  // Parámetros de equipo activos: se envían al backend y acotan el desplegable «Equipo».
  const paramsEquipo = (f = filtros) => {
    const p = {};
    if (f.buscar.trim()) p.buscar = f.buscar.trim();
    ['tipoEquipo', 'subTipo', 'marca', 'ubicacion', 'estado', 'categoria'].forEach((k) => { if (f[k]) p[k] = f[k]; });
    return p;
  };
  const hayFiltrosEquipo = Object.keys(FILTROS_EQUIPO_VACIOS).some((k) => filtros[k]);

  // El desplegable «Equipo» muestra solo los equipos que cumplen los filtros de equipo.
  useEffect(() => {
    const t = setTimeout(() => { equiposApi.listar(paramsEquipo()).then(setEquipos).catch(() => {}); }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtros.buscar, filtros.tipoEquipo, filtros.subTipo, filtros.marca, filtros.ubicacion, filtros.estado, filtros.categoria]);

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

  const paramsActuales = (f = filtros) => {
    const p = {};
    if (f.desde) p.desde = f.desde;
    if (f.hasta) p.hasta = f.hasta;
    if (f.equipo === '__ALTA__') p.excluirBaja = 'true';
    else if (f.equipo) p.equipo = f.equipo;
    if (f.tipoTrabajo) p.tipoTrabajo = f.tipoTrabajo;
    return { ...p, ...paramsEquipo(f) };
  };

  // `f` permite generar con filtros recién cambiados (aún no aplicados al
  // estado). Si se lanzan varias consultas seguidas, solo cuenta la última.
  const consulta = useRef(0);
  const generar = async (f = filtros) => {
    const n = ++consulta.current;
    setCargando(true); setError('');
    try {
      const r = await reportesApi.preview(paramsActuales(f));
      if (n === consulta.current) setData(r);
    } catch (e) {
      if (n === consulta.current) setError(mensajeError(e, 'No se pudo generar el reporte.'));
    } finally {
      if (n === consulta.current) setCargando(false);
    }
  };

  const exportar = async (formato) => {
    setDescargando(formato); setError('');
    try {
      await reportesApi.descargar(formato, {
        ...paramsActuales(),
        columnas: columnasVisibles.map((c) => c.clave).join(','),
        // «ninguna» = el usuario desmarcó todas las gráficas.
        graficas: graficas.join(',') || 'ninguna',
        resumen: RESUMEN_REPORTE.filter((r) => resumenSel.includes(r.clave)).map((r) => r.clave).join(',') || 'ninguna',
      });
    }
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

  // Al cambiar el tipo de trabajo, las casillas pasan a lo pertinente para ese
  // tipo (p. ej. llamadas de emergencia: sin costo ni reparaciones). Es solo el
  // punto de partida: después se pueden marcar o desmarcar a gusto.
  const aplicarPertinente = (tipo) => {
    const p = contenidoPertinente(tipo);
    setGraficas(p.graficas);
    setResumenSel(p.resumen);
    setColumnas((cols) => {
      const sinCosto = cols.filter((c) => c !== 'costo');
      if (p.costo) return [...sinCosto, 'costo'];
      return sinCosto.length ? sinCosto : cols; // nunca dejar el detalle sin columnas
    });
  };
  // El reporte abierto NO se cierra al cambiar el tipo: se vuelve a consultar
  // con el nuevo filtro y se actualiza en el mismo lugar, como con las casillas.
  const cambiarTipoTrabajo = (tipo) => {
    const nuevos = { ...filtros, tipoTrabajo: tipo };
    setFiltros(nuevos);
    aplicarPertinente(tipo);
    if (data) generar(nuevos);
  };
  const contenidoAjustado = !!filtros.tipoTrabajo;
  // ¿Las casillas están tal como las dejó el filtro de tipo (lo sugerido)?
  const sugerido = contenidoPertinente(filtros.tipoTrabajo);
  const mismas = (a, b) => a.length === b.length && a.every((x) => b.includes(x));
  const enSugerido = mismas(graficas, sugerido.graficas) && mismas(resumenSel, sugerido.resumen)
    && columnas.includes('costo') === sugerido.costo;
  // Deshace el ajuste del filtro: vuelve a marcar todo el resumen, las gráficas y el costo.
  const marcarTodoContenido = () => {
    setGraficas(GRAFICAS_REPORTE.map((g) => g.clave));
    setResumenSel(RESUMEN_REPORTE.map((r) => r.clave));
    setColumnas((cols) => (cols.includes('costo') ? cols : [...cols, 'costo']));
  };
  const limpiarFiltrosEquipo = () => { setFiltros({ ...filtros, ...FILTROS_EQUIPO_VACIOS }); setData(null); };
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
                  <label className="form-label">Tipo de trabajo</label>
                  <select className="form-select" value={filtros.tipoTrabajo} onChange={(e) => cambiarTipoTrabajo(e.target.value)}>
                    <option value="">Todos</option>
                    {TIPOS_MANTENIMIENTO.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
              </div>

              <div className="texto-auxiliar fw-semibold mt-3 mb-1">Filtros de equipo</div>
              <div className="row g-2 align-items-end">
                <div className="col-12 col-lg-4">
                  <label className="form-label">Buscar</label>
                  <div className="input-group">
                    <span className="input-group-text"><i className="bi bi-search" /></span>
                    <input className="form-control" placeholder="N.º de bien, nombre, serie o ubicación…"
                      value={filtros.buscar} onChange={(e) => set('buscar', e.target.value)} />
                  </div>
                </div>
                <div className="col-6 col-lg-2">
                  <label className="form-label">Tipo de equipo</label>
                  <select className="form-select" value={filtros.tipoEquipo}
                    onChange={(e) => { setFiltros({ ...filtros, tipoEquipo: e.target.value, subTipo: '' }); setData(null); }}>
                    <option value="">Todos</option>
                    {tiposEquipo.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="col-6 col-lg-2">
                  <label className="form-label">Subtipo</label>
                  <select className="form-select" value={filtros.subTipo} onChange={(e) => set('subTipo', e.target.value)}>
                    <option value="">Todos</option>
                    {subtiposDisponibles.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="col-6 col-lg-2">
                  <label className="form-label">Marca</label>
                  <select className="form-select" value={filtros.marca} onChange={(e) => set('marca', e.target.value)}>
                    <option value="">Todas</option>
                    {marcas.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div className="col-6 col-lg-2">
                  <label className="form-label">Estado del equipo</label>
                  <select className="form-select" value={filtros.estado} onChange={(e) => set('estado', e.target.value)}>
                    <option value="">Todos</option>
                    {ESTADOS_EQUIPO.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
                <div className="col-12 col-md-6 col-lg-4">
                  <label className="form-label">Servicio / ubicación</label>
                  <select className="form-select" value={filtros.ubicacion} onChange={(e) => set('ubicacion', e.target.value)}>
                    <option value="">Todas</option>
                    {ubicaciones.map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div className="col-12 col-md-6 col-lg-4">
                  <label className="form-label">Periodicidad de mantenimiento</label>
                  <select className="form-select" value={filtros.categoria} onChange={(e) => set('categoria', e.target.value)}>
                    <option value="">Todas</option>
                    {categorias.map((c) => <option key={c.valor} value={c.valor}>{c.label}</option>)}
                  </select>
                </div>
                <div className="col-12 col-lg-4 text-lg-end">
                  {hayFiltrosEquipo && (
                    <button className="btn btn-sm btn-outline-secondary" onClick={limpiarFiltrosEquipo}>
                      <i className="bi bi-x-circle me-1" />Limpiar filtros de equipo
                    </button>
                  )}
                </div>
              </div>

              {/* Contenido del reporte: columnas del detalle y gráficas. */}
              <div className="border-top mt-3 pt-3">
                <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-1">
                  <div className="texto-auxiliar fw-semibold">Columnas del detalle</div>
                  <div className="d-flex gap-2">
                    <button type="button" className="btn btn-sm btn-link p-0"
                      disabled={columnas.length === COLUMNAS_REPORTE.length}
                      onClick={() => setColumnas(COLUMNAS_REPORTE.map((c) => c.clave))}>Marcar todas</button>
                    <span className="texto-auxiliar">·</span>
                    <button type="button" className="btn btn-sm btn-link p-0"
                      disabled={columnasPorDefecto}
                      onClick={() => setColumnas(COLUMNAS_REPORTE_DEFECTO)}>Restablecer</button>
                  </div>
                </div>
                <div className="d-flex flex-wrap column-gap-3 row-gap-1">
                  {COLUMNAS_REPORTE.map((c) => {
                    const marcada = columnas.includes(c.clave);
                    return (
                      <div className="form-check" key={c.clave}>
                        <input className="form-check-input" type="checkbox" id={`col-${c.clave}`}
                          checked={marcada}
                          // El detalle necesita al menos una columna.
                          disabled={marcada && columnas.length === 1}
                          onChange={() => alternar(columnas, setColumnas, c.clave)} />
                        <label className="form-check-label" htmlFor={`col-${c.clave}`}>{c.label}</label>
                      </div>
                    );
                  })}
                </div>

                <div className="texto-auxiliar fw-semibold mt-3 mb-1">Resumen del período</div>
                <div className="d-flex flex-wrap column-gap-3 row-gap-1">
                  {RESUMEN_REPORTE.map((r) => (
                    <div className="form-check" key={r.clave}>
                      <input className="form-check-input" type="checkbox" id={`res-${r.clave}`}
                        checked={resumenSel.includes(r.clave)}
                        onChange={() => alternar(resumenSel, setResumenSel, r.clave)} />
                      <label className="form-check-label" htmlFor={`res-${r.clave}`}>{r.label}</label>
                    </div>
                  ))}
                </div>

                <div className="texto-auxiliar fw-semibold mt-3 mb-1">Gráficas</div>
                <div className="d-flex flex-wrap column-gap-3 row-gap-1">
                  {GRAFICAS_REPORTE.map((g) => (
                    <div className="form-check" key={g.clave}>
                      <input className="form-check-input" type="checkbox" id={`graf-${g.clave}`}
                        checked={graficas.includes(g.clave)}
                        onChange={() => alternar(graficas, setGraficas, g.clave)} />
                      <label className="form-check-label" htmlFor={`graf-${g.clave}`}>{g.label}</label>
                    </div>
                  ))}
                </div>
                <div className="form-text">
                  Lo marcado aquí es lo que aparece en la vista previa, en el PDF y en el Excel.
                  {contenidoAjustado && (
                    <> Al filtrar por «{TIPO_MANT_LABEL[filtros.tipoTrabajo]}» se desmarcó lo que no aplica a ese tipo; puede volver a marcarlo.{' '}
                      {enSugerido ? (
                        <button type="button" className="btn btn-sm btn-link p-0 align-baseline"
                          onClick={marcarTodoContenido}>Marcar todo de nuevo</button>
                      ) : (
                        <button type="button" className="btn btn-sm btn-link p-0 align-baseline"
                          onClick={() => aplicarPertinente(filtros.tipoTrabajo)}>Volver a lo sugerido</button>
                      )}.
                    </>
                  )}
                  {columnasVisibles.length > 9 && ' Con muchas columnas, el PDF se genera en hoja horizontal.'}
                </div>
              </div>

              <div className="d-flex gap-2 mt-3 flex-wrap">
                <button className="btn btn-primary" onClick={() => generar()} disabled={cargando}>
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
                {filtros.buscar.trim() && <> · Búsqueda: «{filtros.buscar.trim()}»</>}
                {filtros.tipoEquipo && <> · Tipo de equipo: {filtros.tipoEquipo}</>}
                {filtros.subTipo && <> · Subtipo: {filtros.subTipo}</>}
                {filtros.marca && <> · Marca: {filtros.marca}</>}
                {filtros.ubicacion && <> · Ubicación: {filtros.ubicacion}</>}
                {filtros.estado && <> · Estado del equipo: {ESTADOS_EQUIPO.find((s) => s.value === filtros.estado)?.label}</>}
                {filtros.categoria && <> · Periodicidad: {categoriaLabel(filtros.categoria)}</>}
              </div>
              {/* Recuadros del resumen (solo los marcados). */}
              {resumenSel.length > 0 && (
                <>
                  <div className="mb-2"><strong style={{ fontSize: '14px' }}>Resumen del período</strong></div>
                  <div className="d-flex flex-wrap gap-2 mb-3">
                    {[
                      { clave: 'total', valor: data.resumen.total, label: 'Mantenimientos' },
                      { clave: 'equipos', valor: data.resumen.equiposAtendidos, label: 'Equipos atendidos' },
                      { clave: 'fuera', valor: data.resumen.fueraDeServicio ?? 0, label: 'Fuera de servicio' },
                      { clave: 'mttr', valor: `${data.resumen.mttrMinutos ?? 0} min`, label: 'MTTR' },
                      { clave: 'preventivo', valor: `${data.resumen.preventivoMinutos ?? 0} min`, label: 'Tiempo prev.' },
                      { clave: 'costo', valor: fmtQ(data.resumen.costoTotal ?? 0), label: 'Costo total' },
                    ].filter((t) => resumenSel.includes(t.clave)).map((t) => (
                      <div key={t.clave} className="border rounded p-2 text-center" style={{ flex: '1 1 130px', maxWidth: 220 }}>
                        <div className="fw-bold fs-5">{t.valor}</div>
                        <div className="texto-auxiliar">{t.label}</div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Gráficas diarias del período consultado (solo las marcadas). */}
              {graficas.length > 0 && (
                <div className="mb-4">
                  <GraficasDiarias series={data.resumen.seriesDiarias || []} periodoLabel={`${filtros.desde} a ${filtros.hasta}`} mostrar={graficas} />
                </div>
              )}
              <strong style={{ fontSize: '14px' }}>Detalle de mantenimientos</strong>
              <div className="table-responsive mt-1 mb-3">
                <table className="table table-sm table-bordered">
                  <thead>
                    <tr>{columnasVisibles.map((c) => <th key={c.clave} className={CELDAS[c.clave].clase}>{c.label}</th>)}</tr>
                  </thead>
                  <tbody>
                    {data.resultados.length === 0 && <tr><td colSpan={columnasVisibles.length} className="text-center texto-auxiliar">Sin registros en el período seleccionado.</td></tr>}
                    {data.resultados.map((m) => (
                      <tr key={m._id}>
                        {columnasVisibles.map((c) => (
                          <td key={c.clave} className={CELDAS[c.clave].clase} style={CELDAS[c.clave].estilo}>{CELDAS[c.clave].td(m)}</td>
                        ))}
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
