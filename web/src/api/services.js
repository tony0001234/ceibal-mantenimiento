import api from './client';

// -------------------- Autenticacion (RF01) --------------------
export const authApi = {
  login: (correo, contrasena) =>
    api.post('/auth/login', { correo, contrasena }).then((r) => r.data),
  perfil: () => api.get('/auth/perfil').then((r) => r.data),
};

// -------------------- Equipos (RF02) --------------------
export const equiposApi = {
  listar: (params = {}) => api.get('/equipos', { params }).then((r) => r.data),
  obtener: (id) => api.get(`/equipos/${id}`).then((r) => r.data),
  crear: (dto) => api.post('/equipos', dto).then((r) => r.data),
  actualizar: (id, dto) => api.patch(`/equipos/${id}`, dto).then((r) => r.data),
  darDeBaja: (id) => api.patch(`/equipos/${id}/baja`).then((r) => r.data),
};

// -------------------- Mantenimientos (RF03-RF06) --------------------
export const mantenimientosApi = {
  listar: (params = {}) =>
    api.get('/mantenimientos', { params }).then((r) => r.data),
  crear: (dto) => api.post('/mantenimientos', dto).then((r) => r.data),
  verificarDuplicado: (equipo, fecha) =>
    api
      .get('/mantenimientos/duplicado', { params: { equipo, fecha } })
      .then((r) => r.data),
};

// -------------------- Reportes e indicadores (RF07/RF08) --------------------
export const reportesApi = {
  indicadores: () => api.get('/reportes/indicadores').then((r) => r.data),
  preview: (params = {}) =>
    api.get('/reportes/preview', { params }).then((r) => r.data),
  // Descarga un archivo (Excel/PDF) y dispara la descarga en el navegador.
  descargar: async (formato, params = {}) => {
    const resp = await api.get(`/reportes/${formato}`, {
      params,
      responseType: 'blob',
    });
    descargarBlob(resp.data, `reporte-mantenimientos.${formato === 'excel' ? 'xlsx' : 'pdf'}`);
  },

  // ---------- Inventario de equipos en alta ----------
  equiposPreview: (params = {}) =>
    api.get('/reportes/equipos/preview', { params }).then((r) => r.data),
  descargarEquipos: async (formato, params = {}) => {
    const resp = await api.get(`/reportes/equipos/${formato}`, {
      params,
      responseType: 'blob',
    });
    descargarBlob(resp.data, `reporte-equipos-en-alta.${formato === 'excel' ? 'xlsx' : 'pdf'}`);
  },
};

// Dispara la descarga de un blob en el navegador.
function descargarBlob(data, nombre) {
  const url = window.URL.createObjectURL(new Blob([data]));
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

// -------------------- Usuarios (RF10) --------------------
export const usuariosApi = {
  listar: () => api.get('/usuarios').then((r) => r.data),
  crear: (dto) => api.post('/usuarios', dto).then((r) => r.data),
  actualizar: (id, dto) => api.patch(`/usuarios/${id}`, dto).then((r) => r.data),
  desactivar: (id) => api.patch(`/usuarios/${id}/desactivar`).then((r) => r.data),
};

// -------------------- Empresas --------------------
export const empresasApi = {
  listar: (activas = true) =>
    api.get('/empresas', { params: { activas } }).then((r) => r.data),
  crear: (dto) => api.post('/empresas', dto).then((r) => r.data),
};

// -------------------- Catalogos (RF10) --------------------
// tipo: 'tipoEquipo' | 'subTipo' | 'marca' | 'ubicacion'.
// padre: solo para 'subTipo' (el tipoEquipo al que pertenece).
export const catalogosApi = {
  listar: (tipo, padre) => {
    const params = {};
    if (tipo) params.tipo = tipo;
    if (padre) params.padre = padre;
    return api.get('/catalogos', { params }).then((r) => r.data);
  },
  crear: (tipo, valor, padre) =>
    api.post('/catalogos', padre ? { tipo, valor, padre } : { tipo, valor }).then((r) => r.data),
  desactivar: (id) =>
    api.patch(`/catalogos/${id}/desactivar`).then((r) => r.data),
};
