import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { equiposApi, mantenimientosApi } from '../api/services';
import { mensajeError } from '../api/client';
import { TIPO_MANT_LABEL, ordenarEquipos, etiquetaEquipo, fmtQ } from '../data/constants';
import EstadoBadge from '../components/EstadoBadge';

// Consulta de historial por equipo (RF06). Ficha tecnica + intervenciones.
export default function Historial() {
  const location = useLocation();
  const [equipos, setEquipos] = useState([]);
  const [equipoId, setEquipoId] = useState(location.state?.equipoId ? String(location.state.equipoId) : '');
  const [registros, setRegistros] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    equiposApi.listar().then(setEquipos).catch(() => {});
  }, []);

  useEffect(() => {
    if (!equipoId) { setRegistros([]); return; }
    setCargando(true);
    setError('');
    mantenimientosApi.listar({ equipo: equipoId })
      .then(setRegistros)
      .catch((e) => setError(mensajeError(e, 'No se pudo cargar el historial.')))
      .finally(() => setCargando(false));
  }, [equipoId]);

  const equipo = equipos.find((e) => e._id === equipoId);

  return (
    <>
      <h1 className="titulo-pantalla mb-1">Historial de mantenimientos</h1>
      <p className="texto-auxiliar mb-3">Seleccione un equipo para consultar todas sus intervenciones registradas, de la más reciente a la más antigua.</p>

      {error && <div className="alert alert-danger py-2 px-3">{error}</div>}

      <div className="card mb-3">
        <div className="card-body py-3">
          <div className="row g-2 align-items-end">
            <div className="col-12 col-md-8">
              <label className="form-label">Equipo</label>
              <select className="form-select" value={equipoId} onChange={(e) => setEquipoId(e.target.value)}>
                <option value="">Seleccione un equipo…</option>
                {ordenarEquipos(equipos).map((e) => <option key={e._id} value={e._id}>{etiquetaEquipo(e)}</option>)}
              </select>
            </div>
            {equipo && (
              <div className="col-12 col-md-4 d-flex align-items-center gap-2 pt-2">
                <EstadoBadge estado={equipo.estado} />
                <span className="texto-auxiliar">{equipo.tipoEquipo} · {equipo.ubicacion}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {!equipoId && (
        <div className="text-center texto-auxiliar py-5">
          <i className="bi bi-clock-history d-block mb-2" style={{ fontSize: '38px', opacity: .3 }} />
          Seleccione un equipo para ver su historial.
        </div>
      )}

      {equipo && (
        <div className="card mb-3">
          <div className="card-header py-2 titulo-seccion">Ficha técnica</div>
          <div className="card-body">
            <div className="row g-2" style={{ fontSize: '14px' }}>
              <div className="col-6 col-md-3"><span className="texto-auxiliar d-block">N.º de bien</span><strong>{equipo.codigoInventario}</strong></div>
              <div className="col-6 col-md-3"><span className="texto-auxiliar d-block">Tipo</span>{equipo.tipoEquipo}</div>
              <div className="col-6 col-md-3"><span className="texto-auxiliar d-block">Marca</span>{equipo.marca}</div>
              <div className="col-6 col-md-3"><span className="texto-auxiliar d-block">Serie</span>{equipo.serie || '—'}</div>
              <div className="col-6 col-md-3"><span className="texto-auxiliar d-block">Ubicación</span>{equipo.ubicacion}</div>
              <div className="col-6 col-md-3"><span className="texto-auxiliar d-block">Criticidad</span><span className="text-capitalize">{equipo.criticidad}</span></div>
              <div className="col-6 col-md-3"><span className="texto-auxiliar d-block">Estado actual</span><EstadoBadge estado={equipo.estado} /></div>
              <div className="col-6 col-md-3"><span className="texto-auxiliar d-block">Intervenciones</span><strong>{registros.length}</strong></div>
            </div>
          </div>
        </div>
      )}

      {equipoId && (
        <div className="card">
          <div className="card-header py-2 titulo-seccion d-flex justify-content-between align-items-center">
            <span>Historial de intervenciones</span>
            <span className="badge text-bg-light">{registros.length} registro(s)</span>
          </div>
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead>
                <tr><th>Fecha</th><th>Tipo</th><th>Técnico</th><th>Descripción</th><th className="text-end">Costo</th><th>Estado final</th></tr>
              </thead>
              <tbody>
                {cargando && <tr><td colSpan={6} className="text-center py-4"><span className="spinner-border spinner-border-sm me-2" />Cargando…</td></tr>}
                {!cargando && registros.length === 0 && <tr><td colSpan={6} className="text-center texto-auxiliar py-4">Este equipo no tiene mantenimientos registrados.</td></tr>}
                {!cargando && registros.map((m) => (
                  <tr key={m._id}>
                    <td style={{ whiteSpace: 'nowrap' }}>{m.fechaMantenimiento?.slice(0, 10)}</td>
                    <td>{TIPO_MANT_LABEL[m.tipoTrabajo] || m.tipoTrabajo}</td>
                    <td>{m.tecnico?.nombre || '—'}</td>
                    <td style={{ fontSize: '13.5px', maxWidth: 340 }}>{m.descripcionTrabajo}</td>
                    <td className="text-end" style={{ whiteSpace: 'nowrap' }}>{fmtQ(m.costoMantenimiento ?? 0)}</td>
                    <td><EstadoBadge estado={m.estadoEquipoResultante} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
