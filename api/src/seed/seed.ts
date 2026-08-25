/**
 * Script de poblamiento inicial (seed) de la base de datos.
 *
 *   npm run seed
 *
 * Crea el usuario administrador inicial, las empresas, un catalogo de
 * ubicaciones y equipos/mantenimientos de ejemplo. Los datos CUMPLEN los
 * validadores reales de las colecciones (usuario, equipo, empresa, mantenimiento).
 * Es idempotente: si una coleccion ya tiene datos, no la vuelve a poblar.
 * Para reiniciar por completo:  npm run seed -- --reset
 */
import * as fs from 'fs';
import * as path from 'path';
import * as bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

import { UsuarioSchema } from '../usuarios/schemas/usuario.schema';
import { EmpresaSchema } from '../empresas/schema/empresa.schema';
import { EquipoSchema } from '../equipos/schemas/equipo.schema';
import { MantenimientoSchema } from '../mantenimientos/schemas/mantenimiento.schema';
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
  const reset = process.argv.includes('--reset');
  const uri = process.env.MONGODB_URI;
  if (
    !uri ||
    uri.includes('cluster.mongodb.net') ||
    uri.includes('REEMPLAZA-HOST')
  ) {
    console.error(
      '\n[seed] MONGODB_URI no esta configurado con un host real de Atlas.\n' +
        '       Edita api/.env con tu cadena de conexion (host + nombre de BD) antes de ejecutar el seed.\n',
    );
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log('[seed] Conectado a MongoDB (BD:', mongoose.connection.name + ').');

  const Usuario = mongoose.model('Usuario', UsuarioSchema);
  const Empresa = mongoose.model('Empresa', EmpresaSchema);
  const Equipo = mongoose.model('Equipo', EquipoSchema);
  const Mantenimiento = mongoose.model('Mantenimiento', MantenimientoSchema);
  const Catalogo = mongoose.model('Catalogo', CatalogoSchema);

  if (reset) {
    console.log('[seed] --reset: limpiando colecciones...');
    await Promise.all([
      Usuario.deleteMany({}),
      Empresa.deleteMany({}),
      Equipo.deleteMany({}),
      Mantenimiento.deleteMany({}),
      Catalogo.deleteMany({}),
    ]);
  }

  // ---------- Usuarios (login por correo) ----------
  if ((await Usuario.countDocuments()) === 0) {
    const h = (c: string) => bcrypt.hashSync(c, 10);
    await Usuario.insertMany([
      { nombre: 'Ana Morales', correo: 'amorales@igssceibal.gob.gt', contrasenaHash: h('admin123'), rol: 'administrador', activo: true },
      { nombre: 'Rosa Lopez', correo: 'rlopez@igssceibal.gob.gt', contrasenaHash: h('super123'), rol: 'supervisor', activo: true },
      { nombre: 'Pablo Garcia', correo: 'pgarcia@igssceibal.gob.gt', contrasenaHash: h('tecnico123'), rol: 'tecnico', activo: true },
      { nombre: 'Julio Mendez', correo: 'jmendez@igssceibal.gob.gt', contrasenaHash: h('tecnico123'), rol: 'tecnico', activo: false },
    ]);
    console.log('[seed] Usuarios creados. Login por correo: amorales@igssceibal.gob.gt / admin123, rlopez@.../super123, pgarcia@.../tecnico123');
  } else {
    console.log('[seed] Usuarios ya existen: se omite.');
  }

  // ---------- Catalogo de ubicaciones (campo libre en el validador) ----------
  if ((await Catalogo.countDocuments()) === 0) {
    const ubicaciones = ['Sala de Operaciones', 'Emergencia', 'Encamamiento 2do nivel', 'Laboratorio', 'Consulta externa', 'Rayos X', 'Farmacia', 'Cocina', 'UCI'];
    await Catalogo.insertMany(ubicaciones.map((valor) => ({ tipo: 'ubicacion', valor })));
    console.log('[seed] Catalogo de ubicaciones creado.');
  } else {
    console.log('[seed] Catalogo ya existe: se omite.');
  }

  // ---------- Empresas (nombre, nit, correo, telefono obligatorios) ----------
  let empresas: any[] = await Empresa.find();
  if (empresas.length === 0) {
    empresas = await Empresa.insertMany([
      { nombre: 'Servicios Tecnicos de Mantenimiento', nit: '2519191-8', correo: 'stm@proveedores.gt', telefono: '2412-0001', activo: true },
      { nombre: 'Interno IGSS', nit: 'CF', correo: 'mantenimiento@igssceibal.gob.gt', telefono: '2412-1224', activo: true },
      { nombre: 'Frio Industrial S.A.', nit: '1234567-8', correo: 'contacto@frioindustrial.gt', telefono: '2333-0055', activo: true },
    ]);
    console.log('[seed] Empresas creadas.');
  }
  const empId = (n: string) => empresas.find((e) => e.nombre.startsWith(n))?._id;

  // ---------- Equipos (solo Refrigeración; valores del validador) ----------
  let equipos: any[] = await Equipo.find();
  if (equipos.length === 0) {
    equipos = await Equipo.insertMany([
      { codigoInventario: '0048CF89', nombre: 'Aire Acondicionado Sala de Operaciones', tipoEquipo: 'Refrigeración', subTipo: 'Split', marca: 'York', serie: 'YRK-24-0048', ubicacion: 'Sala de Operaciones', estado: 'ACTIVO', criticidad: 'CRITICA' },
      { codigoInventario: '0051AA12', nombre: 'Aire Acondicionado Emergencia', tipoEquipo: 'Refrigeración', subTipo: 'Split', marca: 'Lennox', serie: 'LNX-18-0051', ubicacion: 'Emergencia', estado: 'INACTIVO', criticidad: 'ALTA' },
      { codigoInventario: '0067BC34', nombre: 'Camara de Refrigeración de Vacunas', tipoEquipo: 'Refrigeración', subTipo: 'Paquete', marca: 'Rheem', serie: 'RHM-500-0067', ubicacion: 'Farmacia', estado: 'ACTIVO', criticidad: 'CRITICA' },
      { codigoInventario: '0072DE56', nombre: 'Aire Acondicionado Laboratorio', tipoEquipo: 'Refrigeración', subTipo: 'Ventana', marca: 'Fedders', serie: 'FDD-12-0072', ubicacion: 'Laboratorio', estado: 'MANTENIMIENTO', criticidad: 'MEDIA' },
      { codigoInventario: '0080FG78', nombre: 'Mini Split UCI', tipoEquipo: 'Refrigeración', subTipo: 'Mini-split', marca: 'Innovair', serie: 'INV-09-0080', ubicacion: 'UCI', estado: 'ACTIVO', criticidad: 'CRITICA' },
      { codigoInventario: '0091HI90', nombre: 'Cassette Consulta Externa', tipoEquipo: 'Refrigeración', subTipo: 'Cassette', marca: 'Tempstar', serie: 'TMP-36-0091', ubicacion: 'Consulta externa', estado: 'ACTIVO', criticidad: 'BAJA' },
      { codigoInventario: '0102JK11', nombre: 'Aire Acondicionado Rayos X', tipoEquipo: 'Refrigeración', subTipo: 'Split', marca: 'Comfortstar', serie: 'CMF-24-0102', ubicacion: 'Rayos X', estado: 'ACTIVO', criticidad: 'ALTA' },
      { codigoInventario: '0113LM22', nombre: 'Refrigeradora de Laboratorio', tipoEquipo: 'Refrigeración', subTipo: 'Paquete', marca: 'Everwell', serie: 'EVW-300-0113', ubicacion: 'Laboratorio', estado: 'INACTIVO', criticidad: 'MEDIA' },
      { codigoInventario: '0124NO33', nombre: 'Mini Split Encamamiento', tipoEquipo: 'Refrigeración', subTipo: 'Mini-split', marca: 'Adina', serie: 'ADN-12-0124', ubicacion: 'Encamamiento 2do nivel', estado: 'ACTIVO', criticidad: 'MEDIA' },
      { codigoInventario: '0135PQ44', nombre: 'Aire Acondicionado Cocina', tipoEquipo: 'Refrigeración', subTipo: 'Ventana', marca: 'Mcquay Daikin', serie: 'MQD-18-0135', ubicacion: 'Cocina', estado: 'BAJA', criticidad: 'BAJA' },
    ]);
    console.log('[seed] Equipos creados.');
  }
  const eqId = (c: string) => equipos.find((e) => e.codigoInventario === c)?._id;

  // ---------- Mantenimientos (horas como Date; empresa y periodo obligatorios) ----------
  if ((await Mantenimiento.countDocuments()) === 0) {
    const usuarios = await Usuario.find();
    const uId = (n: string) => usuarios.find((u) => u.nombre.startsWith(n))?._id;
    const D = (f: string) => new Date(`${f}T00:00:00`);
    const H = (f: string, h: string) => new Date(`${f}T${h}:00`);
    await Mantenimiento.insertMany([
      { equipo: eqId('0080FG78'), tecnico: uId('Pablo'), empresa: empId('Interno'), periodo: 'mensual', tipoTrabajo: 'preventivo', descripcionTrabajo: 'Limpieza de filtros y revision de gas refrigerante.', repuestosObservaciones: 'Ninguno', estadoEquipoResultante: 'funcionando', fechaMantenimiento: D('2026-08-20'), horaInicio: H('2026-08-20', '08:05'), horaFin: H('2026-08-20', '09:10') },
      { equipo: eqId('0048CF89'), tecnico: uId('Pablo'), empresa: empId('Servicios'), periodo: 'mensual', tipoTrabajo: 'preventivo', descripcionTrabajo: 'Limpieza de evaporadora y condensadora, pruebas de funcionamiento.', repuestosObservaciones: 'Ninguno', estadoEquipoResultante: 'funcionando', fechaMantenimiento: D('2026-08-13'), horaInicio: H('2026-08-13', '08:15'), horaFin: H('2026-08-13', '10:30') },
      { equipo: eqId('0051AA12'), tecnico: uId('Julio'), empresa: empId('Frio'), periodo: 'garantia', tipoTrabajo: 'correctivo', descripcionTrabajo: 'Diagnostico de falla de compresor. Equipo fuera de servicio.', repuestosObservaciones: 'Compresor (pendiente)', estadoEquipoResultante: 'fuera_de_servicio', fechaMantenimiento: D('2026-08-12'), horaInicio: H('2026-08-12', '09:00'), horaFin: H('2026-08-12', '13:20') },
      { equipo: eqId('0072DE56'), tecnico: uId('Pablo'), empresa: empId('Interno'), periodo: 'cuatrimestral', tipoTrabajo: 'preventivo', descripcionTrabajo: 'Limpieza general de filtros.', repuestosObservaciones: 'Filtro de aire', estadoEquipoResultante: 'funcionando', fechaMantenimiento: D('2026-08-11'), horaInicio: H('2026-08-11', '11:00'), horaFin: H('2026-08-11', '12:10') },
      { equipo: eqId('0067BC34'), tecnico: uId('Rosa'), empresa: empId('Interno'), periodo: 'mensual', tipoTrabajo: 'evaluacion_interna', descripcionTrabajo: 'Verificacion de temperatura de cadena de frio.', repuestosObservaciones: 'Ninguno', estadoEquipoResultante: 'funcionando', fechaMantenimiento: D('2026-08-08'), horaInicio: H('2026-08-08', '14:00'), horaFin: H('2026-08-08', '14:45') },
      { equipo: eqId('0113LM22'), tecnico: uId('Pablo'), empresa: empId('Frio'), periodo: 'garantia', tipoTrabajo: 'llamada_emergencia', descripcionTrabajo: 'Equipo no enfria. Fuga de refrigerante.', repuestosObservaciones: 'Gas R134a (pendiente)', estadoEquipoResultante: 'fuera_de_servicio', fechaMantenimiento: D('2026-08-04'), horaInicio: H('2026-08-04', '10:10'), horaFin: H('2026-08-04', '15:40') },
      { equipo: eqId('0102JK11'), tecnico: uId('Pablo'), empresa: empId('Interno'), periodo: 'cuatrimestral', tipoTrabajo: 'preventivo', descripcionTrabajo: 'Limpieza de filtros y evaporadora.', repuestosObservaciones: 'Ninguno', estadoEquipoResultante: 'funcionando', fechaMantenimiento: D('2026-07-30'), horaInicio: H('2026-07-30', '08:00'), horaFin: H('2026-07-30', '10:15') },
    ]);
    console.log('[seed] Mantenimientos creados.');
  }

  await mongoose.disconnect();
  console.log('[seed] Listo. Base de datos poblada.');
  process.exit(0);
}

main().catch((err) => {
  console.error('[seed] Error:', err.message);
  process.exit(1);
});
