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
const warranties = ref([])
const search = ref('')
const state = ref('todas')
const reentryDialog = ref(false)
const selectedWarranty = ref(null)
const reentryForm = reactive({fecha_cita:'',hora_cita:'09:00',direccion_servicio:'',referencia_ubicacion:'',prioridad:'alta',motivo:''})

const clientMode = computed(() => route.path.startsWith('/mi-apps/electrofrio'))
const base = computed(() => clientMode.value ? '/mi/apps/electrofrio' : '/apps/electrofrio')
const appBase = computed(() => clientMode.value ? '/mi-apps/electrofrio' : '/apps/electrofrio')
const todayValue = () => new Date().toISOString().slice(0,10)
const today = () => new Date(todayValue() + 'T12:00:00')

function normalize(value){ return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase() }
function date(value){ return value ? new Date(`${String(value).slice(0,10)}T12:00:00`).toLocaleDateString('es-BO') : '—' }
function time(value){ return value ? String(value).slice(0,5) : 'Sin hora' }
function equipmentLabel(row){ return [row.equipo_tipo,row.equipo_marca,row.equipo_modelo].filter(Boolean).join(' · ') || 'Sin equipo' }
function daysRemaining(row){
  if (!row.garantia_fin) return null
  const end = new Date(`${String(row.garantia_fin).slice(0,10)}T12:00:00`)
  return Math.ceil((end - today()) / 86400000)
}
function warrantyState(row){
  const days = daysRemaining(row)
  if (days === null) return 'sin_fecha'
  if (days < 0) return 'vencida'
  if (days <= 7) return 'por_vencer'
  return 'vigente'
}
function canReenter(row){ return ['vigente','por_vencer'].includes(warrantyState(row)) }
function stateLabel(row){
  const current = warrantyState(row), days = daysRemaining(row)
  if (current === 'vencida') return `Vencida hace ${Math.abs(days)} día${Math.abs(days)===1?'':'s'}`
  if (current === 'por_vencer') return days === 0 ? 'Vence hoy' : `Vence en ${days} día${days===1?'':'s'}`
  if (current === 'vigente') return `${days} días restantes`
  return 'Sin fecha'
}
function stateColor(row){ return ({vigente:'positive',por_vencer:'orange',vencida:'negative',sin_fecha:'grey'}[warrantyState(row)] || 'grey') }
function notifyError(error,fallback){
  const errors=error.response?.data?.errors
  const first=errors?Object.values(errors).flat()[0]:null
  $q.notify({type:'negative',message:first||error.response?.data?.message||fallback})
}

const rows = computed(() => {
  const term = normalize(search.value.trim())
  return [...warranties.value]
    .sort((a,b) => Number(b.id) - Number(a.id))
    .filter(row => {
      const matchesState = state.value === 'todas' || warrantyState(row) === state.value
      if (!matchesState) return false
      if (!term) return true
      return normalize([row.codigo,row.cliente_nombre,row.cliente_telefono,equipmentLabel(row),row.condiciones_garantia].filter(Boolean).join(' ')).includes(term)
    })
})
const counts = computed(() => warranties.value.reduce((acc,row) => {
  const key = warrantyState(row)
  acc[key] = (acc[key] || 0) + 1
  return acc
},{vigente:0,por_vencer:0,vencida:0,sin_fecha:0}))

const columns = [
  {name:'orden',label:'Servicio / cliente',field:'codigo',align:'left',sortable:true},
  {name:'equipo',label:'Equipo',field:'equipo_tipo',align:'left',sortable:true},
  {name:'periodo',label:'Periodo',field:'garantia_fin',align:'left',sortable:true},
  {name:'estado',label:'Estado',field:'garantia_fin',align:'center',sortable:true},
  {name:'condiciones',label:'Condiciones',field:'condiciones_garantia',align:'left'},
  {name:'acciones',label:'Acciones',field:'id',align:'right'},
]

