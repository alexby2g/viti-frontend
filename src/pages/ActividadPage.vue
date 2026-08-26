<script setup>
import { computed, onMounted } from 'vue'
import { useNotificationsStore } from '../stores/notifications'
import PageHeader from '../components/PageHeader.vue'

const notifications = useNotificationsStore()
const activity = computed(() => notifications.items || [])
const unread = computed(() => activity.value.filter(item => item.leida === false || item.read === false).length)

function title(item) {
  return item?.titulo || item?.title || item?.mensaje || item?.message || 'Actividad de VITI'
}

function message(item) {
  return item?.mensaje || item?.message || item?.descripcion || item?.description || 'Hay actividad nueva disponible.'
}

function kind(item) {
  const value = String(item?.tipo || item?.type || item?.categoria || '').toLowerCase()
  if (value.includes('pago')) return { icon: 'payments', color: 'teal', label: 'Pago' }
  if (value.includes('solicitud')) return { icon: 'assignment', color: 'primary', label: 'Solicitud' }
  if (value.includes('proyecto')) return { icon: 'account_tree', color: 'deep-purple', label: 'Proyecto' }
  if (value.includes('soporte')) return { icon: 'support_agent', color: 'orange', label: 'Soporte' }
  if (value.includes('mensaje')) return { icon: 'chat', color: 'blue', label: 'Mensaje' }
  return { icon: 'notifications', color: 'grey-7', label: 'Sistema' }
}

function routeFor(item) {
  const route = item?.ruta || item?.route || item?.url
  return route === '/dashboard' ? '/' : (route || null)
}

function open(item) {
  const route = routeFor(item)
  if (route) window.location.assign(route)
}

onMounted(() => notifications.refresh())
</script>

<template>
  <q-page class="viti-page">
    <PageHeader eyebrow="Actividad" title="Centro de actividad" subtitle="Revisa aquí las notificaciones pendientes que alimentan el Command Center.">
      <q-btn outline no-caps icon="refresh" label="Actualizar" :loading="notifications.loading" @click="notifications.refresh" />
      <q-btn v-if="notifications.unreadCount" color="primary" unelevated no-caps icon="done_all" label="Marcar todo leído" @click="notifications.markAllRead" />
    </PageHeader>

    <div class="row q-col-gutter-md q-mb-lg">
      <div class="col-6 col-md-3"><q-card flat class="viti-card"><q-card-section><div class="text-caption text-grey-6">Pendientes</div><div class="metric">{{ activity.length }}</div><div class="text-caption">notificaciones disponibles</div></q-card-section></q-card></div>
      <div class="col-6 col-md-3"><q-card flat class="viti-card"><q-card-section><div class="text-caption text-grey-6">Sin leer</div><div class="metric" :class="unread ? 'text-negative' : ''">{{ unread }}</div><div class="text-caption">requieren revisión</div></q-card-section></q-card></div>
      <div class="col-6 col-md-3"><q-card flat class="viti-card"><q-card-section><div class="text-caption text-grey-6">Estado</div><div class="metric">{{ notifications.loading ? '...' : 'OK' }}</div><div class="text-caption">centro sincronizado</div></q-card-section></q-card></div>
      <div class="col-6 col-md-3"><q-card flat class="viti-card"><q-card-section><div class="text-caption text-grey-6">Actualización</div><div class="metric">20 s</div><div class="text-caption">cuando el store está activo</div></q-card-section></q-card></div>
    </div>

    <q-banner rounded class="bg-blue-1 text-primary q-mb-lg">
      <template #avatar><q-icon name="info" /></template>
      Este centro muestra las notificaciones pendientes del buzón interno. No representa todavía un historial completo de auditoría.
    </q-banner>

    <q-card flat class="viti-card">
      <q-card-section class="row items-center">
        <div><div class="text-h6 text-weight-bold">Notificaciones pendientes</div><div class="text-caption text-grey-6">Abre una notificación para ir directamente a su contexto.</div></div>
        <q-space />
        <q-badge v-if="notifications.unreadCount" color="negative" :label="`${notifications.unreadCount} sin leer`" />
      </q-card-section>
      <q-separator />
      <q-list v-if="activity.length" separator>
        <q-item v-for="(item, index) in activity" :key="item.id || `${title(item)}-${index}`" :clickable="Boolean(routeFor(item))" @click="open(item)">
          <q-item-section avatar><q-avatar :color="kind(item).color" text-color="white" :icon="kind(item).icon" size="42px" /></q-item-section>
          <q-item-section>
            <q-item-label class="text-weight-medium">{{ title(item) }}</q-item-label>
            <q-item-label caption>{{ message(item) }}</q-item-label>
          </q-item-section>
          <q-item-section side class="items-end">
            <q-badge outline :color="kind(item).color" :label="kind(item).label" />
            <q-badge v-if="item.leida === false || item.read === false" class="q-mt-xs" color="negative" label="Nueva" />
          </q-item-section>
        </q-item>
      </q-list>
      <div v-else class="empty-state q-pa-xl">No hay notificaciones pendientes en este momento.</div>
    </q-card>
  </q-page>
</template>

<style scoped>
.metric{font-size:28px;font-weight:800;margin-top:2px}.viti-card{height:100%}
</style>
