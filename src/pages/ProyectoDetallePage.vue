<script setup>
import { onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useQuasar } from 'quasar'
import { api } from '../boot/axios'
import { downloadFile } from '../utils/download'
import PageHeader from '../components/PageHeader.vue'
import { formatDate, formatDateTime } from '../utils/date'

const route=useRoute(),$q=useQuasar(),item=ref(null),loading=ref(true),advanceDialog=ref(false),editDialog=ref(false),developmentDialog=ref(false)
const advance=reactive({fase:'desarrollo',area:'general',titulo:'',descripcion:'',progreso:0,visible_cliente:true})
const advanceFile=ref(null)
const form=reactive({})
const development=reactive({repositorios:[],miembros:[],ambientes:[],dominios:[]})

const blankRepo=()=>({tipo:'frontend',proveedor:'github',nombre:'',url:'',rama_principal:'main',privado:true,descripcion:''})
const blankMember=()=>({usuario_id:'',rol:'desarrollador',permisos:[],activo:true})
const blankEnv=(tipo,nombre)=>({tipo,nombre,frontend_url:'',backend_url:'',proveedor_frontend:tipo==='produccion'?'Vercel':'',proveedor_backend:tipo==='produccion'?'Render':'',base_datos_referencia:'',estado:'pendiente',notas:''})
const blankDomain=()=>({ambiente_tipo:'produccion',dominio:'',tipo:'web',estado:'pendiente',verificado_at:'',notas:''})

function resetDevelopment(){
  development.repositorios=[]
  development.miembros=[]
  development.ambientes=[blankEnv('desarrollo','Desarrollo local'),blankEnv('staging','Staging'),blankEnv('produccion','Producción')]
  development.dominios=[]
}

function hydrateDevelopment(project){
  development.repositorios=(project.repositorios||[]).map(x=>({...blankRepo(),...x}))
  development.miembros=(project.miembros||[]).map(x=>({...blankMember(),usuario_id:x.usuario_id,rol:x.rol,permisos:x.permisos||[],activo:x.activo!==false}))
  development.ambientes=(project.ambientes||[]).map(x=>({...blankEnv(x.tipo,x.nombre),...x}))
  development.dominios=(project.dominios||[]).map(x=>({...blankDomain(),...x,ambiente_tipo:x.ambiente?.tipo||''}))
  if(!development.ambientes.length) development.ambientes=[blankEnv('desarrollo','Desarrollo local'),blankEnv('staging','Staging'),blankEnv('produccion','Producción')]
}

async function load(){
  loading.value=true
  try{
    item.value=(await api.get(`/proyectos/${route.params.id}`)).data.data
    Object.assign(form,item.value)
    hydrateDevelopment(item.value)
  }finally{loading.value=false}
}

async function save(){
  try{
    await api.put(`/proyectos/${item.value.id}`,form)
    $q.notify({type:'positive',message:'Proyecto actualizado.'})
    editDialog.value=false
    load()
  }catch(e){$q.notify({type:'negative',message:e.response?.data?.message||'No se pudo actualizar.'})}
}

async function saveDevelopment(){
  try{
    const payload={...form,development:JSON.parse(JSON.stringify(development))}
    await api.put(`/proyectos/${item.value.id}`,payload)
    $q.notify({type:'positive',message:'Detalles técnicos actualizados.'})
    developmentDialog.value=false
    await load()
  }catch(e){$q.notify({type:'negative',message:e.response?.data?.message||'No se pudieron guardar los detalles técnicos.'})}
}

function openDevelopment(){hydrateDevelopment(item.value||{});developmentDialog.value=true}
function addRepo(){development.repositorios.push(blankRepo())}
function removeRepo(index){development.repositorios.splice(index,1)}
function addMember(){development.miembros.push(blankMember())}
function removeMember(index){development.miembros.splice(index,1)}
function addEnvironment(){development.ambientes.push(blankEnv('staging','Nuevo ambiente'))}
function removeEnvironment(index){development.ambientes.splice(index,1)}
function addDomain(){development.dominios.push(blankDomain())}
function removeDomain(index){development.dominios.splice(index,1)}

