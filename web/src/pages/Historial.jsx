import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { EQUIPOS, MANTENIMIENTOS } from '../data/mockData';
import EstadoBadge from '../components/EstadoBadge';

// Consulta de historial por equipo (RF06). Muestra todos los mantenimientos
// de un equipo específico, ordenados por fecha.
export default function Historial() {
  const location = useLocation();
  const [equipoId, setEquipoId] = useState(location.state?.equipoId ? String(location.state.equipoId) : '');

  const equipo = EQUIPOS.find((e) => String(e.id) === equipoId);
  const registros = equipoId
    ? MANTENIMIENTOS.filter((m) => String(m.equipoId) === equipoId).sort((a, b) => b.fecha.localeCompare(a.fecha))
    : [];

  return (
    <>
      <h1 className="titulo-pantalla mb-1">Historial de mantenimientos</h1>
      <p className="texto-auxiliar mb-3">Seleccione un equipo para consultar todas sus intervenciones registradas, de la más reciente a la más antigua.</p>

      <div className="card mb-3">
        <div className="card-body py-3">
          <div className="row g-2 align-items-end">
            <div className="col-12 col-md-8">
              <label className="form-label">Equipo</label>
              <select className="form-select" value={equipoId} onChange={(e) => setEquipoId(e.target.value)}>
                <option value="">Seleccione un equipo…</option>
                {EQUIPOS.map((e) => <option key={e.id} value={e.id}>{e.codigo} — {e.nombre}</option>)}
              </select>
            </div>
            {equipo && (
              <div className="col-12 col-md-4 d-flex align-items-center gap-2 pt-2">
                <EstadoBadge estado={equipo.estado} />
                <span className="texto-auxiliar">{equipo.tipo} · {equipo.ubicacion}</span>
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

      {/* Ficha técnica del equipo (Detalle de equipo) */}
      {equipo && (
        <div className="card mb-3">
          <div className="card-header py-2 titulo-seccion">Ficha técnica</div>
          <div className="card-body">
            <div className="row g-2" style={{ fontSize: '14px' }}>
              <div className="col-6 col-md-3"><span className="texto-auxiliar d-block">N.º de bien</span><strong>{equipo.codigo}</strong></div>
              <div className="col-6 col-md-3"><span className="texto-auxiliar d-block">Tipo</span>{equipo.tipo}</div>
              <div className="col-6 col-md-3"><span className="texto-auxiliar d-block">Marca</span>{equipo.marca}</div>
              <div className="col-6 col-md-3"><span className="texto-auxiliar d-block">Modelo</span>{equipo.modelo}</div>
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
                <tr><th>N.º</th><th>Fecha</th><th>Tipo</th><th>Técnico</th><th>Descripción</th><th>Estado final</th></tr>
              </thead>
              <tbody>
                {registros.length === 0 && <tr><td colSpan={6} className="text-center texto-auxiliar py-4">Este equipo no tiene mantenimientos registrados.</td></tr>}
                {registros.map((m) => (
                  <tr key={m.id}>
                    <td className="texto-auxiliar">{m.id}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{m.fecha}</td>
                    <td>{m.tipo}</td>
                    <td>{m.tecnico}</td>
                    <td style={{ fontSize: '13.5px', maxWidth: 340 }}>{m.descripcion}</td>
                    <td><EstadoBadge estado={m.estadoFinal} /></td>
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
