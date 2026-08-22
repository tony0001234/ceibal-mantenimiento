import { createContext, useContext, useState } from 'react';
import { USUARIOS } from '../data/mockData';

// Autenticacion SIMULADA (prototipo NO funcional).
// No hay JWT ni backend: solo se compara contra la lista estatica de usuarios demo.
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);

  const login = (nombreUsuario, clave) => {
    const u = USUARIOS.find(
      (x) => x.usuario === nombreUsuario.trim().toLowerCase() && x.clave === clave && x.activo
    );
    if (u) {
      setUsuario(u);
      return { ok: true };
    }
    return { ok: false, error: 'Inicio de sesión inválido' };
  };

  const logout = () => setUsuario(null);

  return (
    <AuthContext.Provider value={{ usuario, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
