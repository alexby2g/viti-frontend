<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useQuasar } from 'quasar'
import { api } from '../boot/axios'
import { useNotificationsStore } from '../stores/notifications'
import { flushClientQueue, pendingOfflineCount, queueClientAction } from '../utils/offlineQueue'
import { formatDateTime } from '../utils/date'
import PageHeader from '../components/PageHeader.vue'

const $q = useQuasar()
const notifications = useNotificationsStore()
const rows = ref([])
const loading = ref(true)
const reply = ref('')
const pending = ref(pendingOfflineCount())
const CACHE_KEY = 'viti-client-buzon-cache-v2'
const current = computed(() => rows.value[0] || null)
const responsibleName = computed(() => {
  const u = current.value?.responsable
  return u ? `${u.nombre || ''} ${u.apellido || ''}`.trim() : 'Equipo VITI'
})

function saveCache() {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(rows.value)) } catch {}
}

function restoreCache() {
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || '[]')
    if (Array.isArray(cached)) rows.value = cached
  } catch {}
}

function queueChanged(event) {
  pending.value = Number(event?.detail?.count ?? pendingOfflineCount())
}

function networkFailure(error) {
  return !navigator.onLine || !error?.response
}

async function loadCurrent() {
  if (!current.value?.id) return
  try {
    const { data } = await api.get(`/mi/buzon/${current.value.id}`)
    rows.value = [data.data]
    saveCache()
    await notifications.refresh()
  } catch (error) {
    if (!networkFailure(error)) throw error
  }
}

async function load() {
  loading.value = true
  try {
    rows.value = (await api.get('/mi/buzon')).data.data || []
    saveCache()
    await loadCurrent()
  } catch (error) {
    if (networkFailure(error)) restoreCache()
    else throw error
  } finally {
    loading.value = false
  }
}

function queueReply(message) {
  if (!current.value?.id) return
  pending.value = queueClientAction({ type: 'reply-message', conversation_id: current.value.id, mensaje: message })
  current.value.mensajes = current.value.mensajes || []
  current.value.mensajes.push({
    id: `offline-${Date.now()}`,
    mensaje: message,
    created_at: new Date().toISOString(),
    pendiente: true,
    usuario: { rol: 'cliente', nombre: 'Tú' },
  })
  reply.value = ''
  saveCache()
  $q.notify({ type: 'warning', message: 'Mensaje guardado. Se enviará automáticamente al volver Internet.' })
}

async function send() {
  if (!reply.value.trim() || !current.value) return
  const message = reply.value.trim()
  if (!navigator.onLine) return queueReply(message)

  try {
    await api.post(`/mi/buzon/${current.value.id}/mensajes`, { mensaje: message })
    reply.value = ''
    await load()
  } catch (e) {
    if (networkFailure(e)) return queueReply(message)
    $q.notify({ type: 'negative', message: e.response?.data?.message || 'No se pudo enviar el mensaje.' })
  }
}

function startCall(type) {
  if (!current.value?.id) return
  if (!navigator.onLine) return $q.notify({ type:'warning', message:'Necesitas Internet para realizar llamadas.' })
  window.dispatchEvent(new CustomEvent('viti-start-call', { detail: { conversationId: current.value.id, type } }))
}

async function flushPending() {
  if (!navigator.onLine || !pending.value) return
  const result = await flushClientQueue(api)
  pending.value = result.pending
  if (result.sent) {
    $q.notify({ type: 'positive', message: `${result.sent} acción(es) pendiente(s) fueron sincronizadas.` })
    await load()
  }
}

onMounted(async () => {
  window.addEventListener('online', flushPending)
  window.addEventListener('viti-offline-queue-changed', queueChanged)
  await load()
  await flushPending()
})

onBeforeUnmount(() => {
  window.removeEventListener('online', flushPending)
  window.removeEventListener('viti-offline-queue-changed', queueChanged)
})
</script>

<template>
  <q-page class="viti-page">
    <PageHeader eyebrow="Atención" title="Atención VITI" subtitle="Tu canal directo con nuestro equipo. No necesitas crear conversaciones nuevas." />

    <q-banner v-if="pending" rounded class="bg-orange-1 text-orange-10 q-mb-lg">
      <template #avatar><q-icon name="cloud_off" /></template>
      Tienes {{ pending }} acción(es) pendiente(s). VITI las sincronizará automáticamente cuando vuelva Internet.
    </q-banner>

    <q-card v-if="current" flat class="viti-card chat-card">
      <q-card-section class="row items-center q-gutter-md chat-header">
        <q-avatar size="54px" color="primary" text-color="white">
          <img v-if="current.responsable?.foto_url" :src="current.responsable.foto_url" />
          <q-icon v-else name="support_agent" />
        </q-avatar>
        <div>
          <div class="text-h6 text-weight-bold">{{ responsibleName }}</div>
          <div class="text-caption text-grey-6">Atención al cliente VITI</div>
        </div>
        <q-space />
        <q-btn round flat color="primary" icon="call" @click="startCall('audio')"><q-tooltip>Llamada de voz</q-tooltip></q-btn>
        <q-btn round flat color="primary" icon="videocam" @click="startCall('video')"><q-tooltip>Videollamada</q-tooltip></q-btn>
      </q-card-section>

      <q-separator />
      <q-card-section class="messages">
        <div v-if="!current.mensajes?.length" class="empty-state q-my-xl">
          Escribe aquí tu consulta. Tu mensaje llegará directamente a {{ responsibleName }}.
        </div>
        <div v-for="m in current.mensajes" :key="m.id" class="message" :class="[m.usuario?.rol === 'cliente' ? 'mine' : 'team', { pending: m.pendiente }]">
          <div class="text-caption text-weight-bold">{{ m.usuario?.rol === 'cliente' ? 'Tú' : (m.usuario?.nombre || 'Equipo VITI') }}</div>
          <div>{{ m.mensaje }}</div>
          <div class="text-caption text-grey-6">{{ m.pendiente ? 'Pendiente de envío' : formatDateTime(m.created_at) }}</div>
        </div>
      </q-card-section>

      <q-separator />
      <q-card-section class="row q-gutter-sm items-end">
        <q-input v-model="reply" class="col" outlined autogrow label="Escribe un mensaje a Atención VITI" @keyup.ctrl.enter="send" />
        <q-btn color="primary" unelevated round icon="send" @click="send"><q-tooltip>Enviar mensaje</q-tooltip></q-btn>
      </q-card-section>
    </q-card>

    <q-card v-else-if="!loading" flat class="viti-card q-pa-xl text-center">
      <q-icon name="support_agent" size="48px" color="primary" />
      <div class="text-h6 q-mt-md">Preparando tu canal de Atención VITI</div>
      <q-btn color="primary" flat label="Actualizar" class="q-mt-sm" @click="load" />
    </q-card>

    <q-inner-loading :showing="loading" />
  </q-page>
</template>

<style scoped>
.chat-card{max-width:1000px}.chat-header{min-height:82px}.messages{display:flex;flex-direction:column;gap:12px;min-height:420px;max-height:62vh;overflow:auto}.message{max-width:82%;padding:12px 14px;border-radius:14px;background:var(--viti-surface-soft)}.message.mine{align-self:flex-end;border-bottom-right-radius:4px}.message.team{align-self:flex-start;border-bottom-left-radius:4px}.message.pending{opacity:.72;border:1px dashed currentColor}
</style>
