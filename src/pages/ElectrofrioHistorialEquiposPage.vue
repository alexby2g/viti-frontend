<script setup>
import { computed, inject, onMounted, ref } from 'vue'
import { useQuasar } from 'quasar'
import { useRoute } from 'vue-router'
import { api } from '../boot/axios'

const $q = useQuasar()
const route = useRoute()
const modules = inject('electrofrioModules', computed(() => []))
const loading = ref(false)
const detailLoading = ref(false)
const rows = ref([])
const summary = ref({ equipos:0, con_historial:0, servicios_cerrados:0, evidencias:0, pagado_total:null, garantias_vigentes:null })
const search = ref('')
const onlyWithHistory = ref(true)
const detailDialog = ref(false)
const selected = ref(null)

const clientMode = computed(() => route.path.startsWith('/mi-apps/electrofrio'))
const base = computed(() => clientMode.value ? '/mi/apps/electrofrio' : '/apps/electrofrio')
const hasModule = name => modules.value.includes(name)
const canPayments = computed(() => hasModule('pagos'))
const canWarranties = computed(() => hasModule('garantias'))
const canInventory = computed(() => hasModule('inventario'))
const canOrders = computed(() => hasModule('ordenes'))

const columns = [
  { name:'equipo', label:'Equipo', field:'tipo', align:'left', sortable:true },
  { name:'cliente', label:'Cliente', field:'cliente_nombre', align:'left', sortable:true },
  { name:'actividad', label:'Actividad', field:'ordenes_total', align:'center', sortable:true },
  { name:'ficha', label:'Ficha técnica', field:'id', align:'left' },
  { name:'garantia', label:'Garantía', field:'garantia_fin', align:'center' },
  { name:'ultima', label:'Última actividad', field:'ultima_at', align:'left', sortable:true },
  { name:'acciones', label:'', field:'id', align:'right' },
]

function equipmentLabel(row){ return [row?.tipo,row?.marca,row?.modelo].filter(Boolean).join(' · ') || 'Equipo sin identificar' }
function money(value){ return `${Number(value || 0).toFixed(2)} Bs` }
function date(value){ return value ? new Date(value).toLocaleDateString('es-BO') : '—' }
function dateTime(value){ return value ? new Date(value).toLocaleString('es-BO',{dateStyle:'short',timeStyle:'short'}) : 'Sin actividad' }
function pretty(value){ return String(value || '').replaceAll('_',' ').replace(/\b\w/g,char=>char.toUpperCase()) }
function stageColor(stage){ return ({cita:'blue',diagnostico:'purple',propuesta:'orange',servicio:'teal',cerrada:'grey-7'}[stage]||'grey') }
function warrantyLabel(row){
  if (!canWarranties.value || !row?.garantia_fin) return '—'
  return row.garantia_vigente ? `Vigente · ${date(row.garantia_fin)}` : `Vencida · ${date(row.garantia_fin)}`
}
function evidenceLabel(item){ return ({antes:'Antes',durante:'Durante',despues:'Después',documento:'Documento',comprobante:'Comprobante'}[item?.categoria] || pretty(item?.categoria)) }
function formatBytes(value){
  const bytes=Number(value||0)
  if(bytes<1024)return `${bytes} B`
  if(bytes<1024*1024)return `${(bytes/1024).toFixed(1)} KB`
  return `${(bytes/1024/1024).toFixed(1)} MB`
}
function saveBlob(blob,filename){
  const url=URL.createObjectURL(blob)
  const anchor=document.createElement('a')
  anchor.href=url;anchor.download=filename;document.body.appendChild(anchor);anchor.click();anchor.remove();URL.revokeObjectURL(url)
}

async function load(){
  loading.value=true
  try{
    const response=await api.get(`${base.value}/historial-equipos`,{params:{buscar:search.value.trim()||undefined,solo_con_historial:onlyWithHistory.value?1:0}})
    rows.value=response.data.data||[]
    summary.value=response.data.meta?.resumen||summary.value
  }catch(error){ notifyError(error,'No se pudo cargar el historial técnico de Electrofrío.') }
  finally{ loading.value=false }
}

