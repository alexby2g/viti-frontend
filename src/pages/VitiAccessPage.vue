<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useQuasar } from 'quasar'
import { useRoute } from 'vue-router'
import { api } from '../boot/axios'
import AppBrand from '../components/AppBrand.vue'

const $q = useQuasar()
const route = useRoute()
const loading = ref(false)
const plansLoading = ref(false)
const sent = ref(false)
const plans = ref([])

const selectedPlanCode = ref(typeof route.query.plan === 'string' ? route.query.plan.trim() : '')
const selectedBilling = ref(route.query.modalidad === 'anual' ? 'anual' : 'mensual')

const selectedPlan = computed(() => {
  if (!selectedPlanCode.value) return null
  return plans.value.find(plan => plan.codigo === selectedPlanCode.value) || null
})

const form = reactive({
  nombre: '',
  telefono: '',
  whatsapp: '',
  ciudad: '',
  negocio: '',
  actividad: '',
  necesidad: '',
  mensaje: '',
})

function onlyDigits(value) {
  return String(value ?? '').replace(/\D/g, '').slice(0, 15)
}

async function loadPlans() {
  plansLoading.value = true
  try {
    const response = await api.get('/publico/planes')
    plans.value = Array.isArray(response.data?.data) ? response.data.data : []
    if (selectedPlanCode.value && !selectedPlan.value) selectedPlanCode.value = ''
  } catch {
    plans.value = []
    selectedPlanCode.value = ''
  } finally {
    plansLoading.value = false
  }
}

async function requestAccess() {
  form.telefono = onlyDigits(form.telefono)
  form.whatsapp = onlyDigits(form.whatsapp)

  if (!form.nombre.trim() || !form.telefono || !form.ciudad.trim() || !form.negocio.trim() || !form.necesidad.trim()) {
    $q.notify({ type: 'warning', message: 'Completa tu nombre, teléfono, ciudad, negocio y la necesidad que deseas resolver.' })
    return
  }
  if (!/^\d{7,15}$/.test(form.telefono) || (form.whatsapp && !/^\d{7,15}$/.test(form.whatsapp))) {
    $q.notify({ type: 'warning', message: 'Revisa el teléfono y WhatsApp. Deben contener entre 7 y 15 dígitos.' })
    return
  }

  loading.value = true
  try {
    const response = await api.post('/publico/solicitudes', {
      nombre: form.nombre.trim(),
      telefono: form.telefono,
      whatsapp: form.whatsapp || null,
      ciudad: form.ciudad.trim(),
      empresa_nombre: form.negocio.trim(),
      empresa_actividad: form.actividad.trim() || null,
      empresa_ciudad: form.ciudad.trim(),
      titulo_sistema: form.necesidad.trim(),
      resumen: form.mensaje.trim() || null,
      plan_codigo: selectedPlan.value?.codigo || null,
      modalidad: selectedPlan.value ? selectedBilling.value : null,
    })
    sent.value = true
    $q.notify({ type: 'positive', message: response.data?.message || 'Solicitud enviada correctamente.' })
  } catch (error) {
    $q.notify({ type: 'negative', message: error.response?.data?.message || 'No pudimos enviar la solicitud. Inténtalo nuevamente.' })
  } finally {
    loading.value = false
  }
}

function clearSelectedPlan() {
  selectedPlanCode.value = ''
}

function restart() {
  sent.value = false
}

onMounted(loadPlans)
</script>

