<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useQuasar } from 'quasar'
import { useRoute, useRouter } from 'vue-router'
import { api } from '../boot/axios'

const $q = useQuasar()
const route = useRoute()
const router = useRouter()
const loading = ref(false)
const saving = ref(false)
const orders = ref([])
const stateCatalog = ref([])
const search = ref('')
const selectedDate = ref(new Date().toISOString().slice(0,10))
const reprogramDialog = ref(false)
const activeAppointment = ref(null)
const reprogramForm = reactive({ fecha_cita:'', hora_cita:'', direccion_servicio:'', referencia_ubicacion:'', motivo:'' })

const clientMode = computed(() => route.path.startsWith('/mi-apps/electrofrio'))
const appBase = computed(() => clientMode.value ? '/mi-apps/electrofrio' : '/apps/electrofrio')
const apiBase = computed(() => clientMode.value ? '/mi/apps/electrofrio' : '/apps/electrofrio')
const stateMap = computed(() => Object.fromEntries(stateCatalog.value.map(item => [item.value,item])))
const normalize = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
const date = value => value ? new Date(`${String(value).slice(0,10)}T12:00:00`).toLocaleDateString('es-BO') : '—'
const time = value => value ? String(value).slice(0,5) : 'Sin hora'
const equipmentLabel = row => [row.equipo_tipo,row.equipo_marca,row.equipo_modelo].filter(Boolean).join(' · ') || 'Sin equipo'
const todayValue = () => new Date().toISOString().slice(0,10)

function currentState(row){
  if(row?.estado_actual)return row.estado_actual
  if(row?.etapa==='cerrada'&&row?.decision_cliente==='rechazado')return 'no_aprobado'
  return ({cita:'cita_programada',diagnostico:'diagnostico_realizado',propuesta:'esperando_aprobacion',servicio:'servicio_en_proceso',cerrada:'finalizado'})[row?.etapa]||'cita_programada'
}
function stateMeta(row){
  const value=currentState(row)
  return stateMap.value[value]||{
    value,
    label:({cita_programada:'Cita programada',en_visita:'En visita / revisión',diagnostico_realizado:'Diagnóstico realizado',propuesta_enviada:'Propuesta enviada',esperando_aprobacion:'Esperando aprobación',aprobado:'Aprobado',no_aprobado:'No aprobado',servicio_en_proceso:'Servicio en proceso',servicio_terminado:'Servicio terminado',pendiente_pago:'Pendiente de pago',finalizado:'Finalizado',cancelado:'Cancelado'})[value]||value,
    color:({cita_programada:'blue',en_visita:'indigo',diagnostico_realizado:'purple',propuesta_enviada:'deep-orange',esperando_aprobacion:'orange',aprobado:'positive',no_aprobado:'negative',servicio_en_proceso:'teal',servicio_terminado:'cyan-8',pendiente_pago:'amber-9',finalizado:'positive',cancelado:'grey-7'})[value]||'grey-7',
    icon:'event',
  }
}
function canManageAppointment(row){ return ['cita_programada','en_visita'].includes(currentState(row)) }
function notifyError(error,fallback){
  const errors=error.response?.data?.errors
  const first=errors?Object.values(errors).flat()[0]:null
  $q.notify({type:'negative',message:first||error.response?.data?.message||fallback})
}

const rows = computed(() => {
  const term = normalize(search.value.trim())
  return orders.value
    .filter(row => !['finalizado','no_aprobado','cancelado'].includes(currentState(row)))
    .filter(row => !selectedDate.value || String(row.fecha_cita || '').slice(0,10) === selectedDate.value)
    .filter(row => !term || normalize([row.codigo,row.cliente_nombre,row.tecnico_nombre,equipmentLabel(row),row.direccion_servicio,row.problema_reportado,stateMeta(row).label].filter(Boolean).join(' ')).includes(term))
    .sort((a,b) => `${a.fecha_cita||''} ${a.hora_cita||''}`.localeCompare(`${b.fecha_cita||''} ${b.hora_cita||''}`))
})
const daySummary = computed(() => ({
  total:rows.value.length,
  programadas:rows.value.filter(row=>currentState(row)==='cita_programada').length,
  visita:rows.value.filter(row=>currentState(row)==='en_visita').length,
}))

