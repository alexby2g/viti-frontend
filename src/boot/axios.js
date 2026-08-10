import { boot } from 'quasar/wrappers'
import axios from 'axios'

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'
const backendRoot = baseURL.replace(/\/api\/v1\/?$/, '')
const authRequestTimeout = 30000
const backendWakeTimeout = 75000

export const api = axios.create({ baseURL, withCredentials: true, withXSRFToken: true })
export const initCsrf = () => axios.get(`${backendRoot}/sanctum/csrf-cookie`, {
  withCredentials: true,
  timeout: authRequestTimeout,
})

let backendWakePromise = null
let lastHealthyAt = 0

export const warmBackend = () => {
  if (Date.now() - lastHealthyAt < 60000) return Promise.resolve(true)
  if (backendWakePromise) return backendWakePromise

  backendWakePromise = axios.get(`${backendRoot}/api/health`, {
    timeout: backendWakeTimeout,
    headers: { Accept: 'application/json' },
  }).then(() => {
    lastHealthyAt = Date.now()
    return true
  }).finally(() => {
    backendWakePromise = null
  })

  return backendWakePromise
}

api.interceptors.request.use(config => {
  const empresaId = localStorage.getItem('viti-empresa-id')
  if (empresaId) config.headers['X-VITI-Empresa'] = empresaId

  // La administración de Peluquería no debe reutilizar el padrón completo de empresas VITI.
  // Su selector solo recibe negocios que realmente tienen una instancia Peluquería provisionada.
  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/apps/peluqueria') && config.url === '/empresas') {
    config.url = '/apps/peluqueria/empresas'
    config.params = undefined
  }

  // Cuando enviamos FormData (mensajes con texto/fotos, logos, etc.), el navegador
  // debe construir el Content-Type con su boundary. Si una vista fija manualmente
  // multipart/form-data, lo retiramos aquí para evitar peticiones que Laravel no
  // pueda interpretar correctamente en algunos navegadores/WebView.
  if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
    if (typeof config.headers?.delete === 'function') config.headers.delete('Content-Type')
    else if (config.headers) delete config.headers['Content-Type']
  }

  return config
})

export default boot(({ app }) => { app.config.globalProperties.$api = api })
