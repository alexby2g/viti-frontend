<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { api } from '../boot/axios'
import { formatDateTime } from '../utils/date'
import PageHeader from '../components/PageHeader.vue'
import RowActionsMenu from '../components/RowActionsMenu.vue'

const $q=useQuasar(),router=useRouter()
const rows=ref([]),loading=ref(false),search=ref(''),statusFilter=ref(null)
const statusOptions=[
 {label:'En revisión',value:'en_revision'},{label:'Aprobada',value:'aprobada'},
 {label:'Rechazada',value:'rechazada'},{label:'En proyecto',value:'convertida'},{label:'Cerrada',value:'cerrada'},
]
const columns=[
 {name:'actions',label:'',field:'actions',align:'left'},
 {name:'codigo',label:'Código',field:'codigo',align:'left'},
 {name:'titulo',label:'Solicitud',field:'titulo',align:'left'},
 {name:'empresa',label:'Negocio',field:r=>r.empresa?.nombre_comercial||'Sin negocio',align:'left'},
 {name:'cliente',label:'Contacto',field:r=>r.cliente?.nombre||'Sin contacto',align:'left'},
 {name:'estado',label:'Estado',field:'estado',align:'left'},
 {name:'created_at',label:'Recibida',field:'created_at',align:'left'},
]
const filteredRows=computed(()=>{
 const term=search.value.trim().toLocaleLowerCase('es')
 return rows.value.filter(row=>{
   if(statusFilter.value&&row.estado!==statusFilter.value)return false
   if(!term)return true
   return `${row.codigo||''} ${row.titulo||''} ${row.cliente?.nombre||''} ${row.cliente?.telefono||''} ${row.empresa?.nombre_comercial||''}`.toLocaleLowerCase('es').includes(term)
 })
})
const statusSummary=computed(()=>[
 {label:'Por revisar',value:rows.value.filter(x=>x.estado==='en_revision').length,icon:'rate_review'},
 {label:'Aprobadas',value:rows.value.filter(x=>x.estado==='aprobada').length,icon:'task_alt'},
 {label:'En proyecto',value:rows.value.filter(x=>x.estado==='convertida').length,icon:'account_tree'},
])

async function load(){loading.value=true;try{const {data}=await api.get('/solicitudes',{params:{per_page:100}});rows.value=data.data||[]}finally{loading.value=false}}
function clearFilters(){search.value='';statusFilter.value=null}
function openPublic(){window.open('/solicitud','_blank','noopener,noreferrer')}
function remove(row){$q.dialog({title:'Eliminar solicitud',message:`¿Eliminar ${row.codigo}?`,cancel:true,persistent:true}).onOk(async()=>{try{await api.delete(`/solicitudes/${row.id}`);await load()}catch(e){$q.notify({type:'negative',message:e.response?.data?.message||'No se puede eliminar esta solicitud.'})}})}
function stateLabel(value){return statusOptions.find(x=>x.value===value)?.label||String(value||'').replaceAll('_',' ')}
function stateColor(value){return {en_revision:'orange',aprobada:'positive',rechazada:'negative',convertida:'purple',cerrada:'grey'}[value]||'grey'}
onMounted(load)
</script>

