<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { api, initCsrf } from '../boot/axios'
import AppBrand from '../components/AppBrand.vue'

const route = useRoute()
const router = useRouter()
const $q = useQuasar()
const item = ref(null)
const loading = ref(true)
const saving = ref(false)
const sent = ref(false)
const step = ref(1)
const registrationDialog = ref(false)
const online = ref(typeof navigator === 'undefined' ? true : navigator.onLine)
const ready = ref(false)
const localDirty = ref(false)
const conflict = ref(false)
const remoteRevision = ref(null)
const pendingDraft = ref(null)
const answers = reactive({})
const otherAnswers = reactive({})
const registration = reactive({
  cliente_nombre:'', cliente_whatsapp:'', cliente_ciudad:'', cliente_direccion:'',
  empresa_nombre:'', empresa_actividad:'', empresa_telefono:'', empresa_whatsapp:'', empresa_ciudad:'', empresa_direccion:'',
  titulo_sistema:'', resumen:'',
})
const declaration = reactive({ aceptada:false, nombre:'', fecha:new Date().toISOString().slice(0,10) })
const commercial = reactive({
  plan_viti_id:null,
  forma_pago_preferida:null,
  frecuencia_suscripcion_preferida:null,
  acuerdo_comercial_aceptado:false,
  acuerdo_comercial_nombre:'',
  acuerdo_comercial_fecha:new Date().toISOString().slice(0,10),
})

const supportedFunctions = {
  initial:new Set(['Registro de clientes','Registro de trabajadores','Registro de servicios','Reservas o citas','Órdenes de trabajo','Historial de clientes','Agenda o calendario','Archivos y documentos','Fotografías','Otro']),
  professional:new Set(['Registro de clientes','Registro de trabajadores','Registro de servicios','Reservas o citas','Órdenes de trabajo','Control de pagos','Cuentas por cobrar','Garantías','Historial de clientes','Reportes','Agenda o calendario','Archivos y documentos','Fotografías','Otro']),
  enterprise:new Set(['Registro de clientes','Registro de trabajadores','Registro de productos','Registro de servicios','Inventario','Reservas o citas','Órdenes de trabajo','Control de pagos','Cuentas por cobrar','Garantías','Historial de clientes','Reportes','Agenda o calendario','Archivos y documentos','Fotografías','Otro']),
  custom:new Set(['Registro de clientes','Registro de trabajadores','Registro de productos','Registro de servicios','Inventario','Reservas o citas','Órdenes de trabajo','Control de pagos','Cuentas por cobrar','Garantías','Historial de clientes','Reportes','Agenda o calendario','Archivos y documentos','Fotografías','Otro']),
}
const allOperationNumbers = new Set([12,13,17,18,19,27,32,35,70])

const sections = computed(() => item.value?.cuestionario?.secciones || [])
const allQuestions = computed(() => sections.value.flatMap(section => section.preguntas || []))
const plans = computed(() => item.value?.planes_disponibles || [])
const draftKey = computed(() => `viti-form-short-${route.params.token}`)
const serverRevision = computed(() => Number(item.value?.draft_revision || 0))
const syncLabel = computed(() => {
  if (sent.value) return 'Enviado'
  if (conflict.value) return 'Revisar sincronización'
  if (saving.value) return 'Guardando…'
  if (!online.value) return 'Borrador local'
  if (localDirty.value) return 'Pendiente de sincronizar'
  return 'Sincronizado'
})
const syncColor = computed(() => sent.value ? 'positive' : conflict.value ? 'orange-9' : !online.value || localDirty.value ? 'warning' : 'positive')
const syncIcon = computed(() => sent.value ? 'check_circle' : conflict.value ? 'sync_problem' : !online.value ? 'cloud_off' : localDirty.value ? 'cloud_upload' : 'cloud_done')
const questionByNumber = number => allQuestions.value.find(q => Number(q.numero) === Number(number))
const hasValue = value => Array.isArray(value) ? value.length > 0 : String(value ?? '').trim().length > 0
const registrationValid = computed(() => {
  const whatsapp = String(registration.cliente_whatsapp || '').trim()
  return registration.cliente_nombre.trim().length >= 3
    && registration.empresa_nombre.trim().length >= 2
    && registration.titulo_sistema.trim().length >= 3
    && (!whatsapp || /^\d{7,15}$/.test(whatsapp))
})

function planKey(plan) {
  const code = String(plan?.codigo || '').toLowerCase()
  if (code.includes('personalizado')) return 'custom'
  if (code.includes('empresa')) return 'enterprise'
  if (code.includes('profesional')) return 'professional'
  return 'initial'
}
function operationNumbersForKey(key) {
  const numbers = [12,13,17,18,19]
  if (key === 'professional') numbers.push(32,35)
  if (key === 'enterprise') numbers.push(27,32,35)
  if (key === 'custom') numbers.push(70)
  return numbers
}
const selectedPlan = computed(() => plans.value.find(plan => Number(plan.id) === Number(commercial.plan_viti_id)) || item.value?.plan_viti || null)
const selectedKey = computed(() => planKey(selectedPlan.value))
const operationNumbers = computed(() => operationNumbersForKey(selectedKey.value))
const operationQuestions = computed(() => operationNumbers.value.map(questionByNumber).filter(Boolean))
const macroSteps = computed(() => [
  {label:'Registro',done:true,active:false},
  {label:'Plan',done:step.value>1||sent.value,active:step.value===1&&!sent.value},
  {label:'Configuración',done:step.value>2||sent.value,active:step.value===2&&!sent.value},
  {label:'Acuerdo',done:sent.value,active:step.value===3&&!sent.value},
  {label:'Revisión',done:false,active:sent.value},
])

