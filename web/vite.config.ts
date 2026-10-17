import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const backend = loadEnv(mode, process.cwd(), '').BACKEND_URL ?? 'http://localhost:8000'
  return {
    plugins: [
      react(),
      babel({ presets: [reactCompilerPreset()] }),
      tailwindcss(),
    ],
    server: {
      proxy: {
        '/api': backend,
        '/media': backend,
        '/healthz': backend,
        '/ws': { target: backend, ws: true },
      },
    },
  }
})
