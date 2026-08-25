import { useState } from 'react';
import { NavLink, useNavigate, Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { MODULOS, ROL_LABEL } from '../data/constants';

// Estructura base de 4 zonas (5.3.3), compartida por todas las pantallas.
export default function Layout() {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  if (!usuario) return <Navigate to="/" replace />;

  const modulosVisibles = MODULOS.filter((m) => m.roles.includes(usuario.rol));

  const salir = () => { logout(); navigate('/'); };

  return (
    <>
      {/* Zona 1: barra superior fija */}
      <header className="topbar">
        <button className="btn btn-sm text-white menu-toggle p-0 me-1" onClick={() => setMenuOpen(!menuOpen)} aria-label="Menú">
          <i className="bi bi-list fs-4" />
        </button>
        <div className="brand-emblem"><i className="bi bi-stack" /></div>
        <div className="d-flex flex-column lh-1">
          <span className="fw-semibold" style={{ fontSize: '15px' }}>Sistema de Control de Mantenimiento</span>
          <span className="d-none d-sm-block" style={{ fontSize: '11px', opacity: .8 }}>Hospital General de Accidentes «Ceibal» — IGSS</span>
        </div>
        <div className="ms-auto d-flex align-items-center gap-2">
          <div className="text-end d-none d-sm-block lh-1">
            <div style={{ fontSize: '14px' }}>{usuario.nombre}</div>
            <span className="rol-chip">{ROL_LABEL[usuario.rol] || usuario.rol}</span>
          </div>
          <div className="brand-emblem"><i className="bi bi-person" /></div>
          <button className="btn btn-sm btn-outline-light" onClick={salir}>
            <i className="bi bi-box-arrow-right me-1" /><span className="d-none d-md-inline">Cerrar sesión</span>
          </button>
        </div>
      </header>

      {/* Zona 2: menú lateral */}
      <nav className={`sidebar ${menuOpen ? 'open' : ''}`}>
        <div className="sidebar-cat">Módulos</div>
        {modulosVisibles.map((m) => (
          <NavLink key={m.key} to={m.ruta} className="nav-link" onClick={() => setMenuOpen(false)}>
            <i className={`bi ${m.icon}`} />{m.label}
          </NavLink>
        ))}
        <div className="sidebar-cat mt-3">Sesión</div>
        <a className="nav-link" role="button" onClick={salir}><i className="bi bi-box-arrow-right" />Cerrar sesión</a>
      </nav>
      <div className={`sidebar-backdrop ${menuOpen ? 'show' : ''}`} onClick={() => setMenuOpen(false)} />

      {/* Zona 3: área de contenido (cada pantalla la rellena) */}
      <main className="content-area">
        <Outlet />
      </main>
    </>
  );
}
