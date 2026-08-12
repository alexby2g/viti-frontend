import { defineStore } from 'pinia'
import { colors } from 'quasar'
import { api } from '../boot/axios'
import { mediaUrl } from '../utils/media'

const defaults = {
  studio_name: 'AGR Studio',
  product_name: 'VITI',
  product_meaning: 'Visión Integral, Tecnología e Innovación',
  tagline: 'Plataforma de proyectos y soluciones digitales',
  logo_path: null,
  primary_color: '#1565C0',
  secondary_color: '#43A047',
  accent_color: '#FB8C00',
  dark_color: '#071C3B',
  drawer_color: '#092B55',
  guide_enabled: true,
  guide_position: 'right-center',
}

export const useBrandingStore = defineStore('branding', {
  state: () => ({ ...defaults, loaded: false, loading: false, saving: false }),
  getters: {
    logoUrl: state => state.logo_path ? mediaUrl(state.logo_path) : '',
    productLabel: state => state.product_name || defaults.product_name,
  },
  actions: {
    assign(data = {}) {
      for (const key of Object.keys(defaults)) {
        if (data[key] !== undefined && data[key] !== null) this[key] = data[key]
      }
      this.apply()
    },
    apply() {
      colors.setBrand('primary', this.primary_color)
      colors.setBrand('secondary', this.secondary_color)
      colors.setBrand('accent', this.accent_color)
      colors.setBrand('dark', this.dark_color)
      document.documentElement.style.setProperty('--viti-drawer-live', this.drawer_color)
      document.documentElement.style.setProperty('--viti-primary-live', this.primary_color)
      document.title = `${this.product_name} · ${this.studio_name}`
    },
    async load(force = false) {
      if (this.loaded && !force) return
      this.loading = true
      try {
        const { data } = await api.get('/branding', { timeout: 5000 })
        this.assign(data?.data || {})
      } catch {
        this.apply()
      } finally {
        this.loaded = true
        this.loading = false
      }
    },
    async save(payload) {
      this.saving = true
      try {
        const { data } = await api.put('/branding', payload)
        this.assign(data?.data || payload)
        return data?.data
      } finally {
        this.saving = false
      }
    },
    async uploadLogo(file) {
      const form = new FormData()
      form.append('logo', file)
      const { data } = await api.post('/branding/logo', form, { headers: { 'Content-Type': 'multipart/form-data' } })
      this.assign(data?.data || {})
      return data?.data
    },
    async removeLogo() {
      const { data } = await api.delete('/branding/logo')
      this.assign(data?.data || { logo_path: null })
      this.logo_path = null
      return data?.data
    },
    defaults() {
      return { ...defaults }
    },
  },
})
