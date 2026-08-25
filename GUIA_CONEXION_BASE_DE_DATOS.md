# Guía de conexión a la base de datos — Sistema de Mantenimiento Hospital «Ceibal» (IGSS)

Guía **específica de este proyecto** para conectar la aplicación `ceibal-mantenimiento`
con tu base de datos **MongoDB Atlas ya existente**, respetando los **validadores**
de tus colecciones (`usuario`, `equipo`, `empresa`, `mantenimiento`).

> **Importante — el código ya fue alineado a tu base de datos.** El código de la
> aplicación y el `seed.ts` se ajustaron para cumplir EXACTAMENTE tus validadores:
> nombres de colección en singular, campos y enums reales (`subTipo`, `serie`,
> estados `ACTIVO/INACTIVO/MANTENIMIENTO/BAJA`, criticidad `BAJA/MEDIA/ALTA/CRITICA`,
> marcas del catálogo de refrigeración, horas como fecha/hora, `empresa` y `periodo`
> obligatorios, login por **correo**). **No se modificó tu base de datos.**

**Datos de tu MongoDB Atlas (confirmados):**
- **Clúster:** `Ceibal-mantenimiento`
- **Base de datos:** `Ceibal-Mantenimiento`  ← va después de `.mongodb.net/`
- **Host:** `ceibal-mantenimiento.8te39ap.mongodb.net`

Tu cadena original venía sin el nombre de la base (`...mongodb.net/?appName=...`).
La cadena correcta debe incluir la base `Ceibal-Mantenimiento`:
```
mongodb+srv://<usuario>:<contraseña>@ceibal-mantenimiento.8te39ap.mongodb.net/Ceibal-Mantenimiento?retryWrites=true&w=majority&appName=Ceibal-Mantenimiento
```

---

## Estructura de la base de datos que espera la aplicación

Tras la alineación, el código usa exactamente estas colecciones (nombres **singulares**):

| Colección | Campos que escribe/lee la app (todos según tu validador) |
|---|---|
| `usuario` | nombre, correo, contrasenaHash, rol (tecnico/supervisor/administrador/auditor), activo |
| `equipo` | codigoInventario, nombre, tipoEquipo (Refrigeración), subTipo, marca, serie, ubicacion, estado, criticidad |
| `empresa` | nombre, nit, correo, telefono, activo |
| `mantenimiento` | equipo, tecnico, empresa, periodo, tipoTrabajo, descripcionTrabajo, repuestosObservaciones, estadoEquipoResultante, fechaMantenimiento, horaInicio (date), horaFin (date) |
| `catalogo` | *(colección propia de la app, sin validador)* solo para **ubicaciones** editables |

---

# Paso 1 — Confirmar la base de datos y armar la cadena completa

**Objetivo:** confirmar que tus 4 colecciones validadas están en la base `Ceibal-Mantenimiento` y armar la cadena de conexión completa.

**Qué vamos a modificar:** nada todavía (solo verificar).

**Antes de comenzar:** acceso a https://cloud.mongodb.com con tu cuenta.

**Procedimiento:**
1. Entra a Atlas → tu proyecto → clúster `Ceibal-mantenimiento`.
2. Clic en **Browse Collections**.
3. En la columna izquierda confirma que bajo la base **`Ceibal-Mantenimiento`** aparecen las colecciones `usuario`, `equipo`, `empresa` y `mantenimiento`.

**Código/configuración:** la cadena final (con tu usuario y contraseña reales):
```
mongodb+srv://<usuario>:<contraseña>@ceibal-mantenimiento.8te39ap.mongodb.net/Ceibal-Mantenimiento?retryWrites=true&w=majority&appName=Ceibal-Mantenimiento
```

**Qué NO debemos modificar:** el host `ceibal-mantenimiento.8te39ap.mongodb.net` ni el nombre de la base `Ceibal-Mantenimiento` (respeta mayúsculas y el guion).

**Cómo verificarlo:** las 4 colecciones aparecen bajo `Ceibal-Mantenimiento` en *Browse Collections*.

**Resultado esperado:** cadena de conexión lista para el Paso 2.

