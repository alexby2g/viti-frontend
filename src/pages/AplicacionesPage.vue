<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useQuasar } from 'quasar'
import { api } from '../boot/axios'
import PageHeader from '../components/PageHeader.vue'

const $q = useQuasar()
const apps = ref([])
const companies = ref([])
const projects = ref([])
const loading = ref(false)
const dialog = ref(false)
const cycleDialog = ref(false)
const editing = ref(null)
const cycleCurrent = ref(null)
const savingCycle = ref(false)

const empty = () => ({ empresa_id:null, proyecto_id:null, nombre:'', version:'', tipo:'web', tecnologias:'', entorno:'desarrollo', estado:'en_pruebas', url:'', url_administracion:'', repositorio_url:'', proveedor_hosting:'', notas:'', modulos:[], beta_url:'', apk_url:'', apk_version:'', payment_required:true, module_control:true })
const form = reactive(empty())
const cycle = reactive({ entorno:'desarrollo', estado:'en_pruebas' })
const environmentOptions = [
  { label:'Desarrollo', value:'desarrollo' }, { label:'Beta / pruebas', value:'beta' }, { label:'Producción', value:'produccion' },
]
const operationalOptions = [
  { label:'En pruebas', value:'en_pruebas' }, { label:'Activo', value:'activo' }, { label:'Pausado', value:'pausado' }, { label:'Retirado', value:'retirado' },
]
const moduleOptions = ['clientes','usuarios','ventas','pedidos','productos','inventario','caja','pagos','agenda','servicios','ordenes','reportes','notificaciones','delivery','ubicacion','soporte']
const activeApps = computed(() => apps.value.filter(item => item.estado !== 'retirado'))

function pretty(value){ return String(value || '').replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase()) }
function environmentColor(value){ return { desarrollo:'blue-grey', beta:'orange', produccion:'positive' }[value] || 'grey' }
function operationalColor(value){ return { en_pruebas:'orange', activo:'positive', pausado:'warning', retirado:'grey' }[value] || 'grey' }
function environmentLabel(value){ return { desarrollo:'Desarrollo', beta:'Beta', produccion:'Producción' }[value] || pretty(value) }
function operationalLabel(value){ return { en_pruebas:'En pruebas', activo:'Activo', pausado:'Pausado', retirado:'Retirado' }[value] || pretty(value) }
function deliveryLabel(app){ return app.acceso_cliente ? 'Entregado' : 'Sin entregar' }
function subscriptionLabel(app){ return app.suscripcion?.estado ? pretty(app.suscripcion.estado) : 'Sin suscripción' }
function configOf(row){
  const cfg=row?.configuracion && typeof row.configuracion==='object' ? row.configuracion : {}
  return { cfg, delivery:cfg.delivery && typeof cfg.delivery==='object' ? cfg.delivery : {}, license:cfg.license && typeof cfg.license==='object' ? cfg.license : {} }
}

