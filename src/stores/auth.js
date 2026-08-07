import { defineStore } from 'pinia'
import { api, initCsrf } from '../boot/axios'
import { registerNativePushDevice, unregisterNativePushDevice } from '../utils/mobile'

export const useAuthStore = defineStore('auth', {
  state: () => ({ user: null, initialized: false, loading: false, setupRequired: null }),
  getters: { isAuthenticated: s => Boolean(s.user) },
  actions: {
    async checkSetup() { const { data } = await api.get('/setup/status'); this.setupRequired = data.requiere_configuracion; return this.setupRequired },
    async initialize(force = false) {
      if (this.initialized && !force) return this.isAuthenticated
      try {
        const { data } = await api.get('/auth/status')
        this.user = data.usuario || null
        if (this.user) registerNativePushDevice(api).catch(() => {})
      } catch { this.user = null }
      finally { this.initialized = true }
      return this.isAuthenticated
    },
    async setup(payload) {
      this.loading = true
      try {
        await initCsrf()
        const { data } = await api.post('/setup', payload)
        this.user = data.usuario
        this.setupRequired = false
        this.initialized = true
        registerNativePushDevice(api).catch(() => {})
        return data
      } finally { this.loading = false }
    },
    async login(payload) {
      this.loading = true
      try {
        await initCsrf()
        const { data } = await api.post('/auth/login', payload)
        this.user = data.usuario
        this.initialized = true
        registerNativePushDevice(api).catch(() => {})
        return data
      } finally { this.loading = false }
    },
    async registerClient(payload) {
      this.loading = true
      try {
        await initCsrf()
        const { data } = await api.post('/auth/cliente/registro', payload)
        this.user = data.usuario
        this.initialized = true
        registerNativePushDevice(api).catch(() => {})
        return data
      } finally { this.loading = false }
    },
    async logout() {
      try {
        await unregisterNativePushDevice(api)
        await initCsrf()
        await api.post('/auth/logout')
      } catch {}
      finally { this.user = null; this.initialized = true }
    },
  },
})
