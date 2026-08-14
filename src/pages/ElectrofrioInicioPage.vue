<script setup>
import { computed, inject, onMounted, ref } from 'vue'
import { useQuasar } from 'quasar'
import { useRoute, useRouter } from 'vue-router'
import { api } from '../boot/axios'

const $q = useQuasar()
const route = useRoute()
const router = useRouter()
const modules = inject('electrofrioModules', ref([]))
const loading = ref(false)
const summary = ref({clientes:0,equipos:0,citas_hoy:0,ordenes_abiertas:0,por_cobrar:null,garantias_vigentes:null,stock_bajo:null,agenda_hoy:[]})

const clientMode = computed(() => route.path.startsWith('/mi-apps/electrofrio'))
const appBase = computed(() => clientMode.value ? '/mi-apps/electrofrio' : '/apps/electrofrio')
const apiBase = computed(() => clientMode.value ? '/mi/apps/electrofrio' : '/apps/electrofrio')
const enabled = module => modules.value?.includes(module)
const money = value => `${Number(value || 0).toFixed(2)} Bs`
const shortTime = value => value ? String(value).slice(0,5) : 'Sin hora'
const stageLabel = value => ({cita:'Cita',diagnostico:'Diagnóstico',propuesta:'Esperando aprobación',servicio:'En servicio',cerrada:'Cerrada'}[value] || value)
const stageColor = value => ({cita:'blue',diagnostico:'purple',propuesta:'orange',servicio:'teal',cerrada:'grey'}[value] || 'grey')

async function load(){
  loading.value = true
  try{
    const response = await api.get(`${apiBase.value}/resumen`)
    summary.value = response.data.data || summary.value
  }catch(error){
    $q.notify({type:'negative',message:error.response?.data?.message || 'No se pudo cargar el inicio de Electrofrío.'})
  }finally{loading.value = false}
}

function go(module){ router.push(`${appBase.value}/${module}`) }
onMounted(load)
</script>

<template>
  <q-page padding class="home-page">
    <div class="row items-start justify-between q-col-gutter-md q-mb-lg">
      <div class="col-12 col-md">
        <div class="text-overline text-primary text-weight-bold">Electrofrío · VITI</div>
        <h1 class="text-h4 text-weight-bold q-my-xs">Inicio</h1>
        <div class="text-body2 text-grey-7">Resumen operativo del negocio. Cada proceso se administra desde un único módulo.</div>
      </div>
      <div class="col-12 col-md-auto row q-gutter-sm">
        <q-btn outline color="primary" icon="refresh" label="Actualizar" no-caps :loading="loading" @click="load"/>
        <q-btn v-if="enabled('ordenes')" color="primary" icon="add" label="Ir a nueva orden" no-caps @click="go('ordenes')"/>
      </div>
    </div>

    <div class="row q-col-gutter-md q-mb-lg">
      <div class="col-6 col-md-3"><q-card flat bordered class="metric-card" @click="go('clientes')"><q-card-section><q-icon name="groups" color="primary" size="28px"/><div class="text-h4 text-weight-bold q-mt-sm">{{summary.clientes}}</div><div class="text-caption text-grey-7">Clientes activos</div></q-card-section></q-card></div>
      <div v-if="enabled('equipos')" class="col-6 col-md-3"><q-card flat bordered class="metric-card" @click="go('equipos')"><q-card-section><q-icon name="ac_unit" color="primary" size="28px"/><div class="text-h4 text-weight-bold q-mt-sm">{{summary.equipos}}</div><div class="text-caption text-grey-7">Equipos registrados</div></q-card-section></q-card></div>
      <div class="col-6 col-md-3"><q-card flat bordered class="metric-card" @click="go('agenda')"><q-card-section><q-icon name="event_available" color="primary" size="28px"/><div class="text-h4 text-weight-bold q-mt-sm">{{summary.citas_hoy}}</div><div class="text-caption text-grey-7">Citas hoy</div></q-card-section></q-card></div>
      <div class="col-6 col-md-3"><q-card flat bordered class="metric-card" @click="go('ordenes')"><q-card-section><q-icon name="assignment" color="primary" size="28px"/><div class="text-h4 text-weight-bold q-mt-sm">{{summary.ordenes_abiertas}}</div><div class="text-caption text-grey-7">Órdenes abiertas</div></q-card-section></q-card></div>
      <div v-if="enabled('pagos')" class="col-6 col-md-3"><q-card flat bordered class="metric-card" @click="go('pagos')"><q-card-section><q-icon name="payments" color="orange" size="28px"/><div class="text-h5 text-weight-bold q-mt-sm">{{money(summary.por_cobrar)}}</div><div class="text-caption text-grey-7">Por cobrar</div></q-card-section></q-card></div>
      <div v-if="enabled('garantias')" class="col-6 col-md-3"><q-card flat bordered class="metric-card" @click="go('garantias')"><q-card-section><q-icon name="verified" color="positive" size="28px"/><div class="text-h4 text-weight-bold q-mt-sm">{{summary.garantias_vigentes}}</div><div class="text-caption text-grey-7">Garantías vigentes</div></q-card-section></q-card></div>
      <div v-if="enabled('inventario')" class="col-6 col-md-3"><q-card flat bordered class="metric-card" @click="go('inventario')"><q-card-section><q-icon name="inventory_2" :color="summary.stock_bajo?'negative':'positive'" size="28px"/><div class="text-h4 text-weight-bold q-mt-sm">{{summary.stock_bajo}}</div><div class="text-caption text-grey-7">Materiales con stock bajo</div></q-card-section></q-card></div>
    </div>

    <q-card flat bordered>
      <q-card-section class="row items-center"><div><div class="text-h6 text-weight-bold">Agenda de hoy</div><div class="text-caption text-grey-7">Solo consulta. Las órdenes se crean y editan en el módulo Órdenes.</div></div><q-space/><q-btn flat color="primary" icon="event" label="Abrir agenda" no-caps @click="go('agenda')"/></q-card-section>
      <q-separator/>
      <q-list separator>
        <q-item v-for="item in summary.agenda_hoy||[]" :key="item.id" clickable @click="go('ordenes')">
          <q-item-section avatar><q-avatar color="primary" text-color="white" icon="event"/></q-item-section>
          <q-item-section><q-item-label class="text-weight-bold">{{shortTime(item.hora_cita)}} · {{item.cliente_nombre}}</q-item-label><q-item-label caption>{{item.direccion_servicio}} · {{item.problema_reportado}}</q-item-label></q-item-section>
          <q-item-section side><q-badge :color="stageColor(item.etapa)" :label="stageLabel(item.etapa)"/></q-item-section>
        </q-item>
        <div v-if="!(summary.agenda_hoy||[]).length" class="empty-state">No hay visitas programadas para hoy.</div>
      </q-list>
    </q-card>
  </q-page>
</template>

<style scoped>
.home-page{max-width:1500px;margin:0 auto}.home-page h1{color:var(--viti-text)}.metric-card{height:100%;border-radius:18px;cursor:pointer;transition:transform .15s ease}.metric-card:hover{transform:translateY(-2px)}.empty-state{padding:28px;text-align:center;color:var(--viti-muted)}
@media(max-width:700px){.home-page{padding:12px}.home-page h1{font-size:25px;line-height:1.2}}
</style>