**Errores comunes:**
- Si las colecciones aparecieran bajo otra base (p. ej. `test`), usarías ese nombre en su lugar. En tu caso es `Ceibal-Mantenimiento`.
- Escribir `ceibal-mantenimiento` (minúsculas) en vez de `Ceibal-Mantenimiento`: MongoDB distingue mayúsculas y usaría/crearía otra base vacía.

---

# Paso 2 — Configurar `api/.env`

**Objetivo:** que el backend sepa a qué base conectarse.

**Qué vamos a modificar:** el archivo `ceibal-mantenimiento/api/.env`.

**Antes de comenzar:** el `Ceibal-Mantenimiento` del Paso 1.

**Procedimiento:**
1. Abre `ceibal-mantenimiento/api/.env`.
2. Localiza la línea `MONGODB_URI=...`.
3. Reemplázala por tu cadena real (con tu usuario, contraseña y `Ceibal-Mantenimiento`). No compartas este archivo ni tu contraseña.

**Código/configuración** (ejemplo; pon tus valores reales):
```env
MONGODB_URI=mongodb+srv://TU_USUARIO:TU_CONTRASENA@ceibal-mantenimiento.8te39ap.mongodb.net/Ceibal-Mantenimiento?retryWrites=true&w=majority&appName=Ceibal-Mantenimiento
JWT_SECRET=una_clave_larga_y_dificil_de_adivinar
JWT_EXPIRES=8h
PORT=3000
FRONTEND_URL=http://localhost:5173
```

**Qué NO debemos modificar:** `JWT_SECRET`, `PORT` ni `FRONTEND_URL` para desarrollo local.

**Cómo verificarlo:** la línea `MONGODB_URI` contiene tu host real y termina en `/Ceibal-Mantenimiento?...` (con el nombre de la base, no vacío, no `cluster.mongodb.net`, no `REEMPLAZA-HOST`).

**Resultado esperado:** `.env` listo. (El `.env` no se puede escribir por herramientas remotas; edítalo tú manualmente. Tienes `api/.env.example` como referencia.)

**Errores comunes:**
- Olvidar el `Ceibal-Mantenimiento` → la app usaría la base `test` (vacía, sin validadores).
- Dejar `<usuario>`/`<contraseña>` sin reemplazar.

**Si aparece un error:** ejecuta en `api/` → `node -e "require('dotenv')" 2>/dev/null; type .env` (Windows) o `cat .env` y compárteme solo la línea `MONGODB_URI` **ocultando la contraseña** (pon `****`).

---

# Paso 3 — Instalar dependencias

**Objetivo:** descargar las librerías del backend y del frontend.

**Qué vamos a modificar:** nada del código; se crea `node_modules/`.

**Procedimiento** (dos terminales):
```bash
cd ceibal-mantenimiento/api
npm install

cd ceibal-mantenimiento/web
npm install
```

**Cómo verificarlo:** ambos comandos terminan sin errores rojos y aparece la carpeta `node_modules` en cada uno.

**Resultado esperado:** dependencias instaladas.

**Errores comunes:** versión de Node vieja → instala Node 18 LTS o superior (`node --version`).

**Si aparece un error:** cópiame las últimas ~15 líneas de la salida del `npm install`.

---

# Paso 4 — Revisar `seed.ts` (¿qué es y debo modificarlo?)

**Objetivo:** entender el script de datos iniciales antes de ejecutarlo.

**Qué es `seed.ts`:** un script (`api/src/seed/seed.ts`) que **inserta datos iniciales** en tu base: 4 usuarios, 3 empresas, 9 equipos de refrigeración, un catálogo de ubicaciones y 7 mantenimientos de ejemplo. **No** es parte de la conexión; la conexión la hace la app.

**¿Debo modificarlo?** **No.** Ya fue alineado para cumplir tus validadores:
- Usuarios: login por `correo` (sin campo `usuario`), roles válidos.
- Equipos: `tipoEquipo` = `Refrigeración`, `subTipo`/`marca` del enum, `serie` presente, `estado` y `criticidad` en MAYÚSCULA.
- Empresas: incluyen `nit`, `correo`, `telefono` (obligatorios).
- Mantenimientos: `empresa` y `periodo` presentes; `horaInicio`/`horaFin` como fecha/hora (`Date`).

