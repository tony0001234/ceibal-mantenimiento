import { useState } from 'react';
import { USUARIOS, TIPOS_EQUIPO, TIPOS_MANTENIMIENTO, MARCAS } from '../data/mockData';
import DemoBanner from '../components/DemoBanner';

// Administración del sistema (RF10). Solo el rol Administrador.
// Gestión de usuarios y de catálogos.
export default function Administracion() {
  const [tab, setTab] = useState('usuarios');
  const sim = (msg) => alert(`Prototipo NO funcional: ${msg}`);

  const catalogos = [
    { nombre: 'Tipos de equipo', valores: TIPOS_EQUIPO, icon: 'bi-hdd-stack' },
    { nombre: 'Tipos de mantenimiento', valores: TIPOS_MANTENIMIENTO, icon: 'bi-wrench' },
    { nombre: 'Marcas', valores: MARCAS, icon: 'bi-tag' },
  ];

  return (
    <>
      <h1 className="titulo-pantalla mb-1">Administración</h1>
      <p className="texto-auxiliar mb-3">Gestión de cuentas de usuario y de los catálogos del sistema. Módulo exclusivo del rol Administrador.</p>
      <DemoBanner />

      <ul className="nav nav-tabs mb-3">
        <li className="nav-item"><button className={`nav-link ${tab === 'usuarios' ? 'active' : ''}`} onClick={() => setTab('usuarios')}><i className="bi bi-people me-1" />Usuarios</button></li>
        <li className="nav-item"><button className={`nav-link ${tab === 'catalogos' ? 'active' : ''}`} onClick={() => setTab('catalogos')}><i className="bi bi-list-ul me-1" />Catálogos</button></li>
      </ul>

      {tab === 'usuarios' && (
        <div className="card">
          <div className="card-header py-2 titulo-seccion d-flex justify-content-between align-items-center">
            <span>Cuentas de usuario</span>
            <button className="btn btn-primary btn-sm" onClick={() => sim('aquí se abriría el formulario de nuevo usuario.')}><i className="bi bi-person-plus me-1" />Nuevo usuario</button>
          </div>
          <div className="table-responsive">
            <table className="table table-hover mb-0 align-middle">
              <thead><tr><th>Usuario</th><th>Nombre</th><th>Correo</th><th>Rol</th><th>Estado</th><th className="text-end">Acciones</th></tr></thead>
              <tbody>
                {USUARIOS.map((u) => (
                  <tr key={u.id}>
                    <td className="fw-semibold">{u.usuario}</td>
                    <td>{u.nombre}</td>
                    <td style={{ fontSize: '13.5px' }}>{u.correo}</td>
                    <td><span className="badge text-bg-secondary">{u.rol}</span></td>
                    <td>{u.activo ? <span className="badge text-bg-success">Activo</span> : <span className="badge text-bg-light text-muted">Inactivo</span>}</td>
                    <td className="text-end" style={{ whiteSpace: 'nowrap' }}>
                      <button className="btn btn-sm btn-outline-secondary me-1" onClick={() => sim('edición de usuario.')}><i className="bi bi-pencil" /></button>
                      <button className="btn btn-sm btn-outline-danger" onClick={() => sim(u.activo ? 'desactivación de usuario.' : 'activación de usuario.')}><i className={`bi ${u.activo ? 'bi-person-x' : 'bi-person-check'}`} /></button>
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
          {catalogos.map((c) => (
            <div className="col-12 col-lg-4" key={c.nombre}>
              <div className="card h-100">
                <div className="card-header py-2 titulo-seccion d-flex justify-content-between align-items-center">
                  <span><i className={`bi ${c.icon} me-1`} />{c.nombre}</span>
                  <button className="btn btn-sm btn-outline-primary" onClick={() => sim(`aquí se agregaría un valor al catálogo «${c.nombre}» (RF10).`)}><i className="bi bi-plus-lg" /></button>
                </div>
                <ul className="list-group list-group-flush">
                  {c.valores.map((v) => (
                    <li key={v} className="list-group-item d-flex justify-content-between align-items-center" style={{ fontSize: '14px' }}>
                      {v}
                      <button className="btn btn-sm btn-link text-secondary p-0" onClick={() => sim('edición de valor del catálogo.')}><i className="bi bi-pencil" /></button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
