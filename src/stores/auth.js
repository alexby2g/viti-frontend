import { defineStore } from 'pinia'
import { api, initCsrf, warmBackend } from '../boot/axios'
import { registerNativePushDevice, unregisterNativePushDevice } from '../utils/mobile'

function normalizeConnectionError(error) {
  const timedOut = ['ECONNABORTED', 'ETIMEDOUT'].includes(error?.code)
  if (timedOut || !error?.response) {
    error.userMessage = 'El servidor de VITI tardó demasiado en responder. Espera unos segundos e inténtalo nuevamente.'
  }
  return error
}

export const useAuthStore = defineStore('auth', {
  state: () => ({ user: null, initialized: false, loading: false, setupRequired: null, loginStage: '' }),
  getters: { isAuthenticated: s => Boolean(s.user) },
  actions: {
    async checkSetup() {
      try {
        const { data } = await api.get('/setup/status', { timeout: 5000 })
        this.setupRequired = Boolean(data.requiere_configuracion)
      } catch {
        // La disponibilidad del backend no debe impedir que Vue renderice la app.
        // En una instalación ya configurada, continuar hacia login es el fallback seguro.
        this.setupRequired = false
      }
      return this.setupRequired
    },
    async initialize(force = false) {
      if (this.initialized && !force) return this.isAuthenticated
      try {
        const { data } = await api.get('/auth/status', { timeout: 5000 })
        this.user = data.usuario || null
        if (this.user) registerNativePushDevice(api).catch(() => {})
      } catch { this.user = null }
      finally { this.initialized = true }
      return this.isAuthenticated
    },
    async setup(payload) {
      this.loading = true
      try {
        await warmBackend()
        await initCsrf()
        const { data } = await api.post('/setup', payload, { timeout: 30000 })
        this.user = data.usuario
        this.setupRequired = false
        this.initialized = true
        registerNativePushDevice(api).catch(() => {})
        return data
      } catch (error) {
        throw normalizeConnectionError(error)
      } finally { this.loading = false }
    },
    async login(payload) {
      this.loading = true
      this.loginStage = 'Conectando con VITI...'
      try {
        await warmBackend()
        this.loginStage = 'Preparando sesión segura...'
        await initCsrf()
        this.loginStage = 'Validando acceso...'
        const { data } = await api.post('/auth/login', payload, { timeout: 30000 })
        this.user = data.usuario
        this.initialized = true
        registerNativePushDevice(api).catch(() => {})
        return data
      } catch (error) {
        throw normalizeConnectionError(error)
      } finally {
        this.loading = false
        this.loginStage = ''
      }
    },
    async registerClient(payload) {
      this.loading = true
      try {
        await warmBackend()
        await initCsrf()
        const { data } = await api.post('/auth/cliente/registro', payload, { timeout: 30000 })
        this.user = data.usuario
        this.initialized = true
        registerNativePushDevice(api).catch(() => {})
        return data
      } catch (error) {
        throw normalizeConnectionError(error)
      } finally { this.loading = false }
    },
    async loginElectrofrioCustomer(payload) {
      this.loading = true
      try {
        await warmBackend()
        await initCsrf()
        const { data } = await api.post('/auth/electrofrio/login', payload, { timeout: 30000 })
        this.user = data.usuario
        this.initialized = true
        registerNativePushDevice(api).catch(() => {})
        return data
      } catch (error) {
        throw normalizeConnectionError(error)
      } finally { this.loading = false }
    },
    async logout() {
      try {
        await initCsrf()
        await api.post('/auth/logout', null, { timeout: 30000 })
      } catch {}
      finally { this.user = null; this.initialized = true }
    },
  },
})