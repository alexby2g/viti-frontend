<script setup>
import { computed, onMounted, ref } from 'vue'
import { useQuasar } from 'quasar'
import { api } from '../boot/axios'
import { formatDateTime } from '../utils/date'

const $q = useQuasar()
const loading = ref(true)
const profile = ref(null)
const apps = ref([])
const requests = ref([])
const project = ref(null)
const creating = ref(false)

const currentRequest = computed(() => requests.value[0] || null)
const activeApps = computed(() => apps.value.filter(app => ['activa','gracia','suspendida','lista_entrega','pruebas'].includes(app.estado_servicio)))
const app = computed(() => activeApps.value[0] || apps.value[0] || null)
const progress = computed(() => Number(currentRequest.value?.proyecto?.progreso || project.value?.progreso || 0))
const status = computed(() => currentRequest.value?.estado || (app.value ? app.value.estado_servicio : 'sin_solicitud'))
const statusLabel = computed(() => ({
  borrador:'Borrador', en_revision:'En revisión', aprobada:'Aprobada', rechazada:'Requiere ajustes',
  convertida:'En desarrollo', cerrada:'Cerrada', preparacion:'En preparación', pruebas:'En pruebas',
  lista_entrega:'Lista para entrega', activa:'Activa', gracia:'Periodo de gracia', suspendida:'Suspendida',
  sin_solicitud:'Sin solicitud',
}[status.value] || 'En seguimiento'))

function tone() {
  if (['convertida','activa','lista_entrega'].includes(status.value)) return 'positive'
  if (['en_revision','preparacion','pruebas','gracia'].includes(status.value)) return 'warning'
  if (['rechazada','suspendida'].includes(status.value)) return 'negative'
  return 'primary'
}

function errorMessage(error, fallback) {
  return error?.response?.data?.message || fallback
}

async function load() {
  loading.value = true
  try {
    const [profileResponse, appsResponse, requestsResponse, projectResponse] = await Promise.all([
      api.get('/mi/perfil'),
      api.get('/mi/aplicaciones'),
      api.get('/mi/solicitudes'),
      api.get('/mi/proyecto').catch(() => ({ data: { data: null } })),
    ])
    profile.value = profileResponse.data.data
    apps.value = appsResponse.data.data || []
    requests.value = requestsResponse.data.data || []
    project.value = projectResponse.data.data || null
  } catch (error) {
    $q.notify({ type:'negative', message:errorMessage(error,'No pudimos cargar tu espacio VITI.') })
  } finally {
    loading.value = false
  }
}

async function startRequest() {
  if (creating.value) return
  creating.value = true
  try {
    const { data } = await api.post('/mi/solicitud')
    const link = data?.data?.enlace_publico
    if (!link) throw new Error('missing_link')
    window.location.href = link
  } catch (error) {
    $q.notify({ type:'negative', message:errorMessage(error,'No pudimos iniciar la nueva solicitud. Revisa que tengas un negocio registrado.') })
  } finally {
    creating.value = false
  }
}

onMounted(load)
</script>

