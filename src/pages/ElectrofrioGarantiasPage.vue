<script setup>
import { computed, onMounted, ref } from 'vue'
import { useQuasar } from 'quasar'
import { useRoute } from 'vue-router'
import { api } from '../boot/axios'

const $q = useQuasar()
const route = useRoute()
const loading = ref(false)
const warranties = ref([])
const search = ref('')
const state = ref('todas')

const clientMode = computed(() => route.path.startsWith('/mi-apps/electrofrio'))
const base = computed(() => clientMode.value ? '/mi/apps/electrofrio' : '/apps/electrofrio')
const today = () => new Date(new Date().toISOString().slice(0,10) + 'T12:00:00')

function normalize(value){ return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase() }
function date(value){ return value ? new Date(`${String(value).slice(0,10)}T12:00:00`).toLocaleDateString('es-BO') : '—' }
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
function stateLabel(row){
  const current = warrantyState(row), days = daysRemaining(row)
  if (current === 'vencida') return `Vencida hace ${Math.abs(days)} día${Math.abs(days)===1?'':'s'}`
  if (current === 'por_vencer') return days === 0 ? 'Vence hoy' : `Vence en ${days} día${days===1?'':'s'}`
  if (current === 'vigente') return `${days} días restantes`
  return 'Sin fecha'
}
function stateColor(row){ return ({vigente:'positive',por_vencer:'orange',vencida:'negative',sin_fecha:'grey'}[warrantyState(row)] || 'grey') }

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
  {name:'orden',label:'Orden / cliente',field:'codigo',align:'left',sortable:true},
  {name:'equipo',label:'Equipo',field:'equipo_tipo',align:'left',sortable:true},
  {name:'periodo',label:'Periodo',field:'garantia_fin',align:'left',sortable:true},
  {name:'estado',label:'Estado',field:'garantia_fin',align:'center',sortable:true},
  {name:'condiciones',label:'Condiciones',field:'condiciones_garantia',align:'left'},
]

async function load(){
  loading.value = true
  try{
    const response = await api.get(`${base.value}/garantias`)
    warranties.value = response.data.data || []
  }catch(error){
    $q.notify({type:'negative',message:error.response?.data?.message || 'No se pudieron cargar las garantías de Electrofrío.'})
  }finally{ loading.value = false }
}

function filterState(value){ state.value = state.value === value ? 'todas' : value }

onMounted(load)
</script>

<template>
  <q-page padding class="warranties-page">
    <div class="row items-start justify-between q-col-gutter-md q-mb-lg">
      <div class="col-12 col-md">
        <div class="text-overline text-primary text-weight-bold">Control</div>
        <h1 class="text-h4 text-weight-bold q-my-xs">Garantías</h1>
        <div class="text-body2 text-grey-7">Seguimiento de servicios cubiertos. Los registros más recientes aparecen primero.</div>
      </div>
      <div class="col-12 col-md-auto"><q-btn outline color="primary" icon="refresh" label="Actualizar" no-caps :loading="loading" @click="load"/></div>
    </div>

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
      <div class="col-12 col-md"><q-input v-model="search" outlined dense clearable debounce="180" label="Buscar orden, cliente, equipo o condición"><template #prepend><q-icon name="search"/></template></q-input></div>
      <div class="col-12 col-md-auto"><q-btn-toggle v-model="state" no-caps unelevated toggle-color="primary" color="grey-2" text-color="grey-8" :options="[{label:'Todas',value:'todas'},{label:'Vigentes',value:'vigente'},{label:'Por vencer',value:'por_vencer'},{label:'Vencidas',value:'vencida'}]"/></div>
    </div></q-card-section></q-card>

    <q-card flat bordered>
      <q-table flat :rows="rows" :columns="columns" row-key="id" :loading="loading" :grid="$q.screen.lt.md" :pagination="{rowsPerPage:20}" no-data-label="No hay garantías que coincidan con este filtro.">
        <template #body-cell-orden="props"><q-td :props="props"><div class="text-weight-bold text-primary">{{props.row.codigo}}</div><div class="text-weight-medium">{{props.row.cliente_nombre}}</div><div class="text-caption text-grey-7">Registro #{{props.row.id}} · {{props.row.cliente_telefono||'Sin teléfono'}}</div></q-td></template>
        <template #body-cell-equipo="props"><q-td :props="props"><div>{{equipmentLabel(props.row)}}</div><div class="text-caption text-grey-7">{{props.row.tipo_servicio||'Servicio técnico'}}</div></q-td></template>
        <template #body-cell-periodo="props"><q-td :props="props"><div>{{date(props.row.garantia_inicio)}} → {{date(props.row.garantia_fin)}}</div><div class="text-caption text-grey-7">{{props.row.garantia_dias}} días de garantía</div></q-td></template>
        <template #body-cell-estado="props"><q-td :props="props"><q-badge :color="stateColor(props.row)" :label="stateLabel(props.row)"/></q-td></template>
        <template #body-cell-condiciones="props"><q-td :props="props"><div class="conditions-cell">{{props.row.condiciones_garantia||'Sin condiciones adicionales registradas.'}}</div></q-td></template>
        <template #item="props"><div class="q-pa-xs col-12 col-sm-6"><q-card flat bordered class="warranty-card"><q-card-section><div class="row items-start no-wrap"><div class="col"><div class="text-weight-bold text-primary">{{props.row.codigo}}</div><div class="text-subtitle1 text-weight-bold">{{props.row.cliente_nombre}}</div><div class="text-caption text-grey-7">{{equipmentLabel(props.row)}}</div></div><q-badge :color="stateColor(props.row)" :label="stateLabel(props.row)"/></div><q-separator class="q-my-md"/><div class="text-body2"><div><span class="text-grey-7">Cobertura:</span> {{date(props.row.garantia_inicio)}} → {{date(props.row.garantia_fin)}}</div><div class="q-mt-sm"><span class="text-grey-7">Condiciones:</span> {{props.row.condiciones_garantia||'Sin condiciones adicionales.'}}</div></div></q-card-section></q-card></div></template>
      </q-table>
    </q-card>
  </q-page>
</template>

<style scoped>
.warranties-page{max-width:1500px;margin:0 auto}.warranties-page h1{color:var(--viti-text)}.summary-card,.filter-card,.warranty-card{border-radius:18px}.summary-card{transition:transform .15s ease,border-color .15s ease}.summary-card:hover{transform:translateY(-2px)}.summary-card--active{border-color:var(--electro-primary)!important;box-shadow:0 0 0 1px var(--electro-primary)}.warranty-card{height:100%}.conditions-cell{max-width:360px;white-space:normal}
@media(max-width:700px){.warranties-page{padding:12px}.warranties-page h1{font-size:25px;line-height:1.2}.filter-card :deep(.q-btn-group){width:100%;display:grid;grid-template-columns:repeat(2,1fr)}.filter-card :deep(.q-btn){width:100%}}
</style>
