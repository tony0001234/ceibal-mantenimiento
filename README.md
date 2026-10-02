# ceibal-mantenimiento

Sistema web de gestión y control del mantenimiento del Hospital General de Accidentes «Ceibal» del IGSS (Guatemala). Reemplaza la bitácora en papel y el formulario de Google Forms que usaba el área de mantenimiento para registrar las intervenciones a los equipos de refrigeración (aires acondicionados, refrigeradoras y congeladores).

Es el proyecto de graduación de Anthony Fabian Ramírez Orellana, Ingeniería en Sistemas de Información y Ciencias de la Computación, Universidad Mariano Gálvez de Guatemala, 2026.

En producción: https://ceibal-mantenimiento.vercel.app

## Qué hace

El técnico registra cada mantenimiento eligiendo el equipo desde un buscador, en lugar de escribir la marca o la ubicación a mano. La fecha, el técnico, la empresa afiliada y el costo se completan solos a partir de la sesión. Si ya existe un registro del mismo equipo en la misma fecha, el formulario muestra una advertencia de posible duplicado antes de guardar.

Con esos registros el sistema arma el historial de cada equipo y un panel de indicadores del mes (equipos fuera de servicio, MTTR, gráficas diarias de costo, emergencias y reparaciones, y avance por periodicidad). También genera reportes filtrables que se exportan a PDF y Excel con los mismos datos que se ven en pantalla. El encargado de mantenimiento administra usuarios, catálogos y costos desde la propia aplicación, sin tocar el código.

Hay cuatro roles. El técnico registra y consulta. El supervisor además edita el historial y genera reportes. El administrador configura todo. El auditor solo consulta.

## Estructura

```
ceibal-mantenimiento/
  api/   Backend: NestJS 11, Mongoose, MongoDB Atlas, JWT
  web/   Frontend: React 18, Vite 5, Bootstrap 5, Recharts
```

Cada carpeta tiene su propio README con más detalle: `api/README.md` y `web/README.md`.

El despliegue usa tres servicios: el frontend en Vercel, la API en Render y la base de datos en MongoDB Atlas. Solo la API lee y escribe en la base de datos.

## Requisitos

- Node.js 20 o superior
- Una base de datos en MongoDB Atlas

## Puesta en marcha local

Backend:

```bash
cd api
cp .env.example .env     # completar MONGODB_URI y JWT_SECRET
npm install
npm run seed             # usuarios, empresas y catálogos base
npm run seed:listados    # inventario real de 124 equipos
npm run start:dev        # http://localhost:3000, documentación en /docs
```

Frontend, en otra terminal:

```bash
cd web
npm install
npm run dev              # http://localhost:5173
```

El frontend busca la API en `http://localhost:3000`. Para apuntar a otra dirección, define `VITE_API_URL`.

### Variables de entorno del backend

| Variable | Uso |
|---|---|
| `MONGODB_URI` | Cadena de conexión a MongoDB Atlas |
| `JWT_SECRET` | Clave para firmar los tokens (32 caracteres o más en producción) |
| `JWT_EXPIRES` | Duración de la sesión, por defecto `8h` |
| `PORT` | Puerto de la API, por defecto `3000` |
| `FRONTEND_URL` | Orígenes permitidos por CORS, separados por coma |

El archivo `.env` no se sube al repositorio.

## Scripts de datos

Todos son idempotentes: se pueden ejecutar varias veces sin duplicar información. Todos menos `seed` aceptan `-- --dry` para ver qué harían sin escribir nada. Trabajan sobre la base indicada en `MONGODB_URI`, que normalmente es la de producción, así que conviene correr primero la simulación.

| Comando | Qué hace |
|---|---|
| `npm run seed` | Carga usuarios, empresas y catálogos base (`-- --reset` reinicia y vuelve a poblar) |
| `npm run seed:listados` | Carga o actualiza el inventario de equipos desde los listados oficiales |
| `npm run seed:septiembre` | Aplica los listados de septiembre 2026: asigna la categoría de contrato a cada equipo, normaliza ubicaciones y marcas, y da de baja lógica a los equipos retirados |
| `npm run migrate` | Completa la empresa de usuarios antiguos y los catálogos editables |
| `npm run backfill:costos` | Asigna costo a los preventivos registrados antes de que existiera el módulo de costos |

## Pruebas

```bash
cd api
npm test            # pruebas unitarias
npm run test:e2e    # pruebas de extremo a extremo con MongoDB en memoria
npm run test:cov    # cobertura
```

Las pruebas E2E levantan la aplicación real contra una MongoDB en memoria (`mongodb-memory-server`). Si no se puede descargar el binario, define `MONGOMS_SYSTEM_BINARY` con la ruta a un `mongod` local, o `MONGODB_URI_TEST` con una base desechable.

## Reglas de negocio importantes

La empresa de un mantenimiento siempre sale del usuario que inició sesión. El backend ignora cualquier empresa que venga en la petición, así un proveedor no puede registrar trabajos a nombre de otro.

El precio depende del tipo de trabajo. Un preventivo toma el costo de la configuración de su categoría, calculado como monto ofertado entre número de equipos entre número de períodos. Un correctivo lleva un precio que se ingresa a mano. Las llamadas de emergencia, las evaluaciones internas y cualquier trabajo en garantía no llevan precio. El costo se guarda al registrar, de modo que un cambio posterior en la configuración no altera los registros anteriores. La regla está en `api/src/mantenimientos/precio.util.ts` y tiene una copia en `web/src/data/constants.js` que hay que mantener igual.

Los equipos y los usuarios no se borran: se dan de baja o se desactivan para conservar el historial.

## Documentación del proyecto

Los archivos `INFORME-*.md` y `ANALISIS-*.md` de esta carpeta registran decisiones y cambios hechos durante el desarrollo. Los documentos `.docx` contienen los capítulos de la tesis, las guías de implementación y capacitación, y las constancias de recepción del sistema.
