import { useState, useEffect } from 'react';
import { usuariosApi, catalogosApi } from '../api/services';
import { mensajeError } from '../api/client';
import { ROL_LABEL, ROLES } from '../data/constants';

// Administracion del sistema (RF10). Solo el rol Administrador.
const USUARIO_VACIO = { nombre: '', correo: '', contrasena: '', rol: 'tecnico', activo: true };

export default function Administracion() {
  const [tab, setTab] = useState('usuarios');
  const [usuarios, setUsuarios] = useState([]);
  const [ubicaciones, setUbicaciones] = useState([]);
  const [error, setError] = useState('');

  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(USUARIO_VACIO);
  const [errorModal, setErrorModal] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [nuevaUbic, setNuevaUbic] = useState('');

  const cargarUsuarios = () => usuariosApi.listar().then(setUsuarios).catch((e) => setError(mensajeError(e)));
  const cargarUbicaciones = () => catalogosApi.listar('ubicacion').then((d) => setUbicaciones(d || [])).catch(() => {});

  useEffect(() => { cargarUsuarios(); cargarUbicaciones(); }, []);

  const abrirNuevo = () => { setForm(USUARIO_VACIO); setErrorModal(''); setModal({ modo: 'nuevo' }); };
  const abrirEditar = (u) => {
    setForm({ nombre: u.nombre, correo: u.correo, contrasena: '', rol: u.rol, activo: u.activo });
    setErrorModal('');
    setModal({ modo: 'editar', id: u._id });
  };

  const guardarUsuario = async () => {
    setErrorModal('');
    if (!form.nombre.trim() || !form.correo.trim() || (modal.modo === 'nuevo' && !form.contrasena)) {
      setErrorModal('Complete nombre, correo y contraseña.');
      return;
    }
    setGuardando(true);
    try {
      if (modal.modo === 'nuevo') {
        await usuariosApi.crear(form);
      } else {
        const dto = { nombre: form.nombre, correo: form.correo, rol: form.rol, activo: form.activo };
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

  const agregarUbicacion = async () => {
    const valor = nuevaUbic.trim();
    if (!valor) return;
    try {
      await catalogosApi.crear('ubicacion', valor);
      setNuevaUbic('');
      await cargarUbicaciones();
    } catch (e) { setError(mensajeError(e, 'No se pudo agregar la ubicación.')); }
  };

  const quitarUbicacion = async (id) => {
    try { await catalogosApi.desactivar(id); await cargarUbicaciones(); }
    catch (e) { setError(mensajeError(e)); }
  };

  return (
    <>
      <h1 className="titulo-pantalla mb-1">Administración</h1>
      <p className="texto-auxiliar mb-3">Gestión de cuentas de usuario y del catálogo de ubicaciones. Módulo exclusivo del rol Administrador.</p>

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
              <thead><tr><th>Nombre</th><th>Correo</th><th>Rol</th><th>Estado</th><th className="text-end">Acciones</th></tr></thead>
              <tbody>
                {usuarios.length === 0 && <tr><td colSpan={5} className="text-center texto-auxiliar py-3">Sin usuarios.</td></tr>}
                {usuarios.map((u) => (
                  <tr key={u._id}>
                    <td className="fw-semibold">{u.nombre}</td>
                    <td style={{ fontSize: '13.5px' }}>{u.correo}</td>
                    <td><span className="badge text-bg-secondary">{ROL_LABEL[u.rol] || u.rol}</span></td>
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
          <div className="col-12 col-lg-6">
            <div className="card h-100">
              <div className="card-header py-2 titulo-seccion"><i className="bi bi-geo-alt me-1" />Ubicaciones</div>
              <div className="card-body py-2">
                <div className="input-group input-group-sm mb-2">
                  <input className="form-control" placeholder="Nueva ubicación…" value={nuevaUbic}
                    onChange={(e) => setNuevaUbic(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && agregarUbicacion()} />
                  <button className="btn btn-outline-primary" onClick={agregarUbicacion}><i className="bi bi-plus-lg" /></button>
                </div>
              </div>
              <ul className="list-group list-group-flush">
                {ubicaciones.map((v) => (
                  <li key={v._id} className="list-group-item d-flex justify-content-between align-items-center" style={{ fontSize: '14px' }}>
                    {v.valor}
                    <button className="btn btn-sm btn-link text-danger p-0" title="Quitar" onClick={() => quitarUbicacion(v._id)}><i className="bi bi-trash" /></button>
                  </li>
                ))}
                {ubicaciones.length === 0 && <li className="list-group-item texto-auxiliar">Sin ubicaciones.</li>}
              </ul>
            </div>
          </div>
          <div className="col-12 col-lg-6">
            <div className="card h-100">
              <div className="card-header py-2 titulo-seccion"><i className="bi bi-info-circle me-1" />Catálogos fijos</div>
              <div className="card-body">
                <p className="texto-auxiliar mb-2">Estos catálogos están definidos como valores cerrados en la base de datos (validadores de MongoDB) y no se editan desde aquí:</p>
                <ul className="mb-0" style={{ fontSize: '13.5px' }}>
                  <li><strong>Tipo de equipo:</strong> Refrigeración</li>
                  <li><strong>Subtipos:</strong> Split, Mini-split, Cassette, Ventana, Paquete</li>
                  <li><strong>Marcas:</strong> Rheem, Tempstar, York, Lennox, y otras 11</li>
                  <li><strong>Estados / criticidad:</strong> valores fijos del validador</li>
                </ul>
                <p className="texto-auxiliar mt-2 mb-0">Para modificarlos hay que cambiar el validador de la colección en MongoDB Atlas.</p>
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
                    <select className="form-select" value={form.rol} onChange={(e) => setForm({ ...form, rol: e.target.value })}>
                      {ROLES.map((r) => <option key={r} value={r}>{ROL_LABEL[r]}</option>)}
                    </select></div>
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
