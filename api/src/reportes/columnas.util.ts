// Contenido configurable del reporte de mantenimientos (RF07): qué columnas
// lleva el detalle y qué gráficas se incluyen. Es la ÚNICA fuente para el PDF y
// el Excel; la pantalla tiene un duplicado en `web/src/data/constants.js`
// (COLUMNAS_REPORTE / GRAFICAS_REPORTE) que debe mantenerse sincronizado para
// que las tres salidas coincidan.

export interface ColumnaReporte {
  clave: string;
  label: string;
  // Ancho base en puntos para el PDF (se reescala al ancho útil de la página).
  ancho: number;
  // Ancho de la columna en Excel (caracteres).
  anchoExcel: number;
  align: 'left' | 'right';
  // true = columna que el reporte ya mostraba antes de ser configurable.
  porDefecto: boolean;
  // Solo en datos cortos (fecha, horas, importes): ancho mínimo en el PDF.
  // Cuando hay muchas columnas no se comprimen por debajo de este valor, para
  // que el dato no se parta en dos líneas; el espacio lo ceden las de texto.
  anchoMin?: number;
}

// El orden de esta lista es el orden de las columnas en el reporte.
export const COLUMNAS_REPORTE: ColumnaReporte[] = [
  { clave: 'fecha', label: 'Fecha', ancho: 60, anchoExcel: 12, align: 'left', porDefecto: true, anchoMin: 54 },
  { clave: 'equipo', label: 'Equipo', ancho: 100, anchoExcel: 34, align: 'left', porDefecto: true },
  { clave: 'serie', label: 'Serie', ancho: 58, anchoExcel: 18, align: 'left', porDefecto: false },
  { clave: 'marca', label: 'Marca', ancho: 50, anchoExcel: 16, align: 'left', porDefecto: false },
  { clave: 'ubicacion', label: 'Ubicación', ancho: 70, anchoExcel: 24, align: 'left', porDefecto: true },
  { clave: 'tipo', label: 'Tipo', ancho: 68, anchoExcel: 20, align: 'left', porDefecto: true },
  { clave: 'periodo', label: 'Periodo', ancho: 56, anchoExcel: 14, align: 'left', porDefecto: false },
  { clave: 'tecnico', label: 'Técnico', ancho: 60, anchoExcel: 22, align: 'left', porDefecto: true },
  { clave: 'empresa', label: 'Empresa', ancho: 60, anchoExcel: 26, align: 'left', porDefecto: true },
  { clave: 'horaInicio', label: 'Entrada', ancho: 46, anchoExcel: 10, align: 'left', porDefecto: false, anchoMin: 42 },
  { clave: 'horaFin', label: 'Salida', ancho: 46, anchoExcel: 10, align: 'left', porDefecto: false, anchoMin: 40 },
  { clave: 'duracion', label: 'Duración (min)', ancho: 58, anchoExcel: 15, align: 'right', porDefecto: false, anchoMin: 50 },
  { clave: 'descripcion', label: 'Descripción del trabajo', ancho: 150, anchoExcel: 50, align: 'left', porDefecto: false },
  { clave: 'repuestos', label: 'Repuestos / observaciones', ancho: 110, anchoExcel: 36, align: 'left', porDefecto: false },
  { clave: 'costo', label: 'Costo (Q)', ancho: 52, anchoExcel: 14, align: 'right', porDefecto: true, anchoMin: 52 },
  { clave: 'estado', label: 'Estado final', ancho: 65, anchoExcel: 16, align: 'left', porDefecto: true, anchoMin: 64 },
];

export const COLUMNAS_POR_DEFECTO = COLUMNAS_REPORTE.filter(
  (c) => c.porDefecto,
).map((c) => c.clave);

export const GRAFICAS_REPORTE = ['costo', 'emergencias', 'reparaciones'] as const;
export type ClaveGrafica = (typeof GRAFICAS_REPORTE)[number];

const separar = (param: string): string[] =>
  String(param)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

