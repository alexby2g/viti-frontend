<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useQuasar, copyToClipboard } from 'quasar'
import { api } from '../boot/axios'
import PageHeader from '../components/PageHeader.vue'

const $q = useQuasar()
const loading = ref(false)
const items = ref([])
const summary = ref({})
const filters = reactive({ buscar:'', estado:null })
const newDomain = reactive({})
const busy = reactive({})
const snippetDialog = ref(false)
const maintenanceDialog = ref(false)
const blockDialog = ref(false)
const current = ref(null)
const maintenance = reactive({ mensaje:'', hasta:'' })
const block = reactive({ motivo:'' })

const states = {
  activo:{ label:'Activo', color:'positive', icon:'check_circle' },
  gracia:{ label:'En gracia', color:'orange', icon:'schedule' },
  mantenimiento:{ label:'Mantenimiento', color:'blue', icon:'construction' },
  bloqueado_pago:{ label:'Bloqueado por pago', color:'negative', icon:'money_off' },
  bloqueado_manual:{ label:'Bloqueado por VITI', color:'deep-orange', icon:'block' },
  pausado:{ label:'Pausado', color:'warning', icon:'pause_circle' },
  no_entregado:{ label:'Sin entregar', color:'blue-grey', icon:'hourglass_empty' },
  retirado:{ label:'Retirado', color:'grey', icon:'archive' },
}
const stateOptions = [
  { label:'Todos los estados', value:null },
  { label:'Solo bloqueados', value:'bloqueados' },
  ...Object.entries(states).map(([value, s]) => ({ label:s.label, value })),
]
const typeLabels = { principal:'Principal', alias:'Alias', administracion:'Administración', api:'API' }
const metrics = computed(() => [
  { key:'total', label:'Sistemas', value:summary.value.total ?? 0, icon:'grid_view' },
  { key:'dominios', label:'Dominios activos', value:summary.value.dominios ?? 0, icon:'dns' },
  { key:'activo', label:'Con acceso', value:(summary.value.activo ?? 0) + (summary.value.gracia ?? 0), icon:'check_circle', filter:'activo' },
  { key:'bloqueado_pago', label:'Bloqueados por pago', value:summary.value.bloqueado_pago ?? 0, icon:'money_off', filter:'bloqueado_pago', danger:true },
  { key:'mantenimiento', label:'En mantenimiento', value:summary.value.mantenimiento ?? 0, icon:'construction', filter:'mantenimiento' },
])
const guardOrigin = typeof window !== 'undefined' ? window.location.origin : ''
const closingTag = '</' + 'script>'
const snippet = computed(() => `<script src="${guardOrigin}/viti-guard.js" defer>${closingTag}`)

function stateOf(row) { return states[row?.acceso?.estado] || { label:row?.acceso?.estado || 'Sin estado', color:'grey', icon:'help' } }
function date(value) {
  if (!value) return '—'
  const d = new Date(value.length === 10 ? `${value}T00:00:00` : value)
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString('es-BO', value.length === 10 ? { dateStyle:'medium' } : { dateStyle:'medium', timeStyle:'short' })
}
function subscriptionText(row) {
  const s = row?.acceso?.suscripcion
  if (!s) return 'Sin suscripción registrada'
  if (s.en_prueba) return `En prueba hasta ${date(s.prueba_hasta)}`
  const parts = [`${s.frecuencia === 'anual' ? 'Anual' : 'Mensual'} · ${Number(s.monto || 0).toFixed(0)} ${s.moneda || 'Bs'}`]
  if (s.fecha_vencimiento) parts.push(`vence ${date(s.fecha_vencimiento)}`)
  if (s.dias_gracia) parts.push(`${s.dias_gracia} días de gracia`)
  return parts.join(' · ')
}
function errorMessage(error, fallback) {
  const errors = error?.response?.data?.errors
  return (errors && Object.values(errors).flat()[0]) || error?.response?.data?.message || fallback
}
function replaceItem(updated) {
  if (!updated?.id) return load()
  const index = items.value.findIndex(item => item.id === updated.id)
  if (index >= 0) items.value.splice(index, 1, updated)
  refreshSummary()
}
async function refreshSummary() {
  try { const { data } = await api.get('/accesos'); summary.value = data?.resumen || {} } catch { /* el listado ya muestra el estado */ }
}
async function load() {
  loading.value = true
  try {
    const params = {}
    if (filters.buscar.trim()) params.buscar = filters.buscar.trim()
    if (filters.estado) params.estado = filters.estado
    const { data } = await api.get('/accesos', { params })
    items.value = data?.data || []
    summary.value = data?.resumen || {}
  } catch (error) {
    $q.notify({ type:'negative', message:errorMessage(error, 'No se pudo cargar el control de acceso.') })
  } finally { loading.value = false }
}
function filterBy(state) { if (!state) return; filters.estado = filters.estado === state ? null : state; load() }

