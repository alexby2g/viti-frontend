<script setup>
import { mediaUrl } from '../utils/media.js'
import { computed, onMounted, ref } from 'vue'
import { useQuasar } from 'quasar'
import { useRoute, useRouter } from 'vue-router'
import { api } from '../boot/axios'
import { useNotificationsStore } from '../stores/notifications'
import { formatDateTime } from '../utils/date'
import PageHeader from '../components/PageHeader.vue'

const $q = useQuasar()
const route = useRoute()
const router = useRouter()
const notifications = useNotificationsStore()
const rows = ref([])
const selected = ref(null)
const reply = ref('')
const loading = ref(true)
const current = computed(() => rows.value.find(x => x.id === selected.value) || null)

async function loadCurrent() {
  if (!selected.value) return
  const { data } = await api.get(`/buzon/${selected.value}`)
  const detail = data.data
  const index = rows.value.findIndex(x => x.id === selected.value)
  if (index >= 0) rows.value[index] = { ...rows.value[index], ...detail, no_leidos: 0 }
  await notifications.refresh()
}

async function load() {
  loading.value = true
  try {
    rows.value = (await api.get('/buzon', { params: { per_page: 100 } })).data.data || []
    const requested = Number(route.query.c || 0)
    if (requested && rows.value.some(x => x.id === requested)) selected.value = requested
    else if (!selected.value && rows.value[0]) selected.value = rows.value[0].id
    else if (selected.value && !rows.value.some(x => x.id === selected.value)) selected.value = rows.value[0]?.id || null
    await loadCurrent()
  } finally {
    loading.value = false
  }
}

async function choose(id) {
  selected.value = id
  await router.replace({ query: { ...route.query, c: id } })
  await loadCurrent()
}

async function send() {
  if (!reply.value.trim() || !current.value) return
  try {
    await api.post(`/buzon/${current.value.id}/mensajes`, { mensaje: reply.value })
    reply.value = ''
    await load()
  } catch (e) {
    $q.notify({ type: 'negative', message: e.response?.data?.message || 'No se pudo enviar la respuesta.' })
  }
}

function startCall(type) {
  if (!current.value?.id) return
  if (!navigator.onLine) return $q.notify({ type:'warning', message:'Necesitas Internet para realizar llamadas.' })
  window.dispatchEvent(new CustomEvent('viti-start-call', { detail: { conversationId: current.value.id, type } }))
}

onMounted(load)
</script>

<template>
  <q-page class="viti-page">
    <PageHeader
      eyebrow="Atención al cliente"
      title="Atención VITI"
      subtitle="Cada cliente tiene un único canal permanente contigo. Mensajes, llamadas y videollamadas en un solo lugar."
    />

    <div class="row q-col-gutter-lg">
      <div class="col-12 col-md-4">
        <q-card flat class="viti-card">
          <q-list separator>
            <q-item
              v-for="c in rows"
              :key="c.id"
              clickable
              :active="selected === c.id"
              active-class="bg-blue-1 text-primary"
              @click="choose(c.id)"
            >
              <q-item-section avatar>
                <q-avatar color="primary" text-color="white">
                  <img v-if="c.cliente?.foto_path" :src="c.cliente.foto_url || mediaUrl(c.cliente.foto_path)" />
                  <span v-else>{{ c.cliente?.nombre?.[0] || 'C' }}</span>
                </q-avatar>
              </q-item-section>
              <q-item-section>
                <q-item-label class="text-weight-bold">{{ c.cliente?.nombre }}</q-item-label>
                <q-item-label caption lines="1">{{ c.mensajes?.[0]?.mensaje || 'Canal listo para atención' }}</q-item-label>
                <q-item-label caption>{{ c.ultimo_mensaje_at ? formatDateTime(c.ultimo_mensaje_at) : 'Sin mensajes todavía' }}</q-item-label>
              </q-item-section>
              <q-item-section side class="items-end q-gutter-xs">
                <q-badge v-if="c.no_leidos" rounded color="negative" :label="c.no_leidos > 99 ? '99+' : c.no_leidos" />
                <q-badge outline color="positive">Atención</q-badge>
              </q-item-section>
            </q-item>
            <div v-if="!rows.length && !loading" class="empty-state">No hay clientes registrados todavía.</div>
          </q-list>
        </q-card>
      </div>

      <div class="col-12 col-md-8">
        <q-card v-if="current" flat class="viti-card">
          <q-card-section class="row items-center q-gutter-md">
            <q-avatar size="52px" color="primary" text-color="white">
              <img v-if="current.cliente?.foto_path" :src="current.cliente.foto_url || mediaUrl(current.cliente.foto_path)" />
              <span v-else>{{ current.cliente?.nombre?.[0] || 'C' }}</span>
            </q-avatar>
            <div>
              <div class="text-h6 text-weight-bold">{{ current.cliente?.nombre }}</div>
              <div class="text-caption text-grey-6">{{ current.cliente?.telefono }} · Canal Atención VITI</div>
            </div>
            <q-space />
            <q-btn round flat color="primary" icon="call" @click="startCall('audio')"><q-tooltip>Llamada de voz</q-tooltip></q-btn>
            <q-btn round flat color="primary" icon="videocam" @click="startCall('video')"><q-tooltip>Videollamada</q-tooltip></q-btn>
          </q-card-section>
          <q-separator />
          <q-card-section class="messages">
            <div v-if="!current.mensajes?.length" class="empty-state q-my-xl">Este canal está listo. El cliente puede escribirte directamente sin crear una conversación.</div>
            <div
              v-for="m in current.mensajes"
              :key="m.id"
              class="message"
              :class="m.usuario?.rol === 'cliente' ? 'client' : 'admin'"
            >
              <div class="text-caption text-weight-bold">
                {{ m.usuario?.rol === 'cliente' ? (current.cliente?.nombre || 'Cliente') : (m.usuario?.nombre || 'VITI') }}
              </div>
              <div>{{ m.mensaje }}</div>
              <div class="text-caption text-grey-6">{{ formatDateTime(m.created_at) }}</div>
            </div>
          </q-card-section>
          <q-separator />
          <q-card-section class="row q-gutter-sm items-end">
            <q-input v-model="reply" class="col" outlined autogrow label="Responder al cliente" @keyup.ctrl.enter="send" />
            <q-btn color="primary" unelevated round icon="send" @click="send"><q-tooltip>Enviar respuesta</q-tooltip></q-btn>
          </q-card-section>
        </q-card>
        <div v-else class="empty-state">Selecciona un cliente para atenderlo.</div>
      </div>
    </div>
  </q-page>
</template>

<style scoped>
.messages{display:flex;flex-direction:column;gap:12px;min-height:420px;max-height:62vh;overflow:auto}.message{max-width:82%;padding:12px 14px;border-radius:14px;background:var(--viti-surface-soft)}.message.client{align-self:flex-start;border-bottom-left-radius:4px}.message.admin{align-self:flex-end;border-bottom-right-radius:4px}
</style>