const columns = [
  {name:'hora',label:'Hora',field:'hora_cita',align:'left'},
  {name:'cliente',label:'Cliente / equipo',field:'cliente_nombre',align:'left'},
  {name:'direccion',label:'Dirección',field:'direccion_servicio',align:'left'},
  {name:'tecnico',label:'Técnico',field:'tecnico_nombre',align:'left'},
  {name:'estado',label:'Estado',field:'estado_actual',align:'center'},
  {name:'acciones',label:'Acciones',field:'id',align:'right'},
]

async function load(){
  loading.value = true
  try{
    const [ordersResponse,statesResponse] = await Promise.all([
      api.get(`${apiBase.value}/ordenes-operativas`),
      api.get(`${apiBase.value}/flujo-estados`),
    ])
    orders.value = ordersResponse.data.data || []
    stateCatalog.value = statesResponse.data.data || []
  }catch(error){
    notifyError(error,'No se pudo cargar la agenda de servicios.')
  }finally{loading.value = false}
}

function goOrders(){ router.push(`${appBase.value}/ordenes`) }
function openService(row){ router.push({path:`${appBase.value}/ordenes`,query:{servicio:String(row.id)}}) }
function today(){ selectedDate.value = todayValue() }
function openReprogram(row){
  activeAppointment.value=row
  Object.assign(reprogramForm,{
    fecha_cita:String(row.fecha_cita||todayValue()).slice(0,10),
    hora_cita:String(row.hora_cita||'').slice(0,5),
    direccion_servicio:row.direccion_servicio||'',
    referencia_ubicacion:row.referencia_ubicacion||'',
    motivo:'',
  })
  reprogramDialog.value=true
}
async function saveReprogram(){
  if(!activeAppointment.value)return
  if(!reprogramForm.fecha_cita||String(reprogramForm.motivo||'').trim().length<3){
    $q.notify({type:'warning',message:'Selecciona la nueva fecha e indica el motivo de la reprogramación.'})
    return
  }
  saving.value=true
  try{
    const response=await api.post(`${apiBase.value}/ordenes/${activeAppointment.value.id}/reprogramar`,{
      fecha_cita:reprogramForm.fecha_cita,
      hora_cita:reprogramForm.hora_cita||null,
      direccion_servicio:reprogramForm.direccion_servicio||null,
      referencia_ubicacion:reprogramForm.referencia_ubicacion||null,
      motivo:reprogramForm.motivo.trim(),
    })
    reprogramDialog.value=false
    selectedDate.value=reprogramForm.fecha_cita
    await load()
    $q.notify({type:'positive',message:response.data?.message||'Cita reprogramada.'})
  }catch(error){notifyError(error,'No se pudo reprogramar la cita.')}finally{saving.value=false}
}
function cancelAppointment(row){
  if(!canManageAppointment(row))return
  $q.dialog({
    title:'Cancelar cita',
    message:`${row.cliente_nombre} · ${date(row.fecha_cita)} ${time(row.hora_cita)}. Indica el motivo; quedará guardado en el historial.`,
    prompt:{model:'',type:'textarea',isValid:value=>String(value||'').trim().length>=3},
    cancel:true,
    persistent:true,
    ok:{label:'Cancelar cita',color:'negative',noCaps:true},
  }).onOk(async reason=>{
    saving.value=true
    try{
      await api.post(`${apiBase.value}/ordenes/${row.id}/estado`,{estado:'cancelado',observacion:String(reason).trim()})
      await load()
      $q.notify({type:'positive',message:'Cita cancelada y registrada en el historial.'})
    }catch(error){notifyError(error,'No se pudo cancelar la cita.')}finally{saving.value=false}
  })
}

