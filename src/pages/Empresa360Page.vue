<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '../boot/axios'
import PageHeader from '../components/PageHeader.vue'
import { formatDateTime } from '../utils/date'

const route = useRoute()
const router = useRouter()
const loading = ref(true)
const error = ref('')
const empresa = ref(null)

const counts = computed(() => ({
  usuarios: empresa.value?.usuarios?.length ?? 0,
  solicitudes: empresa.value?.solicitudes?.length ?? 0,
  proyectos: empresa.value?.proyectos?.length ?? 0,
  aplicaciones: empresa.value?.aplicaciones?.length ?? 0,
  archivos: empresa.value?.archivos?.length ?? 0,
}))

const estadoLabel = computed(() => {
  const estado = empresa.value?.estado || 'sin estado'
  return String(estado).replaceAll('_', ' ')
})

const operationalHealth = computed(() => {
  if (!empresa.value) return { label: 'Sin datos', color: 'grey-7', icon: 'help_outline', tone: 'neutral' }
  if (empresa.value.estado === 'inactivo') return { label: 'Inactiva', color: 'negative', icon: 'pause_circle', tone: 'negative' }
  if (counts.value.solicitudes > 0 && counts.value.proyectos === 0) return { label: 'Esperando ejecución', color: 'warning', icon: 'pending_actions', tone: 'warning' }
  if (counts.value.proyectos > 0 && counts.value.aplicaciones === 0) return { label: 'En construcción', color: 'deep-purple', icon: 'build_circle', tone: 'primary' }
  return { label: 'Operación activa', color: 'positive', icon: 'check_circle', tone: 'positive' }
})

const nextAction = computed(() => {
  if (!empresa.value) return null
  if (!counts.value.usuarios) return { title: 'Asignar usuarios', message: 'La empresa todavía no tiene usuarios vinculados.', to: '/usuarios', icon: 'group_add' }
  if (counts.value.solicitudes && !counts.value.proyectos) return { title: 'Revisar solicitudes', message: 'Hay solicitudes registradas sin proyectos asociados visibles.', to: '/solicitudes', icon: 'assignment' }
  if (counts.value.proyectos && !counts.value.aplicaciones) return { title: 'Revisar aplicaciones', message: 'La empresa tiene proyectos, pero todavía no aparecen aplicaciones asociadas.', to: '/aplicaciones', icon: 'apps' }
  if (counts.value.aplicaciones && !counts.value.archivos) return { title: 'Completar documentación', message: 'Hay aplicaciones asociadas pero todavía no hay archivos visibles en esta cuenta.', to: '/archivos', icon: 'folder_open' }
  return { title: 'Operación en orden', message: 'No se detecta un siguiente paso evidente a partir de los datos disponibles.', to: '/monitor', icon: 'check_circle' }
})

const activity = computed(() => {
  if (!empresa.value) return []
  const events = []
  for (const item of empresa.value.solicitudes || []) events.push({ id: `s-${item.id}`, date: item.created_at, title: item.titulo || item.nombre || `Solicitud #${item.id}`, message: `Solicitud · ${item.estado || 'sin estado'}`, icon: 'assignment', color: 'primary', to: '/solicitudes' })
  for (const item of empresa.value.proyectos || []) events.push({ id: `p-${item.id}`, date: item.created_at, title: item.nombre || item.codigo || `Proyecto #${item.id}`, message: `Proyecto · ${item.estado || 'sin estado'}`, icon: 'account_tree', color: 'deep-purple', to: '/proyectos' })
  for (const item of empresa.value.aplicaciones || []) events.push({ id: `a-${item.id}`, date: item.created_at, title: item.nombre || `Aplicación #${item.id}`, message: `Aplicación · ${item.estado || 'sin estado'}`, icon: 'apps', color: 'teal', to: '/aplicaciones' })
  return events
    .filter(item => item.date)
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 8)
})

function metricCards() {
  return [
    { label: 'Usuarios', value: counts.value.usuarios, icon: 'group', to: '/usuarios' },
    { label: 'Solicitudes', value: counts.value.solicitudes, icon: 'assignment', to: '/solicitudes' },
    { label: 'Proyectos', value: counts.value.proyectos, icon: 'account_tree', to: '/proyectos' },
    { label: 'Aplicaciones', value: counts.value.aplicaciones, icon: 'apps', to: '/aplicaciones' },
    { label: 'Archivos', value: counts.value.archivos, icon: 'folder', to: '/archivos' },
  ]
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    empresa.value = (await api.get(`/empresas/${route.params.id}`)).data?.data || null
    if (!empresa.value) error.value = 'No se encontró la empresa.'
  } catch (err) {
    error.value = err?.response?.data?.message || 'No se pudo cargar la empresa.'
  } finally {
    loading.value = false
  }
}

