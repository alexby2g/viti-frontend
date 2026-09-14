<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useQuasar } from 'quasar'
import { api } from '../boot/axios'
import PageHeader from '../components/PageHeader.vue'

const $q = useQuasar()
const loading = ref(true)
const data = ref({ resumen:{}, atencion:[], planes:[] })
const businesses = ref([])
const planDialog = ref(false)
const editingPlan = ref(null)
const plan = reactive({ codigo:'', nombre:'', descripcion:'', precio_proyecto:null, precio_mensual:null, precio_anual:null, dias_prueba:14, modulos:[], max_usuarios:null, max_aplicaciones:null, activo:true })
const assignment = reactive({ empresa_id:null, plan_viti_id:null })

const moduleOptions = [
  {label:'Inicio',value:'inicio'},{label:'Agenda',value:'agenda'},{label:'Órdenes',value:'ordenes'},{label:'Clientes',value:'clientes'},
  {label:'Equipos',value:'equipos'},{label:'Técnicos',value:'tecnicos'},{label:'Inventario',value:'inventario'},
  {label:'Pagos',value:'pagos'},{label:'Garantías',value:'garantias'},{label:'Historial y reportes',value:'historial'},{label:'Mensajes',value:'buzon'},
]
const businessOptions = computed(() => businesses.value.map(x=>({label:x.nombre_comercial,value:x.id})))
const planOptions = computed(() => data.value.planes.filter(x=>x.activo).map(x=>({label:x.nombre,value:x.id})))
const metrics = computed(() => [
  { label:'Empresas activas', value:data.value.resumen.negocios_activos||0, icon:'business' },
  { label:'Sistemas activos', value:data.value.resumen.aplicaciones_activas||0, icon:'grid_view' },
  { label:'Suscripciones activas', value:data.value.resumen.suscripciones_activas||0, icon:'autorenew' },
  { label:'Solicitudes activas', value:data.value.resumen.solicitudes_activas||0, icon:'fact_check' },
])

function money(v){ return v===null||v===undefined||v===''?'A cotizar':`${Number(v).toFixed(0)} Bs` }
function annualSaving(p){ return p?.precio_mensual&&p?.precio_anual ? Math.max(0,Number(p.precio_mensual)*12-Number(p.precio_anual)) : 0 }

async function load(){
  loading.value=true
  try {
    const [overview,b] = await Promise.all([api.get('/saas/resumen'),api.get('/empresas?per_page=100')])
    const raw = overview.data.data || {}
    data.value = { resumen:raw.resumen||{}, atencion:raw.atencion||[], planes:raw.planes||[] }
    businesses.value = b.data.data || []
  } catch(e){ $q.notify({type:'negative',message:e.response?.data?.message||'No se pudo cargar planes y cobros.'}) }
  finally { loading.value=false }
}
function newPlan(){
  editingPlan.value=null
  Object.assign(plan,{codigo:'',nombre:'',descripcion:'',precio_proyecto:null,precio_mensual:null,precio_anual:null,dias_prueba:14,modulos:[],max_usuarios:null,max_aplicaciones:null,activo:true})
  planDialog.value=true
}
function editPlan(row){
  editingPlan.value=row
  Object.assign(plan,{codigo:row.codigo,nombre:row.nombre,descripcion:row.descripcion||'',precio_proyecto:row.precio_proyecto,precio_mensual:row.precio_mensual,precio_anual:row.precio_anual,dias_prueba:row.dias_prueba??14,modulos:Array.isArray(row.modulos)?row.modulos:[],max_usuarios:row.max_usuarios,max_aplicaciones:row.max_aplicaciones,activo:row.activo})
  planDialog.value=true
}
async function savePlan(){
  try {
    if(editingPlan.value) await api.put(`/saas/planes/${editingPlan.value.id}`,plan)
    else await api.post('/saas/planes',plan)
    planDialog.value=false
    await load()
    $q.notify({type:'positive',message:'Plan guardado.'})
  } catch(e){ $q.notify({type:'negative',message:e.response?.data?.message||Object.values(e.response?.data?.errors||{}).flat()[0]||'No se pudo guardar el plan.'}) }
}
async function assignPlan(){
  try {
    await api.put(`/saas/negocios/${assignment.empresa_id}/plan`,{plan_viti_id:assignment.plan_viti_id})
    $q.notify({type:'positive',message:'Plan asignado a la empresa.'})
    assignment.empresa_id=null; assignment.plan_viti_id=null
    await load()
  } catch(e){ $q.notify({type:'negative',message:e.response?.data?.message||'No se pudo asignar el plan.'}) }
}