**Cómo usa el `.env`:** lee `api/.env`, exige `MONGODB_URI` y **se niega a correr** si el host es un marcador (`cluster.mongodb.net` o `REEMPLAZA-HOST`). Al conectarse imprime el nombre de la base a la que entró — **verifica que sea tu `Ceibal-Mantenimiento`**.

**¿Borra datos?** No, salvo que uses `npm run seed -- --reset` (eso **sí borra** y recrea). Sin `--reset` es idempotente (si una colección ya tiene datos, la omite), así que puede ejecutarse varias veces sin duplicar.

**Qué NO debemos modificar:** la lógica del script ni los datos (ya cumplen los validadores).

**Resultado esperado:** entiendes que el seed es opcional (datos de prueba) y seguro de ejecutar sin `--reset`.

---

# Paso 5 — Ejecutar el seed (poblar la base)

**Objetivo:** cargar datos iniciales para ver el sistema funcionando.

**Antes de comenzar:** Pasos 2 y 3 completos.

**Procedimiento:**
```bash
cd ceibal-mantenimiento/api
npm run seed
```

**Cómo verificarlo:** en la salida debe aparecer
`[seed] Conectado a MongoDB (BD: Ceibal-Mantenimiento).` seguido de las líneas de creación y
`[seed] Listo. Base de datos poblada.`

**Resultado esperado:** en Atlas → *Browse Collections* → las colecciones `usuario`, `equipo`, `empresa`, `mantenimiento` tienen documentos. Usuarios de prueba:

| Correo | Contraseña | Rol |
|---|---|---|
| amorales@igssceibal.gob.gt | admin123 | Administrador |
| rlopez@igssceibal.gob.gt | super123 | Supervisor |
| pgarcia@igssceibal.gob.gt | tecnico123 | Técnico |

**Errores comunes:**
- `Document failed validation` → un dato no cumple un validador. Con el código alineado no debería pasar; si ocurre, ve al Paso 10 y compárteme el mensaje.
- `[seed] MONGODB_URI no esta configurado...` → falta configurar el `.env` (Paso 2).
- La BD que imprime **no** es tu `Ceibal-Mantenimiento` → corrige el nombre en `.env` (Paso 2).

**Si aparece un error:** cópiame la salida completa del comando `npm run seed` (oculta la contraseña si aparece).

---

# Paso 6 — Ejecutar el proyecto

**Objetivo:** levantar backend y frontend.

**Procedimiento** (dos terminales):
```bash
cd ceibal-mantenimiento/api
npm run start:dev      # API en http://localhost:3000  (docs: /docs)

cd ceibal-mantenimiento/web
npm run dev            # App en http://localhost:5173
```

**Cómo verificarlo:** el backend imprime `API escuchando en http://localhost:3000`.

**Resultado esperado:** abres http://localhost:5173 y ves la pantalla de inicio de sesión.

**Errores comunes:**
- `Cannot connect to MongoDB` → revisa `MONGODB_URI` (Paso 2) y el Paso 9 (Network Access).
- Puerto 3000 ocupado → cierra el otro proceso o cambia `PORT` en `.env`.

**Si aparece un error:** cópiame las líneas de la terminal del backend al arrancar.

---

# Paso 7 — Verificar que la conexión funciona

**Objetivo:** confirmar que la app habla con tu base.

**Procedimiento:**
1. Abre http://localhost:3000 → debe responder un JSON con `"estado":"activo"`.
2. Inicia sesión en http://localhost:5173 con `amorales@igssceibal.gob.gt` / `admin123`.
3. Entra a **Equipos** → deben aparecer los equipos del seed.

**Cómo verificarlo:** si inicias sesión y ves datos, la conexión y los modelos funcionan.

**Resultado esperado:** login correcto y listados con datos reales de tu base.

**Errores comunes:** `Network Error` en el navegador → el backend no está corriendo o `web/.env` no apunta a `http://localhost:3000` (por defecto sí lo hace).

---

# Paso 8 — Prueba CRUD (crear, leer, actualizar, eliminar/baja)

**Objetivo:** comprobar lectura y escritura reales.

