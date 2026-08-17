<script setup>
import { computed, inject, onMounted, ref } from 'vue'
import { useQuasar } from 'quasar'
import { useRoute, useRouter } from 'vue-router'
import { api } from '../boot/axios'

const $q = useQuasar()
const route = useRoute()
const router = useRouter()
const modules = inject('electrofrioModules', ref([]))
const airConfig = inject('airSystemConfig', ref(null))
const loading = ref(false)
const summary = ref({
  citas_hoy:0,
  pendientes_diagnostico:0,
  esperando_aprobacion:0,
  servicios_activos:0,
  pendientes_pago:null,
  ordenes_abiertas:0,
  por_cobrar:null,
  garantias_por_vencer:null,
  stock_bajo:null,
  agenda_hoy:[],
  ordenes_recientes:[],
})

const clientMode = computed(() => route.path.startsWith('/mi-apps/'))
const appBase = computed(() => clientMode.value ? '/mi-apps/electrofrio' : '/apps/electrofrio')
const apiBase = computed(() => clientMode.value ? '/mi/apps/electrofrio' : '/apps/electrofrio')
const enabled = module => modules.value?.includes(module)
const systemName = computed(() => airConfig.value?.nombre_corto || 'Aires Acondicionados')
const businessName = computed(() => airConfig.value?.empresa?.nombre_comercial || summary.value?.empresa?.nombre_comercial || 'Mi empresa')
const money = value => `${Number(value || 0).toFixed(2)} ${airConfig.value?.moneda || 'BOB'}`
const shortTime = value => value ? String(value).slice(0,5) : 'Sin hora'
const date = value => value ? new Date(`${String(value).slice(0,10)}T12:00:00`).toLocaleDateString('es-BO') : '—'

const states = {
  cita_programada:{label:'Cita programada',color:'blue',icon:'event'},
  en_visita:{label:'En visita',color:'indigo',icon:'location_on'},
  diagnostico_realizado:{label:'Diagnóstico realizado',color:'purple',icon:'troubleshoot'},
  propuesta_enviada:{label:'Propuesta enviada',color:'deep-orange',icon:'request_quote'},
  esperando_aprobacion:{label:'Esperando aprobación',color:'orange',icon:'hourglass_top'},
  aprobado:{label:'Aprobado',color:'positive',icon:'thumb_up'},
  no_aprobado:{label:'No aprobado',color:'negative',icon:'thumb_down'},
  servicio_en_proceso:{label:'Servicio en proceso',color:'teal',icon:'build'},
  servicio_terminado:{label:'Servicio terminado',color:'cyan-8',icon:'engineering'},
  pendiente_pago:{label:'Pendiente de pago',color:'amber-9',icon:'payments'},
  finalizado:{label:'Finalizado',color:'positive',icon:'task_alt'},
  cancelado:{label:'Cancelado',color:'grey-7',icon:'cancel'},
}
function stateValue(item){
  if(item?.estado_actual)return item.estado_actual
  return ({cita:'cita_programada',diagnostico:'diagnostico_realizado',propuesta:'esperando_aprobacion',servicio:'servicio_en_proceso',cerrada:'finalizado'})[item?.etapa]||'cita_programada'
}
function stateMeta(item){return states[stateValue(item)]||{label:'En seguimiento',color:'grey',icon:'radio_button_checked'}}

const attentionCards = computed(() => [
  {key:'citas',label:'Citas de hoy',value:summary.value.citas_hoy,icon:'event_available',color:'blue',module:'agenda'},
  {key:'diagnostico',label:'Por revisar / diagnosticar',value:summary.value.pendientes_diagnostico,icon:'troubleshoot',color:'purple',states:['cita_programada','en_visita']},
  {key:'aprobacion',label:'Esperando aprobación',value:summary.value.esperando_aprobacion,icon:'request_quote',color:'orange',states:['propuesta_enviada','esperando_aprobacion']},
  {key:'servicio',label:'Servicios activos',value:summary.value.servicios_activos,icon:'build',color:'teal',states:['aprobado','servicio_en_proceso','servicio_terminado','pendiente_pago']},
])

