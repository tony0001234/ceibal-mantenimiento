/**
 * Completa el costo de los mantenimientos PREVENTIVOS que se registraron sin
 * costo porque en ese momento no existia la configuracion de costos (modulo
 * agregado el 03/09/2026) o el equipo aun no tenia categoria/periodicidad.
 *
 *   npm run backfill:costos            # aplica los cambios
 *   npm run backfill:costos -- --dry   # solo muestra lo que haria, sin escribir
 *
 * Solo toca registros que NUNCA recibieron costo:
 *   - tipoTrabajo = preventivo y periodo distinto de «garantia» (regla de precio);
 *   - categoriaCosto vacia o inexistente;
 *   - costoMantenimiento 0 o inexistente.
 * A cada uno le asigna la categoria ACTUAL de su equipo y el costo vigente de
 * esa categoria (configuracion activa del modulo de Costos).
 *
 * NO modifica registros que ya tienen costo (se respeta el costo historico).
 * NO toca correctivos (su precio es manual y no se puede deducir).
 * Es idempotente: ejecutarlo dos veces no cambia nada la segunda vez.
 */
import * as fs from 'fs';
import * as path from 'path';
import mongoose from 'mongoose';

import { MantenimientoSchema } from '../mantenimientos/schemas/mantenimiento.schema';
import { EquipoSchema } from '../equipos/schemas/equipo.schema';
import { ConfiguracionCostoSchema } from '../costos/schemas/configuracion-costo.schema';

function cargarEnv() {
  const ruta = path.resolve(__dirname, '../../.env');
  if (!fs.existsSync(ruta)) return;
  for (const linea of fs.readFileSync(ruta, 'utf8').split('\n')) {
    const limpia = linea.trim();
    if (!limpia || limpia.startsWith('#')) continue;
    const i = limpia.indexOf('=');
    if (i === -1) continue;
    const clave = limpia.slice(0, i).trim();
    const valor = limpia.slice(i + 1).trim();
    if (!process.env[clave]) process.env[clave] = valor;
  }
}

async function main() {
  cargarEnv();
  const dry = process.argv.includes('--dry');
  const uri = process.env.MONGODB_URI;
  if (!uri || uri.includes('cluster.mongodb.net') || uri.includes('REEMPLAZA-HOST')) {
    console.error('\n[backfill-costos] MONGODB_URI no esta configurado con un host real de Atlas. Edita api/.env.\n');
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log(`[backfill-costos] Conectado a MongoDB (BD: ${mongoose.connection.name}).${dry ? '  MODO --dry (sin escribir)' : ''}`);

  const Mantenimiento = mongoose.model('Mantenimiento', MantenimientoSchema);
  const Equipo = mongoose.model('Equipo', EquipoSchema);
  const Config = mongoose.model('ConfiguracionCosto', ConfiguracionCostoSchema);

  const sinCosto: any[] = await Mantenimiento.find({
    tipoTrabajo: 'preventivo',
    periodo: { $ne: 'garantia' },
    $and: [
      { $or: [{ categoriaCosto: { $exists: false } }, { categoriaCosto: '' }, { categoriaCosto: null }] },
      { $or: [{ costoMantenimiento: { $exists: false } }, { costoMantenimiento: 0 }, { costoMantenimiento: null }] },
    ],
  }).lean();
  console.log(`[backfill-costos] Preventivos sin costo: ${sinCosto.length}`);

  const costoPorCategoria = new Map<string, number>();
  const costoDe = async (categoria: string): Promise<number> => {
    if (!costoPorCategoria.has(categoria)) {
      const cfg: any = await Config.findOne({ categoria, activo: true }).lean();
      costoPorCategoria.set(categoria, cfg ? Number(cfg.costoCalculado) || 0 : 0);
    }
    return costoPorCategoria.get(categoria)!;
  };

  const resumen: Record<string, { n: number; costo: number }> = {};
  let actualizados = 0;
  let omitidos = 0;
  for (const m of sinCosto) {
    const equipo: any = await Equipo.findById(m.equipo).lean();
    const categoria = equipo?.categoria || '';
    const costo = categoria ? await costoDe(categoria) : 0;
    if (!categoria || costo <= 0) {
      omitidos++;
      console.log(`[backfill-costos]   omitido ${String(m._id)} (equipo ${equipo?.codigoInventario ?? '?'}): ${!categoria ? 'el equipo no tiene periodicidad' : `sin configuracion de costo para «${categoria}»`}`);
      continue;
    }
    resumen[categoria] = resumen[categoria] || { n: 0, costo: 0 };
    resumen[categoria].n++;
    resumen[categoria].costo += costo;
    if (!dry) {
      await Mantenimiento.updateOne(
        { _id: m._id },
        { $set: { categoriaCosto: categoria, costoMantenimiento: costo } },
      );
    }
    actualizados++;
  }

  Object.entries(resumen).forEach(([cat, r]) =>
    console.log(`[backfill-costos]   ${cat}: ${r.n} registro(s), Q${r.costo.toFixed(2)} en total`),
  );
  console.log(`[backfill-costos] ${dry ? 'Se actualizarian' : 'Actualizados'}: ${actualizados}  ·  omitidos: ${omitidos}`);
  await mongoose.disconnect();
}

main().catch(async (e) => {
  console.error('[backfill-costos] Error:', e);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