async function load(){
  loading.value = true
  try {
    const [a,e,p] = await Promise.all([
      api.get('/aplicaciones',{params:{per_page:100}}),
      api.get('/empresas',{params:{per_page:100}}),
      api.get('/proyectos',{params:{per_page:100}}),
    ])
    apps.value = a.data.data || []
    companies.value = e.data.data || []
    projects.value = p.data.data || []
  } finally { loading.value = false }
}
function open(row=null){
  editing.value=row
  const {delivery,license}=configOf(row)
  Object.assign(form, empty(), row || {}, {
    modulos:Array.isArray(row?.modulos)?[...row.modulos]:[],
    beta_url:delivery.beta_url||'', apk_url:delivery.apk_url||'', apk_version:delivery.apk_version||'',
    payment_required:license.payment_required!==false, module_control:license.module_control!==false,
  })
  dialog.value=true
}
function openCycle(row){ cycleCurrent.value=row; Object.assign(cycle,{entorno:row.entorno||'desarrollo',estado:row.estado||'en_pruebas'}); cycleDialog.value=true }
function openSystem(row){
  const target = row.url_administracion || row.url
  if (target) window.open(target,'_blank','noopener,noreferrer')
  else open(row)
}
async function save(){
  try {
    const original=configOf(editing.value).cfg
    const payload={...form,
      configuracion:{...original,
        delivery:{...(original.delivery||{}),beta_url:form.beta_url||null,apk_url:form.apk_url||null,apk_version:form.apk_version||null},
        license:{...(original.license||{}),payment_required:Boolean(form.payment_required),module_control:Boolean(form.module_control)},
      },
      modulos:Array.isArray(form.modulos)?form.modulos:[],
    }
    delete payload.beta_url;delete payload.apk_url;delete payload.apk_version;delete payload.payment_required;delete payload.module_control
    editing.value ? await api.put(`/aplicaciones/${editing.value.id}`,payload) : await api.post('/aplicaciones',payload)
    $q.notify({type:'positive',message:editing.value?'Sistema actualizado.':'Sistema registrado.'})
    dialog.value=false
    await load()
  } catch(e){ $q.notify({type:'negative',message:e.response?.data?.message||Object.values(e.response?.data?.errors||{}).flat()[0]||'No se pudo guardar.'}) }
}
async function saveCycle(){
  if(!cycleCurrent.value) return
  savingCycle.value=true
  try {
    await api.put(`/aplicaciones/${cycleCurrent.value.id}/ciclo`,cycle)
    cycleDialog.value=false
    $q.notify({type:'positive',message:'Estado del sistema actualizado.'})
    await load()
  } catch(e){ $q.notify({type:'negative',message:e.response?.data?.message||'No se pudo cambiar el estado.'}) }
  finally { savingCycle.value=false }
}
function remove(row){
  $q.dialog({title:'Retirar sistema',message:`¿Retirar ${row.nombre}?`,cancel:true,persistent:true}).onOk(async()=>{
    try { await api.delete(`/aplicaciones/${row.id}`); await load() }
    catch(e){ $q.notify({type:'negative',message:e.response?.data?.message||'No se puede retirar.'}) }
  })
}
function toggleDelivery(row){
  const delivering=!row.acceso_cliente
  $q.dialog({title:delivering?'Entregar sistema':'Revocar acceso',message:delivering?`¿Habilitar ${row.nombre} para el cliente?`:`¿Revocar temporalmente el acceso a ${row.nombre}?`,cancel:true,persistent:true}).onOk(async()=>{
    try {
      await api.post(`/aplicaciones/${row.id}/${delivering?'entregar':'revocar'}`)
      $q.notify({type:'positive',message:delivering?'Sistema entregado.':'Acceso revocado.'})
      await load()
    } catch(e){ $q.notify({type:'negative',message:e.response?.data?.message||'No se pudo cambiar el acceso.'}) }
  })
}

onMounted(load)
</script>