// Columnas a incluir, a partir del parámetro `columnas` ("fecha,equipo,…").
// - Sin parámetro: las columnas por defecto (el reporte de siempre).
// - Se ignoran las claves desconocidas y el orden es siempre el del catálogo.
// - Si no queda ninguna válida, se usan las de por defecto: un reporte sin
//   columnas no tiene sentido.
export function resolverColumnas(param?: string): ColumnaReporte[] {
  if (param === undefined || param === null) {
    return COLUMNAS_REPORTE.filter((c) => c.porDefecto);
  }
  const pedidas = new Set(separar(param));
  const elegidas = COLUMNAS_REPORTE.filter((c) => pedidas.has(c.clave));
  return elegidas.length
    ? elegidas
    : COLUMNAS_REPORTE.filter((c) => c.porDefecto);
}

// Recuadros del «Resumen del período».
export const RESUMEN_REPORTE = [
  'total',
  'equipos',
  'fuera',
  'mttr',
  'preventivo',
  'costo',
] as const;
export type ClaveResumen = (typeof RESUMEN_REPORTE)[number];

// Contenido PERTINENTE según el filtro de tipo de trabajo. Con un tipo
// filtrado, lo que no puede tener datos se omite: p. ej. al filtrar llamadas
// de emergencia no hay costo (no llevan precio), ni tiempo de preventivo, ni
// reparaciones. Sin filtro de tipo, todo es pertinente.
// DUPLICADO en `web/src/data/constants.js` (PERTINENCIA_REPORTE).
const PERTINENCIA: Record<
  string,
  { graficas: ClaveGrafica[]; resumen: ClaveResumen[] }
> = {
  preventivo: {
    graficas: ['costo'],
    resumen: ['total', 'equipos', 'fuera', 'preventivo', 'costo'],
  },
  correctivo: {
    graficas: ['costo', 'reparaciones'],
    resumen: ['total', 'equipos', 'fuera', 'mttr', 'costo'],
  },
  llamada_emergencia: {
    graficas: ['emergencias'],
    resumen: ['total', 'equipos', 'fuera', 'mttr'],
  },
  evaluacion_interna: {
    graficas: [],
    resumen: ['total', 'equipos', 'fuera'],
  },
};

export function graficasPertinentes(tipoTrabajo?: string): ClaveGrafica[] {
  const p = tipoTrabajo ? PERTINENCIA[tipoTrabajo] : undefined;
  return p ? [...p.graficas] : [...GRAFICAS_REPORTE];
}

export function resumenPertinente(tipoTrabajo?: string): ClaveResumen[] {
  const p = tipoTrabajo ? PERTINENCIA[tipoTrabajo] : undefined;
  return p ? [...p.resumen] : [...RESUMEN_REPORTE];
}

// Gráficas a incluir, a partir del parámetro `graficas` ("costo,emergencias").
// - Sin parámetro: las pertinentes al tipo de trabajo filtrado (sin filtro de
//   tipo, las tres: el reporte de siempre).
// - Con parámetro manda la selección del usuario, aunque no sea la pertinente.
// - Parámetro vacío o sin claves válidas: ninguna (el usuario las desmarcó).
export function resolverGraficas(
  param?: string,
  tipoTrabajo?: string,
): ClaveGrafica[] {
  if (param === undefined || param === null) {
    return graficasPertinentes(tipoTrabajo);
  }
  const pedidas = new Set(separar(param));
  return GRAFICAS_REPORTE.filter((g) => pedidas.has(g));
}

// Recuadros del resumen a incluir, a partir del parámetro `resumen`.
// Mismas reglas que las gráficas.
export function resolverResumen(
  param?: string,
  tipoTrabajo?: string,
): ClaveResumen[] {
  if (param === undefined || param === null) {
    return resumenPertinente(tipoTrabajo);
  }
  const pedidas = new Set(separar(param));
  return RESUMEN_REPORTE.filter((r) => pedidas.has(r));
}
