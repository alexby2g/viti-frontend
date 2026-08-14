<script setup>
import { computed, inject, onMounted, reactive, ref } from 'vue'
import { useQuasar } from 'quasar'
import { useRoute } from 'vue-router'
import { api } from '../boot/axios'

const $q = useQuasar()
const route = useRoute()
const canManage = inject('electrofrioCanManage', computed(() => false))
const loading = ref(false)
const saving = ref(false)
const dialog = ref(false)
const payments = ref([])
const references = ref([])
const summary = ref({ cobrado:0, anticipos:0, abonos:0, saldos:0, anulados:0 })

const clientMode = computed(() => route.path.startsWith('/mi-apps/electrofrio'))
const base = computed(() => clientMode.value ? '/mi/apps/electrofrio' : '/apps/electrofrio')
const filters = reactive({ buscar:'', tipo:null, metodo:null, estado:null, desde:'', hasta:'' })
const form = reactive({ orden_id:null, tipo:'abono', monto:null, metodo:'efectivo', referencia:'', notas:'', idempotency_key:'' })

const typeOptions = [
  { label:'Anticipo', value:'anticipo', caption:'Primer pago de la orden' },
  { label:'Abono', value:'abono', caption:'Pago parcial durante el servicio' },
  { label:'Saldo', value:'saldo', caption:'Cancela exactamente lo pendiente' },
]
const methodOptions = [
  { label:'Efectivo', value:'efectivo' },
  { label:'QR', value:'qr' },
  { label:'Transferencia', value:'transferencia' },
  { label:'Tarjeta', value:'tarjeta' },
  { label:'Otro', value:'otro' },
]
const stateOptions = [{label:'Pagados',value:'pagado'},{label:'Anulados',value:'anulado'}]
const selectedReference = computed(() => references.value.find(item => Number(item.id) === Number(form.orden_id)) || null)
const pendingReferences = computed(() => references.value.filter(item => Number(item.saldo) > 0.001))
const availableTypes = computed(() => {
  const reference = selectedReference.value
  if (!reference) return typeOptions
  return typeOptions.filter(option => option.value !== 'anticipo' || Number(reference.cantidad_pagos || 0) === 0)
})

const columns = [
  { name:'fecha', label:'Fecha', field:'pagado_at', align:'left', sortable:true },
  { name:'orden', label:'Orden / cliente', field:'orden_codigo', align:'left', sortable:true },
  { name:'tipo', label:'Tipo', field:'tipo', align:'center', sortable:true },
  { name:'metodo', label:'Método', field:'metodo', align:'left', sortable:true },
  { name:'monto', label:'Monto', field:'monto', align:'right', sortable:true },
  { name:'estado', label:'Estado', field:'estado', align:'center', sortable:true },
  { name:'acciones', label:'', field:'id', align:'right' },
]

function money(value){ return `${Number(value || 0).toFixed(2)} Bs` }
function pretty(value){ return String(value || '').replaceAll('_',' ').replace(/\b\w/g, char => char.toUpperCase()) }
function dateTime(value){ return value ? new Date(value).toLocaleString('es-BO',{dateStyle:'short',timeStyle:'short'}) : '—' }
function paymentKey(){ return globalThis.crypto?.randomUUID?.() || `viti-${Date.now()}-${Math.random().toString(36).slice(2,14)}` }
function orderLabel(item){ return `${item.codigo} · ${item.cliente_nombre} · saldo ${money(item.saldo)}` }

async function loadPayments(){
  loading.value = true
  try{
    const params = Object.fromEntries(Object.entries(filters).filter(([,value]) => value !== null && value !== ''))
    const response = await api.get(`${base.value}/pagos-operativos`, { params })
    payments.value = response.data.data || []
    summary.value = response.data.meta?.resumen || summary.value
  }catch(error){ notifyError(error,'No se pudieron cargar los pagos de Electrofrío.') }
  finally{ loading.value = false }
}

async function loadReferences(){
  try{
    const response = await api.get(`${base.value}/pagos-operativos/referencias`)
    references.value = response.data.data || []
  }catch(error){ notifyError(error,'No se pudieron cargar las órdenes disponibles para cobro.') }
}