<template>
  <q-page class="viti-page systems-page">
    <PageHeader eyebrow="Sistemas" title="Sistemas de clientes" subtitle="Aquí aparece únicamente lo que realmente estás desarrollando, probando o entregando.">
      <q-btn class="viti-btn viti-btn--ghost" outline no-caps icon="account_tree" label="Proyectos" to="/proyectos" />
      <q-btn class="viti-btn viti-btn--primary" unelevated no-caps icon="add" label="Registrar sistema" @click="open()" />
    </PageHeader>

    <div class="flow-line q-mb-lg">
      <span>Proyecto</span><q-icon name="east"/><span>Beta</span><q-icon name="east"/><span>Producción</span><q-icon name="east"/><span>Entrega</span>
    </div>

    <q-inner-loading :showing="loading" />

    <section v-if="!loading && !activeApps.length" class="systems-empty">
      <div class="empty-symbol"><q-icon name="deployed_code" /></div>
      <div class="section-label">Sin sistemas todavía</div>
      <h2>Empieza cuando exista un desarrollo real.</h2>
      <p>Registra aquí la web, panel o APK de un proyecto cuando ya tengas algo que probar o entregar. VITI no agrega ejemplos automáticamente.</p>
      <div class="empty-actions">
        <q-btn class="viti-btn viti-btn--primary" unelevated no-caps icon="add" label="Registrar primer sistema" :disable="!companies.length" @click="open()" />
        <q-btn class="viti-btn viti-btn--ghost" outline no-caps icon="business" :label="companies.length ? 'Ver empresas' : 'Primero necesitas una empresa aprobada'" to="/empresas" />
      </div>
    </section>

    <section v-else-if="activeApps.length" class="systems-grid">
      <article v-for="app in activeApps" :key="app.id" class="system-card">
        <div class="system-head">
          <span class="system-icon"><q-icon :name="app.tipo==='movil'||app.tipo==='hibrido'?'smartphone':app.tipo==='api'?'api':'language'" /></span>
          <div class="system-title"><small>{{ app.empresa?.nombre_comercial || 'Sin empresa' }}</small><h3>{{ app.nombre }}</h3></div>
          <q-btn flat round dense icon="more_horiz" class="more-btn">
            <q-menu auto-close class="viti-menu"><q-list style="min-width:190px">
              <q-item clickable @click="open(app)"><q-item-section avatar><q-icon name="edit"/></q-item-section><q-item-section>Editar datos</q-item-section></q-item>
              <q-item clickable @click="openCycle(app)"><q-item-section avatar><q-icon name="tune"/></q-item-section><q-item-section>Cambiar estado</q-item-section></q-item>
              <q-item clickable @click="toggleDelivery(app)"><q-item-section avatar><q-icon :name="app.acceso_cliente?'lock':'key'"/></q-item-section><q-item-section>{{app.acceso_cliente?'Revocar acceso':'Entregar al cliente'}}</q-item-section></q-item>
              <q-separator/><q-item clickable class="text-negative" @click="remove(app)"><q-item-section avatar><q-icon name="archive"/></q-item-section><q-item-section>Retirar</q-item-section></q-item>
            </q-list></q-menu>
          </q-btn>
        </div>

        <div class="system-badges">
          <q-badge outline :color="environmentColor(app.entorno)">{{ environmentLabel(app.entorno) }}</q-badge>
          <q-badge outline :color="operationalColor(app.estado)">{{ operationalLabel(app.estado) }}</q-badge>
          <q-badge outline :color="app.acceso_cliente?'positive':'grey'">{{ deliveryLabel(app) }}</q-badge>
        </div>

        <div class="system-summary">
          <div><q-icon name="account_tree"/><span><small>Proyecto</small><b>{{ app.proyecto?.nombre || 'Sin vincular' }}</b></span></div>
          <div><q-icon name="science"/><span><small>Prueba</small><b>{{ configOf(app).delivery.beta_url ? 'Beta disponible' : 'Aún no publicada' }}</b></span></div>
          <div><q-icon name="language"/><span><small>Web</small><b>{{ app.url ? 'Disponible' : 'Aún no publicada' }}</b></span></div>
          <div><q-icon name="android"/><span><small>APK</small><b>{{ configOf(app).delivery.apk_url ? (configOf(app).delivery.apk_version || 'Disponible') : 'No publicada' }}</b></span></div>
        </div>

        <div class="system-actions">
          <q-btn class="card-action" flat no-caps icon="tune" label="Estado" @click="openCycle(app)" />
          <q-space/>
          <q-btn class="card-action card-action--accent" flat no-caps icon-right="north_east" :label="app.url_administracion||app.url?'Abrir':'Completar'" @click="openSystem(app)" />
        </div>
      </article>
    </section>

    <q-dialog v-model="cycleDialog">
      <q-card class="viti-dialog cycle-card">
        <q-card-section class="dialog-head"><div><div class="section-label">Estado del sistema</div><div class="text-h5 text-weight-bold">{{cycleCurrent?.nombre}}</div><div class="text-caption text-grey-6">Indica si está en desarrollo, pruebas o producción y si actualmente está disponible.</div></div><q-btn flat round dense icon="close" v-close-popup/></q-card-section>
        <q-separator/>
        <q-card-section>
          <div class="row q-col-gutter-md"><div class="col-12 col-sm-6"><q-select v-model="cycle.entorno" outlined emit-value map-options :options="environmentOptions" label="Etapa de desarrollo"/></div><div class="col-12 col-sm-6"><q-select v-model="cycle.estado" outlined emit-value map-options :options="operationalOptions" label="Disponibilidad"/></div></div>
        </q-card-section>
        <q-card-actions align="right"><q-btn class="viti-btn viti-btn--ghost" flat no-caps label="Cancelar" v-close-popup/><q-btn class="viti-btn viti-btn--primary" unelevated no-caps icon="save" label="Guardar" :loading="savingCycle" @click="saveCycle"/></q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="dialog">
      <q-card class="viti-dialog app-dialog">
        <q-card-section class="dialog-head"><div><div class="section-label">{{editing?'Editar sistema':'Nuevo sistema'}}</div><div class="text-h5 text-weight-bold">Sistema y entrega</div><div class="text-caption text-grey-6">Primero registra lo necesario. La información técnica avanzada es opcional.</div></div><q-btn flat round dense icon="close" v-close-popup/></q-card-section>
        <q-separator/>
        <q-card-section>
          <div class="form-section-title">Datos principales</div>
          <div class="row q-col-gutter-md">
            <div class="col-12 col-sm-6"><q-select v-model="form.empresa_id" outlined emit-value map-options :options="companies.map(x=>({label:x.nombre_comercial,value:x.id}))" label="Empresa *" :disable="!!editing"/></div>
            <div class="col-12 col-sm-6"><q-select v-model="form.proyecto_id" outlined emit-value map-options clearable :options="projects.filter(x=>!form.empresa_id||Number(x.empresa_id)===Number(form.empresa_id)).map(x=>({label:`${x.codigo} · ${x.nombre}`,value:x.id}))" label="Proyecto" :disable="!!editing"/></div>
            <div class="col-12 col-sm-8"><q-input v-model="form.nombre" outlined label="Nombre del sistema *"/></div>
            <div class="col-6 col-sm-2"><q-input v-model="form.version" outlined label="Versión"/></div>
            <div class="col-6 col-sm-2"><q-select v-model="form.tipo" outlined :options="['web','movil','escritorio','hibrido','api','otro']" label="Tipo"/></div>
          </div>

          <div class="form-section-title q-mt-lg">Prueba y entrega</div>
          <div class="row q-col-gutter-md">
            <div class="col-12"><q-input v-model="form.beta_url" outlined label="Enlace de prueba / beta" hint="Se muestra al cliente cuando quieras que pruebe el sistema."/></div>
            <div class="col-12 col-sm-6"><q-input v-model="form.url" outlined label="Web / sistema final"/></div>
            <div class="col-12 col-sm-6"><q-input v-model="form.url_administracion" outlined label="Panel administrativo"/></div>
            <div class="col-12 col-sm-8"><q-input v-model="form.apk_url" outlined label="Enlace de APK"/></div>
            <div class="col-12 col-sm-4"><q-input v-model="form.apk_version" outlined label="Versión APK"/></div>
          </div>

          <q-expansion-item class="advanced-box q-mt-lg" dense-toggle icon="settings" label="Configuración avanzada" caption="Repositorio, hosting, tecnologías, módulos y controles de licencia">
            <div class="advanced-content row q-col-gutter-md">
              <div class="col-12"><q-input v-model="form.tecnologias" outlined label="Tecnologías"/></div>
              <div class="col-12 col-sm-8"><q-input v-model="form.repositorio_url" outlined label="Repositorio"/></div>
              <div class="col-12 col-sm-4"><q-input v-model="form.proveedor_hosting" outlined label="Hosting"/></div>
              <div class="col-12"><q-select v-model="form.modulos" outlined multiple use-chips :options="moduleOptions" label="Módulos habilitados" hint="Úsalo solo si este sistema consulta permisos desde VITI."/></div>
              <div class="col-12 col-sm-6"><q-toggle v-model="form.payment_required" color="orange" label="Controlar acceso por pago"/></div>
              <div class="col-12 col-sm-6"><q-toggle v-model="form.module_control" color="orange" label="Controlar módulos"/></div>
              <div class="col-12"><q-input v-model="form.notas" outlined type="textarea" autogrow label="Notas internas"/></div>
            </div>
          </q-expansion-item>
        </q-card-section>
        <q-card-actions align="right"><q-btn class="viti-btn viti-btn--ghost" flat no-caps label="Cancelar" v-close-popup/><q-btn class="viti-btn viti-btn--primary" unelevated no-caps :label="editing?'Guardar cambios':'Registrar sistema'" :disable="!form.empresa_id||!form.nombre" @click="save"/></q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<style scoped>
