import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Prototipo NO funcional del inciso 5.3.
// base './' permite abrir la version compilada (dist) directamente en el navegador.
export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    port: 5173,
    open: true,
  },
})