function back() {
  if (window.history.length > 1) router.back()
  else router.push('/empresas')
}

onMounted(load)
</script>

<template>
  <q-page class="viti-page">
    <PageHeader eyebrow="Empresa 360" :title="empresa?.nombre_comercial || 'Empresa'" :subtitle="empresa?.actividad || 'Visión integral de la cuenta empresarial.'">
      <q-btn outline no-caps icon="arrow_back" label="Volver a empresas" @click="back" />
    </PageHeader>

    <q-inner-loading :showing="loading" />

    <q-banner v-if="error" rounded class="bg-red-1 text-negative q-mb-lg">
      <template #avatar><q-icon name="error" /></template>
      {{ error }}
    </q-banner>

    <template v-if="empresa && !loading">
      <div class="row q-col-gutter-lg q-mb-lg">
        <div class="col-12 col-lg-8">
          <q-card flat class="viti-card full-height">
            <q-card-section>
              <div class="row items-center no-wrap">
                <q-avatar color="primary" text-color="white" icon="business" size="58px" />
                <div class="col q-ml-md min-width-0">
                  <div class="text-h5 text-weight-bold ellipsis">{{ empresa.nombre_comercial }}</div>
                  <div class="text-caption text-grey-6">{{ empresa.razon_social || 'Sin razón social registrada' }}</div>
                </div>
                <q-badge outline color="primary" :label="estadoLabel" />
              </div>
            </q-card-section>
            <q-separator />
            <q-card-section>
              <div class="row q-col-gutter-md">
                <div class="col-6 col-md-3"><div class="text-caption text-grey-6">Código</div><div class="text-weight-bold">{{ empresa.codigo || '—' }}</div></div>
                <div class="col-6 col-md-3"><div class="text-caption text-grey-6">Plan</div><div class="text-weight-bold">{{ empresa.plan_viti?.nombre || empresa.planViti?.nombre || 'Personalizado' }}</div></div>
                <div class="col-6 col-md-3"><div class="text-caption text-grey-6">Teléfono</div><div class="text-weight-bold">{{ empresa.telefono || '—' }}</div></div>
                <div class="col-6 col-md-3"><div class="text-caption text-grey-6">WhatsApp</div><div class="text-weight-bold">{{ empresa.whatsapp || '—' }}</div></div>
              </div>
            </q-card-section>
          </q-card>
        </div>
        <div class="col-12 col-lg-4">
          <q-card flat class="viti-card full-height health-card">
            <q-card-section>
              <div class="text-caption text-grey-6">SALUD OPERATIVA</div>
              <div class="row items-center q-mt-sm">
                <q-avatar :color="operationalHealth.color" text-color="white" :icon="operationalHealth.icon" size="46px" />
                <div class="q-ml-md">
                  <div class="text-subtitle1 text-weight-bold">{{ operationalHealth.label }}</div>
                  <div class="text-caption text-grey-6">Estado derivado de la información disponible.</div>
                </div>
              </div>
              <q-separator class="q-my-md" />
              <div class="text-caption text-grey-6">SIGUIENTE ACCIÓN</div>
              <div class="text-subtitle2 text-weight-bold q-mt-xs">{{ nextAction.title }}</div>
              <div class="text-caption text-grey-6 q-mt-xs">{{ nextAction.message }}</div>
              <q-btn flat no-caps color="primary" class="q-mt-sm" :icon="nextAction.icon" label="Abrir acción" :to="nextAction.to" />
            </q-card-section>
          </q-card>
        </div>
      </div>

      <div class="row q-col-gutter-md q-mb-lg">
        <div v-for="card in metricCards()" :key="card.label" class="col-6 col-sm-4 col-md-2">
          <q-card flat class="viti-card cursor-pointer metric-card" @click="router.push(card.to)">
            <q-card-section class="text-center">
              <q-avatar color="blue-1" text-color="primary" :icon="card.icon" size="42px" />
              <div class="metric-number">{{ card.value }}</div>
              <div class="text-caption text-grey-6">{{ card.label }}</div>
            </q-card-section>
          </q-card>
        </div>
      </div>

      <div class="row q-col-gutter-lg">
        <div class="col-12 col-lg-7">
          <q-card flat class="viti-card full-height">
            <q-card-section>
              <div class="text-subtitle1 text-weight-bold">Responsable y usuarios</div>
              <div class="text-caption text-grey-6">Personas vinculadas actualmente a esta empresa.</div>
            </q-card-section>
            <q-separator />
            <q-list v-if="empresa.usuarios?.length" separator>
              <q-item v-for="user in empresa.usuarios" :key="user.id">
                <q-item-section avatar><q-avatar color="blue-1" text-color="primary" icon="person" /></q-item-section>
                <q-item-section>
                  <q-item-label class="text-weight-medium">{{ [user.nombre, user.apellido].filter(Boolean).join(' ') || user.usuario }}</q-item-label>
                  <q-item-label caption>@{{ user.usuario }} · {{ user.rol }}</q-item-label>
                </q-item-section>
                <q-item-section side><q-badge outline :color="user.estado === 'activo' ? 'positive' : 'grey-7'" :label="user.estado || 'sin estado'" /></q-item-section>
              </q-item>
            </q-list>
            <div v-else class="empty-state">No hay usuarios asociados todavía.</div>
          </q-card>
        </div>

        <div class="col-12 col-lg-5">
          <q-card flat class="viti-card full-height">
            <q-card-section>
              <div class="text-subtitle1 text-weight-bold">Perfil empresarial</div>
              <div class="text-caption text-grey-6">Datos que ayudan a VITI a entender la cuenta.</div>
            </q-card-section>
            <q-separator />
            <q-card-section>
              <div class="profile-grid">
                <div><span>Actividad</span><strong>{{ empresa.actividad || '—' }}</strong></div>
                <div><span>Ciudad</span><strong>{{ empresa.ciudad || '—' }}</strong></div>
                <div><span>Dirección</span><strong>{{ empresa.direccion || '—' }}</strong></div>
                <div><span>Moneda</span><strong>{{ empresa.moneda || 'BOB' }}</strong></div>
                <div><span>Zona horaria</span><strong>{{ empresa.zona_horaria || 'America/La_Paz' }}</strong></div>
                <div><span>Cliente</span><strong>{{ empresa.cliente?.nombre || '—' }}</strong></div>
              </div>
            </q-card-section>
          </q-card>
        </div>

        <div class="col-12 col-lg-7">
          <q-card flat class="viti-card full-height">
            <q-card-section class="row items-center">
              <div><div class="text-subtitle1 text-weight-bold">Actividad reciente</div><div class="text-caption text-grey-6">Una lectura rápida del movimiento de la cuenta.</div></div>
              <q-space />
              <q-chip dense outline color="grey-7" icon="history">{{ activity.length }} visibles</q-chip>
            </q-card-section>
            <q-separator />
            <q-list v-if="activity.length" separator>
              <q-item v-for="item in activity" :key="item.id" clickable @click="router.push(item.to)">
                <q-item-section avatar><q-avatar :color="item.color" text-color="white" :icon="item.icon" size="36px" /></q-item-section>
                <q-item-section>
                  <q-item-label class="text-weight-medium">{{ item.title }}</q-item-label>
                  <q-item-label caption>{{ item.message }}</q-item-label>
                </q-item-section>
                <q-item-section side><div class="text-caption text-grey-6">{{ formatDateTime(item.date) }}</div></q-item-section>
              </q-item>
            </q-list>
            <div v-else class="empty-state">Todavía no hay actividad temporal suficiente para mostrar una línea reciente.</div>
          </q-card>
        </div>

        <div class="col-12 col-lg-5">
          <q-card flat class="viti-card full-height">
            <q-card-section>
              <div class="text-subtitle1 text-weight-bold">AGR para esta cuenta</div>
              <div class="text-caption text-grey-6">Una lectura contextual sin inventar datos nuevos.</div>
            </q-card-section>
            <q-separator />
            <q-card-section>
              <div class="agr-signal"><q-icon name="smart_toy" color="primary" size="26px" /><div><div class="text-weight-bold">AGR listo para analizar</div><div class="text-caption text-grey-6">La cuenta ya tiene suficientes entidades conectadas para enriquecer el análisis operativo.</div></div></div>
              <div class="q-mt-md q-gutter-sm">
                <q-chip dense outline color="primary">{{ counts.solicitudes }} solicitudes</q-chip>
                <q-chip dense outline color="deep-purple">{{ counts.proyectos }} proyectos</q-chip>
                <q-chip dense outline color="teal">{{ counts.aplicaciones }} apps</q-chip>
              </div>
              <q-btn flat no-caps color="primary" icon="open_in_new" label="Abrir Monitor AGR" class="q-mt-md" to="/monitor" />
            </q-card-section>
          </q-card>
        </div>

        <div class="col-12">
          <q-card flat class="viti-card">
            <q-card-section class="row items-center">
              <div><div class="text-subtitle1 text-weight-bold">Solicitudes y proyectos</div><div class="text-caption text-grey-6">Los registros principales relacionados con la cuenta.</div></div>
              <q-space />
              <div class="row q-gutter-xs">
                <q-btn flat dense no-caps color="primary" label="Solicitudes" to="/solicitudes" />
                <q-btn flat dense no-caps color="primary" label="Proyectos" to="/proyectos" />
              </div>
            </q-card-section>
            <q-separator />
            <div class="row q-col-gutter-lg q-pa-md">
              <div class="col-12 col-lg-6">
                <q-list v-if="empresa.solicitudes?.length" separator>
                  <q-item v-for="item in empresa.solicitudes.slice(0,5)" :key="item.id">
                    <q-item-section avatar><q-icon name="assignment" color="primary" /></q-item-section>
                    <q-item-section><q-item-label class="text-weight-medium">{{ item.titulo || item.nombre || `Solicitud #${item.id}` }}</q-item-label><q-item-label caption>{{ item.estado || 'sin estado' }}</q-item-label></q-item-section>
                    <q-item-section side><q-badge outline color="grey-7" :label="formatDateTime(item.created_at)" /></q-item-section>
                  </q-item>
                </q-list>
                <div v-else class="empty-state">No hay solicitudes registradas.</div>
              </div>
              <div class="col-12 col-lg-6">
                <q-list v-if="empresa.proyectos?.length || empresa.aplicaciones?.length" separator>
                  <q-item v-for="item in (empresa.proyectos || []).slice(0,4)" :key="`p-${item.id}`">
                    <q-item-section avatar><q-icon name="account_tree" color="deep-purple" /></q-item-section>
                    <q-item-section><q-item-label class="text-weight-medium">{{ item.nombre || item.codigo || `Proyecto #${item.id}` }}</q-item-label><q-item-label caption>{{ item.estado || 'sin estado' }} · {{ item.progreso ?? 0 }}%</q-item-label></q-item-section>
                  </q-item>
                  <q-item v-for="item in (empresa.aplicaciones || []).slice(0,4)" :key="`a-${item.id}`">
                    <q-item-section avatar><q-icon name="apps" color="teal" /></q-item-section>
                    <q-item-section><q-item-label class="text-weight-medium">{{ item.nombre || `Aplicación #${item.id}` }}</q-item-label><q-item-label caption>{{ item.estado || 'sin estado' }}</q-item-label></q-item-section>
                  </q-item>
                </q-list>
                <div v-else class="empty-state">Todavía no hay proyectos ni aplicaciones asociados.</div>
              </div>
            </div>
          </q-card>
        </div>
      </div>

      <q-card v-if="empresa.observaciones" flat class="viti-card q-mt-lg">
        <q-card-section><div class="text-subtitle1 text-weight-bold">Observaciones</div><div class="q-mt-sm text-body2">{{ empresa.observaciones }}</div></q-card-section>
      </q-card>
    </template>
  </q-page>
</template>

<style scoped>
.metric-card{height:100%;transition:transform .15s ease,box-shadow .15s ease}.metric-card:hover{transform:translateY(-2px);box-shadow:0 10px 24px rgba(12,35,64,.08)}
.metric-number{font-size:28px;font-weight:800;margin-top:8px}.profile-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.profile-grid span{display:block;font-size:12px;color:var(--viti-muted);margin-bottom:3px}.profile-grid strong{display:block;overflow-wrap:anywhere}
.health-card{border:1px solid rgba(25,118,210,.12)}.agr-signal{display:flex;gap:12px;align-items:flex-start;border:1px solid var(--viti-border);border-radius:14px;padding:14px;background:color-mix(in srgb,var(--viti-card) 92%,var(--viti-bg))}
@media(max-width:600px){.profile-grid{grid-template-columns:1fr}.metric-number{font-size:24px}}
</style>
