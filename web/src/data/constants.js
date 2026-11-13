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
  { key: 'costos',     ruta: '/app/costos',         label: 'Costos de mantenimiento',   icon: 'bi-cash-coin',              roles: ['administrador'] },
  { key: 'admin',      ruta: '/app/administracion', label: 'Administración',            icon: 'bi-gear',                   roles: ['administrador'] },
];

// Pantalla inicial tras iniciar sesión, según el rol: quienes tienen panel de
// indicadores abren ahí; el técnico abre directo en el registro de
// mantenimiento (su tarea habitual). Cualquier otro caso cae en Equipos.
const INICIO_POR_ROL = {
  administrador: '/app/panel',
  supervisor: '/app/panel',
  auditor: '/app/panel',
  tecnico: '/app/registro',
};
export const rutaInicio = (rol) => INICIO_POR_ROL[rol] || '/app/equipos';

// Horario incoherente: la hora de salida ("HH:MM") debe ser posterior a la de
// entrada. Misma regla que valida el backend (mantenimientos.service.ts).
// Con alguna hora vacía devuelve false: eso lo cubre la validación de obligatorios.
export const horarioInvalido = (horaInicio, horaFin) =>
  !!horaInicio && !!horaFin && horaFin <= horaInicio;
export const MSG_HORARIO = 'La hora de salida debe ser posterior a la hora de entrada.';

// ---------- Reportes: contenido configurable (RF07) ----------
// Columnas del detalle y gráficas que el usuario puede marcar o desmarcar.
// DUPLICADO de `api/src/reportes/columnas.util.ts`: mismas claves, mismo orden
// y mismas columnas por defecto, para que pantalla, PDF y Excel coincidan.
// `porDefecto` = columnas que el reporte ya mostraba antes de ser configurable.
export const COLUMNAS_REPORTE = [
  { clave: 'fecha',       label: 'Fecha',                     porDefecto: true },
  { clave: 'equipo',      label: 'Equipo',                    porDefecto: true },
  { clave: 'serie',       label: 'Serie',                     porDefecto: false },
  { clave: 'marca',       label: 'Marca',                     porDefecto: false },
  { clave: 'ubicacion',   label: 'Ubicación',                 porDefecto: true },
  { clave: 'tipo',        label: 'Tipo',                      porDefecto: true },
  { clave: 'periodo',     label: 'Periodo',                   porDefecto: false },
  { clave: 'tecnico',     label: 'Técnico',                   porDefecto: true },
  { clave: 'empresa',     label: 'Empresa',                   porDefecto: true },
  { clave: 'horaInicio',  label: 'Entrada',                   porDefecto: false },
  { clave: 'horaFin',     label: 'Salida',                    porDefecto: false },
  { clave: 'duracion',    label: 'Duración (min)',            porDefecto: false },
  { clave: 'descripcion', label: 'Descripción del trabajo',   porDefecto: false },
  { clave: 'repuestos',   label: 'Repuestos / observaciones', porDefecto: false },
  { clave: 'costo',       label: 'Costo',                     porDefecto: true },
  { clave: 'estado',      label: 'Estado final',              porDefecto: true },
];
export const COLUMNAS_REPORTE_DEFECTO = COLUMNAS_REPORTE.filter((c) => c.porDefecto).map((c) => c.clave);

export const GRAFICAS_REPORTE = [
  { clave: 'costo',        label: 'Costo por día' },
  { clave: 'emergencias',  label: 'Llamadas de emergencia por día' },
  { clave: 'reparaciones', label: 'Reparaciones por día' },
];

// Recuadros del «Resumen del período» (mismas claves que el backend).
export const RESUMEN_REPORTE = [
  { clave: 'total',      label: 'Mantenimientos' },
  { clave: 'equipos',    label: 'Equipos atendidos' },
  { clave: 'fuera',      label: 'Fuera de servicio' },
  { clave: 'mttr',       label: 'MTTR' },
  { clave: 'preventivo', label: 'Tiempo de preventivo' },
  { clave: 'costo',      label: 'Costo total' },
];

// Contenido PERTINENTE según el filtro de tipo de trabajo: al filtrar un tipo,
// se desmarca lo que no puede tener datos (p. ej. una llamada de emergencia no
// lleva precio ni es un preventivo). El usuario puede volver a marcarlo.
// DUPLICADO de PERTINENCIA en `api/src/reportes/columnas.util.ts`.
const PERTINENCIA_REPORTE = {
  preventivo:         { graficas: ['costo'],                 resumen: ['total', 'equipos', 'fuera', 'preventivo', 'costo'] },
  correctivo:         { graficas: ['costo', 'reparaciones'], resumen: ['total', 'equipos', 'fuera', 'mttr', 'costo'] },
  llamada_emergencia: { graficas: ['emergencias'],           resumen: ['total', 'equipos', 'fuera', 'mttr'] },
  evaluacion_interna: { graficas: [],                        resumen: ['total', 'equipos', 'fuera'] },
};
export const contenidoPertinente = (tipoTrabajo) => {
  const p = PERTINENCIA_REPORTE[tipoTrabajo];
  return {
    graficas: p ? [...p.graficas] : GRAFICAS_REPORTE.map((g) => g.clave),
    resumen: p ? [...p.resumen] : RESUMEN_REPORTE.map((r) => r.clave),
    // La columna Costo solo aporta si el tipo puede llevar precio.
    costo: !tipoTrabajo || tipoTrabajo === 'preventivo' || tipoTrabajo === 'correctivo',
  };
};

