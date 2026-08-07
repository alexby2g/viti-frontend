import { defineConfig } from '#q-app/wrappers'
export default defineConfig(() => ({
  boot: ['theme', 'axios', 'offline'],
  css: ['app.scss'],
  extras: ['material-icons'],
  build: { vueRouterMode: 'history', env: { API_URL: process.env.VITE_API_URL || 'http://localhost:8000/api/v1' } },
  framework: { config: { brand: { primary:'#1565C0', secondary:'#43A047', accent:'#FB8C00', dark:'#071C3B' } }, plugins: ['Notify','Dialog','Loading'] },
  devServer: { open: true }
}))