const planBenefits = key => ({
  initial:['1 aplicación VITI','Hasta 3 usuarios','Agenda, órdenes, clientes, equipos e historial'],
  professional:['1 aplicación VITI','Hasta 6 usuarios','Pagos, saldos, comprobantes y garantías'],
  enterprise:['Hasta 3 aplicaciones','Hasta 15 usuarios','Inventario técnico y operación avanzada'],
  custom:['AGR Studio revisa el alcance contigo','Revisión corta y directa','Cotización antes de desarrollar'],
}[key] || [])

function annualSaving(plan) {
  return plan?.precio_mensual && plan?.precio_anual ? Math.max(0, Number(plan.precio_mensual) * 12 - Number(plan.precio_anual)) : 0
}
function money(value) {
  return value === null || value === undefined || value === '' ? 'A cotizar' : `${Number(value).toFixed(0)} Bs`
}
function errorMessage(e, fallback) {
  const bag = e?.response?.data?.errors
  if (bag) return Object.values(bag).flat()[0]
  return e?.response?.data?.message || fallback
}
function optionsFor(q) {
  if (Number(q.numero) !== 17) return q.opciones || []
  const allowed = supportedFunctions[selectedKey.value] || supportedFunctions.initial
  return (q.opciones || []).filter(option => allowed.has(option))
}
function suggestionsFor(q) {
  const number = Number(q.numero)
  if (number === 13) return ['1','2','3','5','10']
  if (number === 18) {
    const base = ['Organizar citas y órdenes de servicio','Registrar clientes y equipos','Llevar historial de trabajos realizados']
    if (['professional','enterprise'].includes(selectedKey.value)) base.push('Controlar pagos, saldos y garantías')
    if (selectedKey.value === 'enterprise') base.push('Controlar inventario técnico')
    if (selectedKey.value === 'custom') base.push('Necesito una función adicional a los planes estándar')
    return base
  }
  if (number === 19) return [
    'El cliente solicita atención → agendo la visita → realizo diagnóstico → el cliente confirma → realizo el servicio → registro el pago → cierro el trabajo.',
    'Recibo la solicitud → registro al cliente → creo una orden → asigno el trabajo → actualizo el estado → finalizo y guardo el historial.',
  ]
  if (number === 70) return ['Necesito más usuarios o aplicaciones que los planes estándar','Tengo un flujo especial que AGR Studio debe revisar','Quiero explicar un requerimiento adicional en la revisión']
  return []
}
function applySuggestion(q, value) {
  answers[q.id] = q.tipo === 'numero' ? Number(value) : value
}
function hasOther(q) { return optionsFor(q).includes('Otro') }
function selectedOther(q) {
  const value = answers[q.id]
  return Array.isArray(value) ? value.includes('Otro') : value === 'Otro'
}
function normalizedValue(id, value) {
  const custom = String(otherAnswers[id] || '').trim()
  if (Array.isArray(value)) return value.map(x => x === 'Otro' && custom ? `Otro: ${custom}` : x)
  return value === 'Otro' && custom ? `Otro: ${custom}` : value
}
function paymentOptions() {
  if (selectedKey.value === 'custom') return [{ value:'por_definir', label:'Definir con AGR Studio', description:'Se acuerda después de revisar el alcance y la cotización.' }]
  const options = []
  if (['professional','enterprise'].includes(selectedKey.value)) options.push({ value:'tres_partes', label:'40% al iniciar / 30% en avance / 30% al entregar', description:'Tres hitos claros para la implementación.' })
  else options.push({ value:'50_50', label:'50% al iniciar / 50% al entregar', description:'Inicio y entrega final.' })
  options.push({ value:'contado', label:'Pago completo de implementación', description:'La implementación se paga en un solo desembolso.' })
  options.push({ value:'por_definir', label:'Acordarlo con AGR Studio', description:'Se define durante la revisión de la solicitud.' })
  return options
}
function clearAnswersOutsidePlan(key) {
  const allowed = new Set(operationNumbersForKey(key))
  for (const q of allQuestions.value) {
    const number = Number(q.numero)
    if (!allOperationNumbers.has(number) || allowed.has(number)) continue
    answers[q.id] = q.tipo === 'seleccion_multiple' ? [] : ''
    otherAnswers[q.id] = ''
  }
}
function selectPlan(plan) {
  if (sent.value) return
  const key = planKey(plan)
  commercial.plan_viti_id = plan.id
  clearAnswersOutsidePlan(key)
  if (key === 'custom') {
    commercial.frecuencia_suscripcion_preferida = null
    commercial.forma_pago_preferida = 'por_definir'
  } else if (!commercial.frecuencia_suscripcion_preferida) {
    commercial.frecuencia_suscripcion_preferida = 'mensual'
  }
  const allowed = paymentOptions().map(option => option.value)
  if (!allowed.includes(commercial.forma_pago_preferida)) commercial.forma_pago_preferida = null
}

