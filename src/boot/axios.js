import { boot } from 'quasar/wrappers'
import axios from 'axios'

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'
const backendRoot = baseURL.replace(/\/api\/v1\/?$/, '')
export const api = axios.create({ baseURL, withCredentials: true, withXSRFToken: true })
export const initCsrf = () => axios.get(`${backendRoot}/sanctum/csrf-cookie`, { withCredentials: true })

api.interceptors.request.use(config => {
  const empresaId = localStorage.getItem('viti-empresa-id')
  if (empresaId) config.headers['X-VITI-Empresa'] = empresaId
  return config
})

export default boot(({ app }) => { app.config.globalProperties.$api = api })