async function load(){
  loading.value = true
  try{
    const response = await api.get(`${base.value}/garantias`)
    warranties.value = response.data.data || []
  }catch(error){
    notifyError(error,'No se pudieron cargar las garantías del sistema.')
  }finally{ loading.value = false }
}

function filterState(value){ state.value = state.value === value ? 'todas' : value }
function openService(row){ router.push({path:`${appBase.value}/ordenes`,query:{servicio:String(row.id)}}) }
function openReentry(row){
  if(!canReenter(row))return
  selectedWarranty.value=row
  Object.assign(reentryForm,{
    fecha_cita:todayValue(),
    hora_cita:'09:00',
    direccion_servicio:row.direccion_servicio||'',
    referencia_ubicacion:row.referencia_ubicacion||'',
    prioridad:'alta',
    motivo:'',
  })
  reentryDialog.value=true
}
async function saveReentry(){
  if(!selectedWarranty.value)return
  if(!reentryForm.fecha_cita||String(reentryForm.motivo||'').trim().length<3){
    $q.notify({type:'warning',message:'Selecciona la fecha e indica el motivo del reingreso.'})
    return
  }
  saving.value=true
  try{
    const response=await api.post(`${base.value}/ordenes/${selectedWarranty.value.id}/reingreso-garantia`,{
      fecha_cita:reentryForm.fecha_cita,
      hora_cita:reentryForm.hora_cita||null,
      direccion_servicio:reentryForm.direccion_servicio||null,
      referencia_ubicacion:reentryForm.referencia_ubicacion||null,
      prioridad:reentryForm.prioridad,
      motivo:reentryForm.motivo.trim(),
    })
    const newId=Number(response.data?.data?.id||0)
    reentryDialog.value=false
    $q.notify({type:'positive',message:response.data?.message||'Reingreso registrado.'})
    if(newId>0) await router.push({path:`${appBase.value}/ordenes`,query:{servicio:String(newId)}})
    else await load()
  }catch(error){notifyError(error,'No se pudo registrar el reingreso por garantía.')}finally{saving.value=false}
}

onMounted(load)
</script>