<template>
  <q-page class="access-page flex flex-center">
    <div class="access-shell">
      <AppBrand />

      <div class="q-mt-xl text-overline text-primary text-weight-bold">SOLICITAR ACCESO A VITI</div>
      <h1 class="text-h3 text-weight-bold q-mt-sm q-mb-sm">Cuéntanos sobre tu negocio.</h1>
      <p class="text-body1 text-grey-7 q-mb-lg">
        Envía una solicitud breve. Esto no crea una cuenta ni habilita el sistema automáticamente: AGR Studio primero revisa la información y luego genera una invitación personal si corresponde.
      </p>

      <q-banner rounded class="invite-info q-mb-lg">
        <template #avatar><q-icon name="verified_user" color="primary" /></template>
        <div class="text-weight-bold">¿Ya recibiste una invitación?</div>
        <div class="text-caption q-mt-xs">Abre directamente el enlace personal que te enviaron. No necesitas completar este formulario otra vez.</div>
      </q-banner>

      <q-banner v-if="selectedPlan" rounded class="selected-plan q-mb-lg">
        <template #avatar><q-icon name="workspace_premium" color="primary" /></template>
        <div class="row items-center no-wrap q-gutter-sm">
          <div class="col">
            <div class="text-weight-bold">Preferencia: {{ selectedPlan.nombre }}</div>
            <div class="text-caption">Modalidad {{ selectedBilling }} · La contratación final se confirma después del análisis.</div>
          </div>
          <q-btn flat dense no-caps color="primary" label="Quitar" @click="clearSelectedPlan" />
        </div>
      </q-banner>

      <q-card v-if="!sent" flat bordered class="access-card">
        <q-card-section>
          <div class="row items-start no-wrap">
            <q-avatar color="blue-1" text-color="primary" icon="person_add" />
            <div class="q-ml-md">
              <div class="text-h6 text-weight-bold">Datos para revisar tu solicitud</div>
              <div class="text-body2 text-grey-7 q-mt-xs">Solo pedimos la información necesaria para que AGR Studio pueda evaluar el acceso y contactarte.</div>
            </div>
          </div>

          <q-form class="q-mt-lg" @submit.prevent="requestAccess">
            <q-input v-model="form.nombre" outlined label="Nombre completo *" class="q-mb-sm" :disable="loading" maxlength="180" />
            <div class="row q-col-gutter-sm">
              <div class="col-12 col-sm-6">
                <q-input v-model="form.telefono" outlined label="Teléfono *" inputmode="numeric" maxlength="15" :disable="loading" @update:model-value="form.telefono = onlyDigits($event)" />
              </div>
              <div class="col-12 col-sm-6">
                <q-input v-model="form.whatsapp" outlined label="WhatsApp (opcional)" inputmode="numeric" maxlength="15" :disable="loading" @update:model-value="form.whatsapp = onlyDigits($event)" />
              </div>
            </div>
            <q-input v-model="form.ciudad" outlined label="Ciudad o localidad *" class="q-mt-sm" :disable="loading" maxlength="100" />
            <q-input v-model="form.negocio" outlined label="Nombre del negocio *" class="q-mt-sm" :disable="loading" maxlength="180" />
            <q-input v-model="form.actividad" outlined label="¿A qué se dedica tu negocio?" class="q-mt-sm" :disable="loading" maxlength="200" />
            <q-input v-model="form.necesidad" outlined label="¿Qué necesitas organizar o digitalizar? *" class="q-mt-sm" :disable="loading" maxlength="200" />
            <q-input v-model="form.mensaje" outlined type="textarea" autogrow label="Cuéntanos un poco más (opcional)" class="q-mt-sm" :disable="loading" maxlength="5000" />

            <q-banner v-if="selectedPlan" rounded class="plan-summary q-mt-md">
              <template #avatar><q-icon name="sell" color="primary" /></template>
              <div class="text-weight-bold">Plan solicitado: {{ selectedPlan.nombre }}</div>
              <div class="text-caption">Modalidad preferida: {{ selectedBilling }}. Es una referencia para la revisión comercial, no una contratación automática.</div>
            </q-banner>

            <q-banner rounded class="info-banner q-mt-lg">
              <template #avatar><q-icon name="security" color="primary" /></template>
              La solicitud no crea usuario, contraseña ni acceso. Si es aprobada, AGR Studio te enviará una invitación personal para completar el registro seguro.
            </q-banner>

            <q-btn color="primary" unelevated no-caps size="lg" class="full-width q-mt-lg" icon="send" label="Solicitar acceso" :loading="loading" :disable="plansLoading" type="submit" />
          </q-form>
        </q-card-section>
      </q-card>

      <q-card v-else flat bordered class="access-card success-card">
        <q-card-section class="text-center q-py-xl">
          <q-avatar size="64px" color="green-1" text-color="positive" icon="check_circle" />
          <div class="text-h5 text-weight-bold q-mt-md">Solicitud recibida</div>
          <p class="text-body1 text-grey-7 q-mt-sm">AGR Studio revisará tus datos{{ selectedPlan ? ` y la preferencia ${selectedPlan.nombre}` : '' }}. Si la solicitud es viable, recibirás una invitación personal para continuar con el registro.</p>
          <q-btn outline color="primary" no-caps label="Enviar otra solicitud" icon="add" class="q-mt-md" @click="restart" />
        </q-card-section>
      </q-card>

      <div class="row justify-center q-gutter-sm q-mt-lg">
        <q-btn flat no-caps color="primary" icon="login" label="Ya tengo una cuenta" to="/login?tipo=cliente" />
        <q-btn flat no-caps color="primary" icon="payments" label="Ver planes" to="/viti/planes" />
        <q-btn flat no-caps color="primary" icon="info" label="Conocer VITI" to="/viti" />
      </div>
      <div class="agr-signature q-mt-lg">Desarrollado y administrado por <strong>AGR Studio</strong></div>
    </div>
  </q-page>
</template>

<style scoped>
.access-page{min-height:100vh;padding:28px 20px;background:var(--viti-bg)}
.access-shell{width:min(720px,100%);padding:38px;border-radius:24px}
.access-card{border-radius:20px;background:var(--viti-card)}
.info-banner,.invite-info,.selected-plan,.plan-summary{background:color-mix(in srgb,var(--viti-card) 88%,var(--agr-purple) 12%);border:1px solid var(--viti-border)}
.success-card{border-color:color-mix(in srgb,#21ba45 30%,var(--viti-border))}
.agr-signature{padding-top:18px;border-top:1px solid var(--viti-border);font-size:11px;color:var(--viti-muted);text-align:center;letter-spacing:.02em}
.agr-signature strong{color:var(--viti-text);font-weight:800}
@media(max-width:600px){.access-page{padding:0;align-items:stretch}.access-shell{width:100%;min-height:100vh;padding:28px 16px;border-radius:0}.access-shell h1{font-size:30px}}
</style>