<template>
<q-page class="viti-page solicitudes-page">
  <PageHeader eyebrow="Solicitudes" title="Lo que los clientes están pidiendo" subtitle="Revisa la necesidad, decide si continúa y deja que VITI conecte el resto del flujo.">
    <q-btn class="viti-btn viti-btn--ghost" outline color="orange" icon="open_in_new" label="Abrir formulario público" no-caps @click="openPublic"/>
  </PageHeader>

  <section class="request-summary q-mb-lg">
    <div v-for="item in statusSummary" :key="item.label" class="request-summary__item"><span><q-icon :name="item.icon"/></span><div><b>{{item.value}}</b><small>{{item.label}}</small></div></div>
  </section>

  <q-card flat class="viti-card filters-card q-mb-lg">
    <q-card-section class="filter-row">
      <q-input v-model="search" outlined dense clearable debounce="150" label="Buscar" placeholder="Código, sistema, contacto o negocio"><template #prepend><q-icon name="search"/></template></q-input>
      <q-select v-model="statusFilter" outlined dense clearable emit-value map-options :options="statusOptions" label="Estado"/>
      <q-btn flat no-caps color="orange" icon="filter_alt_off" label="Limpiar" :disable="!search&&!statusFilter" @click="clearFilters"/>
    </q-card-section>
  </q-card>

  <q-table v-if="$q.screen.gt.sm" flat class="viti-table" :rows="filteredRows" :columns="columns" row-key="id" :loading="loading" :pagination="{rowsPerPage:20,sortBy:'id',descending:true}">
    <template #body-cell-actions="p"><q-td :props="p"><RowActionsMenu @open="router.push(`/solicitudes/${p.row.id}`)" @delete="remove(p.row)"/></q-td></template>
    <template #body-cell-titulo="p"><q-td :props="p"><button class="title-link" :title="p.row.titulo" @click="router.push(`/solicitudes/${p.row.id}`)"><b>{{p.row.titulo}}</b><small>{{p.row.resumen||'Abrir solicitud'}}</small></button></q-td></template>
    <template #body-cell-empresa="p"><q-td :props="p"><div class="business-cell">💼 {{p.row.empresa?.nombre_comercial||'Sin negocio'}}</div></q-td></template>
    <template #body-cell-cliente="p"><q-td :props="p"><div class="contact-cell text-weight-bold">👤 {{p.row.cliente?.nombre||'Sin contacto'}}</div><div class="text-caption text-grey-6">📱 {{p.row.cliente?.telefono||''}}</div></q-td></template>
    <template #body-cell-estado="p"><q-td :props="p"><q-badge :color="stateColor(p.value)">{{stateLabel(p.value)}}</q-badge></q-td></template>
    <template #body-cell-created_at="p"><q-td :props="p"><div class="date-cell">{{formatDateTime(p.value)}}</div></q-td></template>
    <template #no-data><div class="empty-state full-width"><q-icon name="inbox" size="48px"/><div class="text-h6 q-mt-sm">Todavía no hay solicitudes</div><div>Haz una prueba desde el formulario público o espera la primera solicitud real.</div><q-btn class="q-mt-md" outline color="orange" no-caps label="Abrir formulario" @click="openPublic"/></div></template>
  </q-table>

  <div v-else class="mobile-list">
    <q-card v-for="row in filteredRows" :key="row.id" flat class="viti-card mobile-card" @click="router.push(`/solicitudes/${row.id}`)"><q-card-section><div class="row items-start no-wrap"><div class="col min-width-0"><div class="row q-gutter-sm q-mb-sm"><q-badge outline color="primary">{{row.codigo}}</q-badge><q-badge :color="stateColor(row.estado)">{{stateLabel(row.estado)}}</q-badge></div><div class="text-subtitle1 text-weight-bold">{{row.titulo}}</div><div class="mobile-meta">{{row.empresa?.nombre_comercial||'Sin negocio'}} · {{row.cliente?.nombre||'Sin contacto'}}</div><div class="mobile-meta">{{formatDateTime(row.created_at)}}</div></div></div></q-card-section></q-card>
    <div v-if="!filteredRows.length&&!loading" class="empty-state"><q-icon name="inbox" size="48px"/><div class="text-h6 q-mt-sm">Sin solicitudes</div></div>
  </div>
</q-page>
</template>

<style scoped>
.solicitudes-page{max-width:1240px;padding-top:32px}.request-summary{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.request-summary__item{display:flex;align-items:center;gap:12px;padding:15px;border-radius:16px;border:1px solid var(--viti-border);background:rgba(13,36,61,.56)}.request-summary__item>span{width:38px;height:38px;border-radius:11px;background:rgba(242,139,48,.1);display:grid;place-items:center;color:#ff9a3c;font-size:20px}.request-summary__item div{display:grid}.request-summary__item b{font-size:22px}.request-summary__item small{color:var(--viti-muted);font-size:11px}.filters-card{background:rgba(8,25,45,.62)!important}.filter-row{display:grid;grid-template-columns:1fr 260px auto;gap:12px;align-items:center}.viti-table :deep(table){table-layout:fixed}.viti-table :deep(th:nth-child(3)){width:500px}.viti-table :deep(th:nth-child(4)){width:220px}.viti-table :deep(th:nth-child(5)){width:190px}.viti-table :deep(td){vertical-align:middle}.title-link{border:0;background:transparent;color:inherit;text-align:left;cursor:pointer;padding:0;max-width:500px}.title-link b,.title-link small{display:block}.title-link b{overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;line-height:1.35}.business-cell,.contact-cell{white-space:normal}.date-cell{line-height:1.35}.title-link small{color:var(--viti-muted);font-size:11px;margin-top:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.title-link:hover b{color:#ffad64}.viti-btn{border-radius:12px;min-height:42px}.viti-btn--ghost{background:rgba(255,255,255,.025)!important}.mobile-list{display:grid;gap:11px}.mobile-card{cursor:pointer}.mobile-meta{color:var(--viti-muted);font-size:12px;margin-top:6px}.min-width-0{min-width:0}@media(max-width:760px){.request-summary{grid-template-columns:1fr}.filter-row{grid-template-columns:1fr}.filter-row .q-btn{justify-self:start}.solicitudes-page{padding-top:18px}}
</style>