async function load(){
  loading.value = true
  try{
    const response = await api.get(`${apiBase.value}/dashboard-operativo`)
    summary.value = response.data.data || summary.value
  }catch(error){
    $q.notify({type:'negative',message:error.response?.data?.message || 'No se pudo cargar el panel operativo.'})
  }finally{loading.value = false}
}

function go(module){ router.push(`${appBase.value}/${module}`) }
function goServices(statesFilter=[],serviceId=null){
  const query={}
  if(statesFilter.length)query.estados=statesFilter.join(',')
  if(serviceId)query.servicio=String(serviceId)
  router.push({path:`${appBase.value}/ordenes`,query})
}
function openAttention(card){
  if(card.module)return go(card.module)
  goServices(card.states||[])
}
onMounted(load)
</script>

<template>
  <q-page padding class="home-page">
    <div class="hero-card q-mb-lg">
      <div class="row items-center q-col-gutter-lg">
        <div class="col-12 col-md">
          <div class="text-overline text-weight-bold">{{businessName}} · VITI</div>
          <h1 class="text-h4 text-weight-bold q-my-xs">{{systemName}}</h1>
          <div class="text-body1 hero-copy">Primero lo que necesita atención. Cada tarjeta te lleva directamente al trabajo correspondiente.</div>
        </div>
        <div class="col-12 col-md-auto row q-gutter-sm">
          <q-btn outline color="white" icon="refresh" label="Actualizar" no-caps :loading="loading" @click="load"/>
          <q-btn v-if="enabled('ordenes')" color="white" text-color="primary" icon="add" label="Nuevo servicio" no-caps @click="goServices()"/>
        </div>
      </div>
    </div>

    <div class="section-title q-mb-sm"><div class="text-h6 text-weight-bold">Requiere atención</div><div class="text-caption text-grey-7">Toca una tarjeta para trabajar directamente sobre ese grupo de servicios.</div></div>
    <div class="row q-col-gutter-md q-mb-xl">
      <div v-for="card in attentionCards" :key="card.key" class="col-6 col-lg-3">
        <q-card flat bordered class="metric-card" @click="openAttention(card)">
          <q-card-section>
            <div class="row items-start justify-between no-wrap"><q-avatar :color="card.color" text-color="white" :icon="card.icon"/><q-icon name="arrow_forward" color="grey-5"/></div>
            <div class="text-h4 text-weight-bold q-mt-md">{{card.value}}</div>
            <div class="text-caption text-grey-7">{{card.label}}</div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <div class="section-title q-mb-sm"><div class="text-h6 text-weight-bold">Control del negocio</div><div class="text-caption text-grey-7">Indicadores operativos y económicos según los módulos habilitados.</div></div>
    <div class="row q-col-gutter-md q-mb-xl">
      <div class="col-6 col-lg-3"><q-card flat bordered class="metric-card" @click="goServices()"><q-card-section><q-icon name="assignment" color="primary" size="28px"/><div class="text-h4 text-weight-bold q-mt-sm">{{summary.ordenes_abiertas}}</div><div class="text-caption text-grey-7">Servicios abiertos</div></q-card-section></q-card></div>
      <div v-if="enabled('pagos')" class="col-6 col-lg-3"><q-card flat bordered class="metric-card" @click="summary.pendientes_pago?goServices(['pendiente_pago']):go('pagos')"><q-card-section><q-icon name="payments" color="orange" size="28px"/><div class="text-h5 text-weight-bold q-mt-sm">{{money(summary.por_cobrar)}}</div><div class="text-caption text-grey-7">Por cobrar · {{summary.pendientes_pago||0}} terminado(s)</div></q-card-section></q-card></div>
      <div v-if="enabled('garantias')" class="col-6 col-lg-3"><q-card flat bordered class="metric-card" @click="go('garantias')"><q-card-section><q-icon name="schedule" color="orange" size="28px"/><div class="text-h4 text-weight-bold q-mt-sm">{{summary.garantias_por_vencer}}</div><div class="text-caption text-grey-7">Garantías por vencer ≤ 7 días</div></q-card-section></q-card></div>
      <div v-if="enabled('inventario')" class="col-6 col-lg-3"><q-card flat bordered class="metric-card" @click="go('inventario')"><q-card-section><q-icon name="inventory_2" :color="summary.stock_bajo?'negative':'positive'" size="28px"/><div class="text-h4 text-weight-bold q-mt-sm">{{summary.stock_bajo}}</div><div class="text-caption text-grey-7">Materiales con stock bajo</div></q-card-section></q-card></div>
    </div>

    <div class="row q-col-gutter-lg">
      <div class="col-12 col-lg-7">
        <q-card flat bordered class="panel-card">
          <q-card-section class="row items-center"><div><div class="text-h6 text-weight-bold">Agenda de hoy</div><div class="text-caption text-grey-7">Las visitas aparecen en el orden en que deben atenderse.</div></div><q-space/><q-btn flat color="primary" icon="event" label="Abrir agenda" no-caps @click="go('agenda')"/></q-card-section>
          <q-separator/>
          <q-list separator>
            <q-item v-for="item in summary.agenda_hoy||[]" :key="item.id" clickable @click="goServices([],item.id)">
              <q-item-section avatar><q-avatar :color="stateMeta(item).color" text-color="white" :icon="stateMeta(item).icon"/></q-item-section>
              <q-item-section><q-item-label class="text-weight-bold">{{shortTime(item.hora_cita)}} · {{item.cliente_nombre}}</q-item-label><q-item-label caption>{{[item.equipo_tipo,item.equipo_marca,item.equipo_modelo].filter(Boolean).join(' · ') || 'Sin equipo'}} · {{item.problema_reportado}}</q-item-label><q-item-label caption v-if="item.tecnico_nombre">Técnico: {{item.tecnico_nombre}}</q-item-label></q-item-section>
              <q-item-section side><q-badge :color="stateMeta(item).color" :label="stateMeta(item).label"/></q-item-section>
            </q-item>
            <div v-if="!(summary.agenda_hoy||[]).length" class="empty-state">No hay visitas programadas para hoy.</div>
          </q-list>
        </q-card>
      </div>

      <div class="col-12 col-lg-5">
        <q-card flat bordered class="panel-card">
          <q-card-section class="row items-center"><div><div class="text-h6 text-weight-bold">Registros recientes</div><div class="text-caption text-grey-7">Lo último registrado aparece primero.</div></div><q-space/><q-btn flat color="primary" label="Ver servicios" no-caps @click="goServices()"/></q-card-section>
          <q-separator/>
          <q-list separator>
            <q-item v-for="item in summary.ordenes_recientes||[]" :key="item.id" clickable @click="goServices([],item.id)">
              <q-item-section><q-item-label class="text-weight-bold">{{item.codigo}} · {{item.cliente_nombre}}</q-item-label><q-item-label caption>{{item.tipo_servicio || 'Servicio técnico'}} · cita {{date(item.fecha_cita)}}</q-item-label></q-item-section>
              <q-item-section side><q-badge :color="stateMeta(item).color" :label="stateMeta(item).label"/></q-item-section>
            </q-item>
            <div v-if="!(summary.ordenes_recientes||[]).length" class="empty-state">Todavía no hay servicios registrados.</div>
          </q-list>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<style scoped>
.home-page{max-width:1500px;margin:0 auto}.hero-card{border-radius:22px;padding:30px;background:linear-gradient(135deg,var(--electro-primary),var(--electro-secondary));color:#fff;box-shadow:0 14px 38px color-mix(in srgb,var(--electro-primary) 22%,transparent)}.hero-card h1{color:#fff}.hero-copy{color:rgba(255,255,255,.88)}.metric-card,.panel-card{height:100%;border-radius:18px}.metric-card{cursor:pointer;transition:transform .15s ease,box-shadow .15s ease}.metric-card:hover{transform:translateY(-2px);box-shadow:0 10px 24px rgba(23,49,70,.08)}.empty-state{padding:28px;text-align:center;color:var(--viti-muted)}.section-title{padding-left:2px}@media(max-width:700px){.home-page{padding:12px}.hero-card{padding:22px}.hero-card h1{font-size:25px;line-height:1.2}}
</style>