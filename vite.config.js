import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/login':    { target: 'http://127.0.0.1:5000', changeOrigin: true },
      '/register': { target: 'http://127.0.0.1:5000', changeOrigin: true },
      '/donors':   { target: 'http://127.0.0.1:5000', changeOrigin: true },
      '/api':      { target: 'http://127.0.0.1:5000', changeOrigin: true },
      '/forgot-password': { target: 'http://127.0.0.1:5000', changeOrigin: true },
      '/verify-otp': { target: 'http://127.0.0.1:5000', changeOrigin: true },
      '/reset-password': { target: 'http://127.0.0.1:5000', changeOrigin: true },
      '/admin':    { target: 'http://127.0.0.1:5000', changeOrigin: true },
      '/socket.io': { target: 'http://127.0.0.1:5000', changeOrigin: true, ws: true },
    }
  }
})