**Procedimiento:**
1. **Crear:** *Registro de mantenimiento* → elige equipo, empresa, periodo, horas y descripción → **Guardar** → «Registro guardado correctamente».
2. **Leer:** *Historial* → elige ese equipo → aparece la intervención.
3. **Duplicado (RF05):** intenta otra intervención del mismo equipo el mismo día → aviso ámbar «Posible duplicado» con botón para confirmar.
4. **Actualizar / Alta de equipo:** *Equipos* (como admin) → **Nuevo equipo** → llena N.º de bien, nombre, subtipo, marca, serie, ubicación → Guardar.
5. **Baja lógica:** *Equipos* → botón de baja → el equipo pasa a «Dado de baja» conservando su historial.
6. **Reporte:** *Reportes* → **Generar** → **Exportar Excel** / **Exportar PDF** descargan el archivo.

**Resultado esperado:** todas las operaciones se reflejan en Atlas (*Browse Collections*).

**Errores comunes:**
- Al crear un equipo, `Marca invalida` / `Subtipo invalido` → debes elegir un valor de las listas (son valores cerrados del validador).
- Al guardar un mantenimiento, falta empresa/periodo/horas → son obligatorios (el validador los exige).

**Si aparece un error:** dime en qué paso, qué mensaje salió y (si es del backend) las líneas de su terminal.

---

# Catálogos del sistema (selección en vez de texto libre)

**Análisis:** se revisaron TODOS los campos de la bitácora (`mantenimiento`) y del
`equipo` contra el documento, la guía, el código y los validadores. Resultado:

| Campo | ¿Dónde se captura? | ¿Cómo se ingresa? | ¿Catálogo? |
|---|---|---|---|
| equipo | bitácora | selección de la lista de equipos (referencia) | Sí (ya) |
| tecnico | bitácora | automático (usuario en sesión, RF03) | No aplica |
| empresa | bitácora | selección de la lista de empresas (referencia) | Sí (ya) |
| periodo | bitácora | lista fija (enum del validador) | Sí (ya) |
| tipoTrabajo | bitácora | lista fija (enum) | Sí (ya) |
| estadoEquipoResultante | bitácora | lista fija (enum) | Sí (ya) |
| descripcionTrabajo | bitácora | texto libre (narrativa) | No — debe ser libre |
| repuestosObservaciones | bitácora | texto libre (narrativa) | No — debe ser libre |
| fecha / horas | bitácora | fecha/hora | No aplica |
| tipoEquipo, subTipo, marca, estado, criticidad | equipo | listas fijas (enum del validador) | Sí (ya) |
| codigoInventario, serie | equipo | identificadores únicos escritos | No — son únicos |
| nombre | equipo | texto libre (etiqueta descriptiva) | No |
| **ubicacion** | **equipo** | **ANTES texto libre → AHORA selección de catálogo** | **Sí (nuevo)** |

**Conclusión:** la **bitácora no pide `ubicacion`**; el técnico elige el equipo y la
ubicación viene del equipo. El único campo que era texto libre y representa una lista
definida (servicios/áreas del hospital) es **`ubicacion`** en el formulario de equipo.
El validador de `equipo` deja `ubicacion` como **string sin enum** (a diferencia de
`marca`), justo para que sea una lista **extensible** (guía Fase 1: «String (catálogo)»,
«candidato a lista controlada por servicio/área»). Por eso se implementó como catálogo
editable, guardando el valor como **string** (sin cambiar el validador).

**Colección `catalogo`** (propia de la app): `{ tipo: 'ubicacion', valor: <string>, activo: <bool> }`.
- Se llena con el **seed** (ubicaciones de ejemplo) y se administra en **Administración → Catálogos**.
- El formulario de equipo muestra `ubicacion` como **desplegable** (no se escribe).
- No requiere cambiar el validador de `equipo` ni migrar datos.

**¿Hace falta crear la colección `catalogo` en Atlas manualmente?** No: la app la crea
sola al ejecutar el seed. **Opcional** (si quieres formalizarla con validador e índice),
ejecuta esto **una vez** en Atlas → tu clúster → **MongoDB Shell** (o *Collections → ...*):

```javascript
// OPCIONAL y NO destructivo. Ejecutar en la base Ceibal-Mantenimiento.
use('Ceibal-Mantenimiento');
db.createCollection('catalogo', {
  validator: { $jsonSchema: {
    bsonType: 'object',
    required: ['tipo', 'valor', 'activo'],
    properties: {
      tipo:  { bsonType: 'string', enum: ['ubicacion'] },
      valor: { bsonType: 'string' },
      activo:{ bsonType: 'bool' }
    }
  } }
});
db.catalogo.createIndex({ tipo: 1, valor: 1 }, { unique: true });
```

