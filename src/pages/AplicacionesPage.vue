<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { api } from '../boot/axios'
import PageHeader from '../components/PageHeader.vue'
import RowActionsMenu from '../components/RowActionsMenu.vue'

const $q=useQuasar()
const router=useRouter()
const allApps=ref([])
const rows=computed(()=>allApps.value)
const electroApps=computed(()=>allApps.value.filter(item=>item.catalogo?.clave==='electrofrio'&&item.estado!=='retirado'))
const serviceApps=computed(()=>allApps.value.filter(item=>item.catalogo?.clave==='servicio-tecnico'&&item.estado!=='retirado'))
const companies=ref([])
const projects=ref([])
const dialog=ref(false)
const cycleDialog=ref(false)
const editing=ref(null)
const cycleCurrent=ref(null)
const loading=ref(false)
const savingCycle=ref(false)

const empty=()=>({empresa_id:null,proyecto_id:null,nombre:'',version:'',tipo:'web',tecnologias:'',entorno:'beta',estado:'en_pruebas',url:'',url_administracion:'',repositorio_url:'',proveedor_hosting:'',notas:'',publicado_at:null})
const form=reactive(empty())
const cycle=reactive({entorno:'beta',estado:'en_pruebas'})
const environmentOptions=[{label:'Desarrollo',value:'desarrollo'},{label:'Beta / pruebas técnicas',value:'beta'},{label:'Producción',value:'produccion'}]
const operationalOptions=[{label:'En pruebas',value:'en_pruebas'},{label:'Activa',value:'activo'},{label:'Pausada',value:'pausado'},{label:'Retirada',value:'retirado'}]
const columns=[
  {name:'actions',label:'',field:'actions',align:'left'},
  {name:'nombre',label:'Aplicación',field:'nombre',align:'left'},
  {name:'empresa',label:'Empresa',field:r=>r.empresa?.nombre_comercial,align:'left'},
  {name:'version',label:'Versión',field:'version',align:'left'},
  {name:'entorno',label:'Desarrollo técnico',field:'entorno',align:'left'},
  {name:'estado',label:'Operación',field:'estado',align:'left'},
  {name:'suscripcion',label:'Suscripción',field:r=>r.suscripcion?.estado,align:'left'},
  {name:'entrega',label:'Entrega',field:'acceso_cliente',align:'left'},
  {name:'url',label:'Abrir',field:'url',align:'left'},
]

function pretty(value){return String(value||'').replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase())}
function serviceProgress(app){const [major,minor]=String(app?.version||'0.0').split('.').map(Number);if(major>=1)return 100;return Math.min(99,Math.max(0,(minor||0)*10))}
function environmentColor(value){return {desarrollo:'grey-7',beta:'orange',produccion:'positive'}[value]||'grey'}
function operationalColor(value){return {en_pruebas:'orange',activo:'positive',pausado:'warning',retirado:'grey'}[value]||'grey'}
function subscriptionColor(value){return {activa:'positive',gracia:'orange',suspendida:'negative',cancelada:'grey'}[value]||'grey'}
function environmentLabel(value){return {desarrollo:'Desarrollo',beta:'Beta',produccion:'Producción'}[value]||pretty(value)}
function operationalLabel(value){return {en_pruebas:'En pruebas',activo:'Activa',pausado:'Pausada',retirado:'Retirada'}[value]||pretty(value)}
function formatDate(value){if(!value)return '';const d=new Date(`${value}T00:00:00`);return Number.isNaN(d.getTime())?String(value):d.toLocaleDateString('es-BO')}
function isTrialActive(app){if(!app?.suscripcion?.prueba_hasta)return false;const end=new Date(`${app.suscripcion.prueba_hasta}T23:59:59`);return end.getTime()>=Date.now()}
function subscriptionLabel(app){if(!app?.suscripcion)return 'Sin configurar';if(isTrialActive(app))return `Prueba hasta ${formatDate(app.suscripcion.prueba_hasta)}`;return pretty(app.suscripcion.estado)}
function subscriptionBadgeColor(app){return isTrialActive(app)?'orange':subscriptionColor(app?.suscripcion?.estado)}
function serviceReleaseText(app){const technical=serviceProgress(app)>=100?'Desarrollo técnico 100%':'Desarrollo técnico en curso';const delivery=app.acceso_cliente?'Entregada al cliente':'Pendiente de entrega';return `${technical} · ${delivery}`}

