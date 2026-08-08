<script setup>
import { onMounted, ref } from 'vue'
import { api } from '../boot/axios'
import PageHeader from '../components/PageHeader.vue'

const data = ref({ resumen:{}, solicitudes_recientes:[], proyectos_recientes:[], entregas_pendientes:[] })
const loading = ref(true)

const cards = [
  { key:'solicitudes_activas', label:'Solicitudes activas', icon:'assignment', color:'orange', to:'/solicitudes' },
  { key:'proyectos_activos', label:'Proyectos activos', icon:'account_tree', color:'purple', to:'/proyectos' },
  { key:'aplicaciones_pendientes_entrega', label:'Pendientes de entrega', icon:'key', color:'teal', to:'/aplicaciones' },
  { key:'mantenimientos_abiertos', label:'Soporte abierto', icon:'support_agent', color:'red', to:'/mantenimientos' },
]

function pretty(value) {
  return String(value || '').replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase())
}

onMounted(async () => {
  try { data.value = (await api.get('/dashboard')).data }
  finally { loading.value = false }
})
</script>

<template>
  <q-page class="viti-page">
    <q-inner-loading :showing="loading" />

    <PageHeader
      eyebrow="Operación"
      title="Panel VITI"
      subtitle="Lo que necesita atención ahora: solicitudes, proyectos, entregas y soporte."
    >
      <q-btn color="primary" unelevated icon="person_add" label="Registrar cliente" no-caps to="/clientes?new=1" />
    </PageHeader>

    <div class="row q-col-gutter-md">
      <div v-for="card in cards" :key="card.key" class="col-12 col-sm-6 col-xl-3">
        <q-card flat class="viti-card action-card cursor-pointer" @click="$router.push(card.to)">
          <q-card-section>
            <div class="row items-center no-wrap">
              <q-avatar :color="`${card.color}-1`" :text-color="`${card.color}-8`" :icon="card.icon" size="50px" />
              <q-space />
              <q-icon name="arrow_forward" color="grey-5" />
            </div>
            <div class="stat-value q-mt-md">{{ data.resumen[card.key] || 0 }}</div>
            <div class="stat-label">{{ card.label }}</div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <div class="row q-col-gutter-lg q-mt-sm">
      <div class="col-12 col-lg-5">
        <q-card flat class="viti-card full-height">
          <q-card-section class="row items-center">
            <div>
              <div class="text-h6 text-weight-bold">Pendientes de entrega</div>
              <div class="text-caption text-grey-6">Aplicaciones activas que todavía no fueron habilitadas al cliente.</div>
            </div>
            <q-space />
            <q-btn flat dense no-caps color="primary" label="Ver todas" to="/aplicaciones" />
          </q-card-section>
          <q-separator />
          <q-list v-if="data.entregas_pendientes?.length" separator>
            <q-item v-for="item in data.entregas_pendientes" :key="item.id" clickable to="/aplicaciones">
              <q-item-section avatar><q-avatar color="teal-1" text-color="teal-8" icon="apps" /></q-item-section>
              <q-item-section>
                <q-item-label class="text-weight-bold">{{ item.nombre }}</q-item-label>
                <q-item-label caption>{{ item.empresa?.nombre_comercial || 'Empresa sin nombre' }}</q-item-label>
              </q-item-section>
              <q-item-section side><q-badge color="orange" label="Entregar" /></q-item-section>
            </q-item>
          </q-list>
          <div v-else class="empty-state"><q-icon name="task_alt" size="46px" /><div class="q-mt-sm">No hay entregas pendientes.</div></div>
        </q-card>
      </div>

      <div class="col-12 col-lg-7">
        <q-card flat class="viti-card">
          <q-card-section>
            <div class="text-h6 text-weight-bold">Actividad reciente</div>
            <div class="text-caption text-grey-6">Solicitudes y proyectos en los que probablemente tengas que entrar primero.</div>
          </q-card-section>
          <q-separator />
          <q-list separator>
            <q-item v-for="item in data.solicitudes_recientes" :key="`s-${item.id}`" clickable :to="`/solicitudes/${item.id}`">
              <q-item-section avatar><q-avatar color="orange-1" text-color="orange-8" icon="description" /></q-item-section>
              <q-item-section><q-item-label class="text-weight-bold">{{ item.titulo }}</q-item-label><q-item-label caption>{{ item.empresa?.nombre_comercial }} · {{ item.cliente?.nombre }}</q-item-label></q-item-section>
              <q-item-section side><q-badge outline color="orange">{{ pretty(item.estado) }}</q-badge></q-item-section>
            </q-item>
            <q-item v-for="item in data.proyectos_recientes" :key="`p-${item.id}`" clickable :to="`/proyectos/${item.id}`">
              <q-item-section avatar><q-avatar color="purple-1" text-color="purple-8" icon="account_tree" /></q-item-section>
              <q-item-section><q-item-label class="text-weight-bold">{{ item.nombre }}</q-item-label><q-item-label caption>{{ item.empresa?.nombre_comercial }} · {{ pretty(item.fase) }}</q-item-label></q-item-section>
              <q-item-section side><strong>{{ item.progreso }}%</strong></q-item-section>
            </q-item>
          </q-list>
          <div v-if="!data.solicitudes_recientes?.length && !data.proyectos_recientes?.length" class="empty-state">Todavía no hay actividad registrada.</div>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<style scoped>
.action-card{height:100%;transition:transform .15s ease,box-shadow .15s ease}.action-card:hover{transform:translateY(-2px);box-shadow:0 10px 24px rgba(12,35,64,.08)}
</style>
