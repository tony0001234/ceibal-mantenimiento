// =====================================================================
// Datos SIMULADOS (prototipo NO funcional — inciso 5.3)
// No hay base de datos ni backend real: todo es estático/demostrativo.
// Basado en el reporte en papel real y en los requerimientos RF01-RF10.
// =====================================================================

// ---------- Usuarios y roles (RF01) ----------
export const USUARIOS = [
  { id: 1, usuario: 'admin',    nombre: 'Ana Morales',   correo: 'amorales@igssceibal.gob.gt', rol: 'Administrador', clave: 'admin123',   activo: true },
  { id: 2, usuario: 'pgarcia',  nombre: 'Pablo García',  correo: 'pgarcia@igssceibal.gob.gt',  rol: 'Técnico',       clave: 'tecnico123', activo: true },
  { id: 3, usuario: 'rlopez',   nombre: 'Rosa López',    correo: 'rlopez@igssceibal.gob.gt',   rol: 'Supervisor',    clave: 'super123',   activo: true },
  { id: 4, usuario: 'jmendez',  nombre: 'Julio Méndez',  correo: 'jmendez@igssceibal.gob.gt',  rol: 'Técnico',       clave: 'tecnico123', activo: false },
];

// ---------- Catálogos (RF03 / RF10) ----------
export const TIPOS_EQUIPO = ['Aire acondicionado', 'Refrigeración', 'Equipo médico', 'Sistema eléctrico', 'Bomba de agua', 'Planta eléctrica'];
export const MARCAS = ['LG', 'Samsung', 'Carrier', 'York', 'Trane', 'Mabe', 'Genérico'];
export const TIPOS_MANTENIMIENTO = ['Preventivo', 'Correctivo', 'Llamada de emergencia', 'Evaluación interna'];
export const PERIODOS = ['Mensual', 'Cuatrimestral', 'Garantía'];
export const UBICACIONES = ['Sala de Operaciones', 'Emergencia', 'Encamamiento 2do nivel', 'Laboratorio', 'Consulta externa', 'Rayos X', 'Farmacia', 'Cocina'];
export const EMPRESAS = ['Servicios Técnicos de Mantenimiento (Pablo J. Gaitán)', 'Interno IGSS', 'Frío Industrial S.A.'];

// ---------- Estados semánticos (5.3.2) ----------
export const ESTADOS = {
  operativo:      { key: 'operativo',      label: 'Funcionando',      cls: 'estado-funcionando' },
  en_mantenimiento:{ key: 'en_mantenimiento', label: 'En mantenimiento', cls: 'estado-mantenimiento' },
  fuera_de_servicio:{ key: 'fuera_de_servicio', label: 'Fuera de servicio', cls: 'estado-fuera' },
  baja:           { key: 'baja',           label: 'Dado de baja',     cls: 'estado-baja' },
};

// ---------- Inventario de equipos (RF02) ----------
export const EQUIPOS = [
  { id: 1,  codigo: '0048CF89', nombre: 'Aire Acondicionado Split 24k BTU', tipo: 'Aire acondicionado', marca: 'Carrier', modelo: '38QUS', ubicacion: 'Sala de Operaciones', estado: 'operativo', criticidad: 'alta' },
  { id: 2,  codigo: '0051AA12', nombre: 'Aire Acondicionado Split 18k BTU', tipo: 'Aire acondicionado', marca: 'LG', modelo: 'Dual Inverter', ubicacion: 'Emergencia', estado: 'fuera_de_servicio', criticidad: 'alta' },
  { id: 3,  codigo: '0067BC34', nombre: 'Cámara de Refrigeración de Vacunas', tipo: 'Refrigeración', marca: 'York', modelo: 'RF-500', ubicacion: 'Farmacia', estado: 'operativo', criticidad: 'alta' },
  { id: 4,  codigo: '0072DE56', nombre: 'Aire Acondicionado de Ventana', tipo: 'Aire acondicionado', marca: 'Samsung', modelo: 'AW12', ubicacion: 'Laboratorio', estado: 'en_mantenimiento', criticidad: 'media' },
  { id: 5,  codigo: '0080FG78', nombre: 'Bomba de Agua Centrífuga', tipo: 'Bomba de agua', marca: 'Genérico', modelo: 'BC-2HP', ubicacion: 'Cocina', estado: 'operativo', criticidad: 'media' },
  { id: 6,  codigo: '0091HI90', nombre: 'Planta Eléctrica de Emergencia', tipo: 'Planta eléctrica', marca: 'Trane', modelo: 'PE-150', ubicacion: 'Emergencia', estado: 'operativo', criticidad: 'alta' },
  { id: 7,  codigo: '0102JK11', nombre: 'Aire Acondicionado Split 12k BTU', tipo: 'Aire acondicionado', marca: 'LG', modelo: 'Inverter', ubicacion: 'Consulta externa', estado: 'operativo', criticidad: 'baja' },
  { id: 8,  codigo: '0113LM22', nombre: 'Refrigeradora de Laboratorio', tipo: 'Refrigeración', marca: 'Mabe', modelo: 'RL-300', ubicacion: 'Laboratorio', estado: 'fuera_de_servicio', criticidad: 'media' },
  { id: 9,  codigo: '0124NO33', nombre: 'Tablero Eléctrico Principal', tipo: 'Sistema eléctrico', marca: 'Genérico', modelo: 'TP-400', ubicacion: 'Rayos X', estado: 'operativo', criticidad: 'alta' },
  { id: 10, codigo: '0135PQ44', nombre: 'Aire Acondicionado Split 24k BTU', tipo: 'Aire acondicionado', marca: 'Carrier', modelo: '38QUS', ubicacion: 'Encamamiento 2do nivel', estado: 'en_mantenimiento', criticidad: 'media' },
  { id: 11, codigo: '0146RS55', nombre: 'Equipo de Rayos X Portátil', tipo: 'Equipo médico', marca: 'Genérico', modelo: 'RX-Port', ubicacion: 'Rayos X', estado: 'operativo', criticidad: 'alta' },
  { id: 12, codigo: '0157TU66', nombre: 'Aire Acondicionado de Ventana', tipo: 'Aire acondicionado', marca: 'Samsung', modelo: 'AW09', ubicacion: 'Consulta externa', estado: 'baja', criticidad: 'baja' },
];