<template>
  <q-page padding class="warranties-page">
    <div class="row items-start justify-between q-col-gutter-md q-mb-lg">
      <div class="col-12 col-md">
        <div class="text-overline text-primary text-weight-bold">Control</div>
        <h1 class="text-h4 text-weight-bold q-my-xs">Garantías</h1>
        <div class="text-body2 text-grey-7">Seguimiento de servicios cubiertos. Una garantía vigente puede generar un reingreso enlazado al servicio original para evaluar la cobertura.</div>
      </div>
      <div class="col-12 col-md-auto"><q-btn outline color="primary" icon="refresh" label="Actualizar" no-caps :loading="loading" @click="load"/></div>
    </div>

    <q-banner rounded class="warranty-info q-mb-lg">
      <template #avatar><q-icon name="verified_user" color="primary"/></template>
      <strong>Reingreso por garantía</strong>: crea una nueva cita técnica vinculada al servicio original. El sistema no asume automáticamente si el nuevo trabajo será gratuito o tendrá costo; eso se define después de revisar la falla y las condiciones registradas.
    </q-banner>

    <div class="row q-col-gutter-sm q-mb-lg">
      <div v-for="card in [
        {key:'vigente',label:'Vigentes',value:counts.vigente,icon:'verified',color:'positive'},
        {key:'por_vencer',label:'Por vencer ≤ 7 días',value:counts.por_vencer,icon:'schedule',color:'orange'},
        {key:'vencida',label:'Vencidas',value:counts.vencida,icon:'event_busy',color:'negative'},
      ]" :key="card.key" class="col-12 col-sm-4">
        <q-card flat bordered class="summary-card cursor-pointer" :class="{'summary-card--active':state===card.key}" @click="filterState(card.key)"><q-card-section class="row items-center no-wrap"><q-avatar :color="card.color" text-color="white" :icon="card.icon"/><div class="q-ml-md"><div class="text-h5 text-weight-bold">{{card.value}}</div><div class="text-caption text-grey-7">{{card.label}}</div></div></q-card-section></q-card>
      </div>
    </div>

    <q-card flat bordered class="filter-card q-mb-lg"><q-card-section><div class="row q-col-gutter-md items-center">
      <div class="col-12 col-md"><q-input v-model="search" outlined dense clearable debounce="180" label="Buscar servicio, cliente, equipo o condición"><template #prepend><q-icon name="search"/></template></q-input></div>
      <div class="col-12 col-md-auto"><q-btn-toggle v-model="state" no-caps unelevated toggle-color="primary" color="grey-2" text-color="grey-8" :options="[{label:'Todas',value:'todas'},{label:'Vigentes',value:'vigente'},{label:'Por vencer',value:'por_vencer'},{label:'Vencidas',value:'vencida'}]"/></div>
    </div></q-card-section></q-card>

    <q-card flat bordered>
      <q-table flat :rows="rows" :columns="columns" row-key="id" :loading="loading" :grid="$q.screen.lt.md" :pagination="{rowsPerPage:20}" no-data-label="No hay garantías que coincidan con este filtro.">
        <template #body-cell-orden="props"><q-td :props="props"><div class="text-weight-bold text-primary">{{props.row.codigo}}</div><div class="text-weight-medium">{{props.row.cliente_nombre}}</div><div class="text-caption text-grey-7">Registro #{{props.row.id}} · {{props.row.cliente_telefono||'Sin teléfono'}}</div></q-td></template>
        <template #body-cell-equipo="props"><q-td :props="props"><div>{{equipmentLabel(props.row)}}</div><div class="text-caption text-grey-7">{{props.row.tipo_servicio||'Servicio técnico'}}</div></q-td></template>
        <template #body-cell-periodo="props"><q-td :props="props"><div>{{date(props.row.garantia_inicio)}} → {{date(props.row.garantia_fin)}}</div><div class="text-caption text-grey-7">{{props.row.garantia_dias}} días de garantía</div></q-td></template>
        <template #body-cell-estado="props"><q-td :props="props"><q-badge :color="stateColor(props.row)" :label="stateLabel(props.row)"/></q-td></template>
        <template #body-cell-condiciones="props"><q-td :props="props"><div class="conditions-cell">{{props.row.condiciones_garantia||'Sin condiciones adicionales registradas.'}}</div></q-td></template>
        <template #body-cell-acciones="props">
          <q-td :props="props"><div class="row no-wrap justify-end q-gutter-xs">
            <q-btn flat round color="primary" icon="open_in_new" @click="openService(props.row)"><q-tooltip>Abrir servicio original</q-tooltip></q-btn>
            <q-btn v-if="canReenter(props.row)" flat round color="positive" icon="assignment_return" :disable="saving" @click="openReentry(props.row)"><q-tooltip>Registrar reingreso por garantía</q-tooltip></q-btn>
          </div></q-td>
        </template>
        <template #item="props">
          <div class="q-pa-xs col-12 col-sm-6">
            <q-card flat bordered class="warranty-card">
              <q-card-section>
                <div class="row items-start no-wrap"><div class="col"><div class="text-weight-bold text-primary">{{props.row.codigo}}</div><div class="text-subtitle1 text-weight-bold">{{props.row.cliente_nombre}}</div><div class="text-caption text-grey-7">{{equipmentLabel(props.row)}}</div></div><q-badge :color="stateColor(props.row)" :label="stateLabel(props.row)"/></div>
                <q-separator class="q-my-md"/>
                <div class="text-body2"><div><span class="text-grey-7">Cobertura:</span> {{date(props.row.garantia_inicio)}} → {{date(props.row.garantia_fin)}}</div><div class="q-mt-sm"><span class="text-grey-7">Condiciones:</span> {{props.row.condiciones_garantia||'Sin condiciones adicionales.'}}</div></div>
              </q-card-section>
              <q-separator/>
              <q-card-actions align="right"><q-btn flat color="primary" icon="open_in_new" label="Abrir servicio" no-caps @click="openService(props.row)"/><q-btn v-if="canReenter(props.row)" flat color="positive" icon="assignment_return" label="Reingreso" no-caps :disable="saving" @click="openReentry(props.row)"/></q-card-actions>
            </q-card>
          </div>
        </template>
      </q-table>
    </q-card>

    <q-dialog v-model="reentryDialog" persistent>
      <q-card class="reentry-card">
        <q-card-section class="row items-start">
          <div><div class="text-overline text-primary text-weight-bold">Garantía vigente</div><div class="text-h5 text-weight-bold">Registrar reingreso</div><div v-if="selectedWarranty" class="text-caption text-grey-7 q-mt-xs">Servicio original {{selectedWarranty.codigo}} · {{selectedWarranty.cliente_nombre}} · {{equipmentLabel(selectedWarranty)}}</div></div>
          <q-space/><q-btn flat round icon="close" v-close-popup/>
        </q-card-section>
        <q-separator/>
        <q-card-section>
          <q-banner v-if="selectedWarranty" rounded class="bg-grey-2 q-mb-md"><div class="text-caption text-grey-7">Condiciones registradas</div><div class="text-body2 text-weight-medium">{{selectedWarranty.condiciones_garantia||'No se registraron condiciones adicionales.'}}</div></q-banner>
          <div class="row q-col-gutter-md q-gutter-y-md">
            <div class="col-7 col-md-5"><q-input v-model="reentryForm.fecha_cita" outlined type="date" stack-label label="Fecha de revisión *" :min="todayValue()"/></div>
            <div class="col-5 col-md-3"><q-input v-model="reentryForm.hora_cita" outlined type="time" stack-label label="Hora"/></div>
            <div class="col-12 col-md-4"><q-select v-model="reentryForm.prioridad" outlined :options="['baja','normal','alta','urgente']" label="Prioridad"/></div>
            <div class="col-12"><q-input v-model="reentryForm.direccion_servicio" outlined label="Dirección de la revisión"/></div>
            <div class="col-12"><q-input v-model="reentryForm.referencia_ubicacion" outlined label="Referencia de ubicación"/></div>
            <div class="col-12"><q-input v-model="reentryForm.motivo" outlined type="textarea" autogrow label="¿Qué falla volvió a presentarse? *" hint="Este motivo quedará vinculado al servicio original en el historial."/></div>
          </div>
        </q-card-section>
        <q-separator/>
        <q-card-actions align="right" class="q-pa-md"><q-btn flat label="Volver" no-caps v-close-popup/><q-btn color="positive" icon="assignment_return" label="Crear reingreso" no-caps :loading="saving" @click="saveReentry"/></q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<style scoped>
.warranties-page{max-width:1500px;margin:0 auto}.warranties-page h1{color:var(--viti-text)}.summary-card,.filter-card,.warranty-card{border-radius:18px}.summary-card{transition:transform .15s ease,border-color .15s ease}.summary-card:hover{transform:translateY(-2px)}.summary-card--active{border-color:var(--electro-primary)!important;box-shadow:0 0 0 1px var(--electro-primary)}.warranty-card{height:100%}.conditions-cell{max-width:360px;white-space:normal}.warranty-info{background:color-mix(in srgb,var(--electro-primary) 8%,white);border:1px solid color-mix(in srgb,var(--electro-primary) 22%,white)}.reentry-card{width:min(720px,95vw);border-radius:20px}
@media(max-width:700px){.warranties-page{padding:12px}.warranties-page h1{font-size:25px;line-height:1.2}.filter-card :deep(.q-btn-group){width:100%;display:grid;grid-template-columns:repeat(2,1fr)}.filter-card :deep(.q-btn){width:100%}}
</style>