async function load(){
  loading.value=true
  try{
    const [a,e,p]=await Promise.all([
      api.get('/aplicaciones',{params:{per_page:100}}),
      api.get('/empresas',{params:{per_page:100}}),
      api.get('/proyectos',{params:{per_page:100}}),
    ])
    allApps.value=a.data.data||[]
    companies.value=e.data.data||[]
    projects.value=p.data.data||[]
  }finally{loading.value=false}
}
function nativeRoute(app){const key=app?.catalogo?.clave;if(key==='peluqueria')return '/apps/peluqueria';if(key==='electrofrio')return '/apps/electrofrio/inicio';if(key==='servicio-tecnico')return '/apps/servicio-tecnico/inicio';return null}
function openManaged(app){if(!app)return;if(app.empresa_id)localStorage.setItem('viti-empresa-id',String(app.empresa_id));const route=nativeRoute(app);if(route){router.push(route);return}if(app.url)router.push(`/apps/externa/${app.id}`)}
function openElectro(app){openManaged(app)}
function open(row=null){editing.value=row;Object.assign(form,empty(),row||{});dialog.value=true}
function openCycle(row){cycleCurrent.value=row;Object.assign(cycle,{entorno:row.entorno||'desarrollo',estado:row.estado||'en_pruebas'});cycleDialog.value=true}
async function save(){try{editing.value?await api.put(`/aplicaciones/${editing.value.id}`,form):await api.post('/aplicaciones',form);$q.notify({type:'positive',message:editing.value?'Aplicación actualizada.':'Aplicación integrada.'});dialog.value=false;await load()}catch(e){$q.notify({type:'negative',message:e.response?.data?.message||'No se pudo guardar.'})}}
async function saveCycle(){if(!cycleCurrent.value)return;savingCycle.value=true;try{await api.put(`/aplicaciones/${cycleCurrent.value.id}/ciclo`,cycle);$q.notify({type:'positive',message:'Ciclo de la aplicación actualizado.'});cycleDialog.value=false;await load()}catch(e){$q.notify({type:'negative',message:e.response?.data?.message||'No se pudo cambiar el estado.'})}finally{savingCycle.value=false}}
function remove(row){$q.dialog({title:'Retirar aplicación',message:`¿Retirar ${row.nombre}?`,cancel:true}).onOk(async()=>{try{await api.delete(`/aplicaciones/${row.id}`);await load()}catch(e){$q.notify({type:'negative',message:e.response?.data?.message||'No se puede retirar.'})}})}
async function toggleDelivery(row){
  const delivering=!row.acceso_cliente
  const title=delivering?'Entregar aplicación':'Revocar acceso'
  const message=delivering?`¿Habilitar ${row.nombre} para ${row.empresa?.nombre_comercial||'el cliente'}?`:`¿Quitar temporalmente el acceso del cliente a ${row.nombre}?`
  $q.dialog({title,message,cancel:true,persistent:true}).onOk(async()=>{try{await api.post(`/aplicaciones/${row.id}/${delivering?'entregar':'revocar-acceso'}`);$q.notify({type:'positive',message:delivering?'Aplicación entregada al cliente.':'Acceso revocado.'});await load()}catch(e){$q.notify({type:'negative',message:e.response?.data?.message||'No se pudo cambiar el acceso.'})}})
}
onMounted(load)
</script>

