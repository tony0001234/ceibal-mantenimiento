import { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { equiposApi, mantenimientosApi, catalogosApi } from '../api/services';
import { mensajeError } from '../api/client';
import {
  TIPO_MANT_LABEL, TIPOS_MANTENIMIENTO, ESTADOS_EQUIPO,
  ordenarEquipos, etiquetaEquipo, fmtQ, precioAplica,
  combinarCategorias,
} from '../data/constants';
import EstadoBadge from '../components/EstadoBadge';
import EditarMantenimientoModal from '../components/EditarMantenimientoModal';

// Historial de mantenimientos (RF06). Además de consultar, permite editar un
// registro (admin/supervisor) y filtrar con los MISMOS criterios que la pestaña
// Equipos (búsqueda, tipo, subtipo, ubicación, estado, periodicidad), combinables.
const VACIO = {
  buscar: '', equipo: '', tipoEquipo: '', subTipo: '', ubicacion: '',
  estado: '', categoria: '', tipoTrabajo: '',
};

export default function Historial() {
  const location = useLocation();
  const { usuario } = useAuth();
  const puedeEditar = usuario?.rol === 'administrador' || usuario?.rol === 'supervisor';

  const [filtros, setFiltros] = useState({
    ...VACIO,
    equipo: location.state?.equipoId ? String(location.state.equipoId) : '',
  });
  const [registros, setRegistros] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  // Catálogos para los desplegables de filtro (idénticos a Equipos).
  const [equipos, setEquipos] = useState([]);
  const [ubicaciones, setUbicaciones] = useState([]);
  const [tiposEquipo, setTiposEquipo] = useState([]);
  const [subtipos, setSubtipos] = useState([]); // {valor, padre}
  const [catCategorias, setCatCategorias] = useState([]);

  const [editando, setEditando] = useState(null); // registro en edición

  useEffect(() => {
    equiposApi.listar().then(setEquipos).catch(() => {});
    catalogosApi.listar('ubicacion').then((d) => setUbicaciones((d || []).map((x) => x.valor))).catch(() => {});
    catalogosApi.listar('tipoEquipo').then((d) => setTiposEquipo((d || []).map((x) => x.valor))).catch(() => {});
    catalogosApi.listar('subTipo').then((d) => setSubtipos((d || []).map((x) => ({ valor: x.valor, padre: x.padre })))).catch(() => {});
    catalogosApi.listar('categoria').then((d) => setCatCategorias(d || [])).catch(() => {});
  }, []);

  const categorias = useMemo(() => combinarCategorias(catCategorias), [catCategorias]);
  const subtiposFiltro = subtipos.filter((s) => !filtros.tipoEquipo || s.padre === filtros.tipoEquipo).map((s) => s.valor);

  const set = (k, v) => setFiltros((f) => ({ ...f, [k]: v, ...(k === 'tipoEquipo' ? { subTipo: '' } : {}) }));

  const cargar = useCallback(() => {
    setCargando(true);
    setError('');
    const params = {};
    if (filtros.equipo) {
      params.equipo = filtros.equipo;
    } else {
      if (filtros.buscar.trim()) params.buscar = filtros.buscar.trim();
      if (filtros.tipoEquipo) params.tipoEquipo = filtros.tipoEquipo;
      if (filtros.subTipo) params.subTipo = filtros.subTipo;
      if (filtros.ubicacion) params.ubicacion = filtros.ubicacion;
      if (filtros.estado) params.estado = filtros.estado;
      if (filtros.categoria) params.categoria = filtros.categoria;
    }
    if (filtros.tipoTrabajo) params.tipoTrabajo = filtros.tipoTrabajo;
    mantenimientosApi.listar(params)
      .then(setRegistros)
      .catch((e) => setError(mensajeError(e, 'No se pudo cargar el historial.')))
      .finally(() => setCargando(false));
  }, [filtros]);

  // Debounce ligero para la búsqueda; el resto de filtros aplican de inmediato.
  useEffect(() => { const t = setTimeout(cargar, 300); return () => clearTimeout(t); }, [cargar]);

  const limpiar = () => setFiltros(VACIO);
  const hayFiltros = filtros.buscar || filtros.equipo || filtros.tipoEquipo || filtros.subTipo
    || filtros.ubicacion || filtros.estado || filtros.categoria || filtros.tipoTrabajo;

  const equipoSel = equipos.find((e) => e._id === filtros.equipo);

  return (
    <>
      <h1 className="titulo-pantalla mb-1">Historial de mantenimientos</h1>
      <p className="texto-auxiliar mb-3">Consulte y filtre los mantenimientos registrados. {puedeEditar && 'Puede corregir un registro con el botón «Editar».'}</p>

      {error && <div className="alert alert-danger py-2 px-3">{error}</div>}

      {/* Filtros (mismos criterios que la pestaña Equipos) */}
      <div className="card mb-3">
        <div className="card-body py-3">
          <div className="row g-2 align-items-end">
            <div className="col-12 col-lg-4">
              <label className="form-label">Buscar</label>
              <div className="input-group">
                <span className="input-group-text"><i className="bi bi-search" /></span>
                <input className="form-control" placeholder="N.º de bien, nombre, serie o ubicación…"
                  value={filtros.buscar} disabled={!!filtros.equipo}
                  onChange={(e) => set('buscar', e.target.value)} />
              </div>
            </div>
            <div className="col-12 col-lg-4">
              <label className="form-label">Equipo</label>
              <select className="form-select" value={filtros.equipo} onChange={(e) => set('equipo', e.target.value)}>
                <option value="">Todos</option>
                {ordenarEquipos(equipos).map((e) => <option key={e._id} value={e._id}>{etiquetaEquipo(e)}</option>)}
              </select>
            </div>
            <div className="col-6 col-lg-4">
              <label className="form-label">Tipo de mantenimiento</label>
              <select className="form-select" value={filtros.tipoTrabajo} onChange={(e) => set('tipoTrabajo', e.target.value)}>
                <option value="">Todos</option>
                {TIPOS_MANTENIMIENTO.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>

            <div className="col-6 col-lg-2">
              <label className="form-label">Tipo de equipo</label>
              <select className="form-select" value={filtros.tipoEquipo} disabled={!!filtros.equipo}
                onChange={(e) => set('tipoEquipo', e.target.value)}>
                <option value="">Todos</option>
                {tiposEquipo.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="col-6 col-lg-2">
              <label className="form-label">Subtipo</label>
              <select className="form-select" value={filtros.subTipo} disabled={!!filtros.equipo}
                onChange={(e) => set('subTipo', e.target.value)}>
                <option value="">Todos</option>
                {subtiposFiltro.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="col-6 col-lg-2">
              <label className="form-label">Ubicación</label>
              <select className="form-select" value={filtros.ubicacion} disabled={!!filtros.equipo}
                onChange={(e) => set('ubicacion', e.target.value)}>
                <option value="">Todas</option>
                {ubicaciones.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div className="col-6 col-lg-2">
              <label className="form-label">Estado</label>
              <select className="form-select" value={filtros.estado} disabled={!!filtros.equipo}
                onChange={(e) => set('estado', e.target.value)}>
                <option value="">Todos</option>
                {ESTADOS_EQUIPO.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div className="col-6 col-lg-3">
              <label className="form-label">Periodicidad de mantenimiento</label>
              <select className="form-select" value={filtros.categoria} disabled={!!filtros.equipo}
                onChange={(e) => set('categoria', e.target.value)}>
                <option value="">Todas</option>
                {categorias.map((c) => <option key={c.valor} value={c.valor}>{c.label}</option>)}
              </select>
            </div>
            <div className="col-6 col-lg-1 d-flex align-items-end">
              {hayFiltros && (
                <button className="btn btn-outline-secondary w-100" title="Limpiar filtros" onClick={limpiar}>
                  <i className="bi bi-x-circle" />
                </button>
              )}
            </div>
          </div>
          {filtros.equipo && (
            <div className="texto-auxiliar mt-2" style={{ fontSize: 12 }}>
              <i className="bi bi-info-circle me-1" />Mostrando un equipo específico; los filtros por atributos se aplican al quitar el equipo.
            </div>
          )}
        </div>
      </div>

      {/* Ficha técnica cuando se consulta un equipo específico */}
      {equipoSel && (
        <div className="card mb-3">
          <div className="card-header py-2 titulo-seccion">Ficha técnica</div>
          <div className="card-body">
            <div className="row g-2" style={{ fontSize: '14px' }}>
              <div className="col-6 col-md-3"><span className="texto-auxiliar d-block">N.º de bien</span><strong>{equipoSel.codigoInventario}</strong></div>
              <div className="col-6 col-md-3"><span className="texto-auxiliar d-block">Tipo</span>{equipoSel.tipoEquipo}</div>
              <div className="col-6 col-md-3"><span className="texto-auxiliar d-block">Marca</span>{equipoSel.marca}</div>
              <div className="col-6 col-md-3"><span className="texto-auxiliar d-block">Serie</span>{equipoSel.serie || '—'}</div>
              <div className="col-6 col-md-3"><span className="texto-auxiliar d-block">Ubicación</span>{equipoSel.ubicacion}</div>
              <div className="col-6 col-md-3"><span className="texto-auxiliar d-block">Criticidad</span><span className="text-capitalize">{(equipoSel.criticidad || '').toLowerCase()}</span></div>
              <div className="col-6 col-md-3"><span className="texto-auxiliar d-block">Estado actual</span><EstadoBadge estado={equipoSel.estado} /></div>
              <div className="col-6 col-md-3"><span className="texto-auxiliar d-block">Intervenciones</span><strong>{registros.length}</strong></div>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header py-2 titulo-seccion d-flex justify-content-between align-items-center">
          <span>Historial de intervenciones</span>
          <span className="badge text-bg-light">{registros.length} registro(s)</span>
        </div>
        <div className="table-responsive">
          <table className="table table-hover mb-0 align-middle">
            <thead>
              <tr>
                <th>Fecha</th><th>N.º de bien</th><th>Equipo</th><th>Tipo</th><th>Técnico</th>
                <th className="text-end">Precio</th><th>Estado final</th>
                {puedeEditar && <th className="text-end">Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {cargando && <tr><td colSpan={puedeEditar ? 8 : 7} className="text-center py-4"><span className="spinner-border spinner-border-sm me-2" />Cargando…</td></tr>}
              {!cargando && registros.length === 0 && <tr><td colSpan={puedeEditar ? 8 : 7} className="text-center texto-auxiliar py-4">No se encontraron mantenimientos con los filtros aplicados.</td></tr>}
              {!cargando && registros.map((m) => (
                <tr key={m._id}>
                  <td style={{ whiteSpace: 'nowrap' }}>{m.fechaMantenimiento?.slice(0, 10)}</td>
                  <td className="fw-semibold">{m.equipo?.codigoInventario || '—'}</td>
                  <td style={{ fontSize: '13.5px', maxWidth: 220 }} className="text-truncate" title={m.equipo?.nombre}>{m.equipo?.nombre || '—'}</td>
                  <td>{TIPO_MANT_LABEL[m.tipoTrabajo] || m.tipoTrabajo}</td>
                  <td>{m.tecnico?.nombre || '—'}</td>
                  <td className="text-end" style={{ whiteSpace: 'nowrap' }}>{precioAplica(m.tipoTrabajo, m.periodo) ? fmtQ(m.costoMantenimiento ?? 0) : '—'}</td>
                  <td><EstadoBadge estado={m.estadoEquipoResultante} /></td>
                  {puedeEditar && (
                    <td className="text-end">
                      <button className="btn btn-sm btn-outline-secondary" title="Editar registro" onClick={() => setEditando(m)}>
                        <i className="bi bi-pencil me-1" />Editar
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editando && (
        <EditarMantenimientoModal
          registro={editando}
          equipos={equipos}
          onCerrar={() => setEditando(null)}
          onGuardado={() => { setEditando(null); cargar(); equiposApi.listar().then(setEquipos).catch(() => {}); }}
        />
      )}
    </>
  );
}
