<script setup>
import { computed, onMounted, ref } from 'vue'
import { useQuasar } from 'quasar'
import { useRoute, useRouter } from 'vue-router'
import { api } from '../boot/axios'

const $q = useQuasar()
const route = useRoute()
const router = useRouter()
const loading = ref(false)
const orders = ref([])
const search = ref('')
const selectedDate = ref(new Date().toISOString().slice(0,10))

const clientMode = computed(() => route.path.startsWith('/mi-apps/electrofrio'))
const appBase = computed(() => clientMode.value ? '/mi-apps/electrofrio' : '/apps/electrofrio')
const apiBase = computed(() => clientMode.value ? '/mi/apps/electrofrio' : '/apps/electrofrio')
const normalize = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
const date = value => value ? new Date(`${String(value).slice(0,10)}T12:00:00`).toLocaleDateString('es-BO') : '—'
const time = value => value ? String(value).slice(0,5) : 'Sin hora'
const stageLabel = value => ({cita:'Cita',diagnostico:'Diagnóstico',propuesta:'Esperando aprobación',servicio:'En servicio',cerrada:'Cerrada'}[value] || value)
const stageColor = value => ({cita:'blue',diagnostico:'purple',propuesta:'orange',servicio:'teal',cerrada:'grey'}[value] || 'grey')
const equipmentLabel = row => [row.equipo_tipo,row.equipo_marca,row.equipo_modelo].filter(Boolean).join(' · ') || 'Sin equipo'

const rows = computed(() => {
  const term = normalize(search.value.trim())
  return orders.value
    .filter(row => row.etapa !== 'cerrada')
    .filter(row => !selectedDate.value || String(row.fecha_cita || '').slice(0,10) === selectedDate.value)
    .filter(row => !term || normalize([row.codigo,row.cliente_nombre,row.tecnico_nombre,equipmentLabel(row),row.direccion_servicio,row.problema_reportado].filter(Boolean).join(' ')).includes(term))
    .sort((a,b) => `${a.fecha_cita||''} ${a.hora_cita||''}`.localeCompare(`${b.fecha_cita||''} ${b.hora_cita||''}`))
})

const columns = [
  {name:'hora',label:'Hora',field:'hora_cita',align:'left'},
  {name:'cliente',label:'Cliente / equipo',field:'cliente_nombre',align:'left'},
  {name:'direccion',label:'Dirección',field:'direccion_servicio',align:'left'},
  {name:'tecnico',label:'Técnico',field:'tecnico_nombre',align:'left'},
  {name:'estado',label:'Etapa',field:'etapa',align:'center'},
  {name:'acciones',label:'',field:'id',align:'right'},
]

async function load(){
  loading.value = true
  try{
    const response = await api.get(`${apiBase.value}/ordenes-operativas`)
    orders.value = response.data.data || []
  }catch(error){
    $q.notify({type:'negative',message:error.response?.data?.message || 'No se pudo cargar la agenda de Electrofrío.'})
  }finally{loading.value = false}
}

function goOrders(){ router.push(`${appBase.value}/ordenes`) }
function today(){ selectedDate.value = new Date().toISOString().slice(0,10) }
onMounted(load)
</script>

<template>
  <q-page padding class="agenda-page">
    <div class="row items-start justify-between q-col-gutter-md q-mb-lg">
      <div class="col-12 col-md">
        <div class="text-overline text-primary text-weight-bold">Trabajo</div>
        <h1 class="text-h4 text-weight-bold q-my-xs">Agenda</h1>
        <div class="text-body2 text-grey-7">Visitas ordenadas por fecha y hora. La creación y edición se realiza únicamente desde Órdenes.</div>
      </div>
      <div class="col-12 col-md-auto row q-gutter-sm">
        <q-btn outline color="primary" icon="refresh" label="Actualizar" no-caps :loading="loading" @click="load"/>
        <q-btn color="primary" icon="assignment" label="Ir a Órdenes" no-caps @click="goOrders"/>
      </div>
    </div>

    <q-card flat bordered class="filter-card q-mb-lg"><q-card-section><div class="row q-col-gutter-md items-center">
      <div class="col-12 col-md-5"><q-input v-model="search" outlined dense clearable debounce="180" label="Buscar cliente, equipo, técnico o dirección"><template #prepend><q-icon name="search"/></template></q-input></div>
      <div class="col-8 col-md-3"><q-input v-model="selectedDate" type="date" stack-label outlined dense label="Fecha"/></div>
      <div class="col-4 col-md-auto"><q-btn flat color="primary" icon="today" label="Hoy" no-caps @click="today"/></div>
    </div></q-card-section></q-card>

    <q-card flat bordered>
      <q-table flat :rows="rows" :columns="columns" row-key="id" :loading="loading" :grid="$q.screen.lt.md" :pagination="{rowsPerPage:30}" no-data-label="No hay visitas para esta fecha.">
        <template #body-cell-hora="props"><q-td :props="props"><div class="text-h6 text-weight-bold text-primary">{{time(props.row.hora_cita)}}</div><div class="text-caption text-grey-7">{{date(props.row.fecha_cita)}}</div></q-td></template>
        <template #body-cell-cliente="props"><q-td :props="props"><div class="text-weight-bold">{{props.row.cliente_nombre}}</div><div class="text-caption text-grey-7">{{equipmentLabel(props.row)}}</div><div class="text-caption q-mt-xs">{{props.row.problema_reportado}}</div></q-td></template>
        <template #body-cell-tecnico="props"><q-td :props="props">{{props.row.tecnico_nombre||'Sin asignar'}}</q-td></template>
        <template #body-cell-estado="props"><q-td :props="props"><q-badge :color="stageColor(props.row.etapa)" :label="stageLabel(props.row.etapa)"/></q-td></template>
        <template #body-cell-acciones="props"><q-td :props="props"><q-btn flat round color="primary" icon="open_in_new" @click="goOrders"><q-tooltip>Gestionar en Órdenes</q-tooltip></q-btn></q-td></template>
        <template #item="props"><div class="q-pa-xs col-12 col-sm-6"><q-card flat bordered class="agenda-card"><q-card-section><div class="row items-start no-wrap"><q-avatar color="primary" text-color="white" icon="event"/><div class="col q-ml-md"><div class="text-h6 text-weight-bold">{{time(props.row.hora_cita)}} · {{props.row.cliente_nombre}}</div><div class="text-caption text-grey-7">{{equipmentLabel(props.row)}}</div><div class="text-body2 q-mt-sm">{{props.row.direccion_servicio}}</div><div class="text-caption q-mt-sm">{{props.row.problema_reportado}}</div></div><q-badge :color="stageColor(props.row.etapa)" :label="stageLabel(props.row.etapa)"/></div><q-card-actions align="right"><q-btn flat color="primary" icon="assignment" label="Gestionar en Órdenes" no-caps @click="goOrders"/></q-card-actions></q-card-section></q-card></div></template>
      </q-table>
    </q-card>
  </q-page>
</template>

<style scoped>
.agenda-page{max-width:1500px;margin:0 auto}.agenda-page h1{color:var(--viti-text)}.filter-card,.agenda-card{border-radius:18px}.agenda-card{height:100%}
@media(max-width:700px){.agenda-page{padding:12px}.agenda-page h1{font-size:25px;line-height:1.2}}
</style>
