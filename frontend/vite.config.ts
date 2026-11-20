import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { execSync } from 'child_process'

function versaoApp(): string {
  try { return execSync('git rev-parse --short HEAD').toString().trim() } catch { return '' }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: './',
  define: { 'import.meta.env.VITE_APP_VERSAO': JSON.stringify(versaoApp()) },
})
