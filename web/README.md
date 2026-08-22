# Prototipo web — Sistema de Control de Mantenimiento (Hospital «Ceibal», IGSS)

Prototipo **NO funcional** correspondiente al **inciso 5.3 (Maquetación y diseño de la interfaz)** del anteproyecto de graduación *«Implementación de un Sistema Web de Gestión y Control del Mantenimiento del Hospital General de Accidentes Ceibal»*.

Su objetivo es representar visualmente y de forma navegable cómo será el sistema desde la perspectiva del usuario final. **No** incluye base de datos, autenticación real, APIs ni lógica de negocio: los datos son simulados y las acciones (guardar, exportar, etc.) son demostrativas. La construcción del backend y la lógica real corresponde a etapas posteriores (5.4 en adelante).

## Tecnología
- **React 18** + **Vite** (según el stack definido en el apartado 5.2.1 del documento).
- **Bootstrap 5** + **Bootstrap Icons** (sistema de rejilla responsivo y *system font stack*, apartado 5.3.1).
- Enrutamiento con `react-router-dom` (HashRouter, para poder abrir la versión compilada directamente).

## Cómo ejecutarlo
```bash
cd web
npm install
npm run dev
```
Luego abrir la URL que muestra la terminal (por defecto http://localhost:5173).

Para generar la versión estática:
```bash
npm run build      # genera la carpeta dist/
npm run preview    # sirve la versión compilada
```

## Usuarios de demostración (RF01)
| Usuario  | Contraseña   | Rol           |
|----------|--------------|---------------|
| admin    | admin123     | Administrador |
| rlopez   | super123     | Supervisor    |
| pgarcia  | tecnico123   | Técnico       |

El menú lateral muestra únicamente los módulos permitidos para cada rol.

## Módulos incluidos
1. **Panel de indicadores** (RF08) — KPIs, distribución por tipo y últimos registros. *(Supervisor/Administrador)*
2. **Registro de mantenimiento** (RF03/RF04/RF05) — formulario a 2 columnas, catálogos con búsqueda, aviso de duplicado.
3. **Equipos** (RF02) — inventario con búsqueda, filtros, estado semántico y paginación.
4. **Historial** (RF06) — mantenimientos por equipo.
5. **Reportes** (RF07) — filtros, resumen, detalle y plantilla exportable (simulada).
6. **Administración** (RF10) — usuarios y catálogos. *(Solo Administrador)*

## Diseño (inciso 5.3)
- Azul institucional IGSS + paleta semántica de 4 estados (Funcionando / En mantenimiento / Fuera de servicio / Dado de baja); el color nunca es el único medio: siempre se acompaña de etiqueta textual.
- Escala tipográfica y estructura de 4 zonas (barra superior, menú lateral, área de contenido, zona de acciones) según el apartado 5.3.3.
- Diseño responsivo (RF09): en móvil el menú se colapsa, el formulario pasa a una columna y las tablas se desplazan.