onMounted(load)
</script>

<template>
  <q-page class="viti-page saas-page">
    <PageHeader eyebrow="Comercial" title="Planes y precios" subtitle="Administra cuánto cuesta la implementación y el servicio que continúa después de la entrega.">
      <q-btn class="viti-btn viti-btn--ghost" outline no-caps icon="language" label="Ver planes públicos" to="/viti/planes" />
      <q-btn class="viti-btn viti-btn--primary" unelevated no-caps icon="add" label="Nuevo plan" @click="newPlan" />
    </PageHeader>
    <q-inner-loading :showing="loading" />

    <section v-if="!loading" class="mini-metrics">
      <div v-for="metric in metrics" :key="metric.label" class="mini-metric">
        <span><q-icon :name="metric.icon" /></span>
        <div><b>{{ metric.value }}</b><small>{{ metric.label }}</small></div>
      </div>
    </section>

    <section v-if="!loading" class="saas-layout q-mt-lg">
      <article class="plans-panel">
        <div class="panel-head">
          <div><div class="section-label">Catálogo comercial</div><h2>Planes disponibles</h2><p>La implementación y el servicio recurrente se muestran por separado.</p></div>
          <span class="count-pill">{{ data.planes.length }} plan{{data.planes.length===1?'':'es'}}</span>
        </div>

        <div v-if="data.planes.length" class="plan-list">
          <button v-for="p in data.planes" :key="p.id" type="button" class="plan-row" @click="editPlan(p)">
            <span class="plan-mark"><q-icon name="workspace_premium" /></span>
            <span class="plan-copy">
              <span class="plan-title"><b>{{ p.nombre }}</b><q-badge v-if="!p.activo" outline color="grey" label="Inactivo"/></span>
              <small>{{ p.descripcion || 'Sin descripción comercial' }}</small>
              <span class="plan-tags">
                <em>{{ money(p.precio_proyecto) }} implementación</em>
                <em>{{ p.precio_mensual ? `${money(p.precio_mensual)}/mes` : 'Sin mensualidad' }}</em>
                <em>{{ p.max_usuarios || '∞' }} usuarios</em>
                <em>{{ p.max_aplicaciones || '∞' }} sistemas</em>
              </span>
            </span>
            <span class="plan-price"><b>{{ p.precio_mensual ? money(p.precio_mensual) : '—' }}</b><small v-if="p.precio_mensual">/ mes</small><q-icon name="edit"/></span>
          </button>
        </div>
        <div v-else class="panel-empty"><q-icon name="sell"/><b>No hay planes configurados</b><span>Crea el primero para usarlo en nuevas solicitudes.</span></div>
      </article>

      <aside class="assignment-panel">
        <div class="section-label">Asignación</div>
        <h2>Plan de empresa</h2>
        <p>Asigna el plan acordado únicamente cuando la empresa ya fue aprobada.</p>
        <div v-if="businesses.length" class="assignment-form">
          <q-select v-model="assignment.empresa_id" outlined emit-value map-options :options="businessOptions" label="Empresa" />
          <q-select v-model="assignment.plan_viti_id" outlined emit-value map-options :options="planOptions" label="Plan" />
          <q-btn class="viti-btn viti-btn--primary full-width" unelevated no-caps icon="link" label="Asignar plan" :disable="!assignment.empresa_id||!assignment.plan_viti_id" @click="assignPlan" />
        </div>
        <div v-else class="assignment-empty"><q-icon name="business"/><span>Aún no hay empresas. Cuando registres una, aparecerá aquí.</span><q-btn flat no-caps color="primary" label="Ir a empresas" to="/empresas" /></div>
      </aside>
    </section>

    <section v-if="!loading && data.atencion.length" class="attention-panel q-mt-lg">
      <div class="panel-head compact"><div><div class="section-label">Atención</div><h2>Requieren revisión</h2></div></div>
      <div class="attention-list">
        <div v-for="row in data.atencion" :key="row.app.id" class="attention-row"><q-icon name="warning_amber"/><div><b>{{row.app.nombre}}</b><small>{{row.app.empresa?.nombre_comercial}} · {{row.ciclo.mensaje}}</small></div><q-space/><q-badge outline color="orange">{{row.ciclo.estado}}</q-badge></div>
      </div>
    </section>

    <q-dialog v-model="planDialog">
      <q-card class="viti-dialog plan-dialog">
        <q-card-section class="dialog-head"><div><div class="section-label">{{editingPlan?'Editar plan':'Nuevo plan'}}</div><div class="text-h5 text-weight-bold">Configuración comercial</div><div class="text-caption text-grey-6">Precios y alcance comercial. Los controles internos pueden quedar en avanzado.</div></div><q-btn flat round dense icon="close" v-close-popup/></q-card-section>
        <q-separator/>
        <q-card-section>
          <div class="row q-col-gutter-md">
            <div class="col-12 col-sm-7"><q-input v-model="plan.nombre" outlined label="Nombre del plan *"/></div>
            <div class="col-12 col-sm-5"><q-input v-model="plan.codigo" outlined label="Código interno *"/></div>
            <div class="col-12"><q-input v-model="plan.descripcion" outlined type="textarea" autogrow label="Descripción comercial"/></div>
            <div class="col-12 col-sm-4"><q-input v-model.number="plan.precio_proyecto" outlined type="number" min="0" clearable label="Implementación (Bs)"/></div>
            <div class="col-12 col-sm-4"><q-input v-model.number="plan.precio_mensual" outlined type="number" min="0" clearable label="Mensual (Bs)"/></div>
            <div class="col-12 col-sm-4"><q-input v-model.number="plan.precio_anual" outlined type="number" min="0" clearable label="Anual (Bs)"/></div>
            <div class="col-12 col-sm-4"><q-input v-model.number="plan.dias_prueba" outlined type="number" min="0" max="60" label="Días de prueba"/></div>
