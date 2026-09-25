<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useQuasar } from 'quasar'
import { useRouter } from 'vue-router'
import { api } from '../boot/axios'
import PageHeader from '../components/PageHeader.vue'

const $q=useQuasar(), router=useRouter()
const apps=ref([]), companies=ref([]), projects=ref([]), loading=ref(false), dialog=ref(false), saving=ref(false), search=ref('')
const form=reactive({empresa_id:null,proyecto_id:null,nombre:'',version:'',tipo:'web',tecnologias:'',entorno:'desarrollo',estado:'en_pruebas',url:'',url_administracion:'',repositorio_url:'',proveedor_hosting:'',notas:''})
const activeApps=computed(()=>apps.value.filter(item=>item.estado!=='retirado'))
const filteredApps=computed(()=>{const term=search.value.trim().toLowerCase();return !term?activeApps.value:activeApps.value.filter(app=>`${app.nombre||''} ${app.empresa?.nombre_comercial||''} ${app.url||''} ${app.proveedor_hosting||''}`.toLowerCase().includes(term))})
const onlineCount=computed(()=>activeApps.value.filter(app=>app.entorno==='produccion'&&app.estado==='activo'&&app.url).length)
const deliveredCount=computed(()=>activeApps.value.filter(app=>app.acceso_cliente).length)