function draftSnapshot() {
  return {
    answers:{...answers},
    otherAnswers:{...otherAnswers},
    registration:{...registration},
    declaration:{...declaration},
    commercial:{...commercial},
    step:step.value,
    server_revision:serverRevision.value,
    dirty:localDirty.value,
    saved_at:new Date().toISOString(),
  }
}
function readDraft() {
  try { return JSON.parse(localStorage.getItem(draftKey.value) || 'null') } catch { return null }
}
function storeDraft(markDirty=false) {
  if (!ready.value || sent.value) return
  if (markDirty) localDirty.value = true
  try { localStorage.setItem(draftKey.value, JSON.stringify(draftSnapshot())) } catch {}
}
function applyDraft(draft) {
  Object.assign(answers, draft?.answers || {})
  Object.assign(otherAnswers, draft?.otherAnswers || {})
  Object.assign(registration, draft?.registration || {})
  Object.assign(declaration, draft?.declaration || {})
  Object.assign(commercial, draft?.commercial || {})
  if (Number(draft?.step) >= 1 && Number(draft?.step) <= 3) step.value = Number(draft.step)
  clearAnswersOutsidePlan(selectedKey.value)
}
function restoreDraft() {
  if (sent.value) return
  const draft = readDraft()
  if (!draft) return
  const revision = draft.server_revision === undefined ? serverRevision.value : Number(draft.server_revision)
  if (revision !== serverRevision.value && draft.dirty) {
    pendingDraft.value = draft
    remoteRevision.value = serverRevision.value
    conflict.value = true
    if (Number(draft.step) >= 1 && Number(draft.step) <= 3) step.value = Number(draft.step)
    return
  }
  applyDraft(draft)
  localDirty.value = Boolean(draft.dirty)
}
function clearDraft() {
  try { localStorage.removeItem(draftKey.value) } catch {}
  localDirty.value = false
  pendingDraft.value = null
}
function networkFailure(e) { return !online.value || !e?.response }
function isDraftConflict(e) { return Number(e?.response?.status) === 409 && e?.response?.data?.current_revision !== undefined }
function markConflict(e) {
  localDirty.value = true
  pendingDraft.value = draftSnapshot()
  remoteRevision.value = Number(e?.response?.data?.current_revision ?? serverRevision.value)
  conflict.value = true
  storeDraft(false)
}
function revisionFromResponse(response) {
  return Number(response?.data?.draft?.revision ?? response?.headers?.['x-viti-draft-revision'] ?? serverRevision.value)
}

function syncRegistrationFromServer() {
  Object.assign(registration, {
    cliente_nombre:item.value?.cliente?.nombre || '',
    cliente_whatsapp:item.value?.cliente?.whatsapp || '',
    cliente_ciudad:item.value?.cliente?.ciudad || '',
    cliente_direccion:item.value?.cliente?.direccion || '',
    empresa_nombre:item.value?.empresa?.nombre_comercial || '',
    empresa_actividad:item.value?.empresa?.actividad || '',
    empresa_telefono:item.value?.empresa?.telefono || '',
    empresa_whatsapp:item.value?.empresa?.whatsapp || '',
    empresa_ciudad:item.value?.empresa?.ciudad || '',
    empresa_direccion:item.value?.empresa?.direccion || '',
    titulo_sistema:item.value?.titulo || '',
    resumen:item.value?.resumen || '',
  })
}
function syncItemFromRegistration() {
  if (item.value?.cliente) Object.assign(item.value.cliente, {
    nombre:registration.cliente_nombre,
    whatsapp:registration.cliente_whatsapp,
    ciudad:registration.cliente_ciudad,
    direccion:registration.cliente_direccion,
  })
  if (item.value?.empresa) Object.assign(item.value.empresa, {
    nombre_comercial:registration.empresa_nombre,
    actividad:registration.empresa_actividad,
    telefono:registration.empresa_telefono,
    whatsapp:registration.empresa_whatsapp,
    ciudad:registration.empresa_ciudad,
    direccion:registration.empresa_direccion,
  })
  if (item.value) {
    item.value.titulo = registration.titulo_sistema
    item.value.resumen = registration.resumen
  }
}
function hydrateFromServer(data) {
  item.value = data
  syncRegistrationFromServer()
  for (const q of allQuestions.value) answers[q.id] = q.tipo === 'seleccion_multiple' ? [] : ''
  for (const key of Object.keys(otherAnswers)) delete otherAnswers[key]
  for (const response of item.value.respuestas || []) {
    const raw = response.respuesta_json ?? response.respuesta_texto ?? ''
    if (Array.isArray(raw)) {
      const custom = raw.find(value => typeof value === 'string' && value.startsWith('Otro: '))
      answers[response.pregunta_id] = custom ? [...raw.filter(value => value !== custom), 'Otro'] : raw
      otherAnswers[response.pregunta_id] = custom ? custom.slice(6) : ''
    } else if (typeof raw === 'string' && raw.startsWith('Otro: ')) {
      answers[response.pregunta_id] = 'Otro'
      otherAnswers[response.pregunta_id] = raw.slice(6)
    } else answers[response.pregunta_id] = raw
  }
  Object.assign(declaration, {
    aceptada:Boolean(item.value.declaracion_aceptada),
    nombre:item.value.declaracion_nombre || item.value.cliente?.nombre || '',
    fecha:item.value.declaracion_fecha || new Date().toISOString().slice(0,10),
  })
  Object.assign(commercial, {
    plan_viti_id:item.value.plan_viti_id || null,
    forma_pago_preferida:item.value.forma_pago_preferida || null,
    frecuencia_suscripcion_preferida:item.value.frecuencia_suscripcion_preferida || null,
    acuerdo_comercial_aceptado:Boolean(item.value.acuerdo_comercial_aceptado),
    acuerdo_comercial_nombre:item.value.acuerdo_comercial_nombre || item.value.cliente?.nombre || '',
    acuerdo_comercial_fecha:item.value.acuerdo_comercial_fecha || new Date().toISOString().slice(0,10),
  })
  sent.value = ['en_revision','aprobada','convertida','cerrada'].includes(item.value.estado)
}
function validStep(value) {
  const number = Number(value)
  return number >= 1 && number <= 3 ? number : null
}
async function replaceStepInUrl(value) {
  const target = String(value)
  if (String(route.query.paso || '') === target) return
  await router.replace({ query:{...route.query,paso:target} })
}
async function goToStep(value, push=true) {
  const target = validStep(value)
  if (!target || target === step.value) return
  step.value = target
  const location = { query:{...route.query,paso:String(target)} }
  if (push) await router.push(location)
  else await router.replace(location)
}

