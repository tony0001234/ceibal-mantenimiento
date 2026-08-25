import axios from 'axios';

// Cliente HTTP centralizado. Agrega el token JWT a cada peticion y, si el
// servidor responde 401 (token invalido o expirado), cierra la sesion.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('usuario');
      if (!window.location.hash.startsWith('#/')) {
        window.location.hash = '#/';
      } else if (window.location.hash !== '#/') {
        window.location.hash = '#/';
      }
    }
    return Promise.reject(error);
  },
);

// Extrae un mensaje de error legible desde la respuesta del backend.
export function mensajeError(error, porDefecto = 'Ocurrió un error.') {
  const data = error?.response?.data;
  if (!data) return error?.message || porDefecto;
  if (typeof data.message === 'string') return data.message;
  if (Array.isArray(data.message)) return data.message.join(' · ');
  return porDefecto;
}

export default api;