async function run(key, request, successFallback) {
  busy[key] = true
  try {
    const { data } = await request()
    $q.notify({ type:'positive', message:data?.message || successFallback })
    return data
  } catch (error) {
    $q.notify({ type:'negative', message:errorMessage(error, 'No se pudo completar la acción.') })
    return null
  } finally { busy[key] = false }
}
async function addDomain(row) {
  const value = String(newDomain[row.id] || '').trim()
  if (!value) return $q.notify({ type:'warning', message:'Escribe el dominio o la URL del sistema.' })
  const data = await run(`domain-${row.id}`, () => api.post(`/aplicaciones/${row.id}/dominios`, { dominio:value }), 'Dominio registrado.')
  if (data) { newDomain[row.id] = ''; await load() }
}
async function toggleDomain(row, domain) {
  const data = await run(`d-${domain.id}`, () => api.put(`/aplicaciones/${row.id}/dominios/${domain.id}`, { activo:!domain.activo }), 'Dominio actualizado.')
  if (data) domain.activo = !domain.activo
}
function removeDomain(row, domain) {
  $q.dialog({ title:'Quitar dominio', message:`¿Quitar ${domain.dominio}? El sistema dejará de consultar su estado en VITI desde ese dominio.`, cancel:true, ok:{ label:'Quitar', color:'negative', unelevated:true } })
    .onOk(async () => {
      const data = await run(`d-${domain.id}`, () => api.delete(`/aplicaciones/${row.id}/dominios/${domain.id}`), 'Dominio eliminado.')
      if (data) { row.dominios = row.dominios.filter(item => item.id !== domain.id); refreshSummary() }
    })
}
async function togglePaymentControl(row, value) {
  const data = await run(`policy-${row.id}`, () => api.put(`/aplicaciones/${row.id}/politica-acceso`, { control_pago:value }), 'Política actualizada.')
  if (data) replaceItem(data.data)
}
function openMaintenance(row) {
  current.value = row
  maintenance.mensaje = row.acceso?.mantenimiento?.mensaje || 'Estamos actualizando el sistema para mejorar tu experiencia. Vuelve en unos minutos.'
  maintenance.hasta = ''
  maintenanceDialog.value = true
}
async function saveMaintenance() {
  const row = current.value
  const hasta = maintenance.hasta ? new Date(maintenance.hasta).toISOString() : null
  const data = await run(`mnt-${row.id}`, () => api.put(`/aplicaciones/${row.id}/mantenimiento`, { activo:true, mensaje:maintenance.mensaje || null, hasta }), 'Mantenimiento activado.')
  if (data) { maintenanceDialog.value = false; replaceItem(data.data) }
}
async function endMaintenance(row) {
  const data = await run(`mnt-${row.id}`, () => api.put(`/aplicaciones/${row.id}/mantenimiento`, { activo:false }), 'Mantenimiento finalizado.')
  if (data) replaceItem(data.data)
}
function openBlock(row) { current.value = row; block.motivo = ''; blockDialog.value = true }
async function saveBlock() {
  const row = current.value
  const data = await run(`blk-${row.id}`, () => api.put(`/aplicaciones/${row.id}/bloqueo`, { activo:true, motivo:block.motivo || null }), 'Acceso bloqueado.')
  if (data) { blockDialog.value = false; replaceItem(data.data) }
}
async function unblock(row) {
  const data = await run(`blk-${row.id}`, () => api.put(`/aplicaciones/${row.id}/bloqueo`, { activo:false }), 'Bloqueo retirado.')
  if (data) replaceItem(data.data)
}
async function copySnippet() {
  try { await copyToClipboard(snippet.value); $q.notify({ type:'positive', message:'Código copiado.' }) }
  catch { $q.notify({ type:'warning', message:'No se pudo copiar. Selecciona el texto y cópialo manualmente.' }) }
}