<div class="col-12"><q-expansion-item class="advanced-plan" dense-toggle icon="settings" label="Configuración interna" caption="Límites y módulos para licencias"><div class="q-pa-md row q-col-gutter-md"><div class="col-6"><q-input v-model.number="plan.max_usuarios" outlined type="number" clearable label="Máx. usuarios"/></div><div class="col-6"><q-input v-model.number="plan.max_aplicaciones" outlined type="number" clearable label="Máx. sistemas"/></div><div class="col-12"><q-select v-model="plan.modulos" outlined multiple use-chips emit-value map-options :options="moduleOptions" label="Módulos internos" hint="Vacío = alcance personalizado."/></div></div></q-expansion-item></div>
            <div class="col-12 row items-center justify-between"><q-toggle v-model="plan.activo" label="Plan activo"/><span v-if="annualSaving(plan)>0" class="saving-note">Ahorro anual: {{money(annualSaving(plan))}}</span></div>
          </div>
        </q-card-section>
        <q-card-actions align="right"><q-btn class="viti-btn viti-btn--ghost" flat no-caps label="Cancelar" v-close-popup/><q-btn class="viti-btn viti-btn--primary" unelevated no-caps icon="save" label="Guardar plan" :disable="!plan.nombre||!plan.codigo" @click="savePlan"/></q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<style scoped>
