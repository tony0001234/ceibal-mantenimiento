import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base './' permite abrir la version compilada (dist) directamente en el navegador.
export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    port: 5173,
    open: true,
  },
  build: {
    // Reparte las dependencias grandes en un fragmento "vendor" cacheable, de
    // modo que el navegador no vuelva a descargarlas cuando cambie el código de
    // la aplicación. Junto con la carga diferida de vistas (React.lazy), reduce
    // el JavaScript que la pantalla de login necesita en la primera carga.
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'http-vendor': ['axios'],
        },
      },
    },
  },
})
