import { spawnSync } from 'node:child_process'

// Production keeps Viti's original API configuration. Preview remains disconnected.
const production = process.env.VERCEL_ENV === 'production'
const env = production
  ? { ...process.env, VITE_SENSACIONES_OFFLINE_PREVIEW: '0' }
  : { ...process.env, VITE_API_URL: '/api/v1', VITE_SENSACIONES_OFFLINE_PREVIEW: '1' }
// Fail the deployment before bundling if the pure video-editor tests regress.
const qa = spawnSync(process.execPath, ['--test', 'tests/sensaciones-composition.test.mjs'], { env, stdio: 'inherit' })
if (qa.error) throw qa.error
if (qa.status !== 0) process.exit(qa.status ?? 1)
const result = spawnSync('npm', ['run', 'build'], { env, stdio: 'inherit', shell: process.platform === 'win32' })
if (result.error) throw result.error
process.exit(result.status ?? 1)