> **Riesgo:** ninguno si la colección `catalogo` aún no existe. Si ya la creó el seed,
> `createCollection` dará un aviso de que ya existe (inofensivo); en ese caso solo
> ejecuta la línea del `createIndex`. **No** toca `usuario/equipo/empresa/mantenimiento`.

---

# Paso 9 — Configuración necesaria en MongoDB Atlas

**Objetivo:** asegurar acceso a la base.

**Procedimiento (solo lo necesario):**
- **Database Access:** confirma que tu usuario de base de datos existe y tiene rol `readWrite` sobre `Ceibal-Mantenimiento` (o `Atlas admin` para pruebas).
- **Network Access:** agrega tu IP actual. Para desarrollo puedes usar `0.0.0.0/0` **temporalmente** y restringirlo después.
- **Cluster / Base / Colecciones / Validadores:** ya existen; **no hay que crear nada**.

**Cómo verificarlo:** con la IP autorizada y el usuario correcto, el Paso 5/6 conecta sin error de red ni de autenticación.

**Errores comunes:**
- `IP not whitelisted` → agrega tu IP en *Network Access*.
- `bad auth: authentication failed` → usuario/contraseña incorrectos en la cadena.

---

# Paso 10 — Errores comunes y cómo diagnosticarlos

| Síntoma | Causa | Solución |
|---|---|---|
| `querySrv ENOTFOUND` / `getaddrinfo ENOTFOUND` | Host mal escrito | Usa `ceibal-mantenimiento.8te39ap.mongodb.net` |
| `bad auth : authentication failed` | Credenciales incorrectas | Revisa usuario/contraseña en *Database Access* |
| `connection timed out` / `IP not whitelisted` | IP no autorizada | *Network Access* → agrega tu IP |
| `Document failed validation` | Un dato no cumple un validador | Ver el campo del mensaje; con el código alineado no debería ocurrir |
| App carga pero sin datos | No ejecutaste el seed, o la BD del `.env` no es la correcta | `npm run seed`; verifica `Ceibal-Mantenimiento` |
| `Network Error` / CORS | Backend apagado o URL equivocada | Levanta el backend; `web/.env` → `VITE_API_URL=http://localhost:3000` |
| Colecciones vacías pese al seed | El `.env` apunta a otra base | Corrige `Ceibal-Mantenimiento` en `MONGODB_URI` |
| `Cannot find module ...\bcrypt\...bcrypt_lib.node` | El paquete nativo `bcrypt` no compiló en Windows | Ya resuelto: el proyecto usa `bcryptjs` (JS puro). Ejecuta de nuevo `npm install` en `api/` y vuelve a intentar `npm run seed` |

**Si un error de validación aparece (`Document failed validation`), compárteme:**
1. La **colección** afectada. 2. El **campo** que menciona el error. 3. La **operación** (crear equipo / guardar mantenimiento / seed). Con eso identifico la regla y la corrección.

---

## Anexo — Correspondencia validador ↔ aplicación (ya alineada)

| Colección | Punto del validador | Cómo lo cumple la app |
|---|---|---|
| usuario | rol ∈ {tecnico, supervisor, administrador, auditor} | mismo enum; login por `correo` |
| equipo | `subTipo`, `serie` obligatorios; `estado` MAYÚSC.; `criticidad` MAYÚSC.; `marca`/`tipoEquipo` enum | esquema, DTO, formulario y seed usan esos valores exactos |
| empresa | nombre, nit, correo, telefono, activo obligatorios | DTO y seed los exigen/proveen |
| mantenimiento | empresa y periodo obligatorios; `horaInicio`/`horaFin` tipo date | formulario/DTO los exigen; el backend convierte «HH:MM» a fecha/hora |
| todas | colecciones en singular | cada esquema fija `collection: '<singular>'` |

**Estado:** la base (`Ceibal-Mantenimiento`) y el clúster (`Ceibal-mantenimiento`) ya
están confirmados y reflejados en esta guía y en `.env.example`. Solo debes poner tu
usuario y contraseña reales en `api/.env` (Paso 2). No necesito tu contraseña.
