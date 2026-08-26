/**
 * Migracion de datos EXISTENTES (no destructiva).
 *
 *   npm run migrate            # aplica los cambios
 *   npm run migrate -- --dry   # solo muestra lo que haria, sin escribir
 *
 * Que hace (sobre datos que YA existen en la base):
 *   1. Garantiza que exista la empresa «Interno IGSS».
 *   2. Rellena el campo `empresa` de los usuarios que NO lo tengan:
 *        - supervisor / administrador / auditor  -> Interno IGSS  (correcto por regla)
 *        - tecnico                                -> Interno IGSS  (valor temporal seguro;
 *          debe reasignarse a su empresa real desde Administracion → Usuarios).
 *   3. Puebla los catalogos editables tipoEquipo / subTipo / marca a partir de
 *      los valores REALES que ya usan los equipos (no inventa valores).
 *
 * NO borra usuarios, empresas, equipos ni mantenimientos.
 * NO cambia _id de ningun documento.
 * NO toca `estado` ni `criticidad` (siguen siendo listas fijas).
 * Es idempotente: ejecutarlo dos veces no duplica nada.
 */
import * as fs from 'fs';
import * as path from 'path';
import mongoose from 'mongoose';

import { UsuarioSchema } from '../usuarios/schemas/usuario.schema';
import { EmpresaSchema } from '../empresas/schema/empresa.schema';
import { EquipoSchema } from '../equipos/schemas/equipo.schema';
import { CatalogoSchema } from '../catalogos/schemas/catalogo.schema';

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
    console.error('\n[migrate] MONGODB_URI no esta configurado con un host real de Atlas. Edita api/.env.\n');
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log(`[migrate] Conectado a MongoDB (BD: ${mongoose.connection.name}).${dry ? '  MODO --dry (sin escribir)' : ''}`);

  const Usuario = mongoose.model('Usuario', UsuarioSchema);
  const Empresa = mongoose.model('Empresa', EmpresaSchema);
  const Equipo = mongoose.model('Equipo', EquipoSchema);
  const Catalogo = mongoose.model('Catalogo', CatalogoSchema);

  // ---------- 1) Empresa «Interno IGSS» ----------
  let igss: any = await Empresa.findOne({ nombre: /igss/i });
  if (!igss) {
    console.log('[migrate] No existe la empresa «Interno IGSS».');
    if (dry) {
      console.log('[migrate]   (dry) se crearia: Interno IGSS / NIT CF.');
    } else {
      igss = await Empresa.create({ nombre: 'Interno IGSS', nit: 'CF', correo: 'mantenimiento@igssceibal.gob.gt', telefono: '2412-1224', activo: true });
      console.log('[migrate]   Creada empresa «Interno IGSS»:', igss._id.toString());
    }
  } else {
    console.log('[migrate] Empresa interna encontrada:', igss.nombre, igss._id.toString());
  }
  const igssId = igss?._id;

  // ---------- 2) Backfill de usuarios sin empresa ----------
  const sinEmpresa = await Usuario.find({ $or: [{ empresa: { $exists: false } }, { empresa: null }] });
  console.log(`[migrate] Usuarios sin empresa: ${sinEmpresa.length}`);
  const tecnicosAfectados: string[] = [];
  for (const u of sinEmpresa) {
    if (u.get('rol') === 'tecnico') tecnicosAfectados.push(`${u.get('nombre')} <${u.get('correo')}>`);
    if (!dry) {
      await Usuario.updateOne({ _id: u._id }, { $set: { empresa: igssId } });
    }
  }
  if (sinEmpresa.length && !dry) console.log(`[migrate]   Asignados ${sinEmpresa.length} usuarios a «Interno IGSS».`);
  if (tecnicosAfectados.length) {
    console.log('[migrate]   ⚠ TECNICOS asignados temporalmente a IGSS (reasignar a su empresa real en Administracion → Usuarios):');
    tecnicosAfectados.forEach((t) => console.log('           -', t));
  }

  // ---------- 3) Poblar catalogos desde los equipos reales ----------
  const equipos = await Equipo.find({}, { tipoEquipo: 1, subTipo: 1, marca: 1 });
  const tipos = new Set<string>();
  const subPorTipo = new Set<string>(); // "subTipo||padre"
  const marcas = new Set<string>();
  for (const e of equipos) {
    const t = (e.get('tipoEquipo') || '').trim();
    const s = (e.get('subTipo') || '').trim();
    const m = (e.get('marca') || '').trim();
    if (t) tipos.add(t);
    if (s) subPorTipo.add(`${s}||${t}`);
    if (m) marcas.add(m);
  }

  const upsertCatalogo = async (tipo: string, valor: string, padre: string | null) => {
    const existe = await Catalogo.findOne({ tipo, valor, padre });
    if (existe) return false;
    if (!dry) await Catalogo.create({ tipo, valor, padre, activo: true });
    return true;
  };

  let nuevos = 0;
  for (const t of tipos) if (await upsertCatalogo('tipoEquipo', t, null)) { nuevos++; console.log(`[migrate]   + tipoEquipo: ${t}`); }
  for (const sp of subPorTipo) {
    const [s, t] = sp.split('||');
    if (await upsertCatalogo('subTipo', s, t || null)) { nuevos++; console.log(`[migrate]   + subTipo: ${s} (padre: ${t})`); }
  }
  for (const m of marcas) if (await upsertCatalogo('marca', m, null)) { nuevos++; console.log(`[migrate]   + marca: ${m}`); }
  console.log(`[migrate] Catalogos: ${nuevos} valor(es) ${dry ? 'se agregarian' : 'agregados'} desde los equipos reales.`);

  await mongoose.disconnect();
  console.log(`[migrate] Listo.${dry ? ' (dry-run, no se escribio nada)' : ''}`);
  process.exit(0);
}

main().catch((err) => {
  console.error('[migrate] Error:', err.message);
  process.exit(1);
});
