import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { EQUIPOS, TIPOS_EQUIPO, ESTADOS } from '../data/mockData';
import EstadoBadge from '../components/EstadoBadge';

// Módulo de equipos (RF02). Inventario en tabla con búsqueda, filtro por
// tipo y estado, paginación y estado con color semántico.
const POR_PAGINA = 6;

export default function Equipos() {
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const esAdmin = usuario?.rol === 'Administrador';

  const [busqueda, setBusqueda] = useState('');
  const [fTipo, setFTipo] = useState('');
  const [fEstado, setFEstado] = useState('');
  const [pagina, setPagina] = useState(1);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return EQUIPOS.filter((e) => {
      const coincide = !q || e.codigo.toLowerCase().includes(q) || e.nombre.toLowerCase().includes(q) || e.ubicacion.toLowerCase().includes(q);
      return coincide && (!fTipo || e.tipo === fTipo) && (!fEstado || e.estado === fEstado);
    });
  }, [busqueda, fTipo, fEstado]);

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA));
  const paginaActual = Math.min(pagina, totalPaginas);
  const visibles = filtrados.slice((paginaActual - 1) * POR_PAGINA, paginaActual * POR_PAGINA);

  const reset = (fn) => (v) => { fn(v); setPagina(1); };

  return (
    <>
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-1">
        <h1 className="titulo-pantalla mb-0">Equipos</h1>
        {esAdmin && (
          <button className="btn btn-primary btn-sm" onClick={() => alert('Prototipo NO funcional: aquí se abriría el formulario de registro de un nuevo equipo (RF02).')}>
            <i className="bi bi-plus-lg me-1" />Nuevo equipo
          </button>
        )}
      </div>
      <p className="texto-auxiliar mb-3">Inventario de equipos del hospital. La columna de estado usa la paleta semántica para localizar visualmente los equipos fuera de servicio.</p>

      {/* Barra de búsqueda y filtros */}
      <div className="card mb-3">
        <div className="card-body py-3">
          <div className="row g-2 align-items-end">
            <div className="col-12 col-md-6">
              <label className="form-label">Buscar</label>
              <div className="input-group">
                <span className="input-group-text"><i className="bi bi-search" /></span>
                <input className="form-control" placeholder="Número de bien, nombre o ubicación…"
                  value={busqueda} onChange={(e) => reset(setBusqueda)(e.target.value)} />
              </div>
            </div>
            <div className="col-6 col-md-3">
              <label className="form-label">Tipo de equipo</label>
              <select className="form-select" value={fTipo} onChange={(e) => reset(setFTipo)(e.target.value)}>
                <option value="">Todos</option>
                {TIPOS_EQUIPO.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="col-6 col-md-3">
              <label className="form-label">Estado</label>
              <select className="form-select" value={fEstado} onChange={(e) => reset(setFEstado)(e.target.value)}>
                <option value="">Todos</option>
                {Object.values(ESTADOS).map((e) => <option key={e.key} value={e.key}>{e.label}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Tabla de equipos */}
      <div className="card">
        <div className="table-responsive">
          <table className="table table-hover mb-0 align-middle">
            <thead>
              <tr>
                <th>N.º de bien</th><th>Nombre</th><th>Tipo</th><th>Marca</th><th>Ubicación</th><th>Estado</th><th className="text-end">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {visibles.length === 0 && (
                <tr><td colSpan={7} className="text-center texto-auxiliar py-4">No se encontraron equipos con los filtros aplicados.</td></tr>
              )}
              {visibles.map((e) => (
                <tr key={e.id}>
                  <td className="fw-semibold">{e.codigo}</td>
                  <td>{e.nombre}</td>
                  <td>{e.tipo}</td>
                  <td>{e.marca}</td>
                  <td>{e.ubicacion}</td>
                  <td><EstadoBadge estado={e.estado} /></td>
                  <td className="text-end" style={{ whiteSpace: 'nowrap' }}>
                    <button className="btn btn-sm btn-outline-primary me-1" title="Ver historial" onClick={() => navigate('/app/historial', { state: { equipoId: e.id } })}>
                      <i className="bi bi-clock-history" />
                    </button>
                    {esAdmin && (
                      <button className="btn btn-sm btn-outline-secondary" title="Editar" onClick={() => alert('Prototipo NO funcional: edición de equipo (RF02).')}>
                        <i className="bi bi-pencil" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Paginación */}
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 p-3">
          <span className="texto-auxiliar">Mostrando {visibles.length} de {filtrados.length} equipos.</span>
          <nav>
            <ul className="pagination pagination-sm mb-0">
              <li className={`page-item ${paginaActual === 1 ? 'disabled' : ''}`}>
                <button className="page-link" onClick={() => setPagina(paginaActual - 1)}>Anterior</button>
              </li>
              {Array.from({ length: totalPaginas }, (_, i) => (
                <li key={i} className={`page-item ${paginaActual === i + 1 ? 'active' : ''}`}>
                  <button className="page-link" onClick={() => setPagina(i + 1)}>{i + 1}</button>
                </li>
              ))}
              <li className={`page-item ${paginaActual === totalPaginas ? 'disabled' : ''}`}>
                <button className="page-link" onClick={() => setPagina(paginaActual + 1)}>Siguiente</button>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </>
  );
}
