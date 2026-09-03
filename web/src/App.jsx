import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Login from './pages/Login';

// Carga diferida (code-splitting): las vistas autenticadas se descargan solo
// cuando se navega a ellas, de modo que la pantalla de login (primera carga)
// no arrastra el código de todo el panel. El comportamiento no cambia; solo
// se reparte el paquete JS en fragmentos más pequeños.
const Layout = lazy(() => import('./components/Layout'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const RegistroMantenimiento = lazy(() => import('./pages/RegistroMantenimiento'));
const Equipos = lazy(() => import('./pages/Equipos'));
const Historial = lazy(() => import('./pages/Historial'));
const Reportes = lazy(() => import('./pages/Reportes'));
const Costos = lazy(() => import('./pages/Costos'));
const Administracion = lazy(() => import('./pages/Administracion'));

// Indicador mientras se descarga un fragmento de vista.
function Cargador() {
  return (
    <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
      <div className="spinner-border text-primary" role="status">
        <span className="visually-hidden">Cargando…</span>
      </div>
    </div>
  );
}

// Restringe una ruta a ciertos roles (control de acceso real, RF01/RNF01).
function Rol({ roles, children }) {
  const { usuario } = useAuth();
  if (!usuario) return <Navigate to="/" replace />;
  if (roles && !roles.includes(usuario.rol))
    return <Navigate to="/app/equipos" replace />;
  return children;
}

export default function App() {
  const { cargando } = useAuth();

  if (cargando) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Cargando…</span>
        </div>
      </div>
    );
  }

  const CON_PANEL = ['administrador', 'supervisor', 'auditor'];

  return (
    <Suspense fallback={<Cargador />}>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/app" element={<Layout />}>
          <Route index element={<Navigate to="/app/equipos" replace />} />
          <Route path="panel" element={<Rol roles={CON_PANEL}><Dashboard /></Rol>} />
          <Route path="registro" element={<Rol roles={['administrador', 'supervisor', 'tecnico']}><RegistroMantenimiento /></Rol>} />
          <Route path="equipos" element={<Equipos />} />
          <Route path="historial" element={<Historial />} />
          <Route path="reportes" element={<Rol roles={CON_PANEL}><Reportes /></Rol>} />
          <Route path="costos" element={<Rol roles={['administrador']}><Costos /></Rol>} />
          <Route path="administracion" element={<Rol roles={['administrador']}><Administracion /></Rol>} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
