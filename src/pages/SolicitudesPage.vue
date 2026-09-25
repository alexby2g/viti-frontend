<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { api } from '../boot/axios'
import { formatDateTime } from '../utils/date'
import PageHeader from '../components/PageHeader.vue'

const $q = useQuasar()
const router = useRouter()
const rows = ref([])
const loading = ref(false)
const search = ref('')
const statusFilter = ref('todas')

const states = [
  { label:'Todas', value:'todas', icon:'all_inbox' },
  { label:'Borradores', value:'borrador', icon:'edit_note' },
  { label:'Por revisar', value:'en_revision', icon:'rate_review' },
  { label:'Aprobadas', value:'aprobada', icon:'task_alt' },
  { label:'Rechazadas', value:'rechazada', icon:'cancel' },
  { label:'En trabajo', value:'convertida', icon:'account_tree' },
]

const filteredRows = computed(() => {
  const term = search.value.trim().toLocaleLowerCase('es')
  return rows.value.filter(row => {
    if (statusFilter.value !== 'todas' && row.estado !== statusFilter.value) return false
    if (!term) return true
    return `${row.codigo || ''} ${row.titulo || ''} ${row.resumen || ''} ${row.cliente?.nombre || ''} ${row.cliente?.telefono || ''} ${row.empresa?.nombre_comercial || ''}`.toLocaleLowerCase('es').includes(term)
  })
})

function countState(value) { return value === 'todas' ? rows.value.length : rows.value.filter(row => row.estado === value).length }
function stateLabel(value) { return ({borrador:'Borrador',en_revision:'Por revisar',aprobada:'Aprobada',rechazada:'Rechazada',convertida:'En trabajo',cerrada:'Cerrada'}[value] || value || 'Sin estado') }
function stateColor(value) { return ({borrador:'blue-grey',en_revision:'orange',aprobada:'positive',rechazada:'negative',convertida:'purple',cerrada:'grey'}[value] || 'grey') }
function stateIcon(value) { return ({borrador:'edit_note',en_revision:'rate_review',aprobada:'check_circle',rechazada:'cancel',convertida:'account_tree',cerrada:'inventory_2'}[value] || 'info') }
function openPublic() { window.open('/solicitud', '_blank', 'noopener,noreferrer') }
function open(row) { router.push(`/solicitudes/${row.id}`) }
function edit(row) { router.push({ path:`/solicitudes/${row.id}`, query:{ editar:'1' } }) }
function clearFilters() { search.value=''; statusFilter.value='todas' }
function remove(row) {
  $q.dialog({ title:'Eliminar solicitud', message:`¿Eliminar ${row.codigo}?`, cancel:true, persistent:true }).onOk(async () => {
    try { await api.delete(`/solicitudes/${row.id}`); await load(); $q.notify({type:'positive',message:'Solicitud eliminada.'}) }
    catch (error) { $q.notify({type:'negative',message:error.response?.data?.message || 'No se puede eliminar esta solicitud.'}) }
  })
}
async function load() {
  loading.value = true
  try { rows.value = (await api.get('/solicitudes',{params:{per_page:100}})).data.data || [] }
  finally { loading.value = false }
}
onMounted(load)
</script>

<template>
  <q-page class="viti-page requests-page">
    <PageHeader
      eyebrow="Solicitudes"
      title="Decide qué trabajos acepta VITI"
      subtitle="Cada solicitud es una oportunidad. Revisa la necesidad, acepta o rechaza y convierte únicamente lo aprobado en trabajo."
    >
      <q-btn class="viti-btn viti-btn--ghost" outline color="orange" icon="open_in_new" label="Formulario público" no-caps @click="openPublic"/>
    </PageHeader>

    <section class="status-tabs q-mb-lg">
      <button v-for="state in states" :key="state.value" type="button" :class="['status-tab',{active:statusFilter===state.value}]" @click="statusFilter=state.value">
        <q-icon :name="state.icon"/><span>{{state.label}}</span><b>{{countState(state.value)}}</b>
      </button>
    </section>

    <section class="request-toolbar q-mb-lg">
      <q-input v-model="search" outlined dense clearable debounce="150" placeholder="Buscar por código, necesidad, cliente o negocio">
        <template #prepend><q-icon name="search"/></template>
      </q-input>
      <q-btn flat no-caps color="orange" icon="filter_alt_off" label="Limpiar" :disable="!search&&statusFilter==='todas'" @click="clearFilters"/>
    </section>

    <q-inner-loading :showing="loading"/>

    <section v-if="!loading && filteredRows.length" class="requests-list">
      <article v-for="row in filteredRows" :key="row.id" class="request-card" @click="open(row)">
        <div class="request-code">
          <span>{{row.codigo}}</span>
          <q-chip dense square :color="stateColor(row.estado)" text-color="white" :icon="stateIcon(row.estado)">{{stateLabel(row.estado)}}</q-chip>
        </div>

        <div class="request-main">
          <h3>{{row.titulo}}</h3>
          <p>{{row.resumen || 'Sin resumen adicional. Abre la solicitud para revisar toda la información.'}}</p>
          <div class="request-meta">
            <span><q-icon name="business"/>{{row.empresa?.nombre_comercial || 'Sin negocio'}}</span>
            <span><q-icon name="person"/>{{row.cliente?.nombre || 'Sin contacto'}}</span>
            <span v-if="row.cliente?.telefono"><q-icon name="phone"/>{{row.cliente.telefono}}</span>
          </div>
        </div>

        <div class="request-side">
          <small>RECIBIDA</small>
          <b>{{formatDateTime(row.created_at)}}</b>
          <div class="request-actions" @click.stop>
            <q-btn flat round dense icon="edit" @click="edit(row)"><q-tooltip>Editar</q-tooltip></q-btn>
            <q-btn flat round dense icon="open_in_new" color="orange" @click="open(row)"><q-tooltip>Abrir solicitud</q-tooltip></q-btn>
            <q-btn v-if="!row.proyecto" flat round dense icon="delete_outline" color="negative" @click="remove(row)"><q-tooltip>Eliminar</q-tooltip></q-btn>
          </div>
        </div>
      </article>
    </section>

    <section v-else-if="!loading" class="empty-state requests-empty">
      <q-icon name="inbox" size="54px"/>
      <h2>{{ search || statusFilter !== 'todas' ? 'No encontramos solicitudes con esos filtros' : 'Todavía no hay solicitudes' }}</h2>
      <p>{{ search || statusFilter !== 'todas' ? 'Prueba con otro término o limpia los filtros.' : 'Cuando un cliente envíe una solicitud aparecerá aquí para que VITI decida si acepta el trabajo.' }}</p>
      <q-btn v-if="!search && statusFilter==='todas'" outline color="orange" no-caps icon="open_in_new" label="Abrir formulario público" @click="openPublic"/>
      <q-btn v-else flat color="orange" no-caps label="Limpiar filtros" @click="clearFilters"/>
    </section>
  </q-page>