async function reload(){ await Promise.all([loadPayments(), loadReferences()]) }

function clearFilters(){
  Object.assign(filters,{buscar:'',tipo:null,metodo:null,estado:null,desde:'',hasta:''})
  loadPayments()
}

function openPayment(){
  Object.assign(form,{orden_id:null,tipo:'abono',monto:null,metodo:'efectivo',referencia:'',notas:'',idempotency_key:paymentKey()})
  dialog.value = true
}

function onOrderChange(){
  const reference = selectedReference.value
  if (!reference) return
  if (Number(reference.cantidad_pagos || 0) === 0) form.tipo = 'anticipo'
  else if (form.tipo === 'anticipo') form.tipo = 'abono'
  if (form.tipo === 'saldo') form.monto = Number(reference.saldo || 0)
  else form.monto = null
}

function onTypeChange(){
  if (form.tipo === 'saldo' && selectedReference.value) form.monto = Number(selectedReference.value.saldo || 0)
}

async function savePayment(){
  if (!form.orden_id || !form.tipo || !form.metodo || Number(form.monto) <= 0) {
    $q.notify({type:'warning',message:'Selecciona la orden, tipo, método y un monto válido.'})
    return
  }
  saving.value = true
  try{
    const response = await api.post(`${base.value}/ordenes/${form.orden_id}/pagos-operativos`, {
      monto:Number(form.monto), tipo:form.tipo, metodo:form.metodo,
      referencia:form.referencia.trim() || null, notas:form.notas.trim() || null,
      idempotency_key:form.idempotency_key,
    })
    dialog.value = false
    $q.notify({type:'positive',message:response.data.message || 'Pago registrado.'})
    await reload()
  }catch(error){ notifyError(error,'No se pudo registrar el pago.') }
  finally{ saving.value = false }
}

function annulPayment(payment){
  if (!canManage.value || payment.estado === 'anulado') return
  $q.dialog({
    title:'Anular pago',
    message:`El pago de ${money(payment.monto)} quedará en el historial como anulado. Indica el motivo.`,
    prompt:{model:'',type:'textarea',isValid:value=>String(value||'').trim().length>=3},
    cancel:true,persistent:true,
  }).onOk(async motivo => {
    try{
      await api.post(`${base.value}/pagos-operativos/${payment.id}/anular`,{motivo})
      $q.notify({type:'positive',message:'Pago anulado sin borrar su trazabilidad.'})
      await reload()
    }catch(error){ notifyError(error,'No se pudo anular el pago.') }
  })
}

function notifyError(error,fallback){
  const errors = error.response?.data?.errors
  const first = errors ? Object.values(errors).flat()[0] : null
  $q.notify({type:'negative',message:first || error.response?.data?.message || fallback})
}

onMounted(reload)
</script>

