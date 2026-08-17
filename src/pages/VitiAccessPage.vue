<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useQuasar } from 'quasar'
import { useRoute } from 'vue-router'
import { api } from '../boot/axios'
import AppBrand from '../components/AppBrand.vue'

const $q = useQuasar()
const route = useRoute()
const mode = ref('code')
const loading = ref(false)
const plansLoading = ref(false)
const sent = ref(false)
const plans = ref([])

const selectedPlanCode = ref(typeof route.query.plan === 'string' ? route.query.plan.trim() : '')
const selectedBilling = ref(route.query.modalidad === 'anual' ? 'anual' : 'mensual')

const selectedPlan = computed(() => plans.value.find(plan => plan.codigo === selectedPlanCode.value) || null)
const selectedPlanUnavailable = computed(() => Boolean(selectedPlanCode.value) && !plansLoading.value && !selectedPlan.value)

const codeForm = reactive({ codigo: '' })
const requestForm = reactive({
  nombre: '',
  telefono: '',
  whatsapp: '',
  negocio: '',
  actividad: '',
  plan_codigo: selectedPlanCode.value || null,
  modalidad: selectedPlanCode.value ? selectedBilling.value : null,
  mensaje: '',
})

function normalizeCode() {
  codeForm.codigo = codeForm.codigo.toUpperCase().replace(/\s+/g, '')
}

async function loadPlans() {
  plansLoading.value = true
  try {
    const response = await api.get('/publico/planes')
    plans.value = Array.isArray(response.data?.data) ? response.data.data : []

    if (selectedPlanCode.value && !plans.value.some(plan => plan.codigo === selectedPlanCode.value)) {
      requestForm.plan_codigo = null
      requestForm.modalidad = null
      $q.notify({
        type: 'warning',
        message: 'El plan seleccionado ya no está disponible. Puedes enviar la solicitud sin una preferencia de plan.',
      })
    }
  } catch {
    plans.value = []
  } finally {
    plansLoading.value = false
  }
}

async function useCode() {
  normalizeCode()
  if (!/^VITI-[A-Z0-9]{6}$/.test(codeForm.codigo)) {
    $q.notify({ type: 'warning', message: 'Ingresa un código VITI válido, por ejemplo VITI-ABC123.' })
    return
  }

  loading.value = true
  try {
    const response = await api.get(`/publico/acceso/codigo/${encodeURIComponent(codeForm.codigo)}`)
    const path = response.data?.data?.ruta
    if (!path) throw new Error('Ruta de registro no disponible.')
    window.location.assign(path)
  } catch (error) {
    $q.notify({ type: 'negative', message: error.response?.data?.message || 'No pudimos validar el código de acceso.' })
  } finally {
    loading.value = false
  }
}

async function requestAccess() {
  if (!requestForm.nombre || !requestForm.telefono || !requestForm.negocio) {
    $q.notify({ type: 'warning', message: 'Completa tu nombre, teléfono y nombre del negocio.' })
    return
  }

  loading.value = true
  try {
    await api.post('/publico/acceso/solicitar', {
      ...requestForm,
      plan_codigo: selectedPlan.value?.codigo || null,
      modalidad: selectedPlan.value ? selectedBilling.value : null,
    })
    sent.value = true
    $q.notify({ type: 'positive', message: 'Solicitud enviada correctamente.' })
  } catch (error) {
    $q.notify({ type: 'negative', message: error.response?.data?.message || 'No pudimos enviar la solicitud.' })
  } finally {
    loading.value = false
  }
}

function clearSelectedPlan() {
  selectedPlanCode.value = ''
  requestForm.plan_codigo = null
  requestForm.modalidad = null
}

function restart() {
  sent.value = false
  mode.value = selectedPlanCode.value ? 'request' : 'code'
}

onMounted(async () => {
  if (selectedPlanCode.value) mode.value = 'request'
  await loadPlans()
})
</script>

