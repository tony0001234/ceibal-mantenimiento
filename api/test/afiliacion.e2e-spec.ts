/**
 * Pruebas de extremo a extremo de las 9 escenarios del requerimiento de
 * empresa afiliada, usuarios con empresa/NIT/telefono y catalogos editables.
 *
 * Arranca la aplicacion NestJS REAL contra una MongoDB en memoria y ejerce la
 * API por HTTP (supertest), tal como lo haria el frontend.
 *
 *   npm run test:e2e -- afiliacion
 */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request = require('supertest');
import * as bcrypt from 'bcryptjs';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

let mongod: MongoMemoryServer;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongod.getUri('ceibal_test');
  process.env.JWT_SECRET = 'test-secret';
  process.env.JWT_EXPIRES = '8h';
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
});

describe('Empresa afiliada + usuarios + catalogos (e2e)', () => {
  let app: INestApplication;
  let http: any;

  // Tokens y datos que se comparten entre escenarios.
  let tokenAdmin: string;
  let tokenTecnicoA: string;
  let tokenSupervisor: string;
  let empresaA: string; // empresa del tecnico A
  let empresaB: string; // otra empresa (para el intento de suplantacion)
  let igss: string;
  let equipoId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [require('../src/app.module').AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: false, transform: true }),
    );
    await app.init();
    http = app.getHttpServer();

    // --- Sembrar lo minimo directamente en la BD (empresas + admin) ---
    const conn = mongoose.connection;
    const empresas = conn.collection('empresa');
    const usuarios = conn.collection('usuario');

    const insEmpA = await empresas.insertOne({ nombre: 'Empresa A', nit: '111-1', correo: 'a@a.gt', telefono: '1111', activo: true });
    const insEmpB = await empresas.insertOne({ nombre: 'Empresa B', nit: '222-2', correo: 'b@b.gt', telefono: '2222', activo: true });
    const insIgss = await empresas.insertOne({ nombre: 'Interno IGSS', nit: 'CF', correo: 'igss@igss.gt', telefono: '0000', activo: true });
    empresaA = insEmpA.insertedId.toString();
    empresaB = insEmpB.insertedId.toString();
    igss = insIgss.insertedId.toString();

    await usuarios.insertOne({
      nombre: 'Admin', correo: 'admin@igss.gt', contrasenaHash: bcrypt.hashSync('admin123', 10),
      rol: 'administrador', activo: true, empresa: insIgss.insertedId,
    });
    await usuarios.insertOne({
      nombre: 'Tecnico A', correo: 'tecnicoa@igss.gt', contrasenaHash: bcrypt.hashSync('tec123', 10),
      rol: 'tecnico', activo: true, empresa: insEmpA.insertedId,
    });
    await usuarios.insertOne({
      nombre: 'Super', correo: 'super@igss.gt', contrasenaHash: bcrypt.hashSync('sup123', 10),
      rol: 'supervisor', activo: true, empresa: insIgss.insertedId,
    });

    const login = async (correo: string, contrasena: string) => {
      const r = await request(http).post('/auth/login').send({ correo, contrasena }).expect(201);
      return r.body.access_token as string;
    };
    tokenAdmin = await login('admin@igss.gt', 'admin123');
    tokenTecnicoA = await login('tecnicoa@igss.gt', 'tec123');
    tokenSupervisor = await login('super@igss.gt', 'sup123');
  });

  afterAll(async () => {
    await app.close();
  });

  // El login del tecnico A debe traer su empresa afiliada (Empresa A).
  it('Escenario base: el login devuelve la empresa afiliada', async () => {
    const r = await request(http).post('/auth/login').send({ correo: 'tecnicoa@igss.gt', contrasena: 'tec123' }).expect(201);
    expect(r.body.usuario.empresa).toBeDefined();
    expect(r.body.usuario.empresa.nombre).toBe('Empresa A');
  });

  // Necesitamos catalogos + un equipo para registrar mantenimientos.
  it('Escenario 4-8: admin crea catalogos tipoEquipo/subTipo/marca y un equipo', async () => {
    await request(http).post('/catalogos').set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ tipo: 'tipoEquipo', valor: 'Refrigeración' }).expect(201);
    await request(http).post('/catalogos').set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ tipo: 'subTipo', valor: 'Split', padre: 'Refrigeración' }).expect(201);
    await request(http).post('/catalogos').set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ tipo: 'marca', valor: 'York' }).expect(201);
    await request(http).post('/catalogos').set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ tipo: 'ubicacion', valor: 'Sala de Operaciones' }).expect(201);

    // subTipo sin padre debe fallar (regla de negocio).
    await request(http).post('/catalogos').set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ tipo: 'subTipo', valor: 'Cassette' }).expect(400);

    const eq = await request(http).post('/equipos').set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ codigoInventario: 'E-001', nombre: 'AA Sala', tipoEquipo: 'Refrigeración', subTipo: 'Split', marca: 'York', serie: 'S-1', ubicacion: 'Sala de Operaciones', estado: 'ACTIVO', criticidad: 'ALTA' })
      .expect(201);
    equipoId = eq.body._id;
    expect(equipoId).toBeDefined();
  });

  // Escenario 3: admin crea un usuario con empresa afiliada.
  it('Escenario 3: crear usuario con empresa afiliada (obligatoria)', async () => {
    const r = await request(http).post('/usuarios').set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ nombre: 'Tecnico B', correo: 'tecnicob@igss.gt', contrasena: 'tec123', rol: 'tecnico', empresa: empresaB })
      .expect(201);
    expect(r.body.empresa).toBeDefined();

    // Sin empresa -> rechazado por el DTO.
    await request(http).post('/usuarios').set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ nombre: 'Sin Empresa', correo: 'sin@igss.gt', contrasena: 'x123', rol: 'tecnico' })
      .expect(400);

    // Empresa inexistente -> rechazado por el backend.
    await request(http).post('/usuarios').set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ nombre: 'Fantasma', correo: 'fant@igss.gt', contrasena: 'x123', rol: 'tecnico', empresa: '0123456789abcdef01234567' })
      .expect(400);
  });

  // Escenario: la lista de usuarios muestra la empresa legible + NIT + telefono.
  it('Escenario listado: los usuarios muestran empresa (nombre), NIT y telefono', async () => {
    const r = await request(http).get('/usuarios').set('Authorization', `Bearer ${tokenAdmin}`).expect(200);
    const tecA = r.body.find((u: any) => u.correo === 'tecnicoa@igss.gt');
    expect(tecA.empresa.nombre).toBe('Empresa A');
    expect(tecA.empresa.nit).toBe('111-1');
    expect(tecA.empresa.telefono).toBe('1111');
  });

  // Escenario 1: el tecnico A registra un mantenimiento -> empresa = Empresa A (automatica).
  it('Escenario 1: el tecnico registra y la empresa queda como su empresa afiliada', async () => {
    const r = await request(http).post('/mantenimientos').set('Authorization', `Bearer ${tokenTecnicoA}`)
      .send({ equipo: equipoId, periodo: 'mensual', tipoTrabajo: 'preventivo', descripcionTrabajo: 'Limpieza general.', repuestosObservaciones: '', estadoEquipoResultante: 'funcionando', fechaMantenimiento: '2026-08-20', horaInicio: '08:00', horaFin: '09:00' })
      .expect(201);
    expect(r.body.empresa.toString()).toBe(empresaA);
  });

  // Escenario 2: el supervisor registra -> empresa = Interno IGSS (automatica).
  it('Escenario 2: el supervisor registra y la empresa queda como Interno IGSS', async () => {
    const r = await request(http).post('/mantenimientos').set('Authorization', `Bearer ${tokenSupervisor}`)
      .send({ equipo: equipoId, periodo: 'mensual', tipoTrabajo: 'evaluacion_interna', descripcionTrabajo: 'Verificacion interna.', repuestosObservaciones: '', estadoEquipoResultante: 'funcionando', fechaMantenimiento: '2026-08-21', horaInicio: '10:00', horaFin: '10:30' })
      .expect(201);
    expect(r.body.empresa.toString()).toBe(igss);
  });

  // Escenario de seguridad: aunque el cliente envie empresa=Empresa B en el body,
  // el backend la IGNORA y usa la empresa del usuario autenticado (Empresa A).
  it('Seguridad: no se puede suplantar la empresa por HTTP (empresa en el body se ignora)', async () => {
    const r = await request(http).post('/mantenimientos').set('Authorization', `Bearer ${tokenTecnicoA}`)
      .send({ equipo: equipoId, empresa: empresaB, periodo: 'mensual', tipoTrabajo: 'correctivo', descripcionTrabajo: 'Intento de suplantacion.', repuestosObservaciones: '', estadoEquipoResultante: 'funcionando', fechaMantenimiento: '2026-08-22', horaInicio: '11:00', horaFin: '11:30' })
      .expect(201);
    expect(r.body.empresa.toString()).toBe(empresaA);
    expect(r.body.empresa.toString()).not.toBe(empresaB);
  });

  // Escenario permisos: un tecnico NO puede crear catalogos ni usuarios.
  it('Permisos: el tecnico no puede crear catalogos ni usuarios (403)', async () => {
    await request(http).post('/catalogos').set('Authorization', `Bearer ${tokenTecnicoA}`)
      .send({ tipo: 'marca', valor: 'Pirata' }).expect(403);
    await request(http).post('/usuarios').set('Authorization', `Bearer ${tokenTecnicoA}`)
      .send({ nombre: 'X', correo: 'x@x.gt', contrasena: 'x123', rol: 'tecnico', empresa: empresaA }).expect(403);
  });
});
