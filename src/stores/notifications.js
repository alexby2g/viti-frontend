import { defineStore } from 'pinia'
import { Notify } from 'quasar'
import { api } from '../boot/axios'

export const useNotificationsStore = defineStore('notifications', {
  state: () => ({ unreadCount:0, items:[], timer:null, loading:false, initialized:false }),
  actions: {
    async refresh() {
      if (this.loading) return
      this.loading = true
      try {
        const previous = this.unreadCount
        const { data } = await api.get('/notificaciones/centro')
        const next = Number(data?.data?.no_leidos || 0)
        this.unreadCount = next
        this.items = Array.isArray(data?.data?.items) ? data.data.items : []
        if (this.initialized && next > previous) {
          const nuevos = next - previous
          Notify.create({ type:'info', icon:'notifications_active', message:nuevos===1?'Tienes una nueva notificación en VITI.':`Tienes ${nuevos} notificaciones nuevas en VITI.`, position:'top-right', timeout:4000 })
        }
        this.initialized = true
      } catch (error) {
        if (error?.response?.status !== 401) console.warn('No se pudieron actualizar las notificaciones internas.')
      } finally { this.loading = false }
    },
    start() { this.stop(); this.refresh(); this.timer = window.setInterval(() => this.refresh(), 20000) },
    stop() { if (this.timer) window.clearInterval(this.timer); this.timer = null },
    async markAllRead() { await api.post('/notificaciones/centro/leer-todo'); await this.refresh() },
    clear() { this.stop(); this.unreadCount=0; this.items=[]; this.initialized=false },
  },
})