async function load({ restoreLocal=true }={}) {
  loading.value = true
  ready.value = false
  try {
    const data = (await api.get(`/publico/solicitudes/${route.params.token}`)).data.data
    hydrateFromServer(data)
    conflict.value = false
    remoteRevision.value = null
    localDirty.value = false
    if (restoreLocal) restoreDraft()
    const queryStep = validStep(route.query.paso)
    if (queryStep) step.value = queryStep
    if (sent.value) clearDraft()
  } catch (e) {
    $q.notify({ type:'negative', message:errorMessage(e, 'El enlace no está disponible.') })
  } finally {
    ready.value = true
    loading.value = false
    await replaceStepInUrl(step.value)
  }
}
function payload() {
  const visibleAnswers = operationQuestions.value
    .filter(q => hasValue(answers[q.id]))
    .map(q => ({ pregunta_id:Number(q.id), valor:normalizedValue(q.id, answers[q.id]) }))
  return {
    base_revision:serverRevision.value,
    respuestas:visibleAnswers,
    registro:{...registration},
    declaracion_aceptada:declaration.aceptada,
    declaracion_nombre:declaration.nombre,
    declaracion_fecha:declaration.fecha,
    plan_viti_id:commercial.plan_viti_id,
    forma_pago_preferida:commercial.forma_pago_preferida,
    frecuencia_suscripcion_preferida:commercial.frecuencia_suscripcion_preferida,
    acuerdo_comercial_aceptado:commercial.acuerdo_comercial_aceptado,
    acuerdo_comercial_nombre:commercial.acuerdo_comercial_nombre,
    acuerdo_comercial_fecha:commercial.acuerdo_comercial_fecha,
  }
}
async function save(quiet=false) {
  storeDraft(false)
  if (conflict.value) {
    if (!quiet) $q.notify({ type:'warning', message:'Primero resuelve la sincronización con el otro dispositivo.' })
    return false
  }
  if (!online.value) {
    localDirty.value = true
    storeDraft(false)
    if (!quiet) $q.notify({ type:'warning', message:'Sin Internet. El borrador quedó guardado en este dispositivo.' })
    return true
  }
  saving.value = true
  try {
    await initCsrf()
    const response = await api.put(`/publico/solicitudes/${route.params.token}`, payload())
    if (item.value) {
      item.value.draft_revision = revisionFromResponse(response)
      item.value.draft_saved_at = response.data?.draft?.saved_at || item.value.draft_saved_at
    }
    syncItemFromRegistration()
    conflict.value = false
    remoteRevision.value = null
    clearDraft()
    storeDraft(false)
    if (!quiet) $q.notify({ type:'positive', message:'Cambios guardados y sincronizados.' })
    return true
  } catch (e) {
    if (networkFailure(e)) {
      online.value = false
      localDirty.value = true
      storeDraft(false)
      if (!quiet) $q.notify({ type:'warning', message:'Se perdió la conexión. El borrador quedó guardado en este dispositivo.' })
      return true
    }
    if (isDraftConflict(e)) {
      markConflict(e)
      $q.notify({ type:'warning', message:'Hay cambios más recientes desde otro dispositivo. Elige qué versión conservar.' })
      return false
    }
    $q.notify({ type:'negative', message:errorMessage(e, 'No se pudo guardar.') })
    return false
  } finally { saving.value = false }
}
async function useServerDraft() {
  clearDraft()
  conflict.value = false
  remoteRevision.value = null
  pendingDraft.value = null
  await load({ restoreLocal:false })
  $q.notify({ type:'positive', message:'Se cargó la versión más reciente guardada en VITI.' })
}
async function keepLocalDraft() {
  const local = pendingDraft.value || readDraft() || draftSnapshot()
  saving.value = true
  try {
    const latest = (await api.get(`/publico/solicitudes/${route.params.token}`)).data.data
    if (['en_revision','aprobada','convertida','cerrada'].includes(latest.estado)) {
      hydrateFromServer(latest)
      clearDraft()
      conflict.value = false
      remoteRevision.value = null
      $q.notify({ type:'warning', message:'La solicitud ya fue enviada desde otro dispositivo. Se cargó ese estado.' })
      return
    }
    if (item.value) {
      item.value.draft_revision = Number(latest.draft_revision || 0)
      item.value.draft_saved_at = latest.draft_saved_at || null
    }
    ready.value = false
    applyDraft(local)
    ready.value = true
    localDirty.value = true
    conflict.value = false
    remoteRevision.value = null
    pendingDraft.value = null
    await save(false)
  } catch (e) {
    $q.notify({ type:'negative', message:errorMessage(e, 'No se pudo resolver la sincronización.') })
  } finally { saving.value = false }
}
async function saveRegistration() {
  if (!registrationValid.value) return $q.notify({ type:'warning', message:'Revisa nombre, WhatsApp, negocio y sistema antes de guardar.' })
  if (await save(false)) registrationDialog.value = false
}
async function next() {
  if (step.value === 1 && !commercial.plan_viti_id) return $q.notify({ type:'warning', message:'Selecciona un plan para continuar.' })
  if (await save(true)) await goToStep(Math.min(3, step.value + 1), true)
}
async function previous() {
  if (step.value > 1) await goToStep(step.value - 1, false)
}
async function skipOperation() {
  if (await save(true)) await goToStep(3, true)
}
async function submit() {
  if (!commercial.plan_viti_id) return $q.notify({ type:'warning', message:'Selecciona un plan.' })
  if (!commercial.forma_pago_preferida) return $q.notify({ type:'warning', message:'Selecciona la forma de pago de la implementación.' })
  if (selectedKey.value !== 'custom' && !commercial.frecuencia_suscripcion_preferida) return $q.notify({ type:'warning', message:'Selecciona suscripción mensual o anual.' })
  if (!declaration.aceptada) return $q.notify({ type:'warning', message:'Confirma que los datos de tu solicitud son correctos.' })
  if (!commercial.acuerdo_comercial_aceptado) return $q.notify({ type:'warning', message:'Acepta el acuerdo comercial inicial.' })
  if (!online.value) {
    localDirty.value = true
    storeDraft(false)
    return $q.notify({ type:'warning', message:'No se puede enviar sin Internet. Tu borrador está seguro y podrás enviarlo al reconectar.' })
  }
  if (!(await save(true))) return
  saving.value = true
  try {
    await initCsrf()
    const response = await api.post(`/publico/solicitudes/${route.params.token}/enviar`, { base_revision:serverRevision.value })
    if (item.value) item.value.draft_revision = revisionFromResponse(response)
    sent.value = true
    clearDraft()
    conflict.value = false
    remoteRevision.value = null
    $q.notify({ type:'positive', message:'Solicitud enviada a revisión.' })
  } catch (e) {
    if (isDraftConflict(e)) {
      markConflict(e)
      $q.notify({ type:'warning', message:'Otro dispositivo cambió la solicitud antes de enviarla. Revisa la sincronización.' })
      return
    }
    $q.notify({ type:'negative', message:errorMessage(e, 'No se pudo enviar la solicitud.') })
  } finally { saving.value = false }
}
async function syncDraft() {
  online.value = navigator.onLine
  const draft = readDraft()
  if (online.value && draft?.dirty && !sent.value && !conflict.value) await save(true)
}
async function checkRemoteRevision() {
  if (!ready.value || loading.value || saving.value || !online.value || sent.value) return
  try {
    const latest = (await api.get(`/publico/solicitudes/${route.params.token}`)).data.data
    const latestRevision = Number(latest.draft_revision || 0)
    if (latestRevision === serverRevision.value && latest.estado === item.value?.estado) return
    if (localDirty.value) {
      pendingDraft.value = draftSnapshot()
      remoteRevision.value = latestRevision
      conflict.value = true
      storeDraft(false)
      return
    }
    ready.value = false
    hydrateFromServer(latest)
    ready.value = true
    conflict.value = false
    remoteRevision.value = null
    storeDraft(false)
    $q.notify({ type:'info', message:'Se cargaron cambios guardados desde otro dispositivo.' })
  } catch {}
}
function handleOnline() { online.value = true; syncDraft() }
function handleOffline() { online.value = false; if (localDirty.value) storeDraft(false) }
function persistDraft() { if (localDirty.value) storeDraft(false) }
function handleVisibility() {
  if (document.hidden) persistDraft()
  else checkRemoteRevision()
}

