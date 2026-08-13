import { defineStore } from 'pinia'
import { api } from '../boot/axios'

export const useTenantStore = defineStore('tenant', {
  state: () => ({ businesses: [], activeId: Number(localStorage.getItem('viti-empresa-id') || 0), loaded: false }),
  getters: {
    active(state) { return state.businesses.find(item => Number(item.id) === Number(state.activeId)) || state.businesses[0] || null },
    role() { return this.active?.rol || null },
    canManage() { return ['propietario','administrador'].includes(this.role) },
    features() { return this.active?.features || null },
    modules() {
      const modules = this.features?.modulos_efectivos ?? this.features?.modulos ?? this.active?.plan?.modulos
      return Array.isArray(modules) ? modules : null
    },
    hasModule() { return module => this.modules === null || this.modules.includes(module) },
    userUsage() { return this.features?.usuarios || null },
    appUsage() { return this.features?.aplicaciones || null },
  },
  actions: {
    async load() {
      const { data } = await api.get('/mi/negocios')
      this.businesses = Array.isArray(data?.data) ? data.data : []
      if (!this.businesses.some(item => Number(item.id) === Number(this.activeId))) this.activeId = Number(this.businesses[0]?.id || 0)
      if (this.activeId) localStorage.setItem('viti-empresa-id', String(this.activeId))
      else localStorage.removeItem('viti-empresa-id')
      this.loaded = true
      return this.active
    },
    select(id) {
      this.activeId = Number(id || 0)
      if (this.activeId) localStorage.setItem('viti-empresa-id', String(this.activeId))
      else localStorage.removeItem('viti-empresa-id')
      window.dispatchEvent(new CustomEvent('viti-tenant-changed', { detail: this.activeId }))
    },
    clear() {
      this.businesses = []
      this.activeId = 0
      this.loaded = false
      localStorage.removeItem('viti-empresa-id')
    },
  },
})
