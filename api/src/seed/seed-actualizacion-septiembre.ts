/**
 * Seed de ACTUALIZACIÓN — Septiembre 2026.
 * ---------------------------------------------------------------------------
 * Aplica los listados actualizados de mantenimiento (documentos SIAF):
 *   - 7866  aires acondicionados, mantenimiento mensual
 *   - 7867  aires acondicionados, mantenimiento cuatrimestral
 *   - 7887  refrigeradoras y congeladores
 *
 * Qué hace (todo idempotente, por upsert de `codigoInventario`):
 *   1. Reutiliza las transcripciones ya verificadas (seed-listados-equipos) y
 *      AGREGA los equipos nuevos de septiembre: 720499 y 720679.
 *   2. Actualiza los datos trazables del documento (nombre, subtipo, marca,
 *      serie, ubicación) SIN tocar `estado` ni `criticidad`.
 *   3. NORMALIZA en TODA la colección los servicios (ubicación) y las marcas,
 *      de modo que quede UN solo valor por servicio/marca (p.ej. "Emergencia",
 *      nunca "Emergencia" + "EMERGENCIA").
 *   4. DEDUPLICA los catálogos (ubicacion, marca, subTipo, tipoEquipo).
 *
 * Además (actualización de estado y costos):
 *   - Asigna a cada equipo su CATEGORÍA de contrato (mensual_ac / cuatrimestral_ac
 *     / refrigeracion) para el cálculo de costos.
 *   - Da de BAJA (baja lógica, estado='BAJA') los equipos que NO están en los
 *     listados de septiembre (incluidos 653244, 405655, 422551, 435697, 435698).
 *   - Siembra la configuración de costo del ejemplo cuatrimestral (Q88,800).
 *
 * Lo que NO hace (seguridad de datos):
 *   - NO borra la colección de mantenimientos: los registros ya cargados por
 *     los técnicos se conservan (los mantenimientos referencian al equipo por
 *     su _id; actualizar campos del equipo no los afecta).
 *   - NO borra físicamente equipos: los dados de baja conservan su historial.
 *
 * Ejecutar:
 *   npm run seed:septiembre            # aplica
 *   npm run seed:septiembre -- --dry   # solo muestra lo que haría
 */
import mongoose from 'mongoose';

import { EquipoSchema } from '../equipos/schemas/equipo.schema';
import { CatalogoSchema } from '../catalogos/schemas/catalogo.schema';
import { ConfiguracionCostoSchema } from '../costos/schemas/configuracion-costo.schema';

// Mapea la "fuente" del listado a la categoría de contrato (para costos).
const CATEGORIA_POR_FUENTE: Record<string, string> = {
  mensual: 'mensual_ac',
  cuatrimestral: 'cuatrimestral_ac',
  refrigeracion: 'refrigeracion',
};
import {
  cargarEnv,
  limpiar,
  normalizarMarca,
  construir,
  TIPO_AIRE,
  TIPO_REFRI,
  UBIC_DEFECTO,
  MENSUALES,
  CUATRIS,
  REFRIS,
  Fila,
} from './seed-listados-equipos';

// ---------------------------------------------------------------------------
// Equipos NUEVOS de septiembre (listado mensual 7866, filas 44 y 45).
// ---------------------------------------------------------------------------
const NUEVOS_MENSUALES: Fila[] = [
  ['720499', 'AIRE ACONDICIONADO MODELO MANEJADORA AGO T-AHU3613 SERIE: 81003832012402220006 ATI-T-CON3618FR', 'ADINA', '1656CWQ300ZQ31100001', 'CENTRAL DE EQUIPOS'],
  ['720679', 'AIRE ACONDICIONADO MANEJADORA MODELO AGO T-AAHU613 SERIE: 81003832012402220025 ATI T-CON3618FR', 'ADINA', '165A5WQ300ZQ31100002', 'RADIOLOGIA'],
];

// Equipos que salieron del listado de septiembre (se conservan, no se borran).
const RETIRADOS_DEL_LISTADO = ['653244', '405655', '422551', '435697', '435698'];

// ---------------------------------------------------------------------------
// Normalización de SERVICIO (ubicación) a un único valor canónico.
// Regla: Title Case en español (conectores en minúscula), con acrónimos y
// códigos alfanuméricos (B2, A1, UTI, MCH, COEX, II) en mayúscula. Determinista,
// de modo que "EMERGENCIA" y "Emergencia" colapsen al mismo valor "Emergencia".
// ---------------------------------------------------------------------------
const MINOR = new Set(['de', 'del', 'la', 'las', 'los', 'y', 'e', 'en', 'con', 'por', 'a', 'o', 'al', 'para']);
const UPPER_TOK = new Set(['COEX', 'UTI', 'MCH', 'IGSS', 'II', 'III', 'IV', 'V']);