// ---------- Registros de mantenimiento (RF03 / RF06) ----------
// El estado final resultante es binario (funcionando / fuera de servicio),
// conforme al RF03 del documento y al esquema de la guía (estadoEquipoResultante).
// horaInicio/horaFin permiten el cálculo del MTTR (RF08).
export const MANTENIMIENTOS = [
  { id: 1013305, equipoId: 5, equipo: '0080FG78 — Bomba de Agua Centrífuga', tipo: 'Preventivo', periodo: 'Mensual', fecha: '2026-08-20', horaInicio: '08:05', horaFin: '09:10', tecnico: 'Pablo García', empresa: 'Interno IGSS', descripcion: 'Revisión de sellos y lubricación de rodamientos.', repuestos: 'Grasa industrial', estadoFinal: 'operativo', ordenCompra: '—' },
  { id: 1013296, equipoId: 1, equipo: '0048CF89 — Aire Acondicionado Split', tipo: 'Preventivo', periodo: 'Mensual', fecha: '2026-08-13', horaInicio: '08:15', horaFin: '10:30', tecnico: 'Pablo García', empresa: 'Servicios Técnicos de Mantenimiento (Pablo J. Gaitán)', descripcion: 'Limpieza de evaporadora y condensadora, limpieza de drenaje, revisión de sistema eléctrico y mecánico, limpieza de bomba de condensado y pruebas de funcionamiento.', repuestos: 'Ninguno', estadoFinal: 'operativo', ordenCompra: '198' },
  { id: 1013297, equipoId: 2, equipo: '0051AA12 — Aire Acondicionado Split', tipo: 'Correctivo', periodo: 'Garantía', fecha: '2026-08-12', horaInicio: '09:00', horaFin: '13:20', tecnico: 'Julio Méndez', empresa: 'Frío Industrial S.A.', descripcion: 'Diagnóstico de falla de compresor. Se requiere repuesto. Equipo fuera de servicio.', repuestos: 'Compresor (pendiente)', estadoFinal: 'fuera_de_servicio', ordenCompra: '201' },
  { id: 1013298, equipoId: 4, equipo: '0072DE56 — Aire Acondicionado de Ventana', tipo: 'Preventivo', periodo: 'Cuatrimestral', fecha: '2026-08-11', horaInicio: '11:00', horaFin: '12:10', tecnico: 'Pablo García', empresa: 'Interno IGSS', descripcion: 'Limpieza general de filtros y revisión de gas refrigerante.', repuestos: 'Filtro de aire', estadoFinal: 'operativo', ordenCompra: '—' },
  { id: 1013299, equipoId: 3, equipo: '0067BC34 — Cámara de Refrigeración de Vacunas', tipo: 'Evaluación interna', periodo: 'Mensual', fecha: '2026-08-08', horaInicio: '14:00', horaFin: '14:45', tecnico: 'Rosa López', empresa: 'Interno IGSS', descripcion: 'Verificación de temperatura de cadena de frío y registro de termómetro.', repuestos: 'Ninguno', estadoFinal: 'operativo', ordenCompra: '—' },
  { id: 1013300, equipoId: 6, equipo: '0091HI90 — Planta Eléctrica de Emergencia', tipo: 'Preventivo', periodo: 'Mensual', fecha: '2026-08-05', horaInicio: '07:30', horaFin: '09:00', tecnico: 'Julio Méndez', empresa: 'Interno IGSS', descripcion: 'Cambio de aceite, prueba de arranque automático y revisión de nivel de combustible.', repuestos: 'Aceite 15W40, filtro', estadoFinal: 'operativo', ordenCompra: '190' },
  { id: 1013301, equipoId: 8, equipo: '0113LM22 — Refrigeradora de Laboratorio', tipo: 'Llamada de emergencia', periodo: 'Garantía', fecha: '2026-08-04', horaInicio: '10:10', horaFin: '15:40', tecnico: 'Pablo García', empresa: 'Frío Industrial S.A.', descripcion: 'Equipo no enfría. Diagnóstico: fuga de refrigerante. Fuera de servicio hasta reparación.', repuestos: 'Gas R134a (pendiente)', estadoFinal: 'fuera_de_servicio', ordenCompra: '205' },
  { id: 1013302, equipoId: 10, equipo: '0135PQ44 — Aire Acondicionado Split', tipo: 'Correctivo', periodo: 'Cuatrimestral', fecha: '2026-07-30', horaInicio: '08:00', horaFin: '10:15', tecnico: 'Pablo García', empresa: 'Interno IGSS', descripcion: 'Reemplazo de capacitor y ajuste de control de temperatura.', repuestos: 'Capacitor 45uF', estadoFinal: 'operativo', ordenCompra: '187' },
  { id: 1013303, equipoId: 1, equipo: '0048CF89 — Aire Acondicionado Split', tipo: 'Correctivo', periodo: 'Mensual', fecha: '2026-07-15', horaInicio: '13:00', horaFin: '15:30', tecnico: 'Julio Méndez', empresa: 'Servicios Técnicos de Mantenimiento (Pablo J. Gaitán)', descripcion: 'Recarga de gas refrigerante y ajuste de termostato.', repuestos: 'Gas R410a', estadoFinal: 'operativo', ordenCompra: '176' },
  { id: 1013304, equipoId: 7, equipo: '0102JK11 — Aire Acondicionado Split', tipo: 'Preventivo', periodo: 'Cuatrimestral', fecha: '2026-07-10', horaInicio: '09:20', horaFin: '10:20', tecnico: 'Pablo García', empresa: 'Interno IGSS', descripcion: 'Limpieza de filtros y evaporadora.', repuestos: 'Ninguno', estadoFinal: 'operativo', ordenCompra: '—' },
];