async function openDetail(row){
  detailDialog.value=true
  detailLoading.value=true
  selected.value={equipo:row,ordenes:[],resumen:{}}
  try{
    const response=await api.get(`${base.value}/historial-equipos/${row.id}`)
    selected.value=response.data.data
  }catch(error){
    detailDialog.value=false
    notifyError(error,'No se pudo abrir el historial del equipo.')
  }finally{ detailLoading.value=false }
}

async function downloadPdf(order){
  if(!canOrders.value)return
  try{
    const response=await api.get(`${base.value}/ordenes/${order.id}/pdf`,{responseType:'blob'})
    saveBlob(response.data,`${order.codigo}-electrofrio.pdf`)
  }catch(error){ notifyError(error,'No se pudo descargar el PDF de la orden.') }
}

async function downloadEvidence(item){
  if(!canOrders.value)return
  try{
    const response=await api.get(`${base.value}/evidencias/${item.id}/descargar`,{responseType:'blob'})
    saveBlob(response.data,item.nombre_original||`evidencia-${item.id}`)
  }catch(error){ notifyError(error,'No se pudo descargar la evidencia.') }
}

function notifyError(error,fallback){
  const errors=error.response?.data?.errors
  const first=errors?Object.values(errors).flat()[0]:null
  $q.notify({type:'negative',message:first||error.response?.data?.message||fallback})
}

onMounted(load)
</script>