watch(() => [JSON.stringify(answers), JSON.stringify(otherAnswers), JSON.stringify(registration), JSON.stringify(declaration), JSON.stringify(commercial)], () => storeDraft(true))
watch(step, () => storeDraft(false))
watch(() => route.query.paso, value => {
  if (!ready.value) return
  const target = validStep(value)
  if (target && target !== step.value) step.value = target
})
onMounted(async () => {
  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)
  window.addEventListener('pagehide', persistDraft)
  window.addEventListener('focus', checkRemoteRevision)
  document.addEventListener('visibilitychange', handleVisibility)
  await load()
  await syncDraft()
})
onBeforeUnmount(() => {
  persistDraft()
  window.removeEventListener('online', handleOnline)
  window.removeEventListener('offline', handleOffline)
  window.removeEventListener('pagehide', persistDraft)
  window.removeEventListener('focus', checkRemoteRevision)
  document.removeEventListener('visibilitychange', handleVisibility)
})
</script>

<template>
<q-page class="public-page">
  <q-inner-loading :showing="loading" />
  <div v-if="item" class="public-shell">
    <div class="row items-center justify-between q-mb-lg q-gutter-sm">
      <AppBrand/>
      <div class="row items-center q-gutter-sm">
        <q-chip dense outline :color="syncColor" :icon="syncIcon">{{syncLabel}}</q-chip>
        <q-badge outline color="primary">{{item.codigo}}</q-badge>
      </div>
    </div>

    <q-banner v-if="conflict" rounded class="bg-orange-1 text-orange-10 q-mb-lg sync-conflict-banner">
      <template #avatar><q-icon name="sync_problem"/></template>
      <div class="text-weight-bold">Hay una versión más reciente de esta solicitud.</div>
      <div class="text-body2">Otro dispositivo o pestaña guardó cambios. VITI detuvo el guardado para no sobrescribirlos. Revisión del servidor: {{remoteRevision}}.</div>
      <template #action>
        <q-btn flat no-caps color="orange-10" icon="cloud_download" label="Usar versión del servidor" :loading="saving" @click="useServerDraft"/>
        <q-btn unelevated no-caps color="orange-9" text-color="white" icon="upload" label="Conservar lo escrito aquí" :loading="saving" @click="keepLocalDraft"/>
      </template>
    </q-banner>

    <q-banner v-if="sent" rounded class="bg-green-1 text-green-9 q-mb-lg">
      <template #avatar><q-icon name="check_circle"/></template>
      Tu solicitud fue enviada. AGR Studio revisará el alcance y te responderá desde VITI.
      <template #action><q-btn flat no-caps color="green-9" icon="login" label="Ingresar a mi cuenta" to="/login?tipo=cliente"/></template>
    </q-banner>

    <q-banner v-else-if="!online" rounded class="bg-amber-1 text-amber-10 q-mb-lg">
      <template #avatar><q-icon name="cloud_off"/></template>
      Estás sin conexión. Puedes seguir completando la solicitud; el borrador queda guardado en este dispositivo y se sincronizará cuando vuelva Internet.
    </q-banner>

    <div class="section-label">Solicitud VITI</div>
    <h1 class="page-title">Elige el nivel que necesita tu negocio</h1>
    <div class="page-subtitle">{{item.empresa?.nombre_comercial || 'Tu empresa'}} · ya tenemos tus datos de registro. Aquí solo definimos plan y configuración básica.</div>

    <div class="macro-flow q-mt-lg" aria-label="Progreso general de la solicitud">
      <template v-for="(macro,index) in macroSteps" :key="macro.label">
        <div :class="['macro-step',{done:macro.done,active:macro.active}]">
          <q-icon :name="macro.done?'check_circle':macro.active?'radio_button_checked':'radio_button_unchecked'" />
          <span>{{macro.label}}</span>
        </div>
        <q-icon v-if="index<macroSteps.length-1" name="chevron_right" class="macro-arrow"/>
      </template>
    </div>

    <q-stepper v-model="step" flat animated color="primary" class="viti-card q-mt-lg">
      <q-step :name="1" title="Plan" icon="workspace_premium" :done="step>1">
        <q-card flat bordered class="registration-summary q-mb-lg">
          <q-card-section class="row items-center q-col-gutter-md">
            <div class="col">
              <div class="section-label">Registro completado</div>
              <div class="text-weight-bold">{{registration.cliente_nombre}} · {{registration.empresa_nombre}}</div>
              <div class="text-caption text-grey-6">{{registration.titulo_sistema}} · Tel. {{item.cliente?.telefono}}</div>
            </div>
            <div class="col-auto"><q-btn outline no-caps color="primary" icon="edit" label="Revisar datos" :disable="sent" @click="registrationDialog=true"/></div>
          </q-card-section>
        </q-card>

        <div class="plan-grid">
          <q-card v-for="plan in plans" :key="plan.id" flat bordered :class="['plan-card',{selected:Number(commercial.plan_viti_id)===Number(plan.id)}]" @click="selectPlan(plan)">
            <q-card-section>
              <div class="row items-start no-wrap q-gutter-sm"><div class="col"><div class="text-h6 text-weight-bold">{{plan.nombre}}</div><div class="text-caption text-grey-7 q-mt-sm">{{plan.descripcion}}</div></div><q-radio :model-value="commercial.plan_viti_id" :val="plan.id" color="primary" :disable="sent" @update:model-value="selectPlan(plan)"/></div>
              <div v-if="planKey(plan)!=='custom'" class="price-box q-mt-lg"><div><div class="price-label">Implementación</div><div class="price-value">{{money(plan.precio_proyecto)}}</div></div><div><div class="price-label">Suscripción</div><div class="text-weight-bold">{{money(plan.precio_mensual)}}/mes</div><div class="text-caption text-positive">{{money(plan.precio_anual)}}/año</div></div></div>
              <div v-else class="custom-price q-mt-lg"><q-icon name="request_quote" color="primary" size="28px"/><div><div class="text-weight-bold">Cotización después de una revisión corta</div><div class="text-caption text-grey-7">Cuéntanos lo esencial y AGR Studio revisará el alcance contigo.</div></div></div>
              <q-list dense class="q-mt-md"><q-item v-for="benefit in planBenefits(planKey(plan))" :key="benefit" class="q-px-none"><q-item-section avatar style="min-width:30px"><q-icon name="check_circle" color="positive"/></q-item-section><q-item-section>{{benefit}}</q-item-section></q-item></q-list>
              <div v-if="annualSaving(plan)>0" class="text-caption text-positive text-weight-bold q-mt-sm">Ahorro anual: {{money(annualSaving(plan))}}.</div>
            </q-card-section>
          </q-card>
        </div>
      </q-step>

      <q-step :name="2" title="Configuración" icon="tune" :done="step>2">
        <div class="row items-start justify-between q-gutter-md q-mb-lg">
          <div><div class="text-h6 text-weight-bold">Configuración de {{selectedPlan?.nombre}}</div><div class="text-body2 text-grey-7">Responde solo lo que tengas claro. También puedes saltar este paso y completar los detalles durante la revisión.</div></div>
          <q-btn outline no-caps color="primary" icon="skip_next" label="Saltar configuración" :disable="sent||conflict" :loading="saving" @click="skipOperation"/>
        </div>

        <div v-for="q in operationQuestions" :key="q.id" class="question-block">
          <div class="text-weight-medium q-mb-sm">{{q.pregunta}}</div>
          <div v-if="q.ayuda" class="text-caption text-grey-6 q-mb-sm">{{q.ayuda}}</div>
          <div v-if="suggestionsFor(q).length" class="row q-gutter-xs q-mb-sm">
            <q-chip v-for="suggestion in suggestionsFor(q)" :key="suggestion" clickable outline color="primary" @click="applySuggestion(q,suggestion)">{{suggestion}}</q-chip>
          </div>
          <q-input v-if="['texto','numero'].includes(q.tipo)" v-model="answers[q.id]" outlined :type="q.tipo==='numero'?'number':'textarea'" :autogrow="q.tipo==='texto'" :disable="sent"/>
          <div v-else-if="q.tipo==='seleccion_unica'"><q-option-group v-model="answers[q.id]" :options="optionsFor(q).map(x=>({label:x,value:x}))" type="radio" color="primary" :disable="sent"/><q-input v-if="hasOther(q)&&selectedOther(q)" v-model="otherAnswers[q.id]" outlined dense class="q-mt-sm" label="Especifica" :disable="sent"/></div>
          <div v-else><q-option-group v-model="answers[q.id]" :options="optionsFor(q).map(x=>({label:x,value:x}))" type="checkbox" color="primary" :disable="sent"/><q-input v-if="hasOther(q)&&selectedOther(q)" v-model="otherAnswers[q.id]" outlined dense class="q-mt-sm" label="Especifica" :disable="sent"/></div>
        </div>
      </q-step>

      <q-step :name="3" title="Acuerdo" icon="handshake">
        <q-card flat bordered class="summary-plan q-mb-lg"><q-card-section><div class="section-label">Plan elegido</div><div class="text-h5 text-weight-bold">{{selectedPlan?.nombre}}</div><div class="text-body2 text-grey-7 q-mt-sm">{{selectedPlan?.descripcion}}</div></q-card-section></q-card>

        <template v-if="selectedKey!=='custom'">
          <div class="text-h6 text-weight-bold">Suscripción</div>
          <div class="subscription-grid q-mb-xl q-mt-md">
            <q-card flat bordered :class="['subscription-card',{selected:commercial.frecuencia_suscripcion_preferida==='mensual'}]" @click="!sent&&(commercial.frecuencia_suscripcion_preferida='mensual')"><q-card-section class="row items-center justify-between"><div><div class="text-weight-bold">Mensual</div><div class="subscription-price">{{money(selectedPlan?.precio_mensual)}}<span>/mes</span></div><div class="text-caption text-grey-7">Después de {{selectedPlan?.dias_prueba||14}} días de prueba.</div></div><q-radio v-model="commercial.frecuencia_suscripcion_preferida" val="mensual" color="primary" :disable="sent"/></q-card-section></q-card>
            <q-card flat bordered :class="['subscription-card',{selected:commercial.frecuencia_suscripcion_preferida==='anual'}]" @click="!sent&&(commercial.frecuencia_suscripcion_preferida='anual')"><q-card-section class="row items-center justify-between"><div><div class="text-weight-bold">Anual</div><div class="subscription-price">{{money(selectedPlan?.precio_anual)}}<span>/año</span></div><div class="text-caption text-positive">Ahorras {{money(annualSaving(selectedPlan))}}.</div></div><q-radio v-model="commercial.frecuencia_suscripcion_preferida" val="anual" color="primary" :disable="sent"/></q-card-section></q-card>
          </div>
        </template>

        <div class="text-h6 text-weight-bold">Forma de pago de la implementación</div>
        <div class="payment-grid q-mb-xl q-mt-md"><q-card v-for="option in paymentOptions()" :key="option.value" flat bordered :class="['payment-card',{selected:commercial.forma_pago_preferida===option.value}]" @click="!sent&&(commercial.forma_pago_preferida=option.value)"><q-card-section class="row items-start no-wrap"><q-radio v-model="commercial.forma_pago_preferida" :val="option.value" color="primary" :disable="sent"/><div><div class="text-weight-bold">{{option.label}}</div><div class="text-caption text-grey-7">{{option.description}}</div></div></q-card-section></q-card></div>

        <q-card flat bordered class="q-mb-lg"><q-card-section><q-checkbox v-model="declaration.aceptada" :disable="sent" label="Confirmo que los datos de mi registro y esta solicitud son correctos." color="primary"/><div class="row q-col-gutter-md q-mt-sm"><div class="col-12 col-sm-7"><q-input v-model="declaration.nombre" outlined label="Nombre de quien confirma" :disable="sent"/></div><div class="col-12 col-sm-5"><q-input v-model="declaration.fecha" outlined type="date" stack-label label="Fecha" :disable="sent"/></div></div></q-card-section></q-card>
        <q-card flat bordered><q-card-section><q-checkbox v-model="commercial.acuerdo_comercial_aceptado" :disable="sent" color="primary"><span>Acepto que la implementación y la suscripción son conceptos separados y que cualquier requerimiento fuera del alcance se revisará antes de iniciar.</span></q-checkbox><div class="row q-col-gutter-md q-mt-sm"><div class="col-12 col-sm-7"><q-input v-model="commercial.acuerdo_comercial_nombre" outlined label="Nombre de quien acepta" :disable="sent"/></div><div class="col-12 col-sm-5"><q-input v-model="commercial.acuerdo_comercial_fecha" outlined type="date" stack-label label="Fecha" :disable="sent"/></div></div></q-card-section></q-card>
      </q-step>

      <template #navigation>
        <q-stepper-navigation class="row items-center q-gutter-sm">
          <q-btn v-if="step>1&&!sent" flat no-caps color="primary" icon="arrow_back" label="Anterior" @click="previous"/>
          <q-space/>
          <q-btn v-if="!sent" outline no-caps color="primary" icon="save" label="Guardar" :loading="saving" :disable="conflict" @click="save()"/>
          <q-btn v-if="step<3&&!sent" color="primary" unelevated no-caps icon-right="arrow_forward" label="Continuar" :loading="saving" :disable="conflict" @click="next"/>
          <q-btn v-else-if="!sent" color="positive" unelevated no-caps icon="send" label="Enviar a revisión" :loading="saving" :disable="conflict" @click="submit"/>
        </q-stepper-navigation>
      </template>
    </q-stepper>

    <q-dialog v-model="registrationDialog" persistent>
      <q-card class="registration-dialog">
        <q-card-section class="row items-start">
          <div><div class="section-label">Registro inicial</div><div class="text-h5 text-weight-bold">Revisar y corregir datos</div><div class="text-caption text-grey-6 q-mt-xs">No necesitas volver al enlace de invitación. Corrige aquí los datos seguros antes de enviar la solicitud.</div></div>
          <q-space/><q-btn flat round icon="close" :disable="saving" @click="registrationDialog=false"/>
        </q-card-section>
        <q-separator/>
        <q-card-section class="q-pa-lg">
          <div class="text-subtitle1 text-weight-bold q-mb-sm">Tu información</div>
          <div class="row q-col-gutter-md">
            <div class="col-12 col-sm-7"><q-input v-model="registration.cliente_nombre" outlined label="Nombre completo *"/></div>
            <div class="col-12 col-sm-5"><q-input :model-value="item.cliente?.telefono" outlined readonly label="Teléfono de acceso" hint="Por seguridad se cambia desde tu cuenta."/></div>
            <div class="col-12 col-sm-6"><q-input v-model="registration.cliente_whatsapp" outlined label="WhatsApp" inputmode="numeric"/></div>
            <div class="col-12 col-sm-6"><q-input v-model="registration.cliente_ciudad" outlined label="Ciudad o localidad"/></div>
            <div class="col-12"><q-input v-model="registration.cliente_direccion" outlined label="Dirección o zona"/></div>
          </div>
          <div class="text-subtitle1 text-weight-bold q-mt-lg q-mb-sm">Negocio y necesidad</div>
          <div class="row q-col-gutter-md">
            <div class="col-12 col-sm-7"><q-input v-model="registration.empresa_nombre" outlined label="Nombre del negocio *"/></div>
            <div class="col-12 col-sm-5"><q-input v-model="registration.empresa_actividad" outlined label="Actividad"/></div>
            <div class="col-12 col-sm-6"><q-input v-model="registration.empresa_telefono" outlined label="Teléfono del negocio"/></div>
            <div class="col-12 col-sm-6"><q-input v-model="registration.empresa_whatsapp" outlined label="WhatsApp del negocio"/></div>
            <div class="col-12 col-sm-5"><q-input v-model="registration.empresa_ciudad" outlined label="Ciudad del negocio"/></div>
            <div class="col-12 col-sm-7"><q-input v-model="registration.empresa_direccion" outlined label="Dirección del negocio"/></div>
            <div class="col-12"><q-input v-model="registration.titulo_sistema" outlined label="¿Qué sistema necesitas? *"/></div>
            <div class="col-12"><q-input v-model="registration.resumen" outlined type="textarea" autogrow label="Problema que quieres resolver"/></div>
          </div>
        </q-card-section>
        <q-separator/>
        <q-card-actions align="right" class="q-pa-md">
          <q-btn flat no-caps label="Cancelar" :disable="saving" @click="registrationDialog=false"/>
          <q-btn color="primary" unelevated no-caps icon="save" label="Guardar correcciones" :loading="saving" :disable="!registrationValid||conflict" @click="saveRegistration"/>
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</q-page>
</template>