</template>

<style scoped>
.requests-page{max-width:1280px;padding-top:34px}.status-tabs{display:grid;grid-template-columns:repeat(6,1fr);gap:8px}.status-tab{font:inherit;color:#9fb3c6;border:1px solid rgba(82,115,145,.22);background:rgba(8,25,45,.48);border-radius:14px;min-height:48px;padding:9px 11px;display:flex;align-items:center;gap:8px;cursor:pointer;transition:.16s}.status-tab:hover,.status-tab.active{border-color:rgba(242,139,48,.42);background:rgba(242,139,48,.07);color:#eaf1f7}.status-tab .q-icon{font-size:18px}.status-tab b{margin-left:auto;font-size:12px;color:#fff}.status-tab.active .q-icon,.status-tab.active b{color:#ff9b42}.request-toolbar{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:center;padding:12px 14px;border:1px solid var(--viti-border);border-radius:16px;background:rgba(8,25,45,.55)}.requests-list{display:grid;gap:10px}.request-card{display:grid;grid-template-columns:155px minmax(0,1fr) 190px;gap:18px;align-items:center;border:1px solid rgba(78,110,141,.24);background:linear-gradient(180deg,rgba(13,36,61,.78),rgba(8,26,45,.82));border-radius:18px;padding:18px;cursor:pointer;transition:.18s}.request-card:hover{transform:translateY(-1px);border-color:rgba(242,139,48,.4);background:linear-gradient(180deg,rgba(17,46,77,.9),rgba(10,31,53,.92))}.request-code{align-self:stretch;display:flex;flex-direction:column;justify-content:space-between;gap:14px;border-right:1px solid rgba(83,114,143,.18);padding-right:16px}.request-code>span{font-size:11px;font-weight:900;letter-spacing:.08em;color:#89a0b5}.request-code .q-chip{align-self:flex-start;font-size:9px;font-weight:800}.request-main{min-width:0}.request-main h3{font-size:17px;margin:0;color:#f2f6fa;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.request-main p{font-size:11px;color:#92a8bb;line-height:1.55;margin:7px 0 12px;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}.request-meta{display:flex;gap:14px;flex-wrap:wrap}.request-meta span{display:inline-flex;align-items:center;gap:5px;font-size:10px;color:#b7c6d3}.request-meta .q-icon{color:#f28b30}.request-side{align-self:stretch;border-left:1px solid rgba(83,114,143,.18);padding-left:16px;display:flex;flex-direction:column;align-items:flex-end;justify-content:center;text-align:right}.request-side small{font-size:8px;letter-spacing:.11em;color:#718ba1}.request-side>b{font-size:10px;color:#cbd7e1;margin-top:4px}.request-actions{display:flex;gap:2px;margin-top:10px}.requests-empty{min-height:380px;border:1px dashed rgba(121,151,181,.28);border-radius:22px;background:rgba(8,25,45,.42);display:flex;flex-direction:column;align-items:center;justify-content:center}.requests-empty h2{color:#edf4fb;font-size:24px;margin:13px 0 5px}.requests-empty p{max-width:620px;line-height:1.6}.viti-btn{border-radius:12px;min-height:42px}.viti-btn--ghost{background:rgba(255,255,255,.025)!important}
@media(max-width:1100px){.status-tabs{grid-template-columns:repeat(3,1fr)}.request-card{grid-template-columns:130px minmax(0,1fr) 165px}}
@media(max-width:760px){.requests-page{padding-top:18px}.status-tabs{display:flex;overflow:auto;padding-bottom:4px}.status-tab{min-width:138px}.request-toolbar{grid-template-columns:1fr}.request-toolbar .q-btn{justify-self:start}.request-card{grid-template-columns:1fr;gap:12px}.request-code{border-right:0;border-bottom:1px solid rgba(83,114,143,.18);padding:0 0 10px;flex-direction:row;align-items:center}.request-side{border-left:0;border-top:1px solid rgba(83,114,143,.18);padding:10px 0 0;align-items:flex-start;text-align:left}.request-actions{align-self:flex-end;margin-top:-28px}.request-main h3{white-space:normal}}
</style>