onMounted(load)
</script>

<template>
  <q-page padding class="agenda-page">
    <div class="row items-start justify-between q-col-gutter-md q-mb-lg">
      <div class="col-12 col-md">
        <div class="text-overline text-primary text-weight-bold">Trabajo</div>
        <h1 class="text-h4 text-weight-bold q-my-xs">Agenda</h1>
        <div class="text-body2 text-grey-7">Visitas ordenadas por fecha y hora. Desde aquí puedes abrir la ficha, reprogramar o cancelar una cita sin perder trazabilidad.</div>
      </div>
      <div class="col-12 col-md-auto row q-gutter-sm">
        <q-btn outline color="primary" icon="refresh" label="Actualizar" no-caps :loading="loading" @click="load"/>
        <q-btn color="primary" icon="assignment" label="Ver servicios" no-caps @click="goOrders"/>
      </div>
    </div>

    <q-card flat bordered class="filter-card q-mb-lg">
      <q-card-section>
        <div class="row q-col-gutter-md items-center">
          <div class="col-12 col-md-5"><q-input v-model="search" outlined dense clearable debounce="180" label="Buscar cliente, equipo, técnico, dirección o estado"><template #prepend><q-icon name="search"/></template></q-input></div>
          <div class="col-8 col-md-3"><q-input v-model="selectedDate" type="date" stack-label outlined dense label="Fecha"/></div>
          <div class="col-4 col-md-auto"><q-btn flat color="primary" icon="today" label="Hoy" no-caps @click="today"/></div>
          <div class="col-12 col-md row q-gutter-sm justify-end">
            <q-badge color="primary" :label="`${daySummary.total} visita(s)`"/>
            <q-badge color="blue" :label="`${daySummary.programadas} programada(s)`"/>
            <q-badge v-if="daySummary.visita" color="indigo" :label="`${daySummary.visita} en visita`"/>
          </div>
        </div>
      </q-card-section>
    </q-card>

    <q-card flat bordered>
      <q-table flat :rows="rows" :columns="columns" row-key="id" :loading="loading" :grid="$q.screen.lt.md" :pagination="{rowsPerPage:30}" no-data-label="No hay visitas para esta fecha.">
        <template #body-cell-hora="props"><q-td :props="props"><div class="text-h6 text-weight-bold text-primary">{{time(props.row.hora_cita)}}</div><div class="text-caption text-grey-7">{{date(props.row.fecha_cita)}}</div></q-td></template>
        <template #body-cell-cliente="props"><q-td :props="props"><div class="text-weight-bold">{{props.row.cliente_nombre}}</div><div class="text-caption text-grey-7">{{equipmentLabel(props.row)}}</div><div class="text-caption q-mt-xs">{{props.row.problema_reportado}}</div></q-td></template>
        <template #body-cell-tecnico="props"><q-td :props="props">{{props.row.tecnico_nombre||'Sin asignar'}}</q-td></template>
        <template #body-cell-estado="props"><q-td :props="props"><q-badge :color="stateMeta(props.row).color" :label="stateMeta(props.row).label"/></q-td></template>
        <template #body-cell-acciones="props">
          <q-td :props="props">
            <div class="row no-wrap justify-end q-gutter-xs">
              <q-btn flat round color="primary" icon="open_in_new" @click="openService(props.row)"><q-tooltip>Abrir ficha del servicio</q-tooltip></q-btn>
              <q-btn v-if="canManageAppointment(props.row)" flat round color="orange-8" icon="event_repeat" :disable="saving" @click="openReprogram(props.row)"><q-tooltip>Reprogramar cita</q-tooltip></q-btn>
              <q-btn v-if="canManageAppointment(props.row)" flat round color="negative" icon="event_busy" :disable="saving" @click="cancelAppointment(props.row)"><q-tooltip>Cancelar cita</q-tooltip></q-btn>
            </div>
          </q-td>
        </template>
        <template #item="props">
          <div class="q-pa-xs col-12 col-sm-6">
            <q-card flat bordered class="agenda-card">
              <q-card-section>
                <div class="row items-start no-wrap">
                  <q-avatar :color="stateMeta(props.row).color" text-color="white" :icon="stateMeta(props.row).icon||'event'"/>
                  <div class="col q-ml-md">
                    <div class="text-h6 text-weight-bold">{{time(props.row.hora_cita)}} · {{props.row.cliente_nombre}}</div>
                    <div class="text-caption text-grey-7">{{equipmentLabel(props.row)}}</div>
                    <q-badge class="q-mt-xs" :color="stateMeta(props.row).color" :label="stateMeta(props.row).label"/>
                    <div class="text-body2 q-mt-sm">{{props.row.direccion_servicio}}</div>
                    <div class="text-caption q-mt-sm">{{props.row.problema_reportado}}</div>
                  </div>
                </div>
              </q-card-section>
              <q-separator/>
              <q-card-actions align="right">
                <q-btn flat color="primary" icon="open_in_new" label="Abrir" no-caps @click="openService(props.row)"/>
                <q-btn v-if="canManageAppointment(props.row)" flat color="orange-8" icon="event_repeat" label="Reprogramar" no-caps :disable="saving" @click="openReprogram(props.row)"/>
                <q-btn v-if="canManageAppointment(props.row)" flat color="negative" icon="event_busy" label="Cancelar" no-caps :disable="saving" @click="cancelAppointment(props.row)"/>
              </q-card-actions>
            </q-card>
          </div>
        </template>
      </q-table>
    </q-card>

    <q-dialog v-model="reprogramDialog" persistent>
      <q-card class="reprogram-card">
        <q-card-section class="row items-start">
          <div>
            <div class="text-overline text-primary text-weight-bold">Agenda</div>
            <div class="text-h5 text-weight-bold">Reprogramar cita</div>
            <div v-if="activeAppointment" class="text-caption text-grey-7 q-mt-xs">{{activeAppointment.cliente_nombre}} · {{date(activeAppointment.fecha_cita)}} {{time(activeAppointment.hora_cita)}}</div>
          </div>
          <q-space/><q-btn flat round icon="close" v-close-popup/>
        </q-card-section>
        <q-separator/>
        <q-card-section>
          <div class="row q-col-gutter-md q-gutter-y-md">
            <div class="col-7"><q-input v-model="reprogramForm.fecha_cita" outlined type="date" stack-label label="Nueva fecha *" :min="todayValue()"/></div>
            <div class="col-5"><q-input v-model="reprogramForm.hora_cita" outlined type="time" stack-label label="Hora"/></div>
            <div class="col-12"><q-input v-model="reprogramForm.direccion_servicio" outlined label="Dirección de la visita"/></div>
            <div class="col-12"><q-input v-model="reprogramForm.referencia_ubicacion" outlined label="Referencia de ubicación"/></div>
            <div class="col-12"><q-input v-model="reprogramForm.motivo" outlined type="textarea" autogrow label="Motivo de la reprogramación *" hint="El motivo y el cambio de horario quedarán en el historial del servicio."/></div>
          </div>
        </q-card-section>
        <q-separator/>
        <q-card-actions align="right" class="q-pa-md">
          <q-btn flat label="Volver" no-caps v-close-popup/>
          <q-btn color="primary" icon="event_repeat" label="Guardar nueva cita" no-caps :loading="saving" @click="saveReprogram"/>
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<style scoped>
.agenda-page{max-width:1500px;margin:0 auto}.agenda-page h1{color:var(--viti-text)}.filter-card,.agenda-card{border-radius:18px}.agenda-card{height:100%}.reprogram-card{width:min(620px,94vw);border-radius:20px}
@media(max-width:700px){.agenda-page{padding:12px}.agenda-page h1{font-size:25px;line-height:1.2}}
</style>