.systems-page{padding-top:34px}.flow-line{display:flex;align-items:center;justify-content:center;gap:10px;padding:13px 18px;border:1px solid rgba(102,132,163,.18);background:rgba(8,25,45,.48);border-radius:16px;color:#9eb2c5;font-size:11px}.flow-line span{font-weight:800;color:#d8e3ed}.flow-line .q-icon{color:#f28b30}.systems-empty{min-height:430px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;border:1px dashed rgba(115,147,178,.25);border-radius:24px;background:rgba(8,25,45,.42);padding:38px}.systems-empty h2{font-size:28px;margin:8px 0}.systems-empty p{max-width:650px;color:var(--viti-muted);line-height:1.65}.empty-symbol{width:66px;height:66px;border-radius:20px;background:rgba(242,139,48,.10);color:#ff9d43;display:grid;place-items:center;font-size:31px;margin-bottom:17px}.empty-actions{display:flex;gap:9px;flex-wrap:wrap;justify-content:center;margin-top:12px}.systems-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}.system-card{border:1px solid rgba(102,132,163,.20);background:linear-gradient(180deg,rgba(12,34,57,.9),rgba(9,28,48,.9));border-radius:20px;overflow:hidden;transition:.2s ease}.system-card:hover{transform:translateY(-2px);border-color:rgba(242,139,48,.28);box-shadow:0 18px 40px rgba(0,0,0,.15)}.system-head{padding:20px;display:flex;align-items:center;gap:12px}.system-icon{width:46px;height:46px;border-radius:14px;background:rgba(20,87,184,.18);color:#79b1ff;display:grid;place-items:center;font-size:23px}.system-title{min-width:0}.system-title small{color:#8fa6bb;font-size:10px;text-transform:uppercase;letter-spacing:.08em}.system-title h3{font-size:18px;margin:3px 0 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.more-btn{margin-left:auto;color:#9fb2c5}.system-badges{display:flex;gap:6px;flex-wrap:wrap;padding:0 20px 16px}.system-summary{display:grid;grid-template-columns:1fr 1fr;border-top:1px solid rgba(102,132,163,.15)}.system-summary>div{display:flex;align-items:center;gap:10px;padding:14px 16px;border-right:1px solid rgba(102,132,163,.12);border-bottom:1px solid rgba(102,132,163,.12);min-width:0}.system-summary>div:nth-child(even){border-right:0}.system-summary .q-icon{color:#f28b30}.system-summary span{display:grid;min-width:0}.system-summary small{font-size:9px;color:#7891a8;text-transform:uppercase;letter-spacing:.07em}.system-summary b{font-size:11px;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.system-actions{padding:8px 10px;display:flex;align-items:center}.card-action{color:#a9bdd0;border-radius:10px}.card-action:hover{background:rgba(255,255,255,.05)}.card-action--accent{color:#ff9d43}.viti-dialog{background:#0c2036;color:var(--viti-text);border:1px solid var(--viti-border);border-radius:22px}.app-dialog{width:780px;max-width:94vw}.cycle-card{width:650px;max-width:94vw}.dialog-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px}.form-section-title{font-size:10px;text-transform:uppercase;letter-spacing:.12em;color:#ff9d43;font-weight:900;margin-bottom:11px}.advanced-box{border:1px solid rgba(102,132,163,.18);border-radius:15px;background:rgba(6,21,37,.34);overflow:hidden}.advanced-content{padding:16px}.viti-btn{border-radius:12px;min-height:42px}.viti-btn--ghost{background:rgba(255,255,255,.025)!important;border-color:rgba(158,180,201,.28)!important}.viti-btn--primary{background:linear-gradient(135deg,#1457b8,#1a69cf)!important;box-shadow:0 10px 28px rgba(20,87,184,.18)!important}.viti-menu{background:#0d2035;color:#eaf1f8;border:1px solid #274460}
@media(max-width:1150px){.systems-grid{grid-template-columns:repeat(2,1fr)}}
@media(max-width:700px){.systems-page{padding-top:18px}.systems-grid{grid-template-columns:1fr}.system-summary{grid-template-columns:1fr}.system-summary>div{border-right:0}.flow-line{overflow:auto;justify-content:flex-start}.empty-actions .q-btn{width:100%}}
</style>
