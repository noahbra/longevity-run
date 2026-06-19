/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// base is the repo subpath for production builds only (GitHub Pages serves the
// app under /longevity-run/); local dev + preview stay at root.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/longevity-run/' : '/',
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
}))
