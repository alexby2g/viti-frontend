<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { api } from '../boot/axios'
import { formatDateTime } from '../utils/date'
import PageHeader from '../components/PageHeader.vue'
import RowActionsMenu from '../components/RowActionsMenu.vue'

const $q=useQuasar(), route=useRoute(), router=useRouter()
const rows=ref([]), clients=ref([]), loading=ref(false), dialog=ref(false)
const form=reactive({empresa_id:null,cliente_id:null,titulo:'',resumen:'',prioridad:'normal',fecha_limite_deseada:null,presupuesto_estimado:null})
const columns=[
 {name:'actions',label:'',field:'actions',align:'left'},
 {name:'codigo',label:'Código',field:'codigo',align:'left'},
 {name:'titulo',label:'Solicitud',field:'titulo',align:'left'},
 {name:'empresa',label:'Empresa',field:r=>r.empresa?.nombre_comercial||'Sin empresa',align:'left'},
 {name:'cliente',label:'Cliente',field:r=>r.cliente?.nombre||'Sin cliente',align:'left'},
 {name:'prioridad',label:'Prioridad',field:'prioridad',align:'left'},
 {name:'estado',label:'Estado',field:'estado',align:'left'},
 {name:'created_at',label:'Registrado',field:'created_at',align:'left'},
]
const selectedClient=computed(()=>clients.value.find(x=>x.id===form.cliente_id)||null)
const companyOptions=computed(()=>selectedClient.value?.empresas?.map(x=>({label:x.nombre_comercial,value:x.id}))||[])

async function load(){
 loading.value=true
 try{
   const [s,c]=await Promise.all([api.get('/solicitudes',{params:{per_page:100}}),api.get('/clientes',{params:{per_page:100}})])
   rows.value=s.data.data;clients.value=c.data.data
 }finally{loading.value=false}
}
function openNew(){Object.assign(form,{empresa_id:null,cliente_id:null,titulo:'',resumen:'',prioridad:'normal',fecha_limite_deseada:null,presupuesto_estimado:null});dialog.value=true}
function clientChanged(){form.empresa_id=selectedClient.value?.empresas?.length===1?selectedClient.value.empresas[0].id:null}
async function save(){
 try{
   if(!form.cliente_id){$q.notify({type:'warning',message:'Selecciona al cliente responsable.'});return}
   if(!form.empresa_id){$q.notify({type:'warning',message:'Este cliente necesita una empresa registrada antes de crear la solicitud.'});return}
   const response=await api.post('/solicitudes',form)
   const created=response.data?.data??response.data
   if(!created?.id) throw new Error('Respuesta inválida al crear la solicitud.')
   dialog.value=false
   await router.push(`/solicitudes/${created.id}`)
 }catch(e){$q.notify({type:'negative',message:e.response?.data?.message||e.message||'No se pudo crear la solicitud.'})}
}
function remove(row){$q.dialog({title:'Eliminar solicitud',message:`¿Eliminar ${row.codigo}?`,cancel:true}).onOk(async()=>{try{await api.delete(`/solicitudes/${row.id}`);load()}catch(e){$q.notify({type:'negative',message:e.response?.data?.message||'No se puede eliminar.'})}})}
function stateLabel(value){return String(value||'').replaceAll('_',' ')}
onMounted(async()=>{await load();if(route.query.new)openNew()})
</script>

