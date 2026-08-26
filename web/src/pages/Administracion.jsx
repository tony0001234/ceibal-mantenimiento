import { useState, useEffect } from 'react';
import { usuariosApi, catalogosApi, empresasApi } from '../api/services';
import { mensajeError } from '../api/client';
import { ROL_LABEL, ROLES } from '../data/constants';

// Administracion del sistema (RF10). Solo el rol Administrador.
// Regla de negocio: toda persona esta afiliada a una empresa. Los tecnicos a
// su empresa de servicio; supervisor/administrador/auditor a «Interno IGSS».
const USUARIO_VACIO = {
  nombre: '', correo: '', contrasena: '', rol: 'tecnico', activo: true, empresa: '',
};
const EMPRESA_VACIA = { nombre: '', nit: '', correo: '', telefono: '' };

export default function Administracion() {
  const [tab, setTab] = useState('usuarios');
  const [usuarios, setUsuarios] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [error, setError] = useState('');

  // Catalogos editables
  const [ubicaciones, setUbicaciones] = useState([]);
  const [tiposEquipo, setTiposEquipo] = useState([]);
  const [subtipos, setSubtipos] = useState([]); // {_id, valor, padre}
  const [marcas, setMarcas] = useState([]);

  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(USUARIO_VACIO);
  const [crearEmpresa, setCrearEmpresa] = useState(false);
  const [empresaForm, setEmpresaForm] = useState(EMPRESA_VACIA);
  const [errorModal, setErrorModal] = useState('');
  const [guardando, setGuardando] = useState(false);

  // Entradas de nuevos valores de catalogo
  const [nuevaUbic, setNuevaUbic] = useState('');
  const [nuevoTipo, setNuevoTipo] = useState('');
  const [nuevoSubtipo, setNuevoSubtipo] = useState({ padre: '', valor: '' });
  const [nuevaMarca, setNuevaMarca] = useState('');

  const cargarUsuarios = () => usuariosApi.listar().then(setUsuarios).catch((e) => setError(mensajeError(e)));
  const cargarEmpresas = () => empresasApi.listar(true).then((d) => setEmpresas(d || [])).catch(() => {});
  const cargarUbicaciones = () => catalogosApi.listar('ubicacion').then((d) => setUbicaciones(d || [])).catch(() => {});
  const cargarTipos = () => catalogosApi.listar('tipoEquipo').then((d) => setTiposEquipo(d || [])).catch(() => {});
  const cargarSubtipos = () => catalogosApi.listar('subTipo').then((d) => setSubtipos(d || [])).catch(() => {});
  const cargarMarcas = () => catalogosApi.listar('marca').then((d) => setMarcas(d || [])).catch(() => {});

  useEffect(() => {
    cargarUsuarios();
    cargarEmpresas();
    cargarUbicaciones();
    cargarTipos();
    cargarSubtipos();
    cargarMarcas();
  }, []);

  // Empresa «Interno IGSS» para preseleccionar en roles internos.
  const empresaIgss = empresas.find((e) => /igss/i.test(e.nombre));

  const abrirNuevo = () => {
    setForm(USUARIO_VACIO);
    setCrearEmpresa(false);
    setEmpresaForm(EMPRESA_VACIA);
    setErrorModal('');
    setModal({ modo: 'nuevo' });
  };
  const abrirEditar = (u) => {
    setForm({
      nombre: u.nombre, correo: u.correo, contrasena: '', rol: u.rol,
      activo: u.activo, empresa: u.empresa?._id || u.empresa || '',
    });
    setCrearEmpresa(false);
    setEmpresaForm(EMPRESA_VACIA);
    setErrorModal('');
    setModal({ modo: 'editar', id: u._id });
  };

  // Al cambiar el rol, si es interno y no hay empresa elegida, sugiere IGSS.
  const cambiarRol = (rol) => {
    setForm((f) => {
      const esInterno = rol !== 'tecnico';
      const empresa = esInterno && !f.empresa && empresaIgss ? empresaIgss._id : f.empresa;
      return { ...f, rol, empresa };
    });
  };

  const guardarUsuario = async () => {
    setErrorModal('');
    if (!form.nombre.trim() || !form.correo.trim() || (modal.modo === 'nuevo' && !form.contrasena)) {
      setErrorModal('Complete nombre, correo y contraseña.');
      return;
    }
    setGuardando(true);
    try {
      // 1) Resolver la empresa afiliada (obligatoria).
      let empresaId = form.empresa;
      if (crearEmpresa) {
        if (!empresaForm.nombre.trim() || !empresaForm.nit.trim() || !empresaForm.correo.trim() || !empresaForm.telefono.trim()) {
          setErrorModal('Para crear una empresa complete nombre, NIT, correo y teléfono.');
          setGuardando(false);
          return;
        }
        const nueva = await empresasApi.crear({
          nombre: empresaForm.nombre.trim(),
          nit: empresaForm.nit.trim(),
          correo: empresaForm.correo.trim(),
          telefono: empresaForm.telefono.trim(),
        });
        empresaId = nueva._id;
        await cargarEmpresas();
      }
      if (!empresaId) {
        setErrorModal('Seleccione (o cree) la empresa afiliada. Todo usuario debe pertenecer a una empresa.');
        setGuardando(false);
        return;
      }

      // 2) Crear o actualizar el usuario con la empresa.
      if (modal.modo === 'nuevo') {
        await usuariosApi.crear({
          nombre: form.nombre, correo: form.correo, contrasena: form.contrasena,
          rol: form.rol, activo: form.activo, empresa: empresaId,
        });
      } else {
        const dto = { nombre: form.nombre, correo: form.correo, rol: form.rol, activo: form.activo, empresa: empresaId };
        if (form.contrasena) dto.contrasena = form.contrasena;
        await usuariosApi.actualizar(modal.id, dto);
      }
      setModal(null);
      await cargarUsuarios();
    } catch (e) {
      setErrorModal(mensajeError(e, 'No se pudo guardar el usuario.'));
    } finally {
      setGuardando(false);
    }
  };

  const alternarUsuario = async (u) => {
    try {
      if (u.activo) await usuariosApi.desactivar(u._id);
      else await usuariosApi.actualizar(u._id, { activo: true });
      await cargarUsuarios();
    } catch (e) { setError(mensajeError(e)); }
  };

  // ---------- Catalogos ----------
  const agregarUbicacion = async () => {
    const valor = nuevaUbic.trim();
    if (!valor) return;
    try { await catalogosApi.crear('ubicacion', valor); setNuevaUbic(''); await cargarUbicaciones(); }
    catch (e) { setError(mensajeError(e, 'No se pudo agregar la ubicación.')); }
  };
  const agregarTipo = async () => {
    const valor = nuevoTipo.trim();
    if (!valor) return;
    try { await catalogosApi.crear('tipoEquipo', valor); setNuevoTipo(''); await cargarTipos(); }
    catch (e) { setError(mensajeError(e, 'No se pudo agregar el tipo de equipo.')); }
  };
  const agregarSubtipo = async () => {
    const valor = nuevoSubtipo.valor.trim();
    const padre = nuevoSubtipo.padre;
    if (!valor) return;
    if (!padre) { setError('Elija el tipo de equipo (padre) del subtipo.'); return; }
    try { await catalogosApi.crear('subTipo', valor, padre); setNuevoSubtipo({ padre, valor: '' }); await cargarSubtipos(); }
    catch (e) { setError(mensajeError(e, 'No se pudo agregar el subtipo.')); }
  };
  const agregarMarca = async () => {
    const valor = nuevaMarca.trim();
    if (!valor) return;
    try { await catalogosApi.crear('marca', valor); setNuevaMarca(''); await cargarMarcas(); }
    catch (e) { setError(mensajeError(e, 'No se pudo agregar la marca.')); }
  };
  const quitarCatalogo = async (id, recargar) => {
    try { await catalogosApi.desactivar(id); await recargar(); }
    catch (e) { setError(mensajeError(e)); }
  };

  const nombreEmpresaUsuario = (u) =>
    u.empresa?.nombre || (typeof u.empresa === 'string' ? '—' : '—');

  return (
    <>
      <h1 className="titulo-pantalla mb-1">Administración</h1>
      <p className="texto-auxiliar mb-3">Gestión de cuentas de usuario, empresas afiliadas y catálogos editables. Módulo exclusivo del rol Administrador.</p>

      {error && <div className="alert alert-danger py-2 px-3">{error}</div>}

      <ul className="nav nav-tabs mb-3">
        <li className="nav-item"><button className={`nav-link ${tab === 'usuarios' ? 'active' : ''}`} onClick={() => setTab('usuarios')}><i className="bi bi-people me-1" />Usuarios</button></li>
        <li className="nav-item"><button className={`nav-link ${tab === 'catalogos' ? 'active' : ''}`} onClick={() => setTab('catalogos')}><i className="bi bi-list-ul me-1" />Catálogos</button></li>
      </ul>

      {tab === 'usuarios' && (
        <div className="card">
          <div className="card-header py-2 titulo-seccion d-flex justify-content-between align-items-center">
            <span>Cuentas de usuario</span>
            <button className="btn btn-primary btn-sm" onClick={abrirNuevo}><i className="bi bi-person-plus me-1" />Nuevo usuario</button>
          </div>
          <div className="table-responsive">
            <table className="table table-hover mb-0 align-middle">
              <thead><tr><th>Nombre</th><th>Correo</th><th>Rol</th><th>Empresa</th><th>NIT</th><th>Teléfono</th><th>Estado</th><th className="text-end">Acciones</th></tr></thead>
              <tbody>
                {usuarios.length === 0 && <tr><td colSpan={8} className="text-center texto-auxiliar py-3">Sin usuarios.</td></tr>}
                {usuarios.map((u) => (
                  <tr key={u._id}>
                    <td className="fw-semibold">{u.nombre}</td>
                    <td style={{ fontSize: '13.5px' }}>{u.correo}</td>
                    <td><span className="badge text-bg-secondary">{ROL_LABEL[u.rol] || u.rol}</span></td>
                    <td>{nombreEmpresaUsuario(u)}</td>
                    <td style={{ fontSize: '13.5px' }}>{u.empresa?.nit || '—'}</td>
                    <td style={{ fontSize: '13.5px' }}>{u.empresa?.telefono || '—'}</td>
                    <td>{u.activo ? <span className="badge text-bg-success">Activo</span> : <span className="badge text-bg-light text-muted">Inactivo</span>}</td>
                    <td className="text-end" style={{ whiteSpace: 'nowrap' }}>
                      <button className="btn btn-sm btn-outline-secondary me-1" title="Editar" onClick={() => abrirEditar(u)}><i className="bi bi-pencil" /></button>
                      <button className="btn btn-sm btn-outline-danger" title={u.activo ? 'Desactivar' : 'Activar'} onClick={() => alternarUsuario(u)}><i className={`bi ${u.activo ? 'bi-person-x' : 'bi-person-check'}`} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'catalogos' && (
        <div className="row g-3">
          <CatalogoCard
            icon="bi-tag" titulo="Tipos de equipo"
            valor={nuevoTipo} setValor={setNuevoTipo} onAgregar={agregarTipo}
            items={tiposEquipo} onQuitar={(id) => quitarCatalogo(id, cargarTipos)}
            placeholder="Nuevo tipo de equipo…" vacio="Sin tipos de equipo." />

          <div className="col-12 col-lg-6">
            <div className="card h-100">
              <div className="card-header py-2 titulo-seccion"><i className="bi bi-diagram-3 me-1" />Subtipos</div>
              <div className="card-body py-2">
                <div className="row g-1 mb-2">
                  <div className="col-5">
                    <select className="form-select form-select-sm" value={nuevoSubtipo.padre}
                      onChange={(e) => setNuevoSubtipo({ ...nuevoSubtipo, padre: e.target.value })}>
                      <option value="">Tipo…</option>
                      {tiposEquipo.map((t) => <option key={t._id} value={t.valor}>{t.valor}</option>)}
                    </select>
                  </div>
                  <div className="col-7">
                    <div className="input-group input-group-sm">
                      <input className="form-control" placeholder="Nuevo subtipo…" value={nuevoSubtipo.valor}
                        onChange={(e) => setNuevoSubtipo({ ...nuevoSubtipo, valor: e.target.value })}
                        onKeyDown={(e) => e.key === 'Enter' && agregarSubtipo()} />
                      <button className="btn btn-outline-primary" onClick={agregarSubtipo}><i className="bi bi-plus-lg" /></button>
                    </div>
                  </div>
                </div>
                <div className="form-text mb-1">Cada subtipo pertenece a un tipo de equipo.</div>
              </div>
              <ul className="list-group list-group-flush">
                {subtipos.map((v) => (
                  <li key={v._id} className="list-group-item d-flex justify-content-between align-items-center" style={{ fontSize: '14px' }}>
                    <span>{v.valor} <span className="texto-auxiliar">· {v.padre}</span></span>
                    <button className="btn btn-sm btn-link text-danger p-0" title="Quitar" onClick={() => quitarCatalogo(v._id, cargarSubtipos)}><i className="bi bi-trash" /></button>
                  </li>
                ))}
                {subtipos.length === 0 && <li className="list-group-item texto-auxiliar">Sin subtipos.</li>}
              </ul>
            </div>
          </div>

          <CatalogoCard
            icon="bi-award" titulo="Marcas"
            valor={nuevaMarca} setValor={setNuevaMarca} onAgregar={agregarMarca}
            items={marcas} onQuitar={(id) => quitarCatalogo(id, cargarMarcas)}
            placeholder="Nueva marca…" vacio="Sin marcas." />

          <CatalogoCard
            icon="bi-geo-alt" titulo="Ubicaciones"
            valor={nuevaUbic} setValor={setNuevaUbic} onAgregar={agregarUbicacion}
            items={ubicaciones} onQuitar={(id) => quitarCatalogo(id, cargarUbicaciones)}
            placeholder="Nueva ubicación…" vacio="Sin ubicaciones." />

          <div className="col-12">
            <div className="card">
              <div className="card-header py-2 titulo-seccion"><i className="bi bi-lock me-1" />Catálogos fijos del sistema</div>
              <div className="card-body">
                <p className="texto-auxiliar mb-2">Estos valores son listas cerradas del validador de MongoDB (la lógica del sistema depende de ellos) y no se editan desde aquí:</p>
                <ul className="mb-0" style={{ fontSize: '13.5px' }}>
                  <li><strong>Estados del equipo:</strong> Funcionando, En mantenimiento, Fuera de servicio, Dado de baja</li>
                  <li><strong>Criticidad:</strong> Baja, Media, Alta, Crítica</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal usuario */}
      {modal && (
        <div className="modal-overlay" onClick={() => !guardando && setModal(null)}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
            <div className="card">
              <div className="card-header py-2 titulo-seccion d-flex justify-content-between align-items-center">
                <span>{modal.modo === 'nuevo' ? 'Nuevo usuario' : 'Editar usuario'}</span>
                <button className="btn btn-sm btn-link text-secondary p-0" onClick={() => setModal(null)}><i className="bi bi-x-lg" /></button>
              </div>
              <div className="card-body">
                {errorModal && <div className="alert alert-danger py-2 px-3">{errorModal}</div>}
                <div className="row g-3">
                  <div className="col-12"><label className="form-label">Nombre completo <span className="text-danger">*</span></label>
                    <input className="form-control" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} /></div>
                  <div className="col-8"><label className="form-label">Correo institucional <span className="text-danger">*</span></label>
                    <input type="email" className="form-control" value={form.correo} onChange={(e) => setForm({ ...form, correo: e.target.value })} /></div>
                  <div className="col-4"><label className="form-label">Rol <span className="text-danger">*</span></label>
                    <select className="form-select" value={form.rol} onChange={(e) => cambiarRol(e.target.value)}>
                      {ROLES.map((r) => <option key={r} value={r}>{ROL_LABEL[r]}</option>)}
                    </select></div>

                  {/* Empresa afiliada (obligatoria) */}
                  <div className="col-12">
                    <label className="form-label">Empresa afiliada <span className="text-danger">*</span></label>
                    {!crearEmpresa ? (
                      <>
                        <select className="form-select" value={form.empresa} onChange={(e) => setForm({ ...form, empresa: e.target.value })}>
                          <option value="">Seleccione una empresa…</option>
                          {empresas.map((em) => <option key={em._id} value={em._id}>{em.nombre}{em.nit ? ` — NIT ${em.nit}` : ''}</option>)}
                        </select>
                        <div className="form-text">
                          Técnicos → su empresa de servicio · Supervisor/Administrador/Auditor → «Interno IGSS».{' '}
                          <button type="button" className="btn btn-link btn-sm p-0 align-baseline" onClick={() => setCrearEmpresa(true)}>+ Crear empresa nueva</button>
                        </div>
                      </>
                    ) : (
                      <div className="border rounded p-2">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <span className="fw-semibold" style={{ fontSize: '14px' }}>Nueva empresa</span>
                          <button type="button" className="btn btn-link btn-sm p-0" onClick={() => setCrearEmpresa(false)}>Usar existente</button>
                        </div>
                        <div className="row g-2">
                          <div className="col-6"><input className="form-control form-control-sm" placeholder="Nombre *" value={empresaForm.nombre} onChange={(e) => setEmpresaForm({ ...empresaForm, nombre: e.target.value })} /></div>
                          <div className="col-6"><input className="form-control form-control-sm" placeholder="NIT *" value={empresaForm.nit} onChange={(e) => setEmpresaForm({ ...empresaForm, nit: e.target.value })} /></div>
                          <div className="col-6"><input type="email" className="form-control form-control-sm" placeholder="Correo *" value={empresaForm.correo} onChange={(e) => setEmpresaForm({ ...empresaForm, correo: e.target.value })} /></div>
                          <div className="col-6"><input className="form-control form-control-sm" placeholder="Teléfono *" value={empresaForm.telefono} onChange={(e) => setEmpresaForm({ ...empresaForm, telefono: e.target.value })} /></div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="col-12"><label className="form-label">Contraseña {modal.modo === 'nuevo' ? <span className="text-danger">*</span> : <span className="texto-auxiliar">(dejar en blanco para no cambiarla)</span>}</label>
                    <input type="password" className="form-control" value={form.contrasena} onChange={(e) => setForm({ ...form, contrasena: e.target.value })} /></div>
                  <div className="col-12 form-check ms-2">
                    <input className="form-check-input" type="checkbox" id="activo" checked={form.activo} onChange={(e) => setForm({ ...form, activo: e.target.checked })} />
                    <label className="form-check-label" htmlFor="activo">Cuenta activa</label>
                  </div>
                </div>
              </div>
              <div className="card-footer d-flex justify-content-end gap-2 py-2">
                <button className="btn btn-outline-secondary" onClick={() => setModal(null)} disabled={guardando}>Cancelar</button>
                <button className="btn btn-primary" onClick={guardarUsuario} disabled={guardando}>
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

// Tarjeta reutilizable para catalogos de un solo valor (tipo, marca, ubicacion).
function CatalogoCard({ icon, titulo, valor, setValor, onAgregar, items, onQuitar, placeholder, vacio }) {
  return (
    <div className="col-12 col-lg-6">
      <div className="card h-100">
        <div className="card-header py-2 titulo-seccion"><i className={`bi ${icon} me-1`} />{titulo}</div>
        <div className="card-body py-2">
          <div className="input-group input-group-sm mb-2">
            <input className="form-control" placeholder={placeholder} value={valor}
              onChange={(e) => setValor(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onAgregar()} />
            <button className="btn btn-outline-primary" onClick={onAgregar}><i className="bi bi-plus-lg" /></button>
          </div>
        </div>
        <ul className="list-group list-group-flush">
          {items.map((v) => (
            <li key={v._id} className="list-group-item d-flex justify-content-between align-items-center" style={{ fontSize: '14px' }}>
              {v.valor}
              <button className="btn btn-sm btn-link text-danger p-0" title="Quitar" onClick={() => onQuitar(v._id)}><i className="bi bi-trash" /></button>
            </li>
          ))}
          {items.length === 0 && <li className="list-group-item texto-auxiliar">{vacio}</li>}
        </ul>
      </div>
    </div>
  );
}