function titleWord(w: string): string {
  const lower = w.toLowerCase();
  const idx = lower.search(/[a-záéíóúñ]/i);
  if (idx === -1) return w;
  return lower.slice(0, idx) + lower[idx].toUpperCase() + lower.slice(idx + 1);
}
function tokenServicio(w: string, i: number): string {
  if (/\d/.test(w)) return w.toUpperCase(); // códigos: B2, A1, No.22, UTI 2...
  const bare = w.replace(/[()./]/g, '').toUpperCase();
  if (UPPER_TOK.has(bare)) return w.toUpperCase();
  const low = w.toLowerCase();
  if (i > 0 && MINOR.has(low)) return low;
  return titleWord(w);
}
export function normalizarServicio(raw: string): string {
  const s = limpiar(raw);
  if (!s) return UBIC_DEFECTO;
  let out = s.split(' ').map(tokenServicio).join(' ');
  out = out.replace(/\bNO\.(\d)/g, 'No.$1'); // "NO.22" -> "No.22"
  return out;
}

// Clave de comparación (insensible a mayúsculas/acentos/espacios).
const clave = (s: string) =>
  limpiar(s).toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

async function main() {
  cargarEnv();
  const dry = process.argv.includes('--dry');
  const uri = process.env.MONGODB_URI;
  if (!uri || uri.includes('cluster.mongodb.net') || uri.includes('REEMPLAZA-HOST')) {
    console.error('\n[seed:septiembre] MONGODB_URI no configurado con un host real de Atlas. Edita api/.env.\n');
    process.exit(1);
  }

  // 1) Dataset de septiembre (transcripciones verificadas + nuevos), con
  //    servicio y marca ya normalizados.
  //    Solo los equipos que SÍ están en los listados de septiembre (se excluyen
  //    los retirados). Cada equipo lleva su categoría de contrato (para costos).
  const equipos = [
    ...construir([...MENSUALES, ...NUEVOS_MENSUALES], TIPO_AIRE, 'mensual'),
    ...construir(CUATRIS, TIPO_AIRE, 'cuatrimestral'),
    ...construir(REFRIS, TIPO_REFRI, 'refrigeracion'),
  ]
    .filter((e) => !RETIRADOS_DEL_LISTADO.includes(e.codigoInventario))
    .map((e) => ({
      ...e,
      ubicacion: normalizarServicio(e.ubicacion),
      marca: normalizarMarca(e.marca),
      categoria: CATEGORIA_POR_FUENTE[e.fuente] || '',
    }));
  const codigosSeptiembre = [...new Set(equipos.map((e) => e.codigoInventario))];

  console.log(`[seed:septiembre] Equipos vigentes en listados de septiembre: ${equipos.length}.`);
  console.log(`[seed:septiembre] Equipos nuevos: ${NUEVOS_MENSUALES.map((f) => f[0]).join(', ')}.`);
  console.log(`[seed:septiembre] Equipos que salieron del listado (pasarán a BAJA, conservan historial): ${RETIRADOS_DEL_LISTADO.join(', ')}.`);

  if (dry) {
    console.log('\n[seed:septiembre] MODO --dry: no se escribe nada.');
    const servicios = [...new Set(equipos.map((e) => e.ubicacion))].sort();
    const porCat: Record<string, number> = {};
    for (const e of equipos) porCat[e.categoria] = (porCat[e.categoria] || 0) + 1;
    console.log(`[seed:septiembre] Servicios normalizados: ${servicios.length}. Por categoría: ${JSON.stringify(porCat)}.`);
    process.exit(0);
  }

  await mongoose.connect(uri);
  console.log(`[seed:septiembre] Conectado a MongoDB (BD: ${mongoose.connection.name}).`);
  const Equipo = mongoose.model('Equipo', EquipoSchema);
  const Catalogo = mongoose.model('Catalogo', CatalogoSchema);

  // 2) Upsert de equipos por número de bien (no toca estado/criticidad ni mantenimientos).
  let insertados = 0, actualizados = 0;
  for (const e of equipos) {
    const r = await Equipo.updateOne(
      { codigoInventario: e.codigoInventario },
      {
        $set: {
          nombre: e.nombre,
          tipoEquipo: e.tipoEquipo,
          subTipo: e.subTipo,
          marca: e.marca,
          serie: e.serie,
          ubicacion: e.ubicacion,
          categoria: e.categoria,
        },
        $setOnInsert: { estado: 'ACTIVO', criticidad: 'MEDIA' },
      },
      { upsert: true, runValidators: true },
    );
    if (r.upsertedCount) insertados++;
    else if (r.matchedCount) actualizados++;
  }
  console.log(`[seed:septiembre] Equipos: ${insertados} insertado(s), ${actualizados} actualizado(s).`);

  // 2b) Dar de BAJA (baja lógica) los equipos que NO están en los listados de
  //     septiembre (req 1). No se borran: conservan su historial. Los que sí
  //     están conservan su estado actual (arriba no se toca estado en updates).
  const rBaja = await Equipo.updateMany(
    { codigoInventario: { $nin: codigosSeptiembre }, estado: { $ne: 'BAJA' } },
    { $set: { estado: 'BAJA' } },
  );
  console.log(`[seed:septiembre] Equipos dados de baja por no estar en los listados: ${rBaja.modifiedCount}.`);

  // 3) Normalización de TODA la colección (incluye equipos que ya estaban en la
  //    base con casing inconsistente por ediciones de los técnicos).
  const todos = await Equipo.find().exec();
  let normalizados = 0;
  for (const eq of todos) {
    const ubic = normalizarServicio((eq as any).ubicacion);
    const marca = normalizarMarca((eq as any).marca);
    if (ubic !== (eq as any).ubicacion || marca !== (eq as any).marca) {
      await Equipo.updateOne({ _id: eq._id }, { $set: { ubicacion: ubic, marca } });
      normalizados++;
    }
  }
  console.log(`[seed:septiembre] Equipos normalizados (servicio/marca): ${normalizados}.`);

  // 4) Deduplicación de catálogos: fusiona variantes que difieren solo en
  //    mayúsculas/acentos, dejando un único valor canónico por grupo.
  async function dedup(tipo: string, canonFn: (v: string) => string, conPadre = false) {
    const docs = await Catalogo.find({ tipo }).exec();
    const grupos = new Map<string, { canonical: string; keep: any; extras: any[] }>();
    for (const d of docs) {
      const canonical = canonFn((d as any).valor);
      const k = clave(canonical) + (conPadre ? '||' + ((d as any).padre ?? '') : '');
      if (!grupos.has(k)) grupos.set(k, { canonical, keep: d, extras: [] });
      else grupos.get(k)!.extras.push(d);
    }
    let fusionados = 0, renombrados = 0;
    for (const g of grupos.values()) {
      for (const ex of g.extras) { await Catalogo.deleteOne({ _id: ex._id }); fusionados++; }
      if ((g.keep as any).valor !== g.canonical) {
        await Catalogo.updateOne({ _id: g.keep._id }, { $set: { valor: g.canonical } });
        renombrados++;
      }
    }
    return { fusionados, renombrados };
  }
  const idem = (v: string) => limpiar(v);
  const rU = await dedup('ubicacion', normalizarServicio);
  const rM = await dedup('marca', normalizarMarca);
  const rT = await dedup('tipoEquipo', idem);
  const rS = await dedup('subTipo', idem, true);
  console.log(`[seed:septiembre] Catálogos deduplicados -> ubicacion: ${rU.fusionados} fusion., ${rU.renombrados} renom.; marca: ${rM.fusionados}/${rM.renombrados}; tipoEquipo: ${rT.fusionados}/${rT.renombrados}; subTipo: ${rS.fusionados}/${rS.renombrados}.`);

  // 5) Garantiza que cada servicio/marca canónico presente en equipos exista en el catálogo.
  const upsertCat = async (tipo: string, valor: string, padre: string | null) => {
    await Catalogo.updateOne(
      { tipo, valor, padre },
      { $setOnInsert: { tipo, valor, padre, activo: true } },
      { upsert: true },
    );
  };
  const finales = await Equipo.find().lean().exec();
  const ubicSet = new Set<string>(); const marcaSet = new Set<string>();
  for (const e of finales as any[]) { ubicSet.add(e.ubicacion); marcaSet.add(e.marca); }
  for (const u of ubicSet) await upsertCat('ubicacion', u, null);
  for (const m of marcaSet) await upsertCat('marca', m, null);
  console.log(`[seed:septiembre] Catálogo final -> servicios: ${ubicSet.size}, marcas: ${marcaSet.size}.`);

  // 6) Configuración de costo: siembra SOLO el ejemplo cuatrimestral con el
  //    monto proporcionado (Q88,800). Se usa la cantidad real de equipos
  //    cuatrimestrales vigentes. No sobrescribe una configuración ya creada por
  //    el administrador ($setOnInsert). Las categorías mensual y refrigeración
  //    las configura el administrador desde el módulo (montos no proporcionados).
  const ConfigCosto = mongoose.model('ConfiguracionCosto', ConfiguracionCostoSchema);
  const cantCuatri = await Equipo.countDocuments({
    categoria: 'cuatrimestral_ac',
    estado: { $ne: 'BAJA' },
  });
  if (cantCuatri > 0) {
    const monto = 88800;
    const periodos = 4;
    const costo = Math.round((monto / cantCuatri / periodos) * 100) / 100;
    const rc = await ConfigCosto.updateOne(
      { categoria: 'cuatrimestral_ac' },
      {
        $setOnInsert: {
          categoria: 'cuatrimestral_ac',
          montoOfertado: monto,
          cantidadEquipos: cantCuatri,
          periodicidad: 'Cuatrimestral',
          numeroPeriodos: periodos,
          costoCalculado: costo,
          activo: true,
        },
      },
      { upsert: true },
    );
    console.log(
      `[seed:septiembre] Config costo cuatrimestral_ac: ${rc.upsertedCount ? 'creada' : 'ya existía (sin cambios)'} (monto Q${monto} / ${cantCuatri} equipos / ${periodos} = Q${costo} por mantenimiento).`,
    );
  }

  await mongoose.disconnect();
  console.log('[seed:septiembre] Listo. (No se modificó ningún mantenimiento; no se borró físicamente ningún equipo.)');
  process.exit(0);
}

main().catch((err) => {
  console.error('[seed:septiembre] Error:', err.message);
  process.exit(1);
});