<template>
  <q-page padding class="history-page">
    <div class="row items-start justify-between q-col-gutter-md q-mb-lg">
      <div class="col-12 col-md">
        <div class="text-overline text-primary text-weight-bold">Seguimiento técnico</div>
        <h1 class="text-h4 text-weight-bold q-my-xs">Historial por equipo</h1>
        <div class="text-body2 text-grey-7">Cada equipo conserva sus visitas, diagnósticos, trabajos, ficha técnica y documentación como una línea de vida.</div>
      </div>
      <div class="col-12 col-md-auto"><q-btn outline color="primary" icon="refresh" label="Actualizar" no-caps :loading="loading" @click="load"/></div>
    </div>

    <div class="row q-col-gutter-sm q-mb-lg">
      <div v-for="card in [
        {label:'Equipos mostrados',value:summary.equipos,icon:'ac_unit',color:'primary'},
        {label:'Con historial',value:summary.con_historial,icon:'history',color:'blue'},
        {label:'Servicios cerrados',value:summary.servicios_cerrados,icon:'task_alt',color:'teal'},
        {label:'Evidencias',value:summary.evidencias,icon:'photo_library',color:'purple'},
      ]" :key="card.label" class="col-6 col-md-3">
        <q-card flat bordered class="summary-card"><q-card-section class="row items-center no-wrap"><q-avatar :color="card.color" text-color="white" :icon="card.icon"/><div class="q-ml-md min-width-0"><div class="text-h5 text-weight-bold">{{card.value}}</div><div class="text-caption text-grey-7">{{card.label}}</div></div></q-card-section></q-card>
      </div>
      <div v-if="canPayments&&summary.pagado_total!==null" class="col-6 col-md-3"><q-card flat bordered class="summary-card"><q-card-section class="row items-center no-wrap"><q-avatar color="positive" text-color="white" icon="payments"/><div class="q-ml-md"><div class="text-h6 text-weight-bold">{{money(summary.pagado_total)}}</div><div class="text-caption text-grey-7">Pagado histórico</div></div></q-card-section></q-card></div>
      <div v-if="canWarranties&&summary.garantias_vigentes!==null" class="col-6 col-md-3"><q-card flat bordered class="summary-card"><q-card-section class="row items-center no-wrap"><q-avatar color="orange" text-color="white" icon="verified"/><div class="q-ml-md"><div class="text-h5 text-weight-bold">{{summary.garantias_vigentes}}</div><div class="text-caption text-grey-7">Garantías vigentes</div></div></q-card-section></q-card></div>
    </div>

    <q-card flat bordered class="filter-card q-mb-lg"><q-card-section><div class="row q-col-gutter-md items-center"><div class="col-12 col-md"><q-input v-model="search" outlined dense clearable debounce="250" label="Buscar cliente, marca, modelo, serie o capacidad" @keyup.enter="load"><template #prepend><q-icon name="search"/></template></q-input></div><div class="col-12 col-md-auto"><q-toggle v-model="onlyWithHistory" color="primary" label="Solo equipos con historial" @update:model-value="load"/></div><div class="col-12 col-md-auto"><q-btn color="primary" icon="search" label="Buscar" no-caps @click="load"/></div></div></q-card-section></q-card>

    <q-card flat bordered>
      <q-table flat :rows="rows" :columns="columns" row-key="id" :loading="loading" :grid="$q.screen.lt.md" :pagination="{rowsPerPage:20}" no-data-label="No hay equipos con ese criterio.">
        <template #body-cell-equipo="props"><q-td :props="props"><div class="text-weight-bold">{{equipmentLabel(props.row)}}</div><div class="text-caption text-grey-7">{{props.row.serie?`Serie ${props.row.serie}`:'Sin serie'}} · {{props.row.capacidad||'Capacidad sin registrar'}}</div></q-td></template>
        <template #body-cell-cliente="props"><q-td :props="props"><div>{{props.row.cliente_nombre}}</div><div class="text-caption text-grey-7">{{props.row.cliente_telefono||'Sin teléfono'}}</div></q-td></template>
        <template #body-cell-actividad="props"><q-td :props="props"><div>{{props.row.ordenes_total}} orden(es)</div><div class="text-caption text-grey-7">{{props.row.servicios_cerrados}} cerrada(s) · {{props.row.evidencias_total}} evidencia(s)</div></q-td></template>
        <template #body-cell-ficha="props"><q-td :props="props"><div v-if="props.row.ficha_tecnica"><strong>{{props.row.ficha_tecnica.gas_refrigerante||'Gas S/R'}}</strong> · {{props.row.ficha_tecnica.voltaje||'Voltaje S/R'}}<div class="text-caption text-grey-7">Succión {{props.row.ficha_tecnica.presion_succion_psi??'—'}} PSI · Descarga {{props.row.ficha_tecnica.presion_descarga_psi??'—'}} PSI</div></div><span v-else class="text-grey-7">Sin ficha técnica</span></q-td></template>
        <template #body-cell-garantia="props"><q-td :props="props"><q-badge v-if="canWarranties&&props.row.garantia_fin" :color="props.row.garantia_vigente?'positive':'grey-7'" :label="warrantyLabel(props.row)"/><span v-else>—</span></q-td></template>
        <template #body-cell-ultima="props"><q-td :props="props">{{dateTime(props.row.ultima_at)}}</q-td></template>
        <template #body-cell-acciones="props"><q-td :props="props"><q-btn flat round color="primary" icon="history" @click="openDetail(props.row)"><q-tooltip>Ver vida técnica</q-tooltip></q-btn></q-td></template>
        <template #item="props"><div class="q-pa-xs col-12 col-sm-6"><q-card flat bordered class="equipment-history-card" @click="openDetail(props.row)"><q-card-section><div class="row items-start no-wrap"><div class="col"><div class="text-subtitle1 text-weight-bold">{{equipmentLabel(props.row)}}</div><div class="text-caption text-grey-7">{{props.row.cliente_nombre}} · {{props.row.serie||'Sin serie'}}</div></div><q-badge color="primary" :label="`${props.row.ordenes_total} orden(es)`"/></div><q-separator class="q-my-md"/><div class="row q-col-gutter-sm text-body2"><div class="col-6"><span class="text-grey-7">Servicios:</span><br>{{props.row.servicios_cerrados}} cerrados</div><div class="col-6"><span class="text-grey-7">Evidencias:</span><br>{{props.row.evidencias_total}}</div><div class="col-6"><span class="text-grey-7">Ficha:</span><br>{{props.row.ficha_tecnica?.gas_refrigerante||'Sin ficha'}}</div><div class="col-6"><span class="text-grey-7">Última actividad:</span><br>{{dateTime(props.row.ultima_at)}}</div></div></q-card-section></q-card></div></template>
      </q-table>
    </q-card>

    <q-dialog v-model="detailDialog">
      <q-card class="history-detail-dialog">
        <q-card-section class="row items-start no-wrap"><div class="col"><div class="text-overline text-primary">Vida técnica del equipo</div><div class="text-h5 text-weight-bold">{{equipmentLabel(selected?.equipo)}}</div><div class="text-caption text-grey-7">{{selected?.equipo?.cliente_nombre}} · {{selected?.equipo?.cliente_telefono||'Sin teléfono'}}</div></div><q-btn flat round icon="close" v-close-popup/></q-card-section>
        <q-separator/>
        <q-inner-loading :showing="detailLoading" label="Cargando historial..."/>
        <template v-if="selected&&!detailLoading">
          <q-card-section class="equipment-sheet">
            <div class="row q-col-gutter-md"><div class="col-12 col-md-5"><div class="detail-label">Equipo</div><div>{{equipmentLabel(selected.equipo)}}</div><div class="text-caption text-grey-7">Serie {{selected.equipo.serie||'S/R'}} · {{selected.equipo.capacidad||'Capacidad S/R'}} · {{selected.equipo.ubicacion||'Ubicación S/R'}}</div></div><div class="col-12 col-md-7"><div class="detail-label">Ficha técnica</div><div v-if="selected.equipo.ficha_tecnica" class="row q-col-gutter-sm"><div class="col-6 col-sm-3"><strong>{{selected.equipo.ficha_tecnica.gas_refrigerante||'—'}}</strong><div class="text-caption">Gas</div></div><div class="col-6 col-sm-3"><strong>{{selected.equipo.ficha_tecnica.voltaje||'—'}}</strong><div class="text-caption">Voltaje</div></div><div class="col-6 col-sm-3"><strong>{{selected.equipo.ficha_tecnica.presion_succion_psi??'—'}} PSI</strong><div class="text-caption">Succión</div></div><div class="col-6 col-sm-3"><strong>{{selected.equipo.ficha_tecnica.presion_descarga_psi??'—'}} PSI</strong><div class="text-caption">Descarga</div></div></div><div v-else class="text-grey-7">Sin ficha técnica registrada.</div></div></div>
          </q-card-section>
          <q-separator/>
          <q-card-section>
            <div class="row q-col-gutter-sm q-mb-md"><div class="col-6 col-sm"><div class="metric"><strong>{{selected.resumen?.ordenes||0}}</strong><span>Órdenes</span></div></div><div class="col-6 col-sm"><div class="metric"><strong>{{selected.resumen?.servicios_cerrados||0}}</strong><span>Cerradas</span></div></div><div class="col-6 col-sm"><div class="metric"><strong>{{selected.resumen?.evidencias||0}}</strong><span>Evidencias</span></div></div><div v-if="canPayments&&selected.resumen?.pagado_total!==null" class="col-6 col-sm"><div class="metric"><strong>{{money(selected.resumen.pagado_total)}}</strong><span>Pagado</span></div></div></div>
            <div class="text-subtitle1 text-weight-bold q-mb-md">Línea de servicios</div>
            <q-timeline color="primary" layout="comfortable" class="service-timeline">
              <q-timeline-entry v-for="order in selected.ordenes" :key="order.id" :title="`${order.codigo} · ${order.tipo_servicio||'Servicio técnico'}`" :subtitle="`${date(order.fecha_cita)} · ${order.tecnico_nombre||'Sin técnico asignado'}`" :icon="order.etapa==='cerrada'?'task_alt':order.decision_cliente==='rechazado'?'block':'build'" :color="order.decision_cliente==='rechazado'?'negative':stageColor(order.etapa)">
                <q-card flat bordered class="timeline-card"><q-card-section class="q-gutter-sm"><div class="row items-center q-gutter-sm"><q-badge :color="stageColor(order.etapa)" :label="order.decision_cliente==='rechazado'?'No aceptado':pretty(order.etapa)"/><q-badge outline :label="pretty(order.prioridad)"/></div><div><div class="detail-label">Problema reportado</div>{{order.problema_reportado}}</div><div v-if="order.diagnostico"><div class="detail-label">Diagnóstico</div>{{order.diagnostico}}</div><div v-if="order.propuesta"><div class="detail-label">Propuesta</div>{{order.propuesta}}</div><div v-if="order.trabajo_realizado"><div class="detail-label">Trabajo realizado</div>{{order.trabajo_realizado}}</div><div v-if="order.recomendaciones"><div class="detail-label">Recomendaciones</div>{{order.recomendaciones}}</div><div v-if="canInventory&&order.materiales?.length"><div class="detail-label">Materiales</div><div class="tag-list"><span v-for="material in order.materiales" :key="material.id" class="history-tag">{{material.material_nombre}} · {{material.cantidad}} {{material.material_unidad}}</span></div></div><div v-if="canPayments&&order.pagos?.length"><div class="detail-label">Pagos</div><div class="tag-list"><span v-for="payment in order.pagos" :key="payment.id" class="history-tag" :class="{'history-tag--cancelled':payment.estado==='anulado'}">{{pretty(payment.tipo||'abono')}} · {{money(payment.monto)}} · {{pretty(payment.estado)}}</span></div><div class="text-caption q-mt-xs">Pagado {{money(order.pagado)}} · Saldo {{money(order.saldo)}}</div></div><div v-if="canWarranties&&order.garantia_fin" class="warranty-box"><q-icon name="verified" color="positive"/> Garantía {{date(order.garantia_inicio)}} → {{date(order.garantia_fin)}}<div v-if="order.condiciones_garantia" class="text-caption">{{order.condiciones_garantia}}</div></div><div v-if="order.evidencias?.length"><div class="detail-label">Evidencias</div><q-list dense bordered separator class="rounded-borders"><q-item v-for="item in order.evidencias" :key="item.id"><q-item-section avatar><q-icon :name="item.mime==='application/pdf'?'picture_as_pdf':'image'"/></q-item-section><q-item-section><q-item-label>{{item.nombre_original}}</q-item-label><q-item-label caption>{{evidenceLabel(item)}} · {{formatBytes(item.tamano)}}</q-item-label></q-item-section><q-item-section v-if="canOrders" side><q-btn flat round dense icon="download" color="primary" @click="downloadEvidence(item)"/></q-item-section></q-item></q-list></div></q-card-section><q-card-actions v-if="canOrders" align="right"><q-btn flat color="negative" icon="picture_as_pdf" label="PDF de la orden" no-caps @click="downloadPdf(order)"/></q-card-actions></q-card>
              </q-timeline-entry>
            </q-timeline>
            <q-banner v-if="!selected.ordenes?.length" rounded class="empty-history"><template #avatar><q-icon name="history" color="grey-6"/></template>Este equipo todavía no tiene órdenes registradas.</q-banner>
          </q-card-section>
        </template>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<style scoped>
