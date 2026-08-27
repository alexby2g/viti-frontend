<script setup>
import { computed } from 'vue'

const props = defineProps({
  status: { type: String, default: 'empty' },
  savedAt: { type: String, default: '' },
})

const meta = computed(() => ({
  empty: { icon: 'edit_note', label: 'Sin cambios guardados', tone: 'muted' },
  pending: { icon: 'cloud_upload', label: 'Guardando borrador…', tone: 'pending' },
  synced: { icon: 'cloud_done', label: 'Borrador guardado', tone: 'ok' },
  offline: { icon: 'cloud_off', label: 'Sin conexión', tone: 'offline' },
  'offline-pending': { icon: 'sync_problem', label: 'Sin conexión · cambios pendientes', tone: 'warning' },
  conflict: { icon: 'warning', label: 'Hay cambios en conflicto', tone: 'danger' },
}[props.status] || {
  icon: 'help_outline', label: 'Estado no disponible', tone: 'muted'
}))

const savedLabel = computed(() => {
  if (!props.savedAt || props.status !== 'synced') return ''
  const date = new Date(props.savedAt)
  return Number.isNaN(date.getTime()) ? '' : ` · ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
})
</script>

<template>
  <div class="draft-sync-status" :class="`tone-${meta.tone}`" role="status" aria-live="polite">
    <q-icon :name="meta.icon" size="18px" />
    <span>{{ meta.label }}</span>
    <span v-if="savedLabel" class="saved-time">{{ savedLabel }}</span>
  </div>
</template>

<style scoped>
.draft-sync-status{display:inline-flex;align-items:center;gap:7px;border:1px solid #dce7ec;border-radius:999px;padding:7px 11px;background:#fff;color:#587180;font-size:12px;font-weight:700}.saved-time{font-weight:500;color:#7d919c}.tone-ok{color:#14724b;background:#f0fbf6;border-color:#c8ead9}.tone-pending{color:#1565c0;background:#f2f7ff;border-color:#cfe1ff}.tone-offline{color:#6f7e86;background:#f6f8f9}.tone-warning{color:#9a6400;background:#fff8e7;border-color:#f1dfb0}.tone-danger{color:#a43b3b;background:#fff0f0;border-color:#f0c8c8}.tone-muted{color:#71808a}
</style>