<template>
  <q-page class="hub-page">
    <q-inner-loading :showing="loading" />

    <template v-if="profile">
      <header class="page-top">
        <div>
          <div class="kicker">MI ESPACIO VITI</div>
          <h1>Hola, {{ profile.nombre?.split(' ')[0] || 'cliente' }}.</h1>
          <p>Todo lo importante de tu sistema, sin ruido.</p>
        </div>
        <q-btn outline color="primary" no-caps icon="add" label="Nueva solicitud" :loading="creating" @click="startRequest" />
      </header>

      <section class="hero-status q-mt-lg">
        <div class="status-copy">
          <div class="status-eyebrow">Estado actual</div>
          <h2>{{ app?.catalogo?.nombre || app?.nombre || currentRequest?.titulo || 'Aún no tienes un sistema activo' }}</h2>
          <p v-if="app">{{ app.estado_mensaje || 'Tu aplicación está lista para continuar.' }}</p>
          <p v-else-if="currentRequest">Tu solicitud {{ currentRequest.codigo }} está {{ statusLabel.toLowerCase() }}.</p>
          <p v-else>Cuéntanos qué quieres construir y VITI se encargará del siguiente paso.</p>
          <div class="status-row">
            <q-badge :color="tone()" class="status-badge">{{ statusLabel }}</q-badge>
            <span v-if="currentRequest?.created_at">Solicitud creada {{ formatDateTime(currentRequest.created_at) }}</span>
            <span v-if="progress">{{ progress }}% de avance</span>
          </div>
        </div>
        <div class="status-visual">
          <div class="ring"><strong>{{ progress || (app ? 100 : 0) }}%</strong><span>{{ app ? 'operativo' : 'avance' }}</span></div>
        </div>
      </section>

      <section class="quick-grid q-mt-lg">
        <q-card flat clickable class="quick-card" @click="$router.push('/mi-aplicaciones')">
          <q-card-section><q-avatar size="48px" color="blue-1" text-color="primary" icon="apps"/><div class="quick-title">Mi aplicación</div><div class="quick-copy">{{ app ? 'Abrir tu sistema' : 'Ver cuándo estará disponible' }}</div></q-card-section>
        </q-card>
        <q-card flat clickable class="quick-card" @click="$router.push('/mi-proyecto')">
          <q-card-section><q-avatar size="48px" color="cyan-1" text-color="cyan-9" icon="account_tree"/><div class="quick-title">Mi proyecto</div><div class="quick-copy">{{ progress ? `${progress}% de avance` : 'Ver estado y próximos pasos' }}</div></q-card-section>
        </q-card>
        <q-card flat clickable class="quick-card" @click="$router.push('/mi-buzon')">
          <q-card-section><q-avatar size="48px" color="green-1" text-color="positive" icon="support_agent"/><div class="quick-title">Atención</div><div class="quick-copy">Habla directamente con AGR Studio</div></q-card-section>
        </q-card>
        <q-card flat clickable class="quick-card" @click="$router.push('/mi-cuenta')">
          <q-card-section><q-avatar size="48px" color="orange-1" text-color="orange-9" icon="person"/><div class="quick-title">Mi perfil</div><div class="quick-copy">Datos de acceso e identidad</div></q-card-section>
        </q-card>
      </section>

      <section class="lower-grid q-mt-lg">
        <q-card flat class="info-card">
          <q-card-section>
            <div class="kicker">Tu próxima acción</div>
            <h3>{{ currentRequest?.estado === 'borrador' ? 'Termina de contarnos qué necesitas.' : currentRequest ? 'Estamos trabajando con la información de tu solicitud.' : 'Cuéntanos qué quieres construir.' }}</h3>
            <p>{{ currentRequest?.estado === 'borrador' ? 'Completa las preguntas esenciales. No necesitas elegir una arquitectura ni pensar en módulos técnicos.' : currentRequest ? 'Cuando necesitemos una aclaración, te aparecerá aquí o en Atención.' : 'Puedes empezar una solicitud sin estudiar VITI ni elegir un plan primero.' }}</p>
            <q-btn v-if="currentRequest?.estado === 'borrador' && currentRequest.enlace_publico" color="primary" unelevated no-caps icon="edit_note" label="Continuar solicitud" :href="currentRequest.enlace_publico" />
            <q-btn v-else-if="!currentRequest" color="primary" unelevated no-caps icon="rocket_launch" label="Empezar ahora" :loading="creating" @click="startRequest" />
          </q-card-section>
        </q-card>

        <q-card flat class="info-card">
          <q-card-section>
            <div class="kicker">Identidad</div>
            <h3>{{ profile.nombre }}</h3>
            <p>{{ profile.usuario?.usuario ? `@${profile.usuario.usuario}` : 'Tu cuenta VITI está activa.' }}</p>
            <div class="identity-note"><q-icon name="verified_user" color="positive"/> Tu acceso y tus solicitudes permanecen separados de las herramientas internas de VITI.</div>
            <q-btn flat color="primary" no-caps icon="manage_accounts" label="Gestionar mi perfil" to="/mi-cuenta" />
          </q-card-section>
        </q-card>
      </section>
    </template>
  </q-page>
</template>

<style scoped>
.hub-page{min-height:calc(100vh - 70px);color:#102a43}.page-top{display:flex;justify-content:space-between;gap:24px;align-items:flex-end}.kicker,.status-eyebrow{font-size:10px;font-weight:900;letter-spacing:.15em;text-transform:uppercase;color:#0b7593}.page-top h1{font-size:42px;line-height:1;letter-spacing:-.05em;margin:10px 0 9px}.page-top p{margin:0;color:#5f7787}.hero-status{display:flex;justify-content:space-between;gap:30px;align-items:center;background:#102a43;color:#fff;border-radius:24px;padding:34px 36px;box-shadow:0 22px 55px rgba(16,42,67,.14)}.status-eyebrow{color:#73cbd7}.status-copy{max-width:760px}.status-copy h2{font-size:34px;line-height:1.05;letter-spacing:-.04em;margin:11px 0}.status-copy p{color:#d0dee6;line-height:1.7;margin:0}.status-row{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-top:20px;color:#b6c8d2;font-size:12px}.status-badge{font-weight:800}.status-visual{min-width:150px;display:flex;justify-content:center}.ring{width:132px;height:132px;border-radius:50%;border:8px solid #0b879f;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#173a50}.ring strong{font-size:27px}.ring span{font-size:10px;color:#b7ccd5;margin-top:3px}.quick-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}.quick-card{border:1px solid #dbe6eb;border-radius:18px;transition:.18s ease;background:#fff}.quick-card:hover{transform:translateY(-2px);box-shadow:0 14px 30px rgba(16,42,67,.08)}.quick-title{font-weight:800;font-size:17px;margin-top:14px}.quick-copy{font-size:12px;color:#687f8e;line-height:1.5;margin-top:4px}.lower-grid{display:grid;grid-template-columns:1.1fr .9fr;gap:14px}.info-card{border:1px solid #dbe6eb;border-radius:18px;background:#fff}.info-card h3{font-size:24px;line-height:1.1;letter-spacing:-.035em;margin:12px 0}.info-card p{color:#60798a;line-height:1.65}.identity-note{display:flex;align-items:flex-start;gap:8px;padding:12px;border-radius:12px;background:#f0f7f8;color:#526b7a;font-size:12px;line-height:1.5;margin:14px 0}@media(max-width:1000px){.quick-grid{grid-template-columns:repeat(2,1fr)}}@media(max-width:760px){.page-top{align-items:flex-start;flex-direction:column}.hero-status{padding:26px;flex-direction:column;align-items:flex-start}.status-visual{width:100%;justify-content:flex-start}.lower-grid{grid-template-columns:1fr}}@media(max-width:600px){.page-top h1{font-size:34px}.quick-grid{grid-template-columns:1fr}.hero-status{border-radius:18px}.status-copy h2{font-size:28px}}
</style>
