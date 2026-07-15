import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Vite se encarga que en desarrollo que cualquier llamada a /api/* se redirigen al backend Express.
    // Así el frontend usa rutas relativas y no hay problemas de CORS.
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
})
