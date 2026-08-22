import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import RegistroMantenimiento from './pages/RegistroMantenimiento';
import Equipos from './pages/Equipos';
import Historial from './pages/Historial';
import Reportes from './pages/Reportes';
import Administracion from './pages/Administracion';

// Restringe una ruta a ciertos roles (control de acceso simulado, RF01/RNF01).
function Rol({ roles, children }) {
  const { usuario } = useAuth();
  if (!usuario) return <Navigate to="/" replace />;
  if (roles && !roles.includes(usuario.rol)) return <Navigate to="/app/equipos" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/app" element={<Layout />}>
        <Route index element={<Navigate to="/app/equipos" replace />} />
        <Route path="panel" element={<Rol roles={['Administrador', 'Supervisor']}><Dashboard /></Rol>} />
        <Route path="registro" element={<RegistroMantenimiento />} />
        <Route path="equipos" element={<Equipos />} />
        <Route path="historial" element={<Historial />} />
        <Route path="reportes" element={<Rol roles={['Administrador', 'Supervisor']}><Reportes /></Rol>} />
        <Route path="administracion" element={<Rol roles={['Administrador']}><Administracion /></Rol>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