.history-page{max-width:1580px;margin:0 auto}.history-page h1{color:var(--viti-text)}.summary-card,.filter-card,.equipment-history-card{border-radius:18px}.equipment-history-card{height:100%;cursor:pointer}.history-detail-dialog{width:980px;max-width:97vw;max-height:94vh;overflow:auto;position:relative}.equipment-sheet{background:color-mix(in srgb,var(--electro-primary) 6%,var(--viti-card))}.detail-label{font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:var(--viti-muted);font-weight:800;margin-bottom:3px}.metric{border:1px solid var(--viti-border);border-radius:14px;padding:10px;text-align:center}.metric strong{display:block;font-size:18px}.metric span{font-size:11px;color:var(--viti-muted)}.timeline-card{border-radius:16px}.tag-list{display:flex;flex-wrap:wrap;gap:6px}.history-tag{border:1px solid var(--viti-border);border-radius:999px;padding:4px 8px;font-size:12px}.history-tag--cancelled{text-decoration:line-through;opacity:.65}.warranty-box{border:1px solid color-mix(in srgb,#21ba45 35%,transparent);background:color-mix(in srgb,#21ba45 8%,var(--viti-card));border-radius:12px;padding:9px}.empty-history{background:color-mix(in srgb,var(--viti-muted) 7%,var(--viti-card));color:var(--viti-muted)}.rounded-borders{border-radius:12px}.min-width-0{min-width:0}
@media(max-width:700px){.history-page{padding:12px}.history-page h1{font-size:25px;line-height:1.2}.history-detail-dialog{max-width:100vw}.service-timeline{padding-left:0}:deep(.q-timeline__entry){padding-left:28px}:deep(.q-timeline__title){font-size:16px}}
</style>
