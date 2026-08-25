# Frontend — Sistema de Control de Mantenimiento Hospital «Ceibal» (IGSS)

Interfaz web del sistema, construida con **React 18 + Vite + Bootstrap 5**.
Consume la API REST del backend (`../api`). Corresponde a las Fases 3–5 de la
guía de implementación.

## Requisitos
- Node.js 18+ y el backend (`../api`) en ejecución.

## Configuración
Copia `.env.example` a `.env`:

```env
VITE_API_URL=http://localhost:3000      # desarrollo
# En producción detrás de Nginx:  VITE_API_URL=/api
```

## Comandos
```bash
npm install       # instalar dependencias
npm run dev       # servidor de desarrollo en http://localhost:5173
npm run build     # compilar a dist/ (estático, listo para desplegar)
npm run preview   # previsualizar la build
```

## Pantallas (módulos)
| Ruta | Módulo | Roles |
|---|---|---|
| `/` | Inicio de sesión (RF01) | todos |
| `/app/panel` | Panel de indicadores (RF08) | admin, supervisor |
| `/app/registro` | Registro de mantenimiento (RF03–RF05) | todos |
| `/app/equipos` | Inventario de equipos (RF02) | todos (edición: admin) |
| `/app/historial` | Historial y ficha técnica (RF06) | todos |
| `/app/reportes` | Reportes y exportación (RF07) | admin, supervisor |
| `/app/administracion` | Usuarios y catálogos (RF10) | admin |

## Arquitectura del frontend
```
src/
  api/         cliente axios (client.js) + funciones por módulo (services.js)
  context/     AuthContext (login JWT, sesión persistida)
  components/  Layout (4 zonas), EstadoBadge
  data/        constants.js (enums y menú por rol)
  pages/       las 6 pantallas del sistema
  theme.css    diseño institucional (paleta semántica 5.3.2)
```

El token JWT se guarda en `localStorage` y se adjunta automáticamente a cada
petición; si expira (401), la sesión se cierra sola.
