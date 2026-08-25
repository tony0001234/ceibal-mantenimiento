// =====================================================================
// Constantes de interfaz. Los valores fijos (estados, criticidades, marcas,
// subtipos, tipos) coinciden EXACTAMENTE con los validadores de MongoDB.
// Las ubicaciones son texto libre y se cargan desde la API (catálogos).
// =====================================================================

// ---------- Estados del equipo (validador "equipo": ACTIVO/INACTIVO/MANTENIMIENTO/BAJA)
// El mapa incluye alias para el estado resultante del mantenimiento
// (funcionando/fuera_de_servicio) que usan las tablas de bitácora.
export const ESTADOS = {
  ACTIVO:            { label: 'Funcionando',       cls: 'estado-funcionando' },
  MANTENIMIENTO:     { label: 'En mantenimiento',  cls: 'estado-mantenimiento' },
  INACTIVO:          { label: 'Fuera de servicio', cls: 'estado-fuera' },
  BAJA:              { label: 'Dado de baja',      cls: 'estado-baja' },
  funcionando:       { label: 'Funcionando',       cls: 'estado-funcionando' },
  fuera_de_servicio: { label: 'Fuera de servicio', cls: 'estado-fuera' },
};

// Opciones (valor de BD : etiqueta) para filtros y formularios de equipo.
export const ESTADOS_EQUIPO = [
  { value: 'ACTIVO',        label: 'Funcionando' },
  { value: 'MANTENIMIENTO', label: 'En mantenimiento' },
  { value: 'INACTIVO',      label: 'Fuera de servicio' },
  { value: 'BAJA',          label: 'Dado de baja' },
];

export const CRITICIDADES = [
  { value: 'BAJA',    label: 'Baja' },
  { value: 'MEDIA',   label: 'Media' },
  { value: 'ALTA',    label: 'Alta' },
  { value: 'CRITICA', label: 'Crítica' },
];

// Enums fijos del validador de "equipo".
export const TIPOS_EQUIPO = ['Refrigeración'];
export const SUBTIPOS = ['Split', 'Mini-split', 'Cassette', 'Ventana', 'Paquete'];
export const MARCAS = [
  'Rheem', 'Tempstar', 'York', 'Comfortstar', 'Lennox', 'Adina',
  'Mcquay Daikin', 'Fedders', 'Aireone', 'Primiumcool', 'S/M',
  'Pretul', 'Premium', 'Innovair', 'Everwell',
];

// ---------- Tipo de trabajo (RF03) — valor de API : etiqueta ----------
export const TIPOS_MANTENIMIENTO = [
  { value: 'preventivo',         label: 'Preventivo' },
  { value: 'correctivo',         label: 'Correctivo' },
  { value: 'llamada_emergencia', label: 'Llamada de emergencia' },
  { value: 'evaluacion_interna', label: 'Evaluación interna' },
];
export const TIPO_MANT_LABEL = Object.fromEntries(
  TIPOS_MANTENIMIENTO.map((t) => [t.value, t.label]),
);

export const PERIODOS = [
  { value: 'mensual',       label: 'Mensual' },
  { value: 'cuatrimestral', label: 'Cuatrimestral' },
  { value: 'garantia',      label: 'Garantía' },
];

export const ESTADOS_RESULTANTE = [
  { value: 'funcionando',       label: 'Funcionando' },
  { value: 'fuera_de_servicio', label: 'Fuera de servicio' },
];

// ---------- Roles (RF01 + validador "usuario", incluye auditor) ----------
export const ROL_LABEL = {
  administrador: 'Administrador',
  supervisor: 'Supervisor',
  tecnico: 'Técnico',
  auditor: 'Auditor',
};
export const ROLES = Object.keys(ROL_LABEL);

// ---------- Menú por rol (5.3.3). Auditor: solo lectura. ----------
export const MODULOS = [
  { key: 'dashboard',  ruta: '/app/panel',          label: 'Panel de indicadores',      icon: 'bi-speedometer2',           roles: ['administrador', 'supervisor', 'auditor'] },
  { key: 'registro',   ruta: '/app/registro',       label: 'Registro de mantenimiento', icon: 'bi-clipboard-plus',         roles: ['administrador', 'supervisor', 'tecnico'] },
  { key: 'equipos',    ruta: '/app/equipos',        label: 'Equipos',                   icon: 'bi-hdd-stack',              roles: ['administrador', 'supervisor', 'tecnico', 'auditor'] },
  { key: 'historial',  ruta: '/app/historial',      label: 'Historial',                 icon: 'bi-clock-history',          roles: ['administrador', 'supervisor', 'tecnico', 'auditor'] },
  { key: 'reportes',   ruta: '/app/reportes',       label: 'Reportes',                  icon: 'bi-file-earmark-bar-graph', roles: ['administrador', 'supervisor', 'auditor'] },
  { key: 'admin',      ruta: '/app/administracion', label: 'Administración',            icon: 'bi-gear',                   roles: ['administrador'] },
];

export const hoyISO = () => new Date().toISOString().slice(0, 10);

// ---------- Ayudas para los desplegables de equipos ----------
export const esEquipoBaja = (e) => e?.estado === 'BAJA';

// Etiqueta del equipo en los desplegables: agrega "(Dado de baja)" si aplica.
export const etiquetaEquipo = (e) =>
  `${e.codigoInventario} — ${e.nombre}${esEquipoBaja(e) ? '  (Dado de baja)' : ''}`;

// Ordena: primero los equipos en alta, y los dados de baja al final.
export const ordenarEquipos = (lista) =>
  [...(lista || [])].sort((a, b) => (esEquipoBaja(a) ? 1 : 0) - (esEquipoBaja(b) ? 1 : 0));
