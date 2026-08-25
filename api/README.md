# API — Sistema de Control de Mantenimiento Hospital «Ceibal» (IGSS)

Backend REST del sistema, construido con **NestJS + MongoDB (Mongoose)** y
autenticación **JWT** con control de roles. Corresponde a las Fases 2 y 5 de la
guía de implementación.

## Stack
- NestJS 11 · Mongoose · MongoDB Atlas
- Autenticación JWT (`@nestjs/jwt` + Passport) · contraseñas con `bcrypt`
- Validación con `class-validator` (DTOs) · documentación con Swagger
- Reportes: `exceljs` (Excel) y `pdfkit` (PDF)

## Requisitos
- Node.js 18+ y una base de datos MongoDB Atlas.

## Configuración
Copia `.env.example` a `.env` y completa los valores (ver
`GUIA_CONEXION_BASE_DE_DATOS.md` en la raíz del proyecto):

```env
MONGODB_URI=mongodb+srv://usuario:contrasena@TU-HOST.mongodb.net/ceibal_mantenimiento?retryWrites=true&w=majority
JWT_SECRET=clave_larga_y_secreta
JWT_EXPIRES=8h
PORT=3000
FRONTEND_URL=http://localhost:5173
```

## Comandos
```bash
npm install         # instalar dependencias
npm run seed        # poblar la BD con datos iniciales (idempotente)
npm run seed -- --reset   # reiniciar y volver a poblar
npm run start:dev   # servidor en http://localhost:3000 (docs en /docs)
npm run build       # compilar a dist/
npm run start:prod  # ejecutar la versión compilada
```

## Estructura
```
src/
  auth/           login, JWT, estrategia y guard
  common/         decorador @Roles, guard de roles, @UsuarioActual
  usuarios/       gestión de cuentas (RF10)
  empresas/       proveedores externos
  equipos/        inventario (RF02)
  mantenimientos/ bitácora digital + validación de duplicados (RF03–RF06)
  catalogos/      catálogos editables (RF10)
  reportes/       indicadores/MTTR (RF08) y exportación Excel/PDF (RF07)
  seed/           poblamiento inicial
```

## Endpoints principales
| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| POST | `/auth/login` | público | Iniciar sesión (RF01) |
| GET | `/auth/perfil` | autenticado | Perfil del token |
| GET/POST/PATCH | `/equipos` | consulta: todos / edición: admin | Inventario (RF02) |
| GET/POST | `/mantenimientos` | autenticado | Bitácora (RF03–RF06) |
| GET | `/mantenimientos/duplicado` | autenticado | Verificar duplicado (RF05) |
| GET | `/reportes/indicadores` | admin/supervisor | Dashboard/MTTR (RF08) |
| GET | `/reportes/excel` · `/reportes/pdf` | admin/supervisor | Exportar (RF07) |
| GET/POST/PATCH | `/usuarios` · `/catalogos` | admin | Administración (RF10) |

La documentación interactiva completa está en `http://localhost:3000/docs`.

## Modelo de datos (colecciones)
`usuarios`, `empresas`, `equipos`, `mantenimientos` (definidas en la guía) y
`catalogos` (agregada para cumplir el RF10: catálogos editables sin tocar el código).