.saas-page{padding-top:34px}.mini-metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}.mini-metric{display:flex;align-items:center;gap:12px;padding:15px 17px;border:1px solid var(--viti-border);background:rgba(13,36,61,.6);border-radius:16px}.mini-metric>span{width:38px;height:38px;border-radius:11px;background:rgba(242,139,48,.1);color:#ff9a3c;display:grid;place-items:center;font-size:20px}.mini-metric div{display:grid}.mini-metric b{font-size:21px;line-height:1}.mini-metric small{color:var(--viti-muted);font-size:10px;margin-top:4px}.saas-layout{display:grid;grid-template-columns:minmax(0,1fr) 330px;gap:16px}.plans-panel,.assignment-panel,.attention-panel{border:1px solid var(--viti-border);background:rgba(8,25,45,.62);border-radius:22px;overflow:hidden}.panel-head{padding:22px 24px;display:flex;justify-content:space-between;gap:18px;align-items:center;border-bottom:1px solid rgba(102,132,163,.15)}.panel-head.compact{border-bottom:0}.panel-head h2,.assignment-panel h2{margin:4px 0 3px;font-size:21px}.panel-head p,.assignment-panel p{margin:0;color:var(--viti-muted);font-size:12px}.count-pill{padding:6px 10px;border:1px solid rgba(242,139,48,.28);border-radius:999px;color:#ffad62;font-size:10px}.plan-list{display:grid}.plan-row{font:inherit;color:inherit;text-align:left;border:0;border-bottom:1px solid rgba(102,132,163,.13);background:transparent;padding:18px 22px;display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:14px;align-items:center;cursor:pointer;transition:.18s ease}.plan-row:last-child{border-bottom:0}.plan-row:hover{background:rgba(20,87,184,.08)}.plan-mark{width:42px;height:42px;border-radius:12px;background:rgba(20,87,184,.16);color:#79b1ff;display:grid;place-items:center;font-size:22px}.plan-copy{display:grid;gap:5px;min-width:0}.plan-title{display:flex;align-items:center;gap:8px}.plan-copy>small{color:var(--viti-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.plan-tags{display:flex;gap:6px;flex-wrap:wrap}.plan-tags em{font-style:normal;font-size:9px;padding:4px 7px;border-radius:999px;background:rgba(255,255,255,.035);color:#9fb3c6;border:1px solid rgba(102,132,163,.12)}.plan-price{display:grid;grid-template-columns:auto auto;align-items:end;gap:3px;text-align:right;min-width:112px}.plan-price b{font-size:16px}.plan-price small{font-size:9px;color:var(--viti-muted)}.plan-price .q-icon{grid-column:1/-1;justify-self:end;color:#708aa4;margin-top:6px}.assignment-panel{padding:24px;height:max-content;position:sticky;top:88px}.assignment-form{display:grid;gap:12px;margin-top:22px}.assignment-empty{min-height:230px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;color:var(--viti-muted);gap:10px}.assignment-empty>.q-icon{font-size:34px}.attention-list{display:grid}.attention-row{display:flex;align-items:center;gap:12px;padding:14px 22px;border-top:1px solid rgba(102,132,163,.12)}.attention-row>.q-icon{color:#f28b30}.attention-row div{display:grid}.attention-row small{color:var(--viti-muted);font-size:11px}.panel-empty{min-height:260px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;color:var(--viti-muted);gap:6px}.panel-empty .q-icon{font-size:38px}.panel-empty b{color:var(--viti-text)}.viti-dialog{background:#0c2036;color:var(--viti-text);border:1px solid var(--viti-border);border-radius:22px}.plan-dialog{width:780px;max-width:94vw}.dialog-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px}.saving-note{color:#7fd49a;font-size:12px}.advanced-plan{border:1px solid rgba(102,132,163,.18);border-radius:14px;background:rgba(6,21,37,.32);overflow:hidden}.viti-btn{border-radius:12px;min-height:42px}.viti-btn--ghost{background:rgba(255,255,255,.025)!important;border-color:rgba(158,180,201,.28)!important}.viti-btn--primary{background:linear-gradient(135deg,#1457b8,#1a69cf)!important;box-shadow:0 10px 28px rgba(20,87,184,.18)!important}
@media(max-width:1050px){.mini-metrics{grid-template-columns:repeat(2,1fr)}.saas-layout{grid-template-columns:1fr}.assignment-panel{position:static}}
@media(max-width:600px){.saas-page{padding-top:18px}.mini-metrics{grid-template-columns:1fr 1fr}.plan-row{grid-template-columns:auto minmax(0,1fr)}.plan-price{display:none}.panel-head{padding:18px}.assignment-panel{padding:18px}}
</style>