export const PERIODO_LABEL = Object.fromEntries(PERIODOS.map((p) => [p.value, p.label]));

// ---------- Costos: categorías y periodicidades (deben coincidir con el backend) ----------
export const CATEGORIAS_MANTENIMIENTO = [
  { valor: 'mensual_ac',       label: 'Equipos mensuales A/C' },
  { valor: 'cuatrimestral_ac', label: 'Equipos cuatrimestrales A/C' },
  { valor: 'refrigeracion',    label: 'Refrigeradores / congeladores' },
];
export const CATEGORIA_LABEL = Object.fromEntries(
  CATEGORIAS_MANTENIMIENTO.map((c) => [c.valor, c.label]),
);
// Etiqueta corta (para tablas y chips).
export const CATEGORIA_CORTA = {
  mensual_ac: 'Mensual A/C',
  cuatrimestral_ac: 'Cuatrimestral A/C',
  refrigeracion: 'Refrigeración',
};

// Periodicidad → número de períodos (visitas) por defecto. Editable/extensible.
export const PERIODICIDADES = [
  { valor: 'Mensual',       periodos: 1 },
  { valor: 'Trimestral',    periodos: 3 },
  { valor: 'Cuatrimestral', periodos: 4 },
];

// ---------- Combinar listas fijas con valores creados en el catálogo ----------
// Las categorías y periodicidades son extensibles desde el módulo de Costos:
// los nuevos valores se guardan en el catálogo y se reutilizan en Costos y Equipos.

// Etiqueta de una categoría: usa la fija si existe; si no, el valor tal cual.
export const categoriaLabel = (valor) => CATEGORIA_LABEL[valor] || valor || '';
// Etiqueta corta de una categoría (para tablas/chips).
export const categoriaCorta = (valor) => CATEGORIA_CORTA[valor] || valor || '';

// Une las categorías fijas con las del catálogo (sin duplicar), conservando etiqueta.
export const combinarCategorias = (catalogo = []) => {
  const lista = CATEGORIAS_MANTENIMIENTO.map((c) => ({ valor: c.valor, label: c.label }));
  const vistos = new Set(lista.map((c) => c.valor));
  for (const item of catalogo || []) {
    const valor = (item?.valor || '').trim();
    if (valor && !vistos.has(valor)) {
      vistos.add(valor);
      lista.push({ valor, label: valor });
    }
  }
  return lista;
};

// Une las periodicidades fijas con las del catálogo (sin duplicar).
export const combinarPeriodicidades = (catalogo = []) => {
  const lista = PERIODICIDADES.map((p) => ({ valor: p.valor, periodos: p.periodos }));
  const vistos = new Set(lista.map((p) => p.valor));
  for (const item of catalogo || []) {
    const valor = (item?.valor || '').trim();
    if (valor && !vistos.has(valor)) {
      vistos.add(valor);
      lista.push({ valor, periodos: null });
    }
  }
  return lista;
};

// Formato monetario en quetzales (GTQ).
export const fmtQ = (n) =>
  new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ', minimumFractionDigits: 2 })
    .format(Number(n) || 0);

// ---------- Regla de precio del mantenimiento (debe coincidir con el backend) ----------
// Preventivo -> automático (config. de costos); Correctivo -> manual (lo ingresa
// el usuario); Emergencia / Evaluación interna / periodo "garantía" -> sin precio.
export const modoPrecio = (tipoTrabajo, periodo) => {
  if (periodo === 'garantia') return 'ninguno';
  if (tipoTrabajo === 'preventivo') return 'automatico';
  if (tipoTrabajo === 'correctivo') return 'manual';
  return 'ninguno';
};
// ¿Corresponde mostrar/almacenar un precio para este mantenimiento?
export const precioAplica = (tipoTrabajo, periodo) =>
  modoPrecio(tipoTrabajo, periodo) !== 'ninguno';

export const hoyISO = () => new Date().toISOString().slice(0, 10);

// ---------- Ayudas para los desplegables de equipos ----------
export const esEquipoBaja = (e) => e?.estado === 'BAJA';

// Etiqueta del equipo en los desplegables: agrega "(Dado de baja)" si aplica.
export const etiquetaEquipo = (e) =>
  `${e.codigoInventario} — ${e.nombre}${esEquipoBaja(e) ? '  (Dado de baja)' : ''}`;

// Ordena: primero los equipos en alta, y los dados de baja al final.
export const ordenarEquipos = (lista) =>
  [...(lista || [])].sort((a, b) => (esEquipoBaja(a) ? 1 : 0) - (esEquipoBaja(b) ? 1 : 0));