function reset(){Object.assign(form,{empresa_id:null,proyecto_id:null,nombre:'',version:'',tipo:'web',tecnologias:'',entorno:'desarrollo',estado:'en_pruebas',url:'',url_administracion:'',repositorio_url:'',proveedor_hosting:'',notas:''})}
function pretty(value){return String(value||'').replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase())}
function stateColor(app){if(app.estado==='pausado')return 'warning';if(app.estado==='retirado')return 'grey';if(app.entorno==='produccion'&&app.estado==='activo')return 'positive';return 'orange'}
function stateLabel(app){if(app.entorno==='produccion'&&app.estado==='activo')return 'En línea';if(app.estado==='pausado')return 'Pausado';if(app.entorno==='beta')return 'Beta';return pretty(app.entorno||app.estado)}
function openUrl(url){if(url&&/^https?:\/\//i.test(url))window.open(url,'_blank','noopener,noreferrer')}
function openDetail(app){router.push(`/sistemas/${app.id}`)}
function openNew(){reset();dialog.value=true}
async function load(){loading.value=true;try{const[a,e,p]=await Promise.all([api.get('/aplicaciones',{params:{per_page:100}}),api.get('/empresas',{params:{per_page:100}}),api.get('/proyectos',{params:{per_page:100}})]);apps.value=a.data.data||[];companies.value=e.data.data||[];projects.value=p.data.data||[]}finally{loading.value=false}}
async function save(){
  if(!form.empresa_id||!form.nombre.trim())return
  saving.value=true
  try{await api.post('/aplicaciones',{...form,modulos:[],configuracion:{license:{payment_required:false,module_control:false}},acceso_cliente:false});$q.notify({type:'positive',message:'Sistema registrado en VITI.'});dialog.value=false;await load()}
  catch(e){$q.notify({type:'negative',message:e.response?.data?.message||Object.values(e.response?.data?.errors||{}).flat()[0]||'No se pudo registrar el sistema.'})}
  finally{saving.value=false}
}
onMounted(load)
</script>

<template>
  <q-page class="viti-page systems-page">
    <PageHeader eyebrow="Sistemas" title="Sistemas que VITI administra desde fuera" subtitle="VITI no ejecuta la operación interna del sistema. Guarda sus URLs, infraestructura, estado de entrega y relación con el cliente.">
      <q-btn class="viti-btn viti-btn--ghost" outline no-caps icon="account_tree" label="Trabajos" to="/trabajos"/>
      <q-btn class="viti-btn viti-btn--primary" unelevated no-caps icon="add" label="Registrar sistema" @click="openNew"/>
    </PageHeader>

    <section class="systems-summary q-mb-lg">
      <div><small>REGISTRADOS</small><b>{{activeApps.length}}</b></div><div><small>EN LÍNEA</small><b>{{onlineCount}}</b></div><div><small>ENTREGADOS</small><b>{{deliveredCount}}</b></div>
      <q-input v-model="search" outlined dense clearable placeholder="Buscar sistema, cliente o URL"><template #prepend><q-icon name="search"/></template></q-input>
    </section>

    <q-inner-loading :showing="loading"/>
    <section v-if="!loading && filteredApps.length" class="systems-grid">
      <article v-for="app in filteredApps" :key="app.id" class="system-card" @click="openDetail(app)">
        <div class="system-head"><span class="system-icon"><q-icon name="language"/></span><div class="system-title"><small>{{app.empresa?.nombre_comercial||'Sin cliente'}}</small><h3>{{app.nombre}}</h3></div><q-badge outline :color="stateColor(app)">{{stateLabel(app)}}</q-badge></div>
        <div class="url-block"><small>URL PÚBLICA</small><b>{{app.url||'Aún no registrada'}}</b></div>
        <div class="system-facts"><span><q-icon name="dns"/>{{app.proveedor_hosting||'Hosting por definir'}}</span><span><q-icon name="code"/>{{app.tecnologias||'Tecnología por definir'}}</span></div>
        <div class="system-footer" @click.stop><q-btn v-if="app.url" flat no-caps icon="open_in_new" label="Abrir sistema" color="orange" @click="openUrl(app.url)"/><q-space/><q-btn flat no-caps icon-right="arrow_forward" label="Administrar" @click="openDetail(app)"/></div>
      </article>
    </section>

    <section v-else-if="!loading" class="systems-empty">
      <q-icon name="language" size="58px"/><h2>{{search?'No encontramos sistemas':'Todavía no hay sistemas registrados'}}</h2><p>{{search?'Prueba con otro término.':'Cuando un trabajo tenga una aplicación o sistema independiente, registra aquí sus enlaces e infraestructura.'}}</p><q-btn v-if="!search" color="primary" unelevated no-caps icon="add" label="Registrar primer sistema" @click="openNew"/>
    </section>

    <q-dialog v-model="dialog">
      <q-card class="system-dialog"><q-card-section class="dialog-head"><div><div class="section-label">Nuevo sistema</div><div class="text-h5 text-weight-bold">Registrar sistema externo</div><div class="text-caption text-grey-6">VITI guardará la ficha técnica y los enlaces. El sistema seguirá funcionando en su propio hosting.</div></div><q-btn flat round dense icon="close" v-close-popup/></q-card-section><q-separator/>
        <q-card-section><div class="form-grid">
          <q-select v-model="form.empresa_id" outlined emit-value map-options :options="companies.map(x=>({label:x.nombre_comercial,value:x.id}))" label="Cliente / negocio *"/>
          <q-select v-model="form.proyecto_id" outlined emit-value map-options clearable :options="projects.filter(x=>!form.empresa_id||Number(x.empresa_id)===Number(form.empresa_id)).map(x=>({label:`${x.codigo} · ${x.nombre}`,value:x.id}))" label="Trabajo relacionado"/>
          <q-input class="span-2" v-model="form.nombre" outlined label="Nombre del sistema *"/>
          <q-input v-model="form.url" outlined label="URL pública" placeholder="https://..."/>
          <q-input v-model="form.url_administracion" outlined label="URL administrativa" placeholder="https://..."/>
          <q-input v-model="form.repositorio_url" outlined label="Repositorio" placeholder="https://github.com/..."/>
          <q-input v-model="form.proveedor_hosting" outlined label="Hosting" placeholder="Vercel, Render, VPS..."/>
          <q-input v-model="form.tecnologias" outlined label="Tecnologías" placeholder="Vue, Laravel, MySQL..."/>
          <q-input v-model="form.version" outlined label="Versión"/>
          <q-input class="span-2" v-model="form.notas" outlined type="textarea" autogrow label="Notas internas"/>
        </div></q-card-section>
        <q-card-actions align="right"><q-btn flat no-caps label="Cancelar" v-close-popup/><q-btn color="primary" unelevated no-caps icon="save" label="Registrar sistema" :loading="saving" :disable="!form.empresa_id||!form.nombre" @click="save"/></q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<style scoped>
.systems-page{padding-top:34px}.systems-summary{display:grid;grid-template-columns:150px 150px 150px minmax(280px,1fr);gap:10px;align-items:stretch}.systems-summary>div{border:1px solid rgba(80,112,143,.22);background:rgba(8,25,45,.55);border-radius:14px;padding:13px 15px}.systems-summary small,.systems-summary b{display:block}.systems-summary small{font-size:8px;color:#718ca3;letter-spacing:.1em}.systems-summary b{font-size:21px;margin-top:3px}.systems-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:15px}.system-card{border:1px solid rgba(82,114,144,.22);background:linear-gradient(180deg,rgba(13,37,62,.86),rgba(8,27,47,.92));border-radius:20px;overflow:hidden;cursor:pointer;transition:.18s}.system-card:hover{transform:translateY(-2px);border-color:rgba(242,139,48,.4)}.system-head{display:flex;align-items:center;gap:11px;padding:18px}.system-icon{width:44px;height:44px;border-radius:13px;background:rgba(20,87,184,.18);color:#7eb4ff;display:grid;place-items:center;font-size:22px}.system-title{min-width:0;flex:1}.system-title small{font-size:8px;color:#748da4;text-transform:uppercase;letter-spacing:.08em}.system-title h3{font-size:17px;margin:3px 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.url-block{margin:0 18px 14px;padding:12px;background:rgba(255,255,255,.025);border-radius:12px}.url-block small,.url-block b{display:block}.url-block small{font-size:8px;color:#728ca2;letter-spacing:.08em}.url-block b{font-size:10px;margin-top:4px;color:#c8d5df;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.system-facts{display:grid;gap:7px;padding:0 18px 15px}.system-facts span{font-size:9px;color:#8da4b8;display:flex;align-items:center;gap:6px}.system-facts .q-icon{color:#f28b30}.system-footer{display:flex;align-items:center;border-top:1px solid rgba(90,120,150,.14);padding:7px 10px}.systems-empty{min-height:420px;border:1px dashed rgba(121,151,181,.28);border-radius:22px;background:rgba(8,25,45,.44);display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;color:#7f97ab}.systems-empty>.q-icon{color:#f28b30}.systems-empty h2{font-size:25px;color:#edf4fb;margin:14px 0 5px}.systems-empty p{max-width:630px;line-height:1.6}.system-dialog{width:780px;max-width:94vw;background:#0c2036!important;color:#edf4fb;border:1px solid var(--viti-border);border-radius:20px!important}.dialog-head{display:flex;justify-content:space-between;gap:16px}.form-grid{display:grid;grid-template-columns:1fr 1fr;gap:13px}.span-2{grid-column:1/-1}.viti-btn{border-radius:12px;min-height:42px}.viti-btn--ghost{background:rgba(255,255,255,.025)!important}.viti-btn--primary{background:linear-gradient(135deg,#1457b8,#1a69cf)!important}
@media(max-width:1100px){.systems-grid{grid-template-columns:repeat(2,1fr)}.systems-summary{grid-template-columns:repeat(3,1fr)}.systems-summary .q-field{grid-column:1/-1}}
@media(max-width:700px){.systems-page{padding-top:18px}.systems-grid{grid-template-columns:1fr}.systems-summary{grid-template-columns:1fr 1fr}.systems-summary .q-field{grid-column:1/-1}.form-grid{grid-template-columns:1fr}.span-2{grid-column:auto}}
</style>