<template>
  <q-page padding class="payments-page">
    <div class="row items-start justify-between q-col-gutter-md q-mb-lg">
      <div class="col-12 col-md">
        <div class="text-overline text-primary text-weight-bold">Control</div>
        <h1 class="text-h4 text-weight-bold q-my-xs">Pagos</h1>
        <div class="text-body2 text-grey-7">Anticipos, abonos y saldos con control contra cobros duplicados y sobrepagos.</div>
      </div>
      <div class="col-12 col-md-auto row q-gutter-sm">
        <q-btn outline color="primary" icon="refresh" label="Actualizar" no-caps :loading="loading" @click="reload"/>
        <q-btn color="primary" icon="add_card" label="Registrar pago" no-caps :disable="!pendingReferences.length" @click="openPayment"/>
      </div>
    </div>

    <div class="row q-col-gutter-sm q-mb-lg">
      <div v-for="card in [
        {label:'Cobrado',value:summary.cobrado,icon:'account_balance_wallet',color:'primary',money:true},
        {label:'Anticipos',value:summary.anticipos,icon:'savings',color:'blue',money:true},
        {label:'Abonos',value:summary.abonos,icon:'payments',color:'teal',money:true},
        {label:'Saldos',value:summary.saldos,icon:'task_alt',color:'positive',money:true},
        {label:'Anulados',value:summary.anulados,icon:'cancel',color:'grey-7',money:false},
      ]" :key="card.label" class="col-6 col-md">
        <q-card flat bordered class="summary-card"><q-card-section class="row items-center no-wrap"><q-avatar :color="card.color" text-color="white" :icon="card.icon"/><div class="q-ml-md min-width-0"><div class="text-h6 text-weight-bold">{{card.money?money(card.value):card.value}}</div><div class="text-caption text-grey-7">{{card.label}}</div></div></q-card-section></q-card>
      </div>
    </div>

    <q-card flat bordered class="filter-card q-mb-lg"><q-card-section><div class="row q-col-gutter-md">
      <div class="col-12 col-md-4"><q-input v-model="filters.buscar" outlined dense clearable debounce="250" label="Buscar orden, cliente o referencia" @keyup.enter="loadPayments"><template #prepend><q-icon name="search"/></template></q-input></div>
      <div class="col-6 col-md-2"><q-select v-model="filters.tipo" outlined dense clearable emit-value map-options :options="typeOptions" label="Tipo"/></div>
      <div class="col-6 col-md-2"><q-select v-model="filters.metodo" outlined dense clearable emit-value map-options :options="methodOptions" label="Método"/></div>
      <div class="col-6 col-md-2"><q-select v-model="filters.estado" outlined dense clearable emit-value map-options :options="stateOptions" label="Estado"/></div>
      <div class="col-6 col-md-2 row justify-end"><q-btn color="primary" icon="filter_alt" label="Aplicar" no-caps @click="loadPayments"/></div>
      <div class="col-6 col-md-2"><q-input v-model="filters.desde" type="date" stack-label outlined dense label="Desde"/></div>
      <div class="col-6 col-md-2"><q-input v-model="filters.hasta" type="date" stack-label outlined dense label="Hasta"/></div>
      <div class="col-12 col-md-8 row justify-end"><q-btn flat color="grey-7" icon="filter_alt_off" label="Limpiar filtros" no-caps @click="clearFilters"/></div>
    </div></q-card-section></q-card>

    <q-card flat bordered>
      <q-table flat :rows="payments" :columns="columns" row-key="id" :loading="loading" :grid="$q.screen.lt.md" :pagination="{rowsPerPage:20}" no-data-label="Todavía no hay pagos con estos filtros.">
        <template #body-cell-fecha="props"><q-td :props="props">{{dateTime(props.row.pagado_at)}}</q-td></template>
        <template #body-cell-orden="props"><q-td :props="props"><div class="text-weight-bold text-primary">{{props.row.orden_codigo}}</div><div class="text-caption text-grey-7">{{props.row.cliente_nombre}}</div></q-td></template>
        <template #body-cell-tipo="props"><q-td :props="props"><q-badge outline color="primary" :label="pretty(props.row.tipo||'abono')"/></q-td></template>
        <template #body-cell-metodo="props"><q-td :props="props"><div>{{pretty(props.row.metodo)}}</div><div v-if="props.row.referencia" class="text-caption text-grey-7">{{props.row.referencia}}</div></q-td></template>
        <template #body-cell-monto="props"><q-td :props="props" class="text-weight-bold">{{money(props.row.monto)}}</q-td></template>
        <template #body-cell-estado="props"><q-td :props="props"><q-badge :color="props.row.estado==='pagado'?'positive':'grey-7'" :label="pretty(props.row.estado)"/><div v-if="props.row.motivo_anulacion" class="text-caption text-grey-7 q-mt-xs">{{props.row.motivo_anulacion}}</div></q-td></template>
        <template #body-cell-acciones="props"><q-td :props="props"><q-btn v-if="canManage&&props.row.estado==='pagado'" flat round color="negative" icon="cancel" @click="annulPayment(props.row)"><q-tooltip>Anular pago</q-tooltip></q-btn></q-td></template>
        <template #item="props"><div class="q-pa-xs col-12 col-sm-6"><q-card flat bordered class="payment-card"><q-card-section><div class="row items-start no-wrap"><div class="col"><div class="text-weight-bold text-primary">{{props.row.orden_codigo}}</div><div class="text-subtitle1 text-weight-bold">{{props.row.cliente_nombre}}</div></div><q-badge :color="props.row.estado==='pagado'?'positive':'grey-7'" :label="pretty(props.row.estado)"/></div><q-separator class="q-my-md"/><div class="row q-col-gutter-sm"><div class="col-6"><span class="text-caption text-grey-7">Tipo</span><div>{{pretty(props.row.tipo||'abono')}}</div></div><div class="col-6"><span class="text-caption text-grey-7">Método</span><div>{{pretty(props.row.metodo)}}</div></div><div class="col-6"><span class="text-caption text-grey-7">Fecha</span><div>{{dateTime(props.row.pagado_at)}}</div></div><div class="col-6 text-right"><span class="text-caption text-grey-7">Monto</span><div class="text-h6 text-weight-bold">{{money(props.row.monto)}}</div></div></div></q-card-section><q-card-actions v-if="canManage&&props.row.estado==='pagado'" align="right"><q-btn flat color="negative" icon="cancel" label="Anular" no-caps @click="annulPayment(props.row)"/></q-card-actions></q-card></div></template>
      </q-table>
    </q-card>

    <q-dialog v-model="dialog" persistent>
      <q-card class="payment-dialog">
        <q-card-section class="row items-start"><div><div class="text-overline text-primary">Cobro</div><div class="text-h5 text-weight-bold">Registrar pago</div></div><q-space/><q-btn flat round icon="close" v-close-popup/></q-card-section>
        <q-separator/>
        <q-card-section class="q-gutter-md">
          <q-select v-model="form.orden_id" outlined emit-value map-options :options="pendingReferences.map(item=>({label:orderLabel(item),value:item.id}))" label="Orden con saldo pendiente *" @update:model-value="onOrderChange"/>
          <q-banner v-if="selectedReference" rounded class="balance-banner"><div class="row q-col-gutter-md"><div class="col-4"><div class="text-caption">Total</div><div class="text-weight-bold">{{money(selectedReference.total)}}</div></div><div class="col-4"><div class="text-caption">Pagado</div><div class="text-weight-bold text-positive">{{money(selectedReference.pagado)}}</div></div><div class="col-4"><div class="text-caption">Saldo</div><div class="text-weight-bold text-orange">{{money(selectedReference.saldo)}}</div></div></div></q-banner>
          <div class="row q-col-gutter-md"><div class="col-12 col-sm-6"><q-select v-model="form.tipo" outlined emit-value map-options :options="availableTypes" label="Tipo de pago *" @update:model-value="onTypeChange"/></div><div class="col-12 col-sm-6"><q-input v-model.number="form.monto" type="number" min="0.01" step="0.5" outlined label="Monto (Bs) *" :readonly="form.tipo==='saldo'"/></div></div>
          <q-select v-model="form.metodo" outlined emit-value map-options :options="methodOptions" label="Método de pago *"/>
          <q-input v-model="form.referencia" outlined maxlength="120" label="Referencia / número de comprobante"/>
          <q-input v-model="form.notas" outlined type="textarea" autogrow maxlength="2000" label="Notas"/>
          <q-banner rounded class="safety-banner"><template #avatar><q-icon name="verified_user" color="primary"/></template>VITI verifica el saldo en el servidor y usa una clave única para que un doble toque no registre dos veces el mismo cobro.</q-banner>
        </q-card-section>
        <q-separator/>
        <q-card-actions align="right" class="q-pa-md"><q-btn flat label="Cancelar" no-caps v-close-popup/><q-btn color="primary" icon="payments" label="Registrar pago" no-caps :loading="saving" @click="savePayment"/></q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<style scoped>
.payments-page{max-width:1500px;margin:0 auto}.payments-page h1{color:var(--viti-text)}.min-width-0{min-width:0}.summary-card,.filter-card,.payment-card{border-radius:18px}.payment-card{height:100%}.payment-dialog{width:680px;max-width:96vw}.balance-banner{background:color-mix(in srgb,var(--electro-primary) 8%,var(--viti-card));border:1px solid var(--viti-border)}.safety-banner{background:color-mix(in srgb,var(--electro-primary) 5%,var(--viti-card));color:var(--viti-text)}
@media(max-width:600px){.payments-page{padding:12px}.payments-page h1{font-size:25px;line-height:1.2}}
</style>
