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
  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/apps/peluqueria') && config.url === '/empresas') {
    config.url = '/apps/peluqueria/empresas'
    config.params = undefined
  }

  // Al abandonar un chat Vue puede intentar completar un último polling/ping con el ID anterior.
  // No enviamos esa petición con el contexto de la pantalla nueva: evitamos 404 y, más importante,
  // impedimos que un ID de conversación de una app termine consultándose contra otro buzón.
  if (typeof window !== 'undefined') {
    const url = String(config.url || '')
    const path = window.location.pathname
    const staleVitiChat = /^\/buzon\/\d+/.test(url) && !path.startsWith('/buzon')
    const staleClientChat = /^\/mi\/buzon\/\d+/.test(url) && !path.startsWith('/mi-buzon')
    if (staleVitiChat || staleClientChat) {
      throw new axios.CanceledError('Petición de chat descartada al cambiar de pantalla.')
    }
  }

  // El navegador debe construir el Content-Type de FormData con su boundary.
  if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
    if (typeof config.headers?.delete === 'function') config.headers.delete('Content-Type')
    else if (config.headers) delete config.headers['Content-Type']
  }

  return config
})

api.interceptors.response.use(
  response => {
    lastHealthyAt = Date.now()
    return response
  },
  async error => {
    const config = error?.config
    const method = String(config?.method || 'get').toLowerCase()
    const safeRead = method === 'get' || method === 'head'
    const status = Number(error?.response?.status || 0)
    const retryableStatus = [502, 503, 504].includes(status)
    const retryableNetwork = !error?.response || ['ECONNABORTED', 'ETIMEDOUT'].includes(error?.code)
    const online = typeof navigator === 'undefined' || navigator.onLine

    if (!config || config.__vitiWakeRetry || !safeRead || !online || (!retryableStatus && !retryableNetwork)) {
      return Promise.reject(error)
    }

    config.__vitiWakeRetry = true
    try {
      await warmBackend()
      return api.request(config)
    } catch {
      return Promise.reject(error)
    }
  },
)

export default boot(({ app }) => { app.config.globalProperties.$api = api })