onMounted(load)
</script>

<template>
  <q-page class="viti-page access-page">
    <PageHeader eyebrow="Sistemas" title="Dominios y acceso" subtitle="Controla desde qué dominios funciona cada sistema entregado, bloquea por falta de pago según el plan y avisa cuando haya mantenimiento.">
      <q-btn class="viti-btn viti-btn--ghost" outline no-caps icon="grid_view" label="Sistemas" to="/aplicaciones" />
      <q-btn class="viti-btn viti-btn--primary" unelevated no-caps icon="code" label="Código de protección" @click="snippetDialog=true" />
    </PageHeader>

    <section class="access-metrics">
      <button v-for="m in metrics" :key="m.key" type="button" class="access-metric" :class="{active:m.filter && filters.estado===m.filter, danger:m.danger && m.value>0}" @click="filterBy(m.filter)">
        <q-icon :name="m.icon" /><div><strong>{{ m.value }}</strong><span>{{ m.label }}</span></div>
      </button>
    </section>

    <section class="access-rules">
      <div><q-icon name="money_off" /><span><b>Pago:</b> si la suscripción vence y terminan los días de gracia del plan, el sistema se bloquea solo. Se reactiva al confirmar el pago.</span></div>
      <div><q-icon name="construction" /><span><b>Mantenimiento:</b> muestra un aviso temporal mientras actualizas. Si pones hora de fin, se retira automáticamente.</span></div>
      <div><q-icon name="block" /><span><b>Bloqueo manual:</b> suspende el acceso de inmediato, con el motivo que elijas.</span></div>
    </section>

    <div class="access-filters">
      <q-input v-model="filters.buscar" dense outlined clearable debounce="400" placeholder="Buscar por sistema, empresa o dominio" class="grow" @update:model-value="load"><template #prepend><q-icon name="search"/></template></q-input>
      <q-select v-model="filters.estado" dense outlined emit-value map-options :options="stateOptions" class="state-select" @update:model-value="load" />
    </div>

    <q-inner-loading :showing="loading" />

    <section v-if="!loading && !items.length" class="access-empty">
      <q-icon name="dns" />
      <h2>{{ filters.buscar || filters.estado ? 'No hay sistemas con ese filtro.' : 'Todavía no hay sistemas registrados.' }}</h2>
      <p>Cuando registres un sistema con su URL en Sistemas, su dominio aparecerá aquí automáticamente.</p>
      <q-btn class="viti-btn viti-btn--ghost" outline no-caps icon="grid_view" label="Ir a Sistemas" to="/aplicaciones" />
    </section>

    <section v-else class="access-list">
      <article v-for="row in items" :key="row.id" class="access-card" :class="`state-${row.acceso?.estado}`">
        <header class="card-head">
          <div class="card-title"><small>{{ row.empresa?.nombre_comercial || 'Sin empresa' }}<template v-if="row.plan"> · {{ row.plan.nombre }}</template></small><h3>{{ row.nombre }}</h3></div>
          <q-chip dense square :color="stateOf(row).color" text-color="white" :icon="stateOf(row).icon" :label="stateOf(row).label" />
        </header>

        <div class="card-status" :class="{blocked:!row.acceso?.permitido}">
          <b>{{ row.acceso?.titulo }}</b>
          <span>{{ row.acceso?.mensaje }}</span>
          <span v-if="row.acceso?.hasta" class="until"><q-icon name="event"/> Hasta {{ date(row.acceso.hasta) }}</span>
          <span v-if="row.acceso?.aviso" class="notice"><q-icon name="info"/> {{ row.acceso.aviso }}</span>
        </div>

        <div class="card-sub"><q-icon name="event_repeat"/> {{ subscriptionText(row) }}</div>

        <div class="domains">
          <div class="domains-head"><b>Dominios</b><span>{{ row.dominios?.length || 0 }}</span></div>
          <div v-if="!row.dominios?.length" class="domains-empty">Sin dominios. Agrega el dominio donde está publicado el sistema.</div>
          <div v-for="d in row.dominios" :key="d.id" class="domain-row" :class="{off:!d.activo}">
            <q-icon name="language" />
            <div class="domain-main"><a :href="`https://${d.dominio}`" target="_blank" rel="noopener">{{ d.dominio }}</a><small>{{ typeLabels[d.tipo] || d.tipo }} · {{ d.ultima_consulta_at ? `última consulta ${date(d.ultima_consulta_at)}` : 'aún sin consultas' }}</small></div>
            <q-toggle :model-value="d.activo" dense color="positive" :disable="busy[`d-${d.id}`]" @update:model-value="toggleDomain(row,d)"><q-tooltip>{{ d.activo ? 'Desactivar dominio' : 'Activar dominio' }}</q-tooltip></q-toggle>
            <q-btn flat round dense icon="close" size="sm" :loading="busy[`d-${d.id}`]" @click="removeDomain(row,d)"><q-tooltip>Quitar</q-tooltip></q-btn>
          </div>
          <div class="domain-add">
            <q-input v-model="newDomain[row.id]" dense outlined placeholder="midominio.com o https://app.midominio.com" @keyup.enter="addDomain(row)" />
            <q-btn unelevated no-caps color="primary" icon="add" label="Agregar" :loading="busy[`domain-${row.id}`]" @click="addDomain(row)" />
          </div>
        </div>

        <div class="card-controls">
          <q-toggle :model-value="row.acceso?.control_pago" color="orange" :disable="busy[`policy-${row.id}`]" label="Bloquear automáticamente si no paga" @update:model-value="v=>togglePaymentControl(row,v)" />
          <div class="control-buttons">
            <q-btn v-if="row.acceso?.mantenimiento?.activo" outline no-caps color="blue" icon="task_alt" label="Finalizar mantenimiento" :loading="busy[`mnt-${row.id}`]" @click="endMaintenance(row)" />
            <q-btn v-else outline no-caps color="blue" icon="construction" label="Mantenimiento" @click="openMaintenance(row)" />
            <q-btn v-if="row.acceso?.bloqueo_manual?.activo" unelevated no-caps color="positive" icon="lock_open" label="Retirar bloqueo" :loading="busy[`blk-${row.id}`]" @click="unblock(row)" />
            <q-btn v-else outline no-caps color="negative" icon="block" label="Bloquear" @click="openBlock(row)" />
          </div>
        </div>
      </article>
    </section>

    <q-dialog v-model="maintenanceDialog">
      <q-card class="access-dialog">
        <q-card-section><div class="dialog-kicker">MANTENIMIENTO</div><h3>{{ current?.nombre }}</h3><p>Mientras esté activo, quienes entren al sistema verán este aviso en lugar de la aplicación.</p></q-card-section>
        <q-card-section class="q-gutter-md">
          <q-input v-model="maintenance.mensaje" outlined type="textarea" autogrow maxlength="500" label="Mensaje para los usuarios" />
          <q-input v-model="maintenance.hasta" outlined type="datetime-local" stack-label label="Finaliza automáticamente (opcional)" hint="Si lo dejas vacío, el aviso sigue hasta que lo finalices." />
        </q-card-section>
        <q-card-actions align="right"><q-btn flat no-caps label="Cancelar" v-close-popup /><q-btn unelevated no-caps color="primary" icon="construction" label="Activar mantenimiento" :loading="busy[`mnt-${current?.id}`]" @click="saveMaintenance" /></q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="blockDialog">
      <q-card class="access-dialog">
        <q-card-section><div class="dialog-kicker danger">BLOQUEO MANUAL</div><h3>{{ current?.nombre }}</h3><p>El sistema dejará de funcionar de inmediato en todos sus dominios hasta que retires el bloqueo. Los datos no se borran.</p></q-card-section>
        <q-card-section><q-input v-model="block.motivo" outlined type="textarea" autogrow maxlength="500" label="Motivo que verán los usuarios (opcional)" placeholder="Ej.: Acceso suspendido temporalmente. Comunícate con Atención VITI." /></q-card-section>
        <q-card-actions align="right"><q-btn flat no-caps label="Cancelar" v-close-popup /><q-btn unelevated no-caps color="negative" icon="block" label="Bloquear acceso" :loading="busy[`blk-${current?.id}`]" @click="saveBlock" /></q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="snippetDialog">
      <q-card class="access-dialog wide">
        <q-card-section><div class="dialog-kicker">CÓDIGO DE PROTECCIÓN</div><h3>Conecta un sistema entregado con VITI</h3><p>Pega esta línea en el <code>&lt;head&gt;</code> del sistema del cliente. Al abrirse, el sistema consulta a VITI con su dominio: si está bloqueado o en mantenimiento, muestra el aviso y no deja usarlo.</p></q-card-section>
        <q-card-section><pre class="snippet">{{ snippet }}</pre></q-card-section>
        <q-card-section class="snippet-help">
          <div><q-icon name="check"/> El dominio del sistema debe estar registrado en esta página.</div>
          <div><q-icon name="check"/> Los sistemas que usan la API de VITI también reciben el bloqueo desde el servidor.</div>
          <div><q-icon name="check"/> Si VITI no responde, el sistema sigue funcionando para no afectar al cliente.</div>
        </q-card-section>
        <q-card-actions align="right"><q-btn flat no-caps label="Cerrar" v-close-popup /><q-btn unelevated no-caps color="primary" icon="content_copy" label="Copiar código" @click="copySnippet" /></q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<style scoped>
