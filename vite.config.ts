import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 5173, open: false },
  // three.js is lazy-loaded with the 3D attitude panel; its chunk is large by nature.
  build: { chunkSizeWarningLimit: 1200 },
})
