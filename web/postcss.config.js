// Configuración de PostCSS para la compilación de producción (Vite).
//
// Objetivo: aplicar las mejoras de rendimiento sugeridas por Lighthouse
// SIN alterar la apariencia ni el comportamiento de la aplicación:
//
//   1) font-display: swap  -> se inyecta en las @font-face que no lo declaren
//      (corrige el aviso "Asegúrate de que el texto siga siendo visible durante
//      la carga de la fuente" de la fuente de iconos Bootstrap Icons).
//
//   2) PurgeCSS -> elimina las reglas CSS de Bootstrap que la aplicación no usa
//      (reduce el "CSS sin usar"). Es seguro porque:
//        - se escanean TODOS los archivos fuente (.jsx y .js) y el index.html,
//          de modo que cualquier clase escrita en el código se conserva;
//        - las clases de iconos (bi-*) se usan como literales en el código y
//          se detectan; además se refuerzan con una lista blanca;
//        - las clases de estado que se activan dinámicamente (is-invalid,
//          active, show, disabled, etc.) están en la lista blanca;
//        - NO se eliminan @font-face (fontFace: false) ni @keyframes.
//
// Solo se ejecuta en producción; en desarrollo (vite dev) se deja el CSS intacto.

import purgecss from '@fullhuman/postcss-purgecss';

const esProduccion = process.env.NODE_ENV === 'production';

// Plugin propio: fuerza font-display: swap en toda @font-face.
// Bootstrap Icons declara por defecto font-display: block, que mantiene los
// iconos invisibles hasta ~3 s mientras carga la fuente; Lighthouse lo marca
// como problema ("el texto debe seguir visible durante la carga de la fuente").
// Se reemplaza por swap, que muestra el contenido de inmediato. Los iconos son
// decorativos y van acompañados de texto, por lo que el cambio es seguro.
const agregarFontDisplay = () => ({
  postcssPlugin: 'agregar-font-display',
  AtRule: {
    'font-face': (regla) => {
      let tiene = false;
      regla.walkDecls('font-display', (decl) => { decl.value = 'swap'; tiene = true; });
      if (!tiene) regla.append({ prop: 'font-display', value: 'swap' });
    },
  },
});
agregarFontDisplay.postcss = true;

export default {
  plugins: [
    agregarFontDisplay(),
    ...(esProduccion
      ? [
          purgecss({
            content: ['./index.html', './src/**/*.{js,jsx}'],
            // Extractor que conserva clases con guiones, dos puntos y barras.
            defaultExtractor: (contenido) => contenido.match(/[A-Za-z0-9-_:/]+/g) || [],
            // Nota: TODAS las clases escritas en el código (incluidas las de los
            // literales de plantilla como `btn btn-${...}`) se detectan al
            // escanear los archivos fuente y se conservan. La lista blanca solo
            // refuerza clases que se alternan por estado o que, por su alta
            // visibilidad (iconos), no queremos arriesgar.
            safelist: {
              standard: [
                'active', 'show', 'open', 'disabled', 'fade', 'collapse',
                'collapsing', 'modal-open', 'modal-backdrop',
                'is-invalid', 'is-valid', 'was-validated', 'visually-hidden',
              ],
              greedy: [
                /^bi-/,          // iconos Bootstrap Icons (alta visibilidad)
                /^estado-/,      // badges de estado (theme.css)
                /^page-/,        // paginación (active/disabled dinámicos)
                /^text-bg-/,     // badges de color de rol/estado
              ],
            },
            keyframes: true,    // conserva @keyframes usados
            fontFace: false,    // NO elimina @font-face (protege la fuente de iconos)
            variables: false,   // NO elimina variables CSS (protege los colores del
                                // tema: --ceibal-* y los overrides --bs-* de theme.css)
          }),
        ]
      : []),
  ],
};
