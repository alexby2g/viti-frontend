import { defineStore } from 'pinia'
import { Notify } from 'quasar'
import { api } from '../boot/axios'

const NOTIFICATIONS_ENDPOINT = '/notificaciones/buzon'
const MARK_ALL_READ_ENDPOINT = '/notificaciones/buzon/leer-todo'

function normalizeItem(item = {}) {
  return {
    ...item,
    titulo: item.titulo || item.title || 'Actividad de VITI',
    mensaje: item.mensaje || item.message || '',
    ruta: item.ruta || item.path || item.route || null,
    // El endpoint del centro devuelve únicamente pendientes de lectura.
    leida: item.leida ?? (item.read ?? (item.leido_at ? true : false)),
  }
}

export const useNotificationsStore = defineStore('notifications', {
  state: () => ({
    unreadCount: 0,
    items: [],
    timer: null,
    loading: false,
    initialized: false,
    lastUpdatedAt: null,
  }),
  actions: {
    async refresh() {
      if (this.loading) return
      this.loading = true
      try {
        const previous = this.unreadCount
        const { data } = await api.get(NOTIFICATIONS_ENDPOINT)
        const next = Number(data?.data?.no_leidos || 0)
        this.unreadCount = next
        this.items = Array.isArray(data?.data?.items) ? data.data.items.map(normalizeItem) : []
        this.lastUpdatedAt = new Date().toISOString()

        if (this.initialized && next > previous) {
          const nuevos = next - previous
          Notify.create({
            type: 'info',
            icon: 'notifications_active',
            message: nuevos === 1 ? 'Tienes una nueva notificación en VITI.' : `Tienes ${nuevos} notificaciones nuevas en VITI.`,
            position: 'top-right',
            timeout: 4000,
          })
        }
        this.initialized = true
      } catch (error) {
        if (error?.response?.status !== 401) console.warn('No se pudieron actualizar las notificaciones internas.')
      } finally {
        this.loading = false
      }
    },
    start() {
      this.stop()
      this.refresh()
      this.timer = window.setInterval(() => this.refresh(), 20000)
    },
    stop() {
      if (this.timer) window.clearInterval(this.timer)
      this.timer = null
    },
    async markAllRead() {
      try {
        await api.post(MARK_ALL_READ_ENDPOINT)
      } finally {
        await this.refresh()
      }
    },
    clear() {
      this.stop()
      this.unreadCount = 0
      this.items = []
      this.initialized = false
      this.lastUpdatedAt = null
    },
  },
})