function openAdvance(){Object.assign(advance,{fase:item.value.fase,area:'general',titulo:'',descripcion:'',progreso:item.value.progreso,visible_cliente:true});advanceFile.value=null;advanceDialog.value=true}
async function addAdvance(){
  try{
    const {data}=await api.post(`/proyectos/${item.value.id}/avances`,advance)
    if(advanceFile.value){const fd=new FormData();fd.append('tipo','avance');fd.append('id',data.data.id);fd.append('categoria','avance');fd.append('archivo',advanceFile.value);fd.append('descripcion',advance.titulo);await api.post('/archivos',fd)}
    $q.notify({type:'positive',message:'Avance registrado.'});advanceDialog.value=false;load()
  }catch(e){$q.notify({type:'negative',message:e.response?.data?.message||'No se pudo registrar.'})}
}

onMounted(load)
</script>

<template>
<q-page class="viti-page">
  <q-inner-loading :showing="loading"/>
  <template v-if="item">
    <PageHeader eyebrow="Proyecto" :title="`${item.codigo} · ${item.nombre}`" :subtitle="`${item.empresa?.nombre_comercial} · ${item.cliente?.nombre}`">
      <div class="row q-gutter-sm">
        <q-btn outline color="primary" icon="picture_as_pdf" label="PDF" no-caps @click="downloadFile(`/reportes/proyectos/${item.id}.pdf`,`${item.codigo}.pdf`)"/>
        <q-btn outline color="primary" icon="edit" label="Editar" no-caps @click="editDialog=true"/>
        <q-btn flat color="orange" icon="tune" label="Detalles técnicos" no-caps @click="openDevelopment"/>
        <q-btn color="primary" unelevated icon="add_task" label="Registrar avance" no-caps @click="openAdvance"/>
      </div>
    </PageHeader>

    <div class="row q-col-gutter-lg">
      <div class="col-12 col-lg-8">
        <q-card flat class="viti-card">
          <q-card-section>
            <div class="row items-center">
              <div><div class="text-h6 text-weight-bold">Estado del desarrollo</div><div class="text-caption text-grey-6">{{item.fase}} · {{item.estado}}</div></div>
              <q-space/><div class="text-h5 text-weight-bold">{{item.progreso}}%</div>
            </div>
            <q-linear-progress rounded size="12px" :value="item.progreso/100" color="primary" class="q-mt-md"/>
          </q-card-section>
          <q-separator/>
          <q-card-section>
            <div class="text-subtitle1 text-weight-bold">Descripción</div>
            <div class="q-mt-sm" style="white-space:pre-wrap">{{item.descripcion||'Sin descripción.'}}</div>
          </q-card-section>
        </q-card>

        <q-card flat class="viti-card q-mt-lg">
          <q-card-section><div class="text-h6 text-weight-bold">Historial de avances</div></q-card-section>
          <q-separator/>
          <q-timeline color="primary" layout="comfortable" class="q-pa-lg">
            <q-timeline-entry v-for="a in item.avances" :key="a.id" :title="a.titulo" :subtitle="`${a.fase} · ${a.area||'general'} · ${formatDateTime(a.created_at)}`" :icon="a.visible_cliente?'visibility':'visibility_off'">
              <div style="white-space:pre-wrap">{{a.descripcion}}</div>
              <q-badge v-if="a.progreso!==null" outline color="primary" class="q-mt-sm">{{a.progreso}}%</q-badge>
              <div v-if="a.archivos?.length" class="q-mt-sm"><q-chip v-for="f in a.archivos" :key="f.id" clickable icon="attach_file" @click="downloadFile(`/archivos/${f.id}/descargar`,f.nombre_original)">{{f.nombre_original}}</q-chip></div>
            </q-timeline-entry>
            <div v-if="!item.avances?.length" class="empty-state">No hay avances adicionales.</div>
          </q-timeline>
        </q-card>
      </div>

      <div class="col-12 col-lg-4">
        <q-card flat class="viti-card">
          <q-list>
            <q-item><q-item-section><q-item-label caption>Fecha de inicio</q-item-label><q-item-label>{{formatDate(item.fecha_inicio)}}</q-item-label></q-item-section></q-item>
            <q-separator/>
            <q-item><q-item-section><q-item-label caption>Fecha beta</q-item-label><q-item-label>{{formatDate(item.fecha_beta)}}</q-item-label></q-item-section></q-item>
            <q-separator/>
            <q-item><q-item-section><q-item-label caption>Entrega final</q-item-label><q-item-label>{{formatDate(item.fecha_entrega)}}</q-item-label></q-item-section></q-item>
            <q-separator/>
            <q-item v-if="item.produccion_url" clickable tag="a" :href="item.produccion_url" target="_blank"><q-item-section avatar><q-icon name="public"/></q-item-section><q-item-section>Ver producción</q-item-section></q-item>
          </q-list>
        </q-card>
      </div>
    </div>
  </template>

  <q-dialog v-model="advanceDialog">
    <q-card style="width:680px;max-width:94vw">
      <q-card-section><div class="section-label">Seguimiento</div><div class="text-h5 text-weight-bold">Registrar avance</div></q-card-section>
      <q-card-section><div class="row q-col-gutter-md"><div class="col-12 col-sm-4"><q-select v-model="advance.fase" outlined :options="['levantamiento','analisis','diseno','desarrollo','beta','pruebas','ajustes','implementacion','finalizado','mantenimiento']" label="Fase"/></div><div class="col-12 col-sm-4"><q-select v-model="advance.area" outlined :options="['general','analisis','diseno','frontend','backend','movil','infraestructura','qa']" label="Área"/></div><div class="col-12 col-sm-4"><q-input v-model.number="advance.progreso" outlined type="number" min="0" max="100" label="Progreso %"/></div><div class="col-12"><q-input v-model="advance.titulo" outlined label="Título del avance *"/></div><div class="col-12"><q-input v-model="advance.descripcion" outlined type="textarea" label="Descripción"/></div><div class="col-12"><q-file v-model="advanceFile" outlined accept="image/*,.pdf,.doc,.docx,.zip" label="Anexo del avance (opcional)"><template #prepend><q-icon name="attach_file"/></template></q-file></div><div class="col-12"><q-toggle v-model="advance.visible_cliente" label="Este avance puede mostrarse al cliente"/></div></div></q-card-section>
      <q-card-actions align="right"><q-btn flat label="Cancelar" v-close-popup/><q-btn color="primary" unelevated label="Guardar avance" no-caps @click="addAdvance"/></q-card-actions>
    </q-card>
  </q-dialog>

  <q-dialog v-model="editDialog">
    <q-card style="width:720px;max-width:94vw">
      <q-card-section><div class="section-label">Proyecto</div><div class="text-h5 text-weight-bold">Editar configuración</div></q-card-section>
      <q-card-section><q-input v-model="form.nombre" outlined label="Nombre"/><q-input v-model="form.descripcion" outlined type="textarea" label="Descripción" class="q-mt-md"/><div class="row q-col-gutter-md q-mt-xs"><div class="col-6"><q-select v-model="form.fase" outlined :options="['levantamiento','analisis','diseno','desarrollo','beta','pruebas','ajustes','implementacion','finalizado','mantenimiento']" label="Fase"/></div><div class="col-6"><q-select v-model="form.estado" outlined :options="['activo','pausado','finalizado','cancelado','mantenimiento']" label="Estado"/></div><div class="col-4"><q-input v-model.number="form.progreso" outlined type="number" label="Progreso %"/></div><div class="col-4"><q-input v-model="form.fecha_beta" outlined type="date" stack-label label="Beta"/></div><div class="col-4"><q-input v-model="form.fecha_entrega" outlined type="date" stack-label label="Entrega"/></div><div class="col-12"><q-input v-model="form.repositorio_url" outlined label="Repositorio URL"/></div><div class="col-12"><q-input v-model="form.produccion_url" outlined label="Producción URL"/></div></div></q-card-section>
      <q-card-actions align="right"><q-btn flat label="Cancelar" v-close-popup/><q-btn color="primary" unelevated label="Guardar cambios" no-caps @click="save"/></q-card-actions>
    </q-card>
  </q-dialog>

  <q-dialog v-model="developmentDialog" maximized>
    <q-card>
      <q-card-section class="row items-center"><div><div class="section-label">Detalles técnicos</div><div class="text-h5 text-weight-bold">{{item?.codigo}} · {{item?.nombre}}</div><div class="text-caption text-grey-6">Información opcional para el equipo de desarrollo. El cliente no necesita verla.</div></div><q-space/><q-btn flat round icon="close" v-close-popup/></q-card-section>
      <q-separator/>
      <q-card-section class="q-pa-lg">
        <div class="row q-col-gutter-lg">
          <div class="col-12 col-xl-6">
            <q-card flat bordered>
              <q-card-section class="row items-center"><div><div class="text-h6 text-weight-bold">Repositorios</div><div class="text-caption">Referencias de código cuando el proyecto las necesite.</div></div><q-space/><q-btn color="primary" icon="add" label="Repositorio" no-caps @click="addRepo"/></q-card-section>
              <q-separator/>
              <q-card-section>
                <div v-for="(repo,index) in development.repositorios" :key="index" class="q-pa-md q-mb-md rounded-borders dev-block">
                  <div class="row q-col-gutter-sm">
                    <div class="col-6"><q-select v-model="repo.tipo" outlined dense :options="['frontend','backend','mobile','infra','otro']" label="Tipo"/></div>
                    <div class="col-6"><q-select v-model="repo.proveedor" outlined dense :options="['github','gitlab','bitbucket','otro']" label="Proveedor"/></div>
                    <div class="col-12"><q-input v-model="repo.nombre" outlined dense label="Nombre del repositorio"/></div>
                    <div class="col-12"><q-input v-model="repo.url" outlined dense label="URL del repositorio"/></div>
                    <div class="col-7"><q-input v-model="repo.rama_principal" outlined dense label="Rama principal"/></div>
                    <div class="col-5 flex items-center"><q-toggle v-model="repo.privado" label="Privado"/></div>
                    <div class="col-12"><q-input v-model="repo.descripcion" outlined dense type="textarea" autogrow label="Descripción"/></div>
                    <div class="col-12 text-right"><q-btn flat color="negative" icon="delete" label="Quitar" no-caps @click="removeRepo(index)"/></div>
                  </div>
                </div>
                <div v-if="!development.repositorios.length" class="text-grey-6">No hay repositorios configurados todavía.</div>
              </q-card-section>
            </q-card>
          </div>

          <div class="col-12 col-xl-6">
            <q-card flat bordered>
              <q-card-section class="row items-center"><div><div class="text-h6 text-weight-bold">Ambientes</div><div class="text-caption">URLs y hosting de prueba o producción, solo cuando existan.</div></div><q-space/><q-btn outline color="primary" icon="add" label="Ambiente" no-caps @click="addEnvironment"/></q-card-section>
              <q-separator/>
              <q-card-section>
                <div v-for="(env,index) in development.ambientes" :key="index" class="q-pa-md q-mb-md rounded-borders dev-block">
                  <div class="row q-col-gutter-sm">
                    <div class="col-5"><q-select v-model="env.tipo" outlined dense :options="['desarrollo','staging','produccion']" label="Tipo"/></div>
                    <div class="col-7"><q-input v-model="env.nombre" outlined dense label="Nombre"/></div>
                    <div class="col-12"><q-input v-model="env.frontend_url" outlined dense label="Frontend URL"/></div>
                    <div class="col-12"><q-input v-model="env.backend_url" outlined dense label="Backend URL"/></div>
                    <div class="col-6"><q-input v-model="env.proveedor_frontend" outlined dense label="Hosting frontend"/></div>
                    <div class="col-6"><q-input v-model="env.proveedor_backend" outlined dense label="Hosting backend"/></div>
                    <div class="col-8"><q-input v-model="env.base_datos_referencia" outlined dense label="Referencia de BD"/></div>
                    <div class="col-4"><q-select v-model="env.estado" outlined dense :options="['pendiente','en_pruebas','estable','bloqueado','activo']" label="Estado"/></div>
                    <div class="col-12"><q-input v-model="env.notas" outlined dense type="textarea" autogrow label="Notas"/></div>
                    <div class="col-12 text-right"><q-btn flat color="negative" icon="delete" label="Quitar" no-caps @click="removeEnvironment(index)"/></div>
                  </div>
                </div>
              </q-card-section>
            </q-card>
          </div>

          <div class="col-12 col-xl-6">
            <q-card flat bordered>
              <q-card-section class="row items-center"><div><div class="text-h6 text-weight-bold">Miembros</div><div class="text-caption">Equipo técnico asignado, si corresponde.</div></div><q-space/><q-btn outline color="primary" icon="person_add" label="Miembro" no-caps @click="addMember"/></q-card-section>
              <q-separator/>
              <q-card-section>
                <div v-for="(member,index) in development.miembros" :key="index" class="q-pa-md q-mb-md rounded-borders dev-block">
                  <div class="row q-col-gutter-sm items-center">
                    <div class="col-4"><q-input v-model.number="member.usuario_id" outlined dense type="number" label="ID usuario"/></div>
                    <div class="col-5"><q-select v-model="member.rol" outlined dense :options="['responsable','desarrollador','qa','devops','diseno','cliente_lector']" label="Rol"/></div>
                    <div class="col-3 flex justify-end"><q-btn flat color="negative" icon="delete" @click="removeMember(index)"/></div>
                  </div>
                </div>
                <div v-if="!development.miembros.length" class="text-grey-6">No hay miembros asignados.</div>
              </q-card-section>
            </q-card>
          </div>

          <div class="col-12 col-xl-6">
            <q-card flat bordered>
              <q-card-section class="row items-center"><div><div class="text-h6 text-weight-bold">Dominios</div><div class="text-caption">Dominios reales del sistema, cuando estén disponibles.</div></div><q-space/><q-btn outline color="primary" icon="language" label="Dominio" no-caps @click="addDomain"/></q-card-section>
              <q-separator/>
              <q-card-section>
                <div v-for="(domain,index) in development.dominios" :key="index" class="q-pa-md q-mb-md rounded-borders dev-block">
                  <div class="row q-col-gutter-sm">
                    <div class="col-8"><q-input v-model="domain.dominio" outlined dense label="Dominio"/></div>
                    <div class="col-4"><q-select v-model="domain.tipo" outlined dense :options="['web','api','staging','otro']" label="Tipo"/></div>
                    <div class="col-6"><q-select v-model="domain.ambiente_tipo" outlined dense :options="['desarrollo','staging','produccion']" label="Ambiente"/></div>
                    <div class="col-6"><q-select v-model="domain.estado" outlined dense :options="['pendiente','configurando','activo','bloqueado']" label="Estado"/></div>
                    <div class="col-12"><q-input v-model="domain.notas" outlined dense type="textarea" autogrow label="Notas"/></div>
                    <div class="col-12 text-right"><q-btn flat color="negative" icon="delete" label="Quitar" no-caps @click="removeDomain(index)"/></div>
                  </div>
                </div>
                <div v-if="!development.dominios.length" class="text-grey-6">No hay dominios configurados.</div>
              </q-card-section>
            </q-card>
          </div>
        </div>
      </q-card-section>
      <q-separator/>
      <q-card-actions align="right" class="q-pa-md"><q-btn flat label="Cancelar" v-close-popup/><q-btn color="primary" unelevated icon="save" label="Guardar detalles técnicos" no-caps @click="saveDevelopment"/></q-card-actions>
    </q-card>
  </q-dialog>
</q-page>
</template>

<style scoped>
.dev-block{background:#081a2c;border:1px solid rgba(68,103,137,.28)}
.q-dialog :deep(.q-card){background:#0a1d31;color:#edf4fb}.q-dialog :deep(.q-card.q-pa-md),.q-dialog :deep(.q-card[bordered]){border-color:rgba(68,103,137,.28)}
</style>