<template>
  <q-page class="access-page flex flex-center">
    <div class="access-shell">
      <AppBrand />

      <div class="q-mt-xl text-overline text-primary text-weight-bold">PRIMER ACCESO A VITI</div>
      <h1 class="text-h3 text-weight-bold q-mt-sm q-mb-sm">¿Es tu primera vez en VITI?</h1>
      <p class="text-body1 text-grey-7 q-mb-xl">
        Si AGR Studio ya te envió un código o enlace personal, úsalo para continuar. Si todavía no tienes acceso, puedes solicitarlo sin crear una cuenta.
      </p>

      <q-banner v-if="selectedPlan" rounded class="selected-plan q-mb-lg">
        <template #avatar><q-icon name="workspace_premium" color="primary" /></template>
        <div class="row items-center no-wrap q-gutter-sm">
          <div class="col">
            <div class="text-weight-bold">Preferencia: {{ selectedPlan.nombre }}</div>
            <div class="text-caption">Modalidad {{ selectedBilling }} · La contratación final se valida durante el análisis de tu necesidad.</div>
          </div>
          <q-btn flat dense no-caps color="primary" label="Quitar" @click="clearSelectedPlan" />
        </div>
      </q-banner>

      <q-banner v-if="selectedPlanUnavailable" rounded class="info-banner q-mb-lg">
        <template #avatar><q-icon name="info" color="primary" /></template>
        El plan indicado en el enlace no está disponible actualmente. Puedes continuar con una solicitud general.
      </q-banner>

      <q-btn-toggle
        v-model="mode"
        spread
        no-caps
        unelevated
        toggle-color="primary"
        :options="[
          { label: 'Tengo un código', value: 'code', icon: 'vpn_key' },
          { label: 'Necesito acceso', value: 'request', icon: 'person_add' },
        ]"
        class="mode-toggle"
      />

      <q-card v-if="mode === 'code'" flat bordered class="access-card q-mt-lg">
        <q-card-section>
          <div class="row items-start no-wrap">
            <q-avatar color="blue-1" text-color="primary" icon="vpn_key" />
            <div class="q-ml-md">
              <div class="text-h6 text-weight-bold">Tengo un código de acceso</div>
              <div class="text-body2 text-grey-7 q-mt-xs">Escribe el código que te envió AGR Studio. El código solo sirve para abrir el registro personal que ya fue habilitado para ti.</div>
            </div>
          </div>

          <q-input
            v-model="codeForm.codigo"
            outlined
            class="q-mt-xl"
            label="Código de acceso"
            placeholder="VITI-ABC123"
            maxlength="11"
            autocomplete="one-time-code"
            :disable="loading"
            @update:model-value="normalizeCode"
            @keyup.enter="useCode"
          >
            <template #prepend><q-icon name="key" /></template>
          </q-input>

          <q-btn color="primary" unelevated no-caps size="lg" class="full-width q-mt-md" icon="arrow_forward" label="Continuar con mi código" :loading="loading" @click="useCode" />
        </q-card-section>
      </q-card>

      <q-card v-else-if="!sent" flat bordered class="access-card q-mt-lg">
        <q-card-section>
          <div class="row items-start no-wrap">
            <q-avatar color="blue-1" text-color="primary" icon="person_add" />
            <div class="q-ml-md">
              <div class="text-h6 text-weight-bold">Necesito acceso a VITI</div>
              <div class="text-body2 text-grey-7 q-mt-xs">Déjanos una solicitud breve. AGR Studio la revisará antes de crear una invitación personal.</div>
            </div>
          </div>

          <q-form class="q-mt-lg" @submit.prevent="requestAccess">
            <q-input v-model="requestForm.nombre" outlined label="Nombre completo" class="q-mb-sm" :disable="loading" />
            <div class="row q-col-gutter-sm">
              <div class="col-12 col-sm-6"><q-input v-model="requestForm.telefono" outlined label="Teléfono" :disable="loading" /></div>
              <div class="col-12 col-sm-6"><q-input v-model="requestForm.whatsapp" outlined label="WhatsApp (opcional)" :disable="loading" /></div>
            </div>
            <q-input v-model="requestForm.negocio" outlined label="Nombre del negocio" class="q-mt-sm" :disable="loading" />
            <q-input v-model="requestForm.actividad" outlined label="¿A qué se dedica tu negocio?" class="q-mt-sm" :disable="loading" />

            <q-banner v-if="selectedPlan" rounded class="plan-summary q-mt-sm">
              <template #avatar><q-icon name="sell" color="primary" /></template>
              <div class="text-weight-bold">Plan solicitado: {{ selectedPlan.nombre }}</div>
              <div class="text-caption">Modalidad preferida: {{ selectedBilling }}. Esto orienta la revisión comercial; no activa una suscripción automáticamente.</div>
            </q-banner>

            <q-input v-model="requestForm.mensaje" outlined type="textarea" autogrow label="¿Qué te gustaría organizar o digitalizar? (opcional)" class="q-mt-sm" :disable="loading" />

            <q-banner rounded class="info-banner q-mt-lg">
              <template #avatar><q-icon name="verified_user" color="primary" /></template>
              Enviar esta solicitud no crea una cuenta ni da acceso al sistema. Primero se revisa y, si corresponde, se genera una invitación personal.
            </q-banner>

            <q-btn color="primary" unelevated no-caps size="lg" class="full-width q-mt-lg" icon="send" label="Solicitar acceso" :loading="loading" type="submit" />
          </q-form>
        </q-card-section>
      </q-card>

      <q-card v-else flat bordered class="access-card q-mt-lg success-card">
        <q-card-section class="text-center q-py-xl">
          <q-avatar size="64px" color="green-1" text-color="positive" icon="check_circle" />
          <div class="text-h5 text-weight-bold q-mt-md">Solicitud recibida</div>
          <p class="text-body1 text-grey-7 q-mt-sm">AGR Studio revisará tus datos{{ selectedPlan ? ` y la preferencia ${selectedPlan.nombre}` : '' }} y, si corresponde, te enviará un código y un enlace personal para continuar.</p>
          <q-btn outline color="primary" no-caps label="Volver a elegir una opción" icon="arrow_back" class="q-mt-md" @click="restart" />
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
.mode-toggle{border:1px solid var(--viti-border);border-radius:14px;overflow:hidden}
.access-card{border-radius:20px;background:var(--viti-card)}
.info-banner,.selected-plan,.plan-summary{background:color-mix(in srgb,var(--viti-card) 88%,var(--agr-purple) 12%);border:1px solid var(--viti-border)}
.success-card{border-color:color-mix(in srgb,#21ba45 30%,var(--viti-border))}
.agr-signature{padding-top:18px;border-top:1px solid var(--viti-border);font-size:11px;color:var(--viti-muted);text-align:center;letter-spacing:.02em}
.agr-signature strong{color:var(--viti-text);font-weight:800}
@media(max-width:600px){.access-page{padding:0;align-items:stretch}.access-shell{width:100%;min-height:100vh;padding:28px 16px;border-radius:0}.access-shell h1{font-size:30px}.mode-toggle{font-size:13px}}
</style>