<template>
<q-page class="viti-page solicitudes-page">
  <PageHeader eyebrow="Levantamiento" title="Solicitudes de sistema" subtitle="Cada solicitud contiene el cuestionario institucional y puede convertirse en un proyecto.">
    <q-btn color="primary" unelevated icon="add" label="Nueva solicitud" no-caps class="responsive-primary-action" @click="openNew"/>
  </PageHeader>

  <q-table v-if="$q.screen.gt.sm" flat class="viti-table" :rows="rows" :columns="columns" row-key="id" :loading="loading" :pagination="{rowsPerPage:20,sortBy:'id',descending:true}">
    <template #body-cell-actions="p"><q-td :props="p"><RowActionsMenu @open="router.push(`/solicitudes/${p.row.id}`)" @edit="router.push({path:`/solicitudes/${p.row.id}`,query:{editar:'1'}})" @delete="remove(p.row)"/></q-td></template>
    <template #body-cell-estado="p"><q-td :props="p"><q-badge outline color="primary">{{stateLabel(p.value)}}</q-badge></q-td></template>
    <template #body-cell-created_at="p"><q-td :props="p">{{formatDateTime(p.value)}}</q-td></template>
    <template #no-data><div class="empty-state full-width"><q-icon name="assignment" size="52px"/><div class="text-h6 q-mt-sm">No hay solicitudes</div><div>Registra un cliente y su empresa; después inicia el levantamiento.</div></div></template>
  </q-table>

  <div v-else class="mobile-request-list">
    <q-inner-loading :showing="loading" />
    <q-card v-for="row in rows" :key="row.id" flat class="viti-card mobile-request-card" @click="router.push(`/solicitudes/${row.id}`)">
      <q-card-section class="row items-start no-wrap">
        <div class="col min-width-0">
          <div class="row items-center q-gutter-sm q-mb-sm">
            <q-badge color="primary" rounded>{{ row.codigo }}</q-badge>
            <q-badge outline color="primary">{{ stateLabel(row.estado) }}</q-badge>
          </div>
          <div class="text-subtitle1 text-weight-bold ellipsis-2-lines">{{ row.titulo }}</div>
          <div class="mobile-meta q-mt-sm"><q-icon name="person" /> {{ row.cliente?.nombre || 'Sin cliente' }}</div>
          <div class="mobile-meta"><q-icon name="business" /> {{ row.empresa?.nombre_comercial || 'Sin empresa' }}</div>
          <div class="mobile-meta"><q-icon name="schedule" /> {{ formatDateTime(row.created_at) }}</div>
        </div>
        <div @click.stop><RowActionsMenu @open="router.push(`/solicitudes/${row.id}`)" @edit="router.push({path:`/solicitudes/${row.id}`,query:{editar:'1'}})" @delete="remove(row)"/></div>
      </q-card-section>
    </q-card>
    <div v-if="!rows.length && !loading" class="empty-state"><q-icon name="assignment" size="48px"/><div class="text-h6 q-mt-sm">No hay solicitudes</div><div>Cuando registres una solicitud aparecerá aquí.</div></div>
  </div>

  <q-dialog v-model="dialog"><q-card style="width:760px;max-width:94vw"><q-card-section><div class="section-label">Nueva solicitud</div><div class="text-h5 text-weight-bold">Iniciar levantamiento del sistema</div><div class="text-caption text-grey-6">Primero selecciona al cliente. VITI mostrará únicamente las empresas registradas para esa persona.</div></q-card-section><q-separator/><q-card-section><div class="row q-col-gutter-md">
    <div class="col-12"><q-select v-model="form.cliente_id" outlined emit-value map-options :options="clients.map(x=>({label:`${x.nombre} · ${x.telefono}`,value:x.id}))" label="Cliente responsable *" @update:model-value="clientChanged"/></div>
    <div class="col-12"><q-select v-model="form.empresa_id" outlined emit-value map-options :options="companyOptions" label="Empresa o microempresa *" :disable="!form.cliente_id" :hint="form.cliente_id&&!companyOptions.length?'Este cliente aún no tiene empresa. Agrégala desde Clientes y empresas.':''"/></div>
    <div class="col-12"><q-input v-model="form.titulo" outlined label="Nombre o título del sistema solicitado *"/></div>
    <div class="col-12"><q-input v-model="form.resumen" outlined type="textarea" label="Resumen inicial"/></div>
    <div class="col-12 col-sm-4"><q-select v-model="form.prioridad" outlined :options="['baja','normal','alta','urgente']" label="Prioridad"/></div>
    <div class="col-12 col-sm-4"><q-input v-model="form.fecha_limite_deseada" outlined type="date" label="Fecha deseada" stack-label/></div>
    <div class="col-12 col-sm-4"><q-input v-model.number="form.presupuesto_estimado" outlined type="number" label="Presupuesto estimado" prefix="Bs"/></div>
  </div></q-card-section><q-card-actions align="right"><q-btn flat label="Cancelar" v-close-popup/><q-btn color="primary" unelevated label="Crear y abrir cuestionario" no-caps :disable="!form.cliente_id||!form.empresa_id||!form.titulo" @click="save"/></q-card-actions></q-card></q-dialog>
</q-page>
</template>

<style scoped>
.mobile-request-list{position:relative;display:flex;flex-direction:column;gap:12px}.mobile-request-card{cursor:pointer;overflow:hidden}.mobile-meta{display:flex;align-items:center;gap:7px;color:var(--viti-muted);font-size:13px;line-height:1.8}.min-width-0{min-width:0}
@media(max-width:600px){.solicitudes-page{padding-top:16px}.responsive-primary-action{width:100%;margin-top:12px}.mobile-request-card{border-radius:18px}.mobile-request-card .q-card__section{padding:16px}}
</style>