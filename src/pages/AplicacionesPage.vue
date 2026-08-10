<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { api } from '../boot/axios'
import PageHeader from '../components/PageHeader.vue'
import RowActionsMenu from '../components/RowActionsMenu.vue'

const $q = useQuasar()
const router=useRouter()
const allApps=ref([])
const rows = computed(()=>allApps.value)
const electroApps=computed(()=>allApps.value.filter(item=>item.catalogo?.clave==='electrofrio'&&item.estado==='activo'))
const serviceApps=computed(()=>allApps.value.filter(item=>item.catalogo?.clave==='servicio-tecnico'&&item.estado!=='retirado'))
const companies = ref([])
const projects = ref([])
const dialog = ref(false)
const editing = ref(null)
const loading = ref(false)

const empty = () => ({ empresa_id:null,proyecto_id:null,nombre:'',version:'',tipo:'web',tecnologias:'',entorno:'beta',estado:'en_pruebas',url:'',url_administracion:'',repositorio_url:'',proveedor_hosting:'',notas:'',publicado_at:null })
const form = reactive(empty())
const columns = [
  {name:'actions',label:'',field:'actions',align:'left'},
  {name:'nombre',label:'Aplicación',field:'nombre',align:'left'},
  {name:'empresa',label:'Empresa',field:r=>r.empresa?.nombre_comercial,align:'left'},
  {name:'version',label:'Versión',field:'version',align:'left'},
  {name:'entorno',label:'Entorno',field:'entorno',align:'left'},
  {name:'estado',label:'Estado',field:'estado',align:'left'},
  {name:'entrega',label:'Acceso cliente',field:'acceso_cliente',align:'left'},
  {name:'url',label:'Abrir',field:'url',align:'left'},
]

async function load(){
  loading.value=true
  try{
    const [a,e,p]=await Promise.all([
      api.get('/aplicaciones',{params:{per_page:100}}),
      api.get('/empresas',{params:{per_page:100}}),
      api.get('/proyectos',{params:{per_page:100}}),
    ])
    allApps.value=a.data.data||[]
    companies.value=e.data.data
    projects.value=p.data.data
  } finally { loading.value=false }
}
function nativeRoute(app){
  const key=app?.catalogo?.clave
  if(key==='peluqueria')return '/apps/peluqueria'
  if(key==='electrofrio')return '/apps/electrofrio/inicio'
  if(key==='servicio-tecnico')return '/apps/servicio-tecnico/inicio'
  return null
}
function openManaged(app){
  if(!app)return
  if(app.empresa_id)localStorage.setItem('viti-empresa-id',String(app.empresa_id))
  const route=nativeRoute(app)
  if(route){router.push(route);return}
  if(app.url)router.push(`/apps/externa/${app.id}`)
}
function openElectro(app){openManaged(app)}
function open(row=null){editing.value=row;Object.assign(form,empty(),row||{});dialog.value=true}
async function save(){try{editing.value?await api.put(`/aplicaciones/${editing.value.id}`,form):await api.post('/aplicaciones',form);$q.notify({type:'positive',message:editing.value?'Aplicación actualizada.':'Aplicación integrada.'});dialog.value=false;load()}catch(e){$q.notify({type:'negative',message:e.response?.data?.message||'No se pudo guardar.'})}}
function remove(row){$q.dialog({title:'Retirar aplicación',message:`¿Retirar ${row.nombre}?`,cancel:true}).onOk(async()=>{try{await api.delete(`/aplicaciones/${row.id}`);load()}catch(e){$q.notify({type:'negative',message:e.response?.data?.message||'No se puede retirar.'})}})}
async function toggleDelivery(row){
  const delivering=!row.acceso_cliente
  const title=delivering?'Entregar aplicación':'Revocar acceso'
  const message=delivering?`¿Habilitar ${row.nombre} para ${row.empresa?.nombre_comercial||'el cliente'}?`:`¿Quitar temporalmente el acceso del cliente a ${row.nombre}?`
  $q.dialog({title,message,cancel:true,persistent:true}).onOk(async()=>{
    try{
      await api.post(`/aplicaciones/${row.id}/${delivering?'entregar':'revocar-acceso'}`)
      $q.notify({type:'positive',message:delivering?'Aplicación entregada al cliente.':'Acceso revocado.'})
      await load()
    }catch(e){$q.notify({type:'negative',message:e.response?.data?.message||'No se pudo cambiar el acceso.'})}
  })
}
onMounted(load)
</script>

<template>
  <q-page class="viti-page">
    <PageHeader eyebrow="VITI" title="Centro de aplicaciones" subtitle="Aplicaciones propias de VITI y sistemas administrados desde una sola plataforma.">
      <q-btn color="primary" unelevated icon="add_to_queue" label="Integrar sistema externo" no-caps @click="open()"/>
    </PageHeader>

    <div class="text-overline text-primary">VITI Apps</div>
    <div class="text-h6 text-weight-bold q-mb-sm">Aplicaciones de la plataforma</div>
    <div class="apps-grid q-mb-xl">
      <q-card flat class="viti-card native-app-card">
        <q-card-section class="row items-start no-wrap q-gutter-md">
          <q-avatar size="56px" color="primary" text-color="white" icon="content_cut"/>
          <div class="col">
            <div class="row items-center q-gutter-sm"><div class="text-h6 text-weight-bold">Peluquería</div><q-badge color="positive" label="V1 activa"/></div>
            <div class="text-body2 text-grey-7 q-mt-xs">Agenda, clientes, servicios, personal, atenciones, pagos e historial para peluquerías, salones y barberías.</div>
          </div>
        </q-card-section>
        <q-separator/>
        <q-card-actions align="right"><q-btn color="primary" unelevated no-caps icon-right="arrow_forward" label="Abrir aplicación" to="/apps/peluqueria"/></q-card-actions>
      </q-card>

      <q-card v-for="app in electroApps" :key="`electro-${app.id}`" flat class="viti-card native-app-card electrofrio-card">
        <q-card-section class="row items-start no-wrap q-gutter-md">
          <q-avatar size="56px" color="primary" text-color="white" icon="ac_unit"/>
          <div class="col">
            <div class="row items-center q-gutter-sm"><div class="text-h6 text-weight-bold">Electrofrío</div><q-badge color="positive" label="VITI App activa"/></div>
            <div class="text-body2 text-grey-7 q-mt-xs">{{app.empresa?.nombre_comercial}} · agenda, órdenes, clientes, equipos, técnicos, historial y mensajes propios.</div>
            <div class="text-caption text-grey-6 q-mt-sm">Empresa dinámica · datos aislados por negocio</div>
          </div>
        </q-card-section>
        <q-separator/>
        <q-card-actions align="right"><q-btn color="primary" unelevated no-caps icon-right="arrow_forward" label="Abrir Electrofrío" @click="openElectro(app)"/></q-card-actions>
      </q-card>

      <q-card v-for="app in serviceApps" :key="`service-${app.id}`" flat class="viti-card native-app-card">
        <q-card-section class="row items-start no-wrap q-gutter-md">
          <q-avatar size="56px" color="primary" text-color="white" icon="computer"/>
          <div class="col">
            <div class="row items-center q-gutter-sm"><div class="text-h6 text-weight-bold">{{app.nombre}}</div><q-badge color="orange" :label="`V${app.version||'0.5'} · 50%`"/></div>
            <div class="text-body2 text-grey-7 q-mt-xs">Sistema técnico para computadoras: clientes, equipos, técnicos, órdenes y agenda en desarrollo.</div>
            <div class="text-caption text-grey-6 q-mt-sm">{{app.empresa?.nombre_comercial}} · {{app.entorno}} · {{app.estado}}</div>
          </div>
        </q-card-section>
        <q-separator/>
        <q-card-actions align="right"><q-btn color="primary" unelevated no-caps icon-right="arrow_forward" label="Abrir avance" @click="openManaged(app)"/></q-card-actions>
      </q-card>
    </div>

    <div class="text-overline text-primary">Sistemas administrados</div>
    <div class="text-h6 text-weight-bold">Aplicaciones de clientes</div>
    <div class="text-caption text-grey-6 q-mb-md">Las aplicaciones nativas abren directamente su espacio de trabajo. El visor integrado queda reservado para sistemas externos reales.</div>

    <q-table flat class="viti-table" :rows="rows" :columns="columns" row-key="id" :loading="loading" :pagination="{rowsPerPage:20,sortBy:'id',descending:true}">
      <template #body-cell-actions="p"><q-td :props="p"><div class="row no-wrap items-center"><RowActionsMenu @open="open(p.row)" @edit="open(p.row)" @delete="remove(p.row)"/><q-btn v-if="nativeRoute(p.row)||p.row.url" flat dense round icon="web_asset" color="primary" @click="openManaged(p.row)"><q-tooltip>{{nativeRoute(p.row)?'Abrir aplicación VITI':'Abrir sistema externo'}}</q-tooltip></q-btn><q-btn flat dense round :icon="p.row.acceso_cliente?'lock':'key'" :color="p.row.acceso_cliente?'orange':'positive'" @click="toggleDelivery(p.row)"><q-tooltip>{{p.row.acceso_cliente?'Revocar acceso':'Entregar al cliente'}}</q-tooltip></q-btn></div></q-td></template>
      <template #body-cell-url="p"><q-td :props="p"><q-btn v-if="nativeRoute(p.row)||p.value" flat dense icon="open_in_new" color="primary" @click="openManaged(p.row)"/><span v-else>Sin acceso</span></q-td></template>
      <template #body-cell-estado="p"><q-td :props="p"><q-badge outline color="primary">{{p.value}}</q-badge></q-td></template>
      <template #body-cell-entrega="p"><q-td :props="p"><q-badge :color="p.row.acceso_cliente?'positive':'grey'">{{p.row.acceso_cliente?'Entregada':'Sin acceso'}}</q-badge></q-td></template>
      <template #no-data><div class="empty-state full-width"><q-icon name="apps" size="52px"/><div class="text-h6 q-mt-sm">Todavía no hay aplicaciones registradas</div></div></template>
    </q-table>

    <q-dialog v-model="dialog"><q-card style="width:760px;max-width:94vw"><q-card-section><div class="section-label">{{editing?'Editar':'Integrar'}} aplicación</div><div class="text-h5 text-weight-bold">Sistema del cliente</div></q-card-section><q-card-section><div class="row q-col-gutter-md"><div class="col-12 col-sm-6"><q-select v-model="form.empresa_id" outlined emit-value map-options :options="companies.map(x=>({label:x.nombre_comercial,value:x.id}))" label="Empresa *"/></div><div class="col-12 col-sm-6"><q-select v-model="form.proyecto_id" outlined emit-value map-options clearable :options="projects.map(x=>({label:`${x.codigo} · ${x.nombre}`,value:x.id}))" label="Proyecto relacionado"/></div><div class="col-12 col-sm-8"><q-input v-model="form.nombre" outlined label="Nombre de la aplicación *"/></div><div class="col-12 col-sm-4"><q-input v-model="form.version" outlined label="Versión"/></div><div class="col-12 col-sm-4"><q-select v-model="form.tipo" outlined :options="['web','movil','escritorio','hibrido','api','otro']" label="Tipo"/></div><div class="col-12 col-sm-8"><q-input v-model="form.tecnologias" outlined label="Tecnologías" placeholder="Ej. Laravel, Quasar, PostgreSQL"/></div><div class="col-12 col-sm-6"><q-select v-model="form.entorno" outlined :options="['desarrollo','beta','produccion']" label="Entorno"/></div><div class="col-12 col-sm-6"><q-select v-model="form.estado" outlined :options="['en_pruebas','activo','pausado','retirado']" label="Estado"/></div><div class="col-12"><q-input v-model="form.url" outlined label="URL pública (solo si es externa)"/></div><div class="col-12"><q-input v-model="form.url_administracion" outlined label="URL administrativa"/></div><div class="col-12 col-sm-8"><q-input v-model="form.repositorio_url" outlined label="Repositorio del proyecto"/></div><div class="col-12 col-sm-4"><q-input v-model="form.proveedor_hosting" outlined label="Hosting / proveedor" placeholder="Vercel, Render..."/></div><div class="col-12"><q-input v-model="form.notas" outlined type="textarea" label="Notas técnicas"/></div></div></q-card-section><q-card-actions align="right"><q-btn flat label="Cancelar" v-close-popup/><q-btn color="primary" unelevated :label="editing?'Guardar cambios':'Integrar aplicación'" no-caps @click="save"/></q-card-actions></q-card></q-dialog>
  </q-page>
</template>

<style scoped>
.apps-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,440px));gap:18px}.native-app-card{overflow:hidden}.empty-state{text-align:center;padding:36px;color:#777}
</style>