<template>
<q-page class="viti-page">
  <PageHeader eyebrow="VITI" title="Centro de aplicaciones" subtitle="Controla por separado desarrollo técnico, operación, entrega y suscripción.">
    <q-btn color="primary" unelevated icon="add_to_queue" label="Integrar sistema externo" no-caps @click="open()"/>
  </PageHeader>

  <q-banner rounded class="viti-card q-mb-lg lifecycle-note">
    <template #avatar><q-icon name="tune" color="primary" size="30px"/></template>
    <div class="text-weight-bold">El fin de la prueba no cambia el estado técnico del sistema.</div>
    <div class="text-body2 text-grey-6">Desarrollo/Beta/Producción y En pruebas/Activa/Pausada los controlas tú. Los días de prueba solo afectan la suscripción y el acceso comercial.</div>
  </q-banner>

  <div class="text-overline text-primary">VITI Apps</div>
  <div class="text-h6 text-weight-bold q-mb-sm">Aplicaciones de la plataforma</div>
  <div class="apps-grid q-mb-xl">
    <q-card flat class="viti-card native-app-card"><q-card-section class="row items-start no-wrap q-gutter-md"><q-avatar size="56px" color="primary" text-color="white" icon="content_cut"/><div class="col"><div class="row items-center q-gutter-sm"><div class="text-h6 text-weight-bold">Peluquería</div><q-badge color="positive" label="V1 activa"/></div><div class="text-body2 text-grey-7 q-mt-xs">Agenda, clientes, servicios, personal, atenciones, pagos e historial para peluquerías, salones y barberías.</div></div></q-card-section><q-separator/><q-card-actions align="right"><q-btn color="primary" unelevated no-caps icon-right="arrow_forward" label="Abrir aplicación" to="/apps/peluqueria"/></q-card-actions></q-card>

    <q-card v-for="app in electroApps" :key="`electro-${app.id}`" flat class="viti-card native-app-card">
      <q-card-section class="row items-start no-wrap q-gutter-md"><q-avatar size="56px" color="primary" text-color="white" icon="ac_unit"/><div class="col min-width-0"><div class="text-h6 text-weight-bold">Electrofrío</div><div class="row q-gutter-xs q-mt-sm"><q-badge :color="environmentColor(app.entorno)">{{environmentLabel(app.entorno)}}</q-badge><q-badge :color="operationalColor(app.estado)">{{operationalLabel(app.estado)}}</q-badge><q-badge :color="app.acceso_cliente?'positive':'grey'">{{app.acceso_cliente?'Entregada':'Sin entregar'}}</q-badge><q-badge :color="subscriptionBadgeColor(app)">{{subscriptionLabel(app)}}</q-badge></div><div class="text-body2 text-grey-7 q-mt-sm">{{app.empresa?.nombre_comercial}} · agenda, órdenes, clientes, equipos, técnicos, historial y mensajes propios.</div></div></q-card-section>
      <q-separator/><q-card-actions align="right"><q-btn flat color="primary" no-caps icon="tune" label="Ciclo y estado" @click="openCycle(app)"/><q-btn color="primary" unelevated no-caps icon-right="arrow_forward" label="Abrir Electrofrío" @click="openElectro(app)"/></q-card-actions>
    </q-card>

    <q-card v-for="app in serviceApps" :key="`service-${app.id}`" flat class="viti-card native-app-card">
      <q-card-section class="row items-start no-wrap q-gutter-md"><q-avatar size="56px" color="primary" text-color="white" icon="computer"/><div class="col min-width-0"><div class="row items-center q-gutter-sm"><div class="text-h6 text-weight-bold">{{app.nombre}}</div><q-badge :color="serviceProgress(app)>=100?'positive':'orange'" :label="`V${app.version||'1.0.0'} · ${serviceProgress(app)}% técnico`"/></div><div class="row q-gutter-xs q-mt-sm"><q-badge :color="environmentColor(app.entorno)">{{environmentLabel(app.entorno)}}</q-badge><q-badge :color="operationalColor(app.estado)">{{operationalLabel(app.estado)}}</q-badge><q-badge :color="app.acceso_cliente?'positive':'grey'">{{app.acceso_cliente?'Entregada':'Pendiente de entrega'}}</q-badge><q-badge :color="subscriptionBadgeColor(app)">{{subscriptionLabel(app)}}</q-badge></div><div class="text-body2 text-grey-7 q-mt-sm">Clientes, computadoras, técnicos, órdenes, agenda, pagos, garantías, historial, evidencias privadas y reportes PDF.</div><div class="text-caption text-grey-6 q-mt-sm">{{serviceReleaseText(app)}} · {{app.empresa?.nombre_comercial}}</div></div></q-card-section>
      <q-separator/><q-card-actions align="right"><q-btn flat color="primary" no-caps icon="tune" label="Ciclo y estado" @click="openCycle(app)"/><q-btn color="primary" unelevated no-caps icon-right="arrow_forward" label="Abrir aplicación" @click="openManaged(app)"/></q-card-actions>
    </q-card>
  </div>

  <div class="text-overline text-primary">Sistemas administrados</div>
  <div class="text-h6 text-weight-bold">Aplicaciones de clientes</div>
  <div class="text-caption text-grey-6 q-mb-md">Cada columna representa un estado distinto. La entrega no cambia por terminar una beta ni por vencer una prueba.</div>
  <q-table flat class="viti-table" :rows="rows" :columns="columns" row-key="id" :loading="loading" :pagination="{rowsPerPage:20,sortBy:'id',descending:true}">
    <template #body-cell-actions="p"><q-td :props="p"><div class="row no-wrap items-center"><RowActionsMenu @open="open(p.row)" @edit="open(p.row)" @delete="remove(p.row)"/><q-btn flat dense round icon="tune" color="primary" @click="openCycle(p.row)"><q-tooltip>Ciclo y estado</q-tooltip></q-btn><q-btn v-if="nativeRoute(p.row)||p.row.url" flat dense round icon="web_asset" color="primary" @click="openManaged(p.row)"/><q-btn flat dense round :icon="p.row.acceso_cliente?'lock':'key'" :color="p.row.acceso_cliente?'orange':'positive'" @click="toggleDelivery(p.row)"><q-tooltip>{{p.row.acceso_cliente?'Revocar acceso':'Entregar aplicación'}}</q-tooltip></q-btn></div></q-td></template>
    <template #body-cell-entorno="p"><q-td :props="p"><q-badge :color="environmentColor(p.row.entorno)">{{environmentLabel(p.row.entorno)}}</q-badge></q-td></template>
    <template #body-cell-estado="p"><q-td :props="p"><q-badge :color="operationalColor(p.row.estado)">{{operationalLabel(p.row.estado)}}</q-badge></q-td></template>
    <template #body-cell-suscripcion="p"><q-td :props="p"><q-badge :color="subscriptionBadgeColor(p.row)">{{subscriptionLabel(p.row)}}</q-badge><div v-if="p.row.suscripcion?.fecha_vencimiento" class="text-caption text-grey-6 q-mt-xs">Vence {{formatDate(p.row.suscripcion.fecha_vencimiento)}}</div></q-td></template>
    <template #body-cell-entrega="p"><q-td :props="p"><q-badge :color="p.row.acceso_cliente?'positive':'grey'">{{p.row.acceso_cliente?'Entregada':'Pendiente'}}</q-badge></q-td></template>
    <template #body-cell-url="p"><q-td :props="p"><q-btn v-if="nativeRoute(p.row)||p.value" flat dense icon="open_in_new" color="primary" @click="openManaged(p.row)"/><span v-else>Sin acceso</span></q-td></template>
    <template #no-data><div class="empty-state full-width">Todavía no hay aplicaciones registradas.</div></template>
  </q-table>

  <q-dialog v-model="cycleDialog">
    <q-card class="cycle-card">
      <q-card-section><div class="section-label">Control de aplicación</div><div class="text-h5 text-weight-bold">Ciclo y estado</div><div class="text-caption text-grey-6 q-mt-xs">{{cycleCurrent?.nombre}} · {{cycleCurrent?.empresa?.nombre_comercial}}</div></q-card-section>
      <q-separator/>
      <q-card-section>
        <q-banner rounded class="bg-blue-1 text-primary q-mb-lg"><div class="text-weight-bold">Estos cambios son manuales.</div><div class="text-body2">La prueba gratuita y la suscripción no cambian Desarrollo/Beta/Producción ni activan una aplicación por sí solas.</div></q-banner>
        <div class="row q-col-gutter-md"><div class="col-12 col-sm-6"><q-select v-model="cycle.entorno" outlined emit-value map-options :options="environmentOptions" label="Desarrollo técnico" hint="En qué etapa técnica se encuentra"/></div><div class="col-12 col-sm-6"><q-select v-model="cycle.estado" outlined emit-value map-options :options="operationalOptions" label="Estado operativo" hint="Si puede usarse o está pausada/retirada"/></div></div>
        <div class="row q-gutter-sm q-mt-lg"><q-badge :color="environmentColor(cycle.entorno)" class="q-pa-sm">{{environmentLabel(cycle.entorno)}}</q-badge><q-badge :color="operationalColor(cycle.estado)" class="q-pa-sm">{{operationalLabel(cycle.estado)}}</q-badge><q-badge :color="cycleCurrent?.acceso_cliente?'positive':'grey'" class="q-pa-sm">Entrega: {{cycleCurrent?.acceso_cliente?'Entregada':'Pendiente'}}</q-badge><q-badge :color="subscriptionBadgeColor(cycleCurrent)" class="q-pa-sm">Suscripción: {{subscriptionLabel(cycleCurrent)}}</q-badge></div>
      </q-card-section>
      <q-card-actions align="right"><q-btn flat no-caps label="Cancelar" v-close-popup/><q-btn color="primary" unelevated no-caps icon="save" label="Guardar ciclo" :loading="savingCycle" @click="saveCycle"/></q-card-actions>
    </q-card>
  </q-dialog>

  <q-dialog v-model="dialog"><q-card style="width:760px;max-width:94vw"><q-card-section><div class="section-label">{{editing?'Editar':'Integrar'}} aplicación</div><div class="text-h5 text-weight-bold">Sistema del cliente</div></q-card-section><q-card-section><div class="row q-col-gutter-md"><div class="col-12 col-sm-6"><q-select v-model="form.empresa_id" outlined emit-value map-options :options="companies.map(x=>({label:x.nombre_comercial,value:x.id}))" label="Empresa *"/></div><div class="col-12 col-sm-6"><q-select v-model="form.proyecto_id" outlined emit-value map-options clearable :options="projects.map(x=>({label:`${x.codigo} · ${x.nombre}`,value:x.id}))" label="Proyecto relacionado"/></div><div class="col-12 col-sm-8"><q-input v-model="form.nombre" outlined label="Nombre de la aplicación *"/></div><div class="col-12 col-sm-4"><q-input v-model="form.version" outlined label="Versión"/></div><div class="col-12 col-sm-4"><q-select v-model="form.tipo" outlined :options="['web','movil','escritorio','hibrido','api','otro']" label="Tipo"/></div><div class="col-12 col-sm-8"><q-input v-model="form.tecnologias" outlined label="Tecnologías"/></div><div class="col-12 col-sm-6"><q-select v-model="form.entorno" outlined emit-value map-options :options="environmentOptions" label="Desarrollo técnico"/></div><div class="col-12 col-sm-6"><q-select v-model="form.estado" outlined emit-value map-options :options="operationalOptions" label="Estado operativo"/></div><div class="col-12"><q-input v-model="form.url" outlined label="URL pública (solo si es externa)"/></div><div class="col-12"><q-input v-model="form.url_administracion" outlined label="URL administrativa"/></div><div class="col-12 col-sm-8"><q-input v-model="form.repositorio_url" outlined label="Repositorio"/></div><div class="col-12 col-sm-4"><q-input v-model="form.proveedor_hosting" outlined label="Hosting"/></div><div class="col-12"><q-input v-model="form.notas" outlined type="textarea" label="Notas técnicas"/></div></div></q-card-section><q-card-actions align="right"><q-btn flat label="Cancelar" v-close-popup/><q-btn color="primary" unelevated :label="editing?'Guardar cambios':'Integrar aplicación'" no-caps @click="save"/></q-card-actions></q-card></q-dialog>
</q-page>
</template>

<style scoped>
.apps-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,480px));gap:18px}.native-app-card{overflow:hidden}.empty-state{text-align:center;padding:36px;color:#777}.lifecycle-note{border:1px solid var(--viti-border)}.cycle-card{width:720px;max-width:94vw}.min-width-0{min-width:0}
@media(max-width:600px){.apps-grid{grid-template-columns:1fr}.native-app-card .q-card__actions{display:grid;grid-template-columns:1fr;gap:8px}.native-app-card .q-card__actions .q-btn{width:100%;margin:0}}
</style>
