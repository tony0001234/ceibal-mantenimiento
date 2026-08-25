import { createContext, useContext, useEffect, useState } from 'react';
import { authApi } from '../api/services';
import { mensajeError } from '../api/client';

// Autenticacion REAL contra la API (RF01): login con JWT, sesion persistida
// en localStorage y restaurada al recargar mediante /auth/perfil.
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(() => {
    try {
      const guardado = localStorage.getItem('usuario');
      return guardado ? JSON.parse(guardado) : null;
    } catch {
      return null;
    }
  });
  const [cargando, setCargando] = useState(true);

  // Al montar, si hay token, valida la sesion contra el backend.
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setCargando(false);
      return;
    }
    authApi
      .perfil()
      .then((perfil) => {
        setUsuario(perfil);
        localStorage.setItem('usuario', JSON.stringify(perfil));
      })
      .catch(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('usuario');
        setUsuario(null);
      })
      .finally(() => setCargando(false));
  }, []);

  const login = async (correo, clave) => {
    try {
      const data = await authApi.login(correo, clave);
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('usuario', JSON.stringify(data.usuario));
      setUsuario(data.usuario);
      return { ok: true, usuario: data.usuario };
    } catch (error) {
      return { ok: false, error: mensajeError(error, 'Inicio de sesión inválido') };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    setUsuario(null);
  };

  return (
    <AuthContext.Provider value={{ usuario, cargando, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
