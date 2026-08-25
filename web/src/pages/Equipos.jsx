import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { equiposApi, catalogosApi } from '../api/services';
import { mensajeError } from '../api/client';
import { ESTADOS, ESTADOS_EQUIPO, CRITICIDADES, TIPOS_EQUIPO, SUBTIPOS, MARCAS } from '../data/constants';
import EstadoBadge from '../components/EstadoBadge';

// Modulo de equipos (RF02). Valores cerrados segun el validador de MongoDB.
const POR_PAGINA = 8;
const VACIO = {
  codigoInventario: '', nombre: '', tipoEquipo: 'Refrigeración', subTipo: '',
  marca: '', serie: '', ubicacion: '', estado: 'ACTIVO', criticidad: 'MEDIA',
};

export default function Equipos() {
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const esAdmin = usuario?.rol === 'administrador';

  const [equipos, setEquipos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [fEstado, setFEstado] = useState('');
  const [fUbicacion, setFUbicacion] = useState('');
  const [pagina, setPagina] = useState(1);
  const [ubicaciones, setUbicaciones] = useState([]);

  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(VACIO);
  const [guardando, setGuardando] = useState(false);
  const [errorModal, setErrorModal] = useState('');

  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      const params = {};
      if (busqueda.trim()) params.buscar = busqueda.trim();
      if (fEstado) params.estado = fEstado;
      if (fUbicacion) params.ubicacion = fUbicacion;
      const data = await equiposApi.listar(params);
      setEquipos(data);
      setPagina(1);
    } catch (e) {
      setError(mensajeError(e, 'No se pudieron cargar los equipos.'));
    } finally {
      setCargando(false);
    }
  }, [busqueda, fEstado, fUbicacion]);

  useEffect(() => {
    const t = setTimeout(cargar, 300);
    return () => clearTimeout(t);
  }, [cargar]);

  useEffect(() => {
    catalogosApi.listar('ubicacion')
      .then((data) => setUbicaciones((data || []).map((x) => x.valor)))
      .catch(() => {});
  }, []);

  const totalPaginas = Math.max(1, Math.ceil(equipos.length / POR_PAGINA));
  const paginaActual = Math.min(pagina, totalPaginas);
  const visibles = equipos.slice((paginaActual - 1) * POR_PAGINA, paginaActual * POR_PAGINA);

  const abrirNuevo = () => { setForm(VACIO); setErrorModal(''); setModal({ modo: 'nuevo' }); };
  const abrirEditar = (e) => {
    setForm({
      codigoInventario: e.codigoInventario, nombre: e.nombre, tipoEquipo: e.tipoEquipo || 'Refrigeración',
      subTipo: e.subTipo || '', marca: e.marca || '', serie: e.serie || '',
      ubicacion: e.ubicacion, estado: e.estado, criticidad: e.criticidad,
    });
    setErrorModal('');
    setModal({ modo: 'editar', id: e._id });
  };

  const guardar = async () => {
    setErrorModal('');
    if (!form.codigoInventario.trim() || !form.nombre.trim() || !form.subTipo || !form.marca || !form.serie.trim() || !form.ubicacion.trim()) {
      setErrorModal('Complete los campos obligatorios: número de bien, nombre, subtipo, marca, serie y ubicación.');
      return;
    }
    setGuardando(true);
    try {
      if (modal.modo === 'nuevo') await equiposApi.crear(form);
      else await equiposApi.actualizar(modal.id, form);
      setModal(null);
      await cargar();
    } catch (e) {
      setErrorModal(mensajeError(e, 'No se pudo guardar el equipo.'));
    } finally {
      setGuardando(false);
    }
  };

  const darDeBaja = async (e) => {
    if (!window.confirm(`¿Dar de baja el equipo ${e.codigoInventario}? Se conserva su historial.`)) return;
    try {
      await equiposApi.darDeBaja(e._id);
      await cargar();
    } catch (err) {
      setError(mensajeError(err, 'No se pudo dar de baja el equipo.'));
    }
  };

  return (
    <>
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-1">
        <h1 className="titulo-pantalla mb-0">Equipos</h1>
        {esAdmin && (
          <button className="btn btn-primary btn-sm" onClick={abrirNuevo}>
            <i className="bi bi-plus-lg me-1" />Nuevo equipo
          </button>
        )}
      </div>
      <p className="texto-auxiliar mb-3">Inventario de equipos de refrigeración del hospital. La columna de estado usa la paleta semántica para localizar visualmente los equipos fuera de servicio.</p>

      {error && <div className="alert alert-danger py-2 px-3">{error}</div>}

      <div className="card mb-3">
        <div className="card-body py-3">
          <div className="row g-2 align-items-end">
            <div className="col-12 col-md-6">
              <label className="form-label">Buscar</label>
              <div className="input-group">
                <span className="input-group-text"><i className="bi bi-search" /></span>
                <input className="form-control" placeholder="Número de bien, nombre o serie…"
                  value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
              </div>
            </div>
            <div className="col-6 col-md-3">
              <label className="form-label">Ubicación</label>
              <select className="form-select" value={fUbicacion} onChange={(e) => setFUbicacion(e.target.value)}>
                <option value="">Todas</option>
                {ubicaciones.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div className="col-6 col-md-3">
              <label className="form-label">Estado</label>
              <select className="form-select" value={fEstado} onChange={(e) => setFEstado(e.target.value)}>
                <option value="">Todos</option>
                {ESTADOS_EQUIPO.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="table-responsive">
          <table className="table table-hover mb-0 align-middle">
            <thead>
              <tr>
                <th>N.º de bien</th><th>Nombre</th><th>Subtipo</th><th>Marca</th><th>Ubicación</th><th>Estado</th><th className="text-end">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {cargando && (
                <tr><td colSpan={7} className="text-center py-4"><span className="spinner-border spinner-border-sm me-2" />Cargando…</td></tr>
              )}
              {!cargando && visibles.length === 0 && (
                <tr><td colSpan={7} className="text-center texto-auxiliar py-4">No se encontraron equipos con los filtros aplicados.</td></tr>
              )}
              {!cargando && visibles.map((e) => (
                <tr key={e._id}>
                  <td className="fw-semibold">{e.codigoInventario}</td>
                  <td>{e.nombre}</td>
                  <td>{e.subTipo}</td>
                  <td>{e.marca}</td>
                  <td>{e.ubicacion}</td>
                  <td><EstadoBadge estado={e.estado} /></td>
                  <td className="text-end" style={{ whiteSpace: 'nowrap' }}>
                    <button className="btn btn-sm btn-outline-primary me-1" title="Ver historial" onClick={() => navigate('/app/historial', { state: { equipoId: e._id } })}>
                      <i className="bi bi-clock-history" />
                    </button>
                    {esAdmin && (
                      <>
                        <button className="btn btn-sm btn-outline-secondary me-1" title="Editar" onClick={() => abrirEditar(e)}>
                          <i className="bi bi-pencil" />
                        </button>
                        {e.estado !== 'BAJA' && (
                          <button className="btn btn-sm btn-outline-danger" title="Dar de baja" onClick={() => darDeBaja(e)}>
                            <i className="bi bi-box-arrow-down" />
                          </button>
                        )}
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 p-3">
          <span className="texto-auxiliar">Mostrando {visibles.length} de {equipos.length} equipos.</span>
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

      {/* Modal de alta / edición (solo administrador) */}
      {modal && (
        <div className="modal-overlay" onClick={() => !guardando && setModal(null)}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
            <div className="card">
              <div className="card-header py-2 titulo-seccion d-flex justify-content-between align-items-center">
                <span>{modal.modo === 'nuevo' ? 'Nuevo equipo' : 'Editar equipo'}</span>
                <button className="btn btn-sm btn-link text-secondary p-0" onClick={() => setModal(null)}><i className="bi bi-x-lg" /></button>
              </div>
              <div className="card-body">
                {errorModal && <div className="alert alert-danger py-2 px-3">{errorModal}</div>}
                <div className="row g-3">
                  <div className="col-6">
                    <label className="form-label">N.º de bien <span className="text-danger">*</span></label>
                    <input className="form-control" value={form.codigoInventario} onChange={(e) => setForm({ ...form, codigoInventario: e.target.value })} />
                  </div>
                  <div className="col-6">
                    <label className="form-label">Nombre <span className="text-danger">*</span></label>
                    <input className="form-control" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
                  </div>
                  <div className="col-6">
                    <label className="form-label">Tipo de equipo</label>
                    <select className="form-select" value={form.tipoEquipo} onChange={(e) => setForm({ ...form, tipoEquipo: e.target.value })}>
                      {TIPOS_EQUIPO.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="col-6">
                    <label className="form-label">Subtipo <span className="text-danger">*</span></label>
                    <select className="form-select" value={form.subTipo} onChange={(e) => setForm({ ...form, subTipo: e.target.value })}>
                      <option value="">Seleccione…</option>
                      {SUBTIPOS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="col-6">
                    <label className="form-label">Marca <span className="text-danger">*</span></label>
                    <select className="form-select" value={form.marca} onChange={(e) => setForm({ ...form, marca: e.target.value })}>
                      <option value="">Seleccione…</option>
                      {MARCAS.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div className="col-6">
                    <label className="form-label">Serie <span className="text-danger">*</span></label>
                    <input className="form-control" value={form.serie} onChange={(e) => setForm({ ...form, serie: e.target.value })} />
                  </div>
                  <div className="col-6">
                    <label className="form-label">Ubicación <span className="text-danger">*</span></label>
                    <select className="form-select" value={form.ubicacion} onChange={(e) => setForm({ ...form, ubicacion: e.target.value })}>
                      <option value="">Seleccione…</option>
                      {ubicaciones.map((u) => <option key={u} value={u}>{u}</option>)}
                      {form.ubicacion && !ubicaciones.includes(form.ubicacion) && (
                        <option value={form.ubicacion}>{form.ubicacion}</option>
                      )}
                    </select>
                    <div className="form-text">¿Falta una ubicación? Agréguela en <strong>Administración → Catálogos</strong>.</div>
                  </div>
                  <div className="col-3">
                    <label className="form-label">Criticidad</label>
                    <select className="form-select" value={form.criticidad} onChange={(e) => setForm({ ...form, criticidad: e.target.value })}>
                      {CRITICIDADES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  </div>
                  <div className="col-3">
                    <label className="form-label">Estado</label>
                    <select className="form-select" value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })}>
                      {ESTADOS_EQUIPO.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>
                </div>
              </div>
              <div className="card-footer d-flex justify-content-end gap-2 py-2">
                <button className="btn btn-outline-secondary" onClick={() => setModal(null)} disabled={guardando}>Cancelar</button>
                <button className="btn btn-primary" onClick={guardar} disabled={guardando}>
                  {guardando ? <><span className="spinner-border spinner-border-sm me-2" />Guardando…</> : <><i className="bi bi-save me-1" />Guardar</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