<style scoped>
.question-block{padding:18px 0;border-bottom:1px solid rgba(120,135,155,.16)}
.question-block:last-child{border-bottom:0}
.macro-flow{display:flex;align-items:center;gap:7px;flex-wrap:wrap;padding:12px 16px;border:1px solid var(--viti-border);border-radius:16px;background:var(--viti-card)}
.macro-step{display:flex;align-items:center;gap:5px;color:var(--viti-muted);font-size:13px;font-weight:700}.macro-step.done{color:#21ba45}.macro-step.active{color:var(--q-primary)}.macro-arrow{color:var(--viti-muted)}
.sync-conflict-banner{border:1px solid rgba(245,124,0,.28)}
.registration-summary{border-radius:16px;background:color-mix(in srgb,var(--viti-card) 94%,var(--q-primary) 6%)}
.registration-dialog{width:min(820px,94vw);max-height:90vh}
.plan-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px}
.plan-card,.subscription-card,.payment-card{cursor:pointer;border-radius:18px;transition:.18s ease;background:var(--q-card-background,white)}
.plan-card:hover,.subscription-card:hover,.payment-card:hover{transform:translateY(-2px);border-color:rgba(25,118,210,.45)}
.plan-card.selected,.subscription-card.selected,.payment-card.selected{border:2px solid var(--q-primary);box-shadow:0 10px 30px rgba(30,90,160,.12)}
.price-box{display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:14px;border-radius:14px;background:rgba(80,130,190,.08)}
.price-label{font-size:11px;color:#78869a;text-transform:uppercase;letter-spacing:.04em}
.price-value{font-size:24px;font-weight:900;color:var(--q-primary)}
.custom-price{display:flex;gap:12px;align-items:center;padding:14px;border-radius:14px;background:rgba(80,130,190,.08)}
.subscription-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
.subscription-price{font-size:26px;font-weight:900;color:var(--q-primary);margin:4px 0}.subscription-price span{font-size:13px;font-weight:600;color:#78869a}
.payment-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:12px}
.summary-plan{border-radius:18px}
@media(max-width:700px){.subscription-grid,.price-box{grid-template-columns:1fr}.plan-grid{grid-template-columns:1fr}.public-shell{padding-left:14px;padding-right:14px}.macro-flow{gap:4px}.macro-step{font-size:11px}.macro-arrow{font-size:16px}.registration-dialog{width:100vw;max-height:100vh}}
</style>