// ---------- Indicadores del dashboard (RF08) ----------
// Calculados a partir de los datos simulados para mantener la coherencia interna.
const MES_ACTUAL = '2026-08';
const mantsMes = MANTENIMIENTOS.filter(m => m.fecha.startsWith(MES_ACTUAL));

// MTTR: promedio de (horaFin - horaInicio) de los mantenimientos correctivos
// y llamadas de emergencia del mes (RF08 / guía 4.8).
function horasEntre(hi, hf) {
  const [ah, am] = hi.split(':').map(Number);
  const [bh, bm] = hf.split(':').map(Number);
  return (bh * 60 + bm - (ah * 60 + am)) / 60;
}
const correctivos = mantsMes.filter(m => m.tipo === 'Correctivo' || m.tipo === 'Llamada de emergencia');
const mttr = correctivos.length
  ? correctivos.reduce((a, m) => a + horasEntre(m.horaInicio, m.horaFin), 0) / correctivos.length
  : 0;

export const KPIS = {
  equiposRegistrados: EQUIPOS.length,
  equiposFuera: EQUIPOS.filter(e => e.estado === 'fuera_de_servicio').length,
  mantenimientosMes: mantsMes.length,
  mttrHoras: Math.round(mttr * 10) / 10,
};

// Distribución de mantenimientos por tipo (mes en curso), calculada de los datos.
const COLOR_TIPO = {
  'Preventivo': 'var(--ceibal-azul-600)',
  'Correctivo': 'var(--estado-mantenimiento)',
  'Llamada de emergencia': 'var(--estado-fuera)',
  'Evaluación interna': 'var(--estado-funcionando)',
};
export const DISTRIBUCION_TIPO = TIPOS_MANTENIMIENTO.map(t => ({
  tipo: t,
  cantidad: mantsMes.filter(m => m.tipo === t).length,
  color: COLOR_TIPO[t],
}));

// ---------- Menú por rol (5.3.3 — visibilidad según rol) ----------
export const MODULOS = [
  { key: 'dashboard',  ruta: '/app/panel',        label: 'Panel de indicadores', icon: 'bi-speedometer2', roles: ['Administrador', 'Supervisor'] },
  { key: 'registro',   ruta: '/app/registro',     label: 'Registro de mantenimiento', icon: 'bi-clipboard-plus', roles: ['Administrador', 'Supervisor', 'Técnico'] },
  { key: 'equipos',    ruta: '/app/equipos',      label: 'Equipos', icon: 'bi-hdd-stack', roles: ['Administrador', 'Supervisor', 'Técnico'] },
  { key: 'historial',  ruta: '/app/historial',    label: 'Historial', icon: 'bi-clock-history', roles: ['Administrador', 'Supervisor', 'Técnico'] },
  { key: 'reportes',   ruta: '/app/reportes',     label: 'Reportes', icon: 'bi-file-earmark-bar-graph', roles: ['Administrador', 'Supervisor'] },
  { key: 'admin',      ruta: '/app/administracion', label: 'Administración', icon: 'bi-gear', roles: ['Administrador'] },
];
