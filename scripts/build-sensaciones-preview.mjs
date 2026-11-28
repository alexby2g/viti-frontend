import { spawnSync } from 'node:child_process'

// En esta rama ninguna variable heredada de Vercel debe dirigir el preview
// a la API real de Viti. El proxy de staging se configurará explícitamente.
const env = { ...process.env, VITE_API_URL: '/api/v1', VITE_SENSACIONES_OFFLINE_PREVIEW: '1' }
const result = spawnSync('npm', ['run', 'build'], { env, stdio: 'inherit', shell: process.platform === 'win32' })
if (result.error) throw result.error
process.exit(result.status ?? 1)