.access-page{padding-top:34px}
.access-metrics{display:grid;grid-template-columns:repeat(5,1fr);gap:12px;margin-bottom:16px}
.access-metric{display:flex;align-items:center;gap:12px;padding:16px;border-radius:16px;border:1px solid rgba(102,132,163,.2);background:rgba(8,25,45,.55);color:#dfe8f1;text-align:left;cursor:pointer;transition:.15s ease}
.access-metric:hover{border-color:rgba(242,139,48,.4)}.access-metric.active{border-color:#f28b30;background:rgba(242,139,48,.08)}
.access-metric .q-icon{font-size:24px;color:#f28b30}.access-metric.danger .q-icon{color:#ff6b6b}
.access-metric strong{display:block;font-size:24px;line-height:1}.access-metric span{display:block;font-size:12px;color:#94a9bc;margin-top:4px}
.access-rules{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:18px}
.access-rules>div{display:flex;gap:10px;padding:12px 14px;border-radius:14px;background:rgba(8,25,45,.4);border:1px dashed rgba(102,132,163,.22);color:#a9bccd;font-size:12px;line-height:1.5}
.access-rules .q-icon{font-size:18px;color:#74adf6;margin-top:1px}.access-rules b{color:#e6eef6}
.access-filters{display:flex;gap:10px;margin-bottom:18px}.access-filters .grow{flex:1}.state-select{min-width:230px}
.access-empty{display:flex;flex-direction:column;align-items:center;text-align:center;padding:48px 20px;border:1px dashed rgba(115,147,178,.25);border-radius:22px;background:rgba(8,25,45,.42);color:#a9bccd}
.access-empty>.q-icon{font-size:42px;color:#f28b30}.access-empty h2{font-size:22px;margin:12px 0 6px;color:#eef4fa}
.access-list{display:grid;grid-template-columns:repeat(2,1fr);gap:16px}
.access-card{display:flex;flex-direction:column;gap:14px;padding:20px;border-radius:20px;border:1px solid rgba(102,132,163,.22);background:linear-gradient(180deg,rgba(12,31,52,.9),rgba(9,25,43,.9))}
.access-card.state-bloqueado_pago,.access-card.state-bloqueado_manual{border-color:rgba(255,107,107,.35)}.access-card.state-mantenimiento{border-color:rgba(116,173,246,.4)}
.card-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.card-title small{color:#8ea3b6;font-size:12px}.card-title h3{margin:3px 0 0;font-size:20px;line-height:1.2;color:#f3f7fb}
.card-status{display:flex;flex-direction:column;gap:4px;padding:12px 14px;border-radius:14px;background:rgba(85,213,143,.06);border:1px solid rgba(85,213,143,.2);font-size:13px;color:#b7d9c6}
.card-status b{color:#eaf6ef}.card-status.blocked{background:rgba(255,107,107,.06);border-color:rgba(255,107,107,.25);color:#e8b9b9}.card-status.blocked b{color:#ffe3e3}
.card-status .until,.card-status .notice{display:flex;gap:6px;align-items:center;font-size:12px;color:#ffc58f}
.card-sub{display:flex;gap:8px;align-items:center;font-size:12px;color:#97abbe}.card-sub .q-icon{color:#74adf6}
.domains{border-top:1px solid rgba(102,132,163,.15);padding-top:12px}.domains-head{display:flex;justify-content:space-between;color:#dfe8f1;margin-bottom:8px}.domains-head span{color:#8ea3b6;font-size:12px}
.domains-empty{font-size:12px;color:#8ea3b6;margin-bottom:8px}
.domain-row{display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:12px;background:rgba(7,25,42,.7);margin-bottom:6px}.domain-row.off{opacity:.55}
.domain-row>.q-icon{color:#74adf6}.domain-main{flex:1;min-width:0}.domain-main a{color:#e6eef6;text-decoration:none;font-weight:700;word-break:break-all}.domain-main a:hover{color:#ffad62}.domain-main small{display:block;color:#8195a8;font-size:11px}
.domain-add{display:flex;gap:8px;margin-top:8px}.domain-add .q-input{flex:1}
.card-controls{display:flex;flex-direction:column;gap:10px;border-top:1px solid rgba(102,132,163,.15);padding-top:12px;color:#dfe8f1}
.control-buttons{display:flex;gap:8px;flex-wrap:wrap}.control-buttons .q-btn{border-radius:12px}
.access-dialog{width:min(520px,94vw);border-radius:20px}.access-dialog.wide{width:min(680px,94vw)}
.access-dialog h3{margin:4px 0 6px;font-size:22px;line-height:1.2}.access-dialog p{margin:0;opacity:.8;line-height:1.55}
.dialog-kicker{font-size:11px;font-weight:900;letter-spacing:.14em;color:#f28b30}.dialog-kicker.danger{color:#ff6b6b}
.snippet{margin:0;padding:14px;border-radius:12px;background:#06111f;color:#9fe2bf;font-size:12px;white-space:pre-wrap;word-break:break-all}
.snippet-help{display:flex;flex-direction:column;gap:6px;font-size:13px;opacity:.85}.snippet-help .q-icon{color:#55d58f;margin-right:6px}
@media(max-width:1100px){.access-metrics{grid-template-columns:repeat(3,1fr)}.access-list{grid-template-columns:1fr}.access-rules{grid-template-columns:1fr}}
@media(max-width:640px){.access-page{padding-top:18px}.access-metrics{grid-template-columns:1fr 1fr}.access-filters{flex-direction:column}.state-select{min-width:0}.domain-add{flex-direction:column}}
</style>
