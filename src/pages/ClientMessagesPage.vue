<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
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
const loading = ref(true)
const selected = ref(null)
const newDialog = ref(false)
const form = reactive({ asunto: 'Consulta', mensaje: '' })
const reply = ref('')
const current = computed(() => rows.value.find(x => x.id === selected.value) || null)

async function loadCurrent() {
  if (!selected.value) return
  const { data } = await api.get(`/mi/buzon/${selected.value}`)
  const detail = data.data
  const index = rows.value.findIndex(x => x.id === selected.value)
  if (index >= 0) rows.value[index] = { ...rows.value[index], ...detail, no_leidos: 0 }
  await notifications.refresh()
}

async function load() {
  loading.value = true
  try {
    rows.value = (await api.get('/mi/buzon')).data.data || []
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

async function start() {
  try {
    const { data } = await api.post('/mi/buzon', form)
    Object.assign(form, { asunto: 'Consulta', mensaje: '' })
    newDialog.value = false
    selected.value = data.data?.id || null
    await load()
    $q.notify({ type: 'positive', message: 'Mensaje enviado.' })
  } catch (e) {
    $q.notify({ type: 'negative', message: e.response?.data?.message || 'No se pudo enviar el mensaje.' })
  }
}

async function send() {
  if (!reply.value.trim() || !current.value) return
  try {
    await api.post(`/mi/buzon/${current.value.id}/mensajes`, { mensaje: reply.value })
    reply.value = ''
    await load()
  } catch (e) {
    $q.notify({ type: 'negative', message: e.response?.data?.message || 'No se pudo enviar el mensaje.' })
  }
}

onMounted(load)
</script>

<template>
  <q-page class="viti-page">
    <PageHeader eyebrow="Atención" title="Mi buzón" subtitle="Comunícate directamente con nuestro equipo y conserva todas las respuestas en VITI.">
      <q-btn color="primary" unelevated no-caps icon="add_comment" label="Nueva conversación" @click="newDialog = true" />
    </PageHeader>

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
              <q-item-section>
                <q-item-label class="text-weight-bold">{{ c.asunto }}</q-item-label>
                <q-item-label caption lines="1">{{ c.mensajes?.[0]?.mensaje || 'Sin mensajes' }}</q-item-label>
                <q-item-label caption>{{ formatDateTime(c.ultimo_mensaje_at) }}</q-item-label>
              </q-item-section>
              <q-item-section v-if="c.no_leidos" side>
                <q-badge rounded color="negative" :label="c.no_leidos > 99 ? '99+' : c.no_leidos" />
              </q-item-section>
            </q-item>
            <div v-if="!rows.length && !loading" class="empty-state">Todavía no tienes conversaciones.</div>
          </q-list>
        </q-card>
      </div>

      <div class="col-12 col-md-8">
        <q-card v-if="current" flat class="viti-card">
          <q-card-section>
            <div class="text-h6 text-weight-bold">{{ current.asunto }}</div>
            <div class="text-caption text-grey-6">{{ current.estado }}</div>
          </q-card-section>
          <q-separator />
          <q-card-section class="messages">
            <div
              v-for="m in current.mensajes"
              :key="m.id"
              class="message"
              :class="m.usuario?.rol === 'cliente' ? 'mine' : 'team'"
            >
              <div class="text-caption text-weight-bold">{{ m.usuario?.rol === 'cliente' ? 'Tú' : (m.usuario?.nombre || 'Equipo VITI') }}</div>
              <div>{{ m.mensaje }}</div>
              <div class="text-caption text-grey-6">{{ formatDateTime(m.created_at) }}</div>
            </div>
          </q-card-section>
          <q-separator />
          <q-card-section v-if="current.estado !== 'cerrada'" class="row q-gutter-sm">
            <q-input v-model="reply" class="col" outlined autogrow label="Escribe tu mensaje" @keyup.ctrl.enter="send" />
            <q-btn color="primary" unelevated icon="send" @click="send"><q-tooltip>Enviar mensaje</q-tooltip></q-btn>
          </q-card-section>
        </q-card>
        <div v-else class="empty-state">Selecciona una conversación.</div>
      </div>
    </div>

    <q-dialog v-model="newDialog">
      <q-card style="width: 620px; max-width: 94vw">
        <q-card-section><div class="text-h6 text-weight-bold">Nueva conversación</div></q-card-section>
        <q-card-section>
          <q-input v-model="form.asunto" outlined label="Asunto *" />
          <q-input v-model="form.mensaje" outlined type="textarea" autogrow label="Mensaje *" class="q-mt-md" />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancelar" v-close-popup />
          <q-btn color="primary" unelevated label="Enviar" @click="start" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<style scoped>
.messages { display: flex; flex-direction: column; gap: 12px; min-height: 300px; }
.message { max-width: 82%; padding: 12px 14px; border-radius: 14px; background: var(--viti-surface-soft); }
.message.mine { align-self: flex-end; border-bottom-right-radius: 4px; }
.message.team { align-self: flex-start; border-bottom-left-radius: 4px; }
</style>
