import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { equiposApi, catalogosApi } from '../api/services';
import { mensajeError } from '../api/client';
import {
  ESTADOS, ESTADOS_EQUIPO, CRITICIDADES,
  combinarCategorias, categoriaCorta,
} from '../data/constants';
import EstadoBadge from '../components/EstadoBadge';

// Modulo de equipos (RF02). tipoEquipo, subTipo y marca provienen de los
// catalogos editables (Administracion → Catalogos). Estado y criticidad son
// listas fijas del validador de MongoDB.
const POR_PAGINA = 8;
const VACIO = {
  codigoInventario: '', nombre: '', tipoEquipo: '', subTipo: '',
  marca: '', serie: '', ubicacion: '', estado: 'ACTIVO', criticidad: 'MEDIA',
  categoria: '',
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
  const [fTipo, setFTipo] = useState('');
  const [fSubtipo, setFSubtipo] = useState('');
  const [fCategoria, setFCategoria] = useState('');
  const [pagina, setPagina] = useState(1);
  const [ubicaciones, setUbicaciones] = useState([]);
  const [tiposEquipo, setTiposEquipo] = useState([]);
  const [subtipos, setSubtipos] = useState([]); // {valor, padre}
  const [marcas, setMarcas] = useState([]);
  const [catCategorias, setCatCategorias] = useState([]); // categorías del catálogo (extensibles)

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
      if (fTipo) params.tipoEquipo = fTipo;
      if (fSubtipo) params.subTipo = fSubtipo;
      if (fEstado) params.estado = fEstado;
      if (fUbicacion) params.ubicacion = fUbicacion;
      if (fCategoria) params.categoria = fCategoria;
      const data = await equiposApi.listar(params);
      setEquipos(data);
      setPagina(1);
    } catch (e) {
      setError(mensajeError(e, 'No se pudieron cargar los equipos.'));
    } finally {
      setCargando(false);
    }
  }, [busqueda, fTipo, fSubtipo, fEstado, fUbicacion, fCategoria]);

  useEffect(() => {
    const t = setTimeout(cargar, 300);
    return () => clearTimeout(t);
  }, [cargar]);

  useEffect(() => {
    catalogosApi.listar('ubicacion')
      .then((data) => setUbicaciones((data || []).map((x) => x.valor)))
      .catch(() => {});
    catalogosApi.listar('tipoEquipo')
      .then((data) => setTiposEquipo((data || []).map((x) => x.valor)))
      .catch(() => {});
    catalogosApi.listar('subTipo')
      .then((data) => setSubtipos((data || []).map((x) => ({ valor: x.valor, padre: x.padre }))))
      .catch(() => {});
    catalogosApi.listar('marca')
      .then((data) => setMarcas((data || []).map((x) => x.valor)))
      .catch(() => {});
    catalogosApi.listar('categoria')
      .then((data) => setCatCategorias(data || []))
      .catch(() => {});
  }, []);

  // Categorías / periodicidades disponibles = fijas + las creadas desde Costos.
  const categorias = useMemo(() => combinarCategorias(catCategorias), [catCategorias]);

  // Subtipos disponibles segun el tipo de equipo seleccionado (padre) en el modal.
  const subtiposDisponibles = subtipos
    .filter((s) => !form.tipoEquipo || s.padre === form.tipoEquipo)
    .map((s) => s.valor);

  // Subtipos disponibles para el FILTRO segun el tipo filtrado.
  const subtiposFiltro = subtipos
    .filter((s) => !fTipo || s.padre === fTipo)
    .map((s) => s.valor);

  const limpiarFiltros = () => {
    setBusqueda(''); setFTipo(''); setFSubtipo(''); setFEstado(''); setFUbicacion(''); setFCategoria('');
  };
  const hayFiltros = busqueda || fTipo || fSubtipo || fEstado || fUbicacion || fCategoria;

  const totalPaginas = Math.max(1, Math.ceil(equipos.length / POR_PAGINA));
  const paginaActual = Math.min(pagina, totalPaginas);
  const visibles = equipos.slice((paginaActual - 1) * POR_PAGINA, paginaActual * POR_PAGINA);

  const abrirNuevo = () => { setForm(VACIO); setErrorModal(''); setModal({ modo: 'nuevo' }); };
  const abrirEditar = (e) => {
    setForm({
      codigoInventario: e.codigoInventario, nombre: e.nombre, tipoEquipo: e.tipoEquipo || 'Refrigeración',
      subTipo: e.subTipo || '', marca: e.marca || '', serie: e.serie || '',
      ubicacion: e.ubicacion, estado: e.estado, criticidad: e.criticidad,
      categoria: e.categoria || '',
    });
    setErrorModal('');
    setModal({ modo: 'editar', id: e._id });
  };

  const guardar = async () => {
    setErrorModal('');
    if (!form.codigoInventario.trim() || !form.nombre.trim() || !form.tipoEquipo || !form.subTipo || !form.marca || !form.serie.trim() || !form.ubicacion.trim()) {
      setErrorModal('Complete los campos obligatorios: número de bien, nombre, tipo de equipo, subtipo, marca, serie y ubicación.');
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
            <div className="col-12 col-lg-4">
              <label className="form-label">Buscar</label>
              <div className="input-group">
                <span className="input-group-text"><i className="bi bi-search" /></span>
                <input className="form-control" placeholder="Número de bien, nombre o serie…"
                  value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
              </div>
            </div>
            <div className="col-6 col-lg-2">
              <label className="form-label">Tipo de equipo</label>
              <select className="form-select" value={fTipo}
                onChange={(e) => { setFTipo(e.target.value); setFSubtipo(''); }}>
                <option value="">Todos</option>
                {tiposEquipo.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="col-6 col-lg-2">
              <label className="form-label">Subtipo</label>
              <select className="form-select" value={fSubtipo} onChange={(e) => setFSubtipo(e.target.value)}>
                <option value="">Todos</option>
                {subtiposFiltro.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="col-6 col-lg-2">
              <label className="form-label">Ubicación</label>
              <select className="form-select" value={fUbicacion} onChange={(e) => setFUbicacion(e.target.value)}>
                <option value="">Todas</option>
                {ubicaciones.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div className="col-6 col-lg-2">
              <label className="form-label">Estado</label>
              <select className="form-select" value={fEstado} onChange={(e) => setFEstado(e.target.value)}>
                <option value="">Todos</option>
                {ESTADOS_EQUIPO.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div className="col-6 col-lg-3">
              <label className="form-label">Periodicidad de mantenimiento</label>
              <select className="form-select" value={fCategoria} onChange={(e) => setFCategoria(e.target.value)}>
                <option value="">Todas</option>
                {categorias.map((c) => <option key={c.valor} value={c.valor}>{c.label}</option>)}
              </select>
            </div>
          </div>
          {hayFiltros && (
            <div className="mt-2 text-end">
              <button className="btn btn-sm btn-outline-secondary" onClick={limpiarFiltros}>
                <i className="bi bi-x-circle me-1" />Limpiar filtros
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="table-responsive">
          <table className="table table-hover mb-0 align-middle">
            <thead>
              <tr>
                <th>N.º de bien</th><th>Nombre</th><th>Subtipo</th><th>Marca</th><th>Ubicación</th><th>Periodicidad</th><th>Estado</th><th className="text-end">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {cargando && (
                <tr><td colSpan={8} className="text-center py-4"><span className="spinner-border spinner-border-sm me-2" />Cargando…</td></tr>
              )}
              {!cargando && visibles.length === 0 && (
                <tr><td colSpan={8} className="text-center texto-auxiliar py-4">No se encontraron equipos con los filtros aplicados.</td></tr>
              )}
              {!cargando && visibles.map((e) => (
                <tr key={e._id}>
                  <td className="fw-semibold">{e.codigoInventario}</td>
                  <td>{e.nombre}</td>
                  <td>{e.subTipo}</td>
                  <td>{e.marca}</td>
                  <td>{e.ubicacion}</td>
                  <td>{e.categoria ? categoriaCorta(e.categoria) : <span className="texto-auxiliar">—</span>}</td>
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
                    <label className="form-label">Tipo de equipo <span className="text-danger">*</span></label>
                    <select className="form-select" value={form.tipoEquipo}
                      onChange={(e) => setForm({ ...form, tipoEquipo: e.target.value, subTipo: '' })}>
                      <option value="">Seleccione…</option>
                      {tiposEquipo.map((t) => <option key={t} value={t}>{t}</option>)}
                      {form.tipoEquipo && !tiposEquipo.includes(form.tipoEquipo) && (
                        <option value={form.tipoEquipo}>{form.tipoEquipo}</option>
                      )}
                    </select>
                  </div>
                  <div className="col-6">
                    <label className="form-label">Subtipo <span className="text-danger">*</span></label>
                    <select className="form-select" value={form.subTipo}
                      disabled={!form.tipoEquipo}
                      onChange={(e) => setForm({ ...form, subTipo: e.target.value })}>
                      <option value="">{form.tipoEquipo ? 'Seleccione…' : 'Elija primero el tipo de equipo'}</option>
                      {subtiposDisponibles.map((s) => <option key={s} value={s}>{s}</option>)}
                      {form.subTipo && !subtiposDisponibles.includes(form.subTipo) && (
                        <option value={form.subTipo}>{form.subTipo}</option>
                      )}
                    </select>
                  </div>
                  <div className="col-6">
                    <label className="form-label">Marca <span className="text-danger">*</span></label>
                    <select className="form-select" value={form.marca} onChange={(e) => setForm({ ...form, marca: e.target.value })}>
                      <option value="">Seleccione…</option>
                      {marcas.map((m) => <option key={m} value={m}>{m}</option>)}
                      {form.marca && !marcas.includes(form.marca) && (
                        <option value={form.marca}>{form.marca}</option>
                      )}
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
                  <div className="col-6">
                    <label className="form-label">Periodicidad de mantenimiento</label>
                    <select className="form-select" value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })}>
                      <option value="">Sin categoría</option>
                      {categorias.map((c) => <option key={c.valor} value={c.valor}>{c.label}</option>)}
                      {form.categoria && !categorias.some((c) => c.valor === form.categoria) && (
                        <option value={form.categoria}>{form.categoria}</option>
                      )}
                    </select>
                    <div className="form-text">Determina el contrato y el costo de mantenimiento. Las categorías se crean en <strong>Costos de mantenimiento</strong>.</div>
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
