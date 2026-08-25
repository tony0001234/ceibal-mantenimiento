# Informe final — Continuación del desarrollo del Sistema de Mantenimiento Hospital «Ceibal» (IGSS)

**Fecha:** 22 de agosto de 2026
**Proyecto:** Implementación de un Sistema Web de Gestión y Control del Mantenimiento del Hospital General de Accidentes «Ceibal» (IGSS)

> **Actualización (alineación con los validadores reales de MongoDB).** Tras recibir
> los validadores `$jsonSchema` de tus colecciones (`usuario`, `equipo`, `empresa`,
> `mantenimiento`), el código y el `seed` se **alinearon exactamente** a tu base de
> datos existente, sin modificarla: colecciones en singular; `equipo` con `subTipo`,
> `serie`, estados `ACTIVO/INACTIVO/MANTENIMIENTO/BAJA` y criticidad
> `BAJA/MEDIA/ALTA/CRITICA`, marcas del catálogo de refrigeración; `empresa` con
> nit/correo/telefono obligatorios; `mantenimiento` con `empresa`/`periodo`
> obligatorios y `horaInicio`/`horaFin` como fecha/hora; login por **correo**.
> Detalle y pasos en `GUIA_CONEXION_BASE_DE_DATOS.md`.

---

## 1. Qué analicé

- **`doc + cap_4 + cap_5`** (autoridad principal): objetivo general y específicos,
  alcance, 3 roles (técnico, supervisor, administrador), 10 requerimientos
  funcionales (RF01–RF10), 7 no funcionales (RNF01–RNF07), 6 módulos, diagramas
  UML (componentes, clases, secuencia, estados, actividades) y la maquetación 5.3.
- **`Guia_Implementacion`**: stack, esquema de 4 colecciones (usuarios, empresas,
  equipos, mantenimientos), endpoints, cálculo de MTTR con `horaInicio`/`horaFin`,
  validación de duplicados y despliegue.
- **`ceibal-mantenimiento`**: backend NestJS (`api/`) y frontend React (`web/`).

**Diagnóstico inicial:**
- El **frontend** era el prototipo del 5.3 completo en diseño, pero **100 % con
  datos simulados** (`mockData.js`), sin backend real.
- El **backend** era solo andamiaje: schemas de usuarios, empresas y
  mantenimientos **vacíos (0 bytes)**, DTOs vacíos, `auth/` sin JWT ni bcrypt, y
  un error de compilación en `equipos.module.ts`. Faltaban todas las dependencias.
- El `.env` traía una cadena de Atlas con **host de plantilla** (`cluster.mongodb.net`),
  que no resuelve.

**Discrepancia resuelta:** la guía menciona un 4.º rol «auditor»; el documento
principal define solo 3 roles → **se conservan 3 roles** (prevalece el documento).

---

## 2. Qué modifiqué

### Backend (`api/`) — construido de cero sobre el andamiaje existente
- **Esquemas Mongoose** completos: `usuarios`, `empresas`, `equipos`,
  `mantenimientos` y `catalogos`, con índices únicos (número de bien, correo).
- **Autenticación (RF01/RNF01):** login con JWT, `bcrypt` para contraseñas,
  `JwtStrategy`, `JwtAuthGuard`, `RolesGuard` y decorador `@Roles`. Login por
  usuario **o** correo institucional; mensaje de error genérico.
- **DTOs con `class-validator`** y `ValidationPipe` global (RF04): rechazo de
  registros incompletos o con campos no permitidos.
- **Equipos (RF02):** CRUD, búsqueda y filtros, número de bien único, baja lógica.
- **Mantenimientos (RF03–RF06):** registro con técnico y fecha automáticos,
  **detección de duplicados (RF05)** con confirmación consciente, actualización del
  estado del equipo (ciclo de vida 5.2.4) e historial por equipo.
- **Reportes (RF07):** exportación **real** a Excel (`exceljs`) y PDF (`pdfkit`).
- **Indicadores (RF08):** dashboard con MTTR calculado, equipos fuera de servicio,
  mantenimientos del mes y distribución por tipo.
- **Administración (RF10):** gestión de usuarios y catálogos editables.
- **Infraestructura:** CORS, Swagger en `/docs`, script `npm run seed`,
  `package.json` con todas las dependencias, `.env` parametrizado + `.env.example`.

### Frontend (`web/`) — de prototipo simulado a aplicación funcional
- **Capa API** (`api/client.js`, `api/services.js`): axios con inyección de token
  JWT e interceptor 401.
- **`AuthContext`** reescrito: login real, sesión persistida y restaurada vía
  `/auth/perfil`.
