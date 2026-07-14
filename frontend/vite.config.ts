import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // En desarrollo, las llamadas a /api/* se redirigen al backend Express.
    // Así el frontend usa rutas relativas y no hay problemas de CORS.
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
})
