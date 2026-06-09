import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/EinterWeb/',
  server: {
    proxy: {
      '/api': {
        target: 'https://einterapi-production.up.railway.app/',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '/api'),
      },
    },
  },
})