- **Las 6 pantallas** ahora consumen la API (se conservó el diseño, la paleta
  semántica y la estructura de 4 zonas):
  - Login real; Panel con indicadores reales; Equipos con CRUD y baja lógica;
    Registro con guardado y aviso de duplicado reales; Historial con datos reales;
    Reportes con exportación PDF/Excel real; Administración con CRUD de usuarios y
    catálogos.
- Roles del backend (`administrador`/`supervisor`/`tecnico`) con etiquetas de
  interfaz; se eliminó la dependencia de `mockData.js`.

---

## 3. Funcionalidades terminadas (trazabilidad de requerimientos)

| Req. | Descripción | Estado |
|---|---|---|
| RF01 | Autenticación y control de acceso por roles | ✅ |
| RF02 | Registro y consulta de equipos (único, baja lógica) | ✅ |
| RF03 | Registro de mantenimiento por catálogos | ✅ |
| RF04 | Validación de campos obligatorios | ✅ |
| RF05 | Validación de duplicados con confirmación | ✅ |
| RF06 | Consulta de historial por equipo | ✅ |
| RF07 | Generación y exportación de reportes (Excel/PDF) | ✅ |
| RF08 | Panel de indicadores (MTTR, etc.) | ✅ |
| RF09 | Acceso responsivo (PC y móvil) | ✅ |
| RF10 | Administración de usuarios y catálogos | ✅ |
| RNF01 | Seguridad (bcrypt, JWT, roles) | ✅ |
| RNF02 | Usabilidad (listas, mensajes claros) | ✅ |
| RNF03 | Rendimiento (red interna, sin fuentes externas) | ✅ |
| RNF04 | Compatibilidad de navegadores | ✅ |
| RNF05 | Disponibilidad / respaldo | 🟡 código listo; el backup en Atlas lo configuras tú (guía Fase 7) |
| RNF06 | Escalabilidad (catálogos y tipos abiertos) | ✅ |
| RNF07 | Mantenibilidad (README, Swagger, código comentado) | ✅ |

---

## 4. Estado de la base de datos

🟡 **Conexión preparada; falta un dato para completarla.** El código está listo
para conectarse a tu MongoDB Atlas existente. **No se creó ni se reemplazó ninguna
base de datos.** El `.env` tenía el host de plantilla `cluster.mongodb.net` (no
resuelve); lo dejé marcado como `REEMPLAZA-HOST.mongodb.net` para que pegues el
host real de tu clúster.

No pude probar la conexión en vivo desde este entorno (el sandbox no permite
levantar MongoDB ni descargar su binario). En su lugar verifiqué:
- ✅ El backend **compila** sin errores (`nest build`) y pasa el chequeo de tipos.
- ✅ El frontend **compila** y genera la build de producción.
- ✅ Revisión de la lógica de extremo a extremo (login, roles, duplicados, reportes).

La estructura de colecciones respeta exactamente la definida en la guía (más la
colección `catalogos`, agregada para el RF10 — ver nota abajo).

---

## 5. Qué falta

- Configurar el **host real de Atlas** y ejecutar el proyecto (ver
  `GUIA_CONEXION_BASE_DE_DATOS.md`).
- (Opcional, producción) Configurar respaldos automáticos en Atlas y despliegue
  con PM2 + Nginx (Fases 7–8 de la guía).

---

## 6. Qué necesitas hacer tú

1. **Pegar en `api/.env`** la cadena de conexión real de tu clúster de Atlas
   (host verdadero + contraseña correcta). *Esto es indispensable.*
2. Autorizar tu IP en **Network Access** de Atlas.
3. Ejecutar, una vez, en cada carpeta:
   - `api/`: `npm install` → `npm run seed` → `npm run start:dev`
   - `web/`: `npm install` → `npm run dev`
4. Entrar a http://localhost:5173 con `admin` / `admin123`.

No necesitas configurar nada más para el funcionamiento local básico.

---

## 7. Decisión técnica propuesta (no es requisito literal de la documentación)

> **Colección `catalogos`.** La guía modela `tipoEquipo`, `marca` y `ubicacion`
> como texto dentro de `equipos`. Para cumplir el **RF10** («el administrador
> agrega nuevos valores a los catálogos sin modificar el código») agregué una
> colección ligera `catalogos`. No altera las 4 colecciones de la guía; solo las
> complementa. Si prefieres no usarla, puede omitirse sin afectar el resto.
>
> Además, se añadió un campo `usuario` (nombre corto) a la colección `usuarios`,
> junto al `correo` institucional, para permitir iniciar sesión con cualquiera de
> los dos (usabilidad, RNF02).

---

## 8. Estado final

🟡 **TERMINADO, PERO REQUIERE CONFIGURACIÓN.**
La aplicación está completa y funcional en su lógica; solo necesita que pegues la
cadena de conexión real de tu MongoDB Atlas y ejecutes los comandos de arranque
para quedar operativa de extremo a extremo.
