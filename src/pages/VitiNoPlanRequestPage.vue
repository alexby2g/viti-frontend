<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useQuasar } from 'quasar'
import { api } from '../boot/axios'

const $q = useQuasar()
const loading = ref(true)
const apiUnavailable = ref(false)
const sending = ref(false)
const submitted = ref(false)
const result = ref(null)
const questionnaire = ref(null)
const answers = reactive({})

const form = reactive({
  nombre: 'Carlos Enrique Guzmán Ribera',
  correo: '',
  telefono: '',
  whatsapp: '',
  ciudad: '',
  direccion: '',
  empresa_nombre: 'FitFamily',
  empresa_actividad: 'Venta de alimentos y productos de nutrición',
  empresa_telefono: '',
  empresa_whatsapp: '',
  empresa_ciudad: '',
  empresa_direccion: '',
  titulo_sistema: 'FitFamily',
  resumen: 'Sistema para registrar productos de comida, mostrar un catálogo y recibir compras dentro de VITI.',
  declaracion_nombre: 'Carlos Enrique Guzmán Ribera',
  declaracion_aceptada: false,
})

const requiredQuestions = computed(() => {
  const sections = questionnaire.value?.secciones || []
  return sections.flatMap(section => section.preguntas || []).filter(question => {
    if (!question.obligatoria) return false
    return ![27, 32, 35, 70].includes(Number(question.numero))
  })
})

function answerValue(question) {
  const type = String(question.tipo || '').toLowerCase()
  if (type.includes('multiple')) return answers[question.id] || []
  return answers[question.id] || ''
}

function setAnswer(question, value) {
  answers[question.id] = value
}

function isFilled(value) {
  return Array.isArray(value) ? value.length > 0 : String(value ?? '').trim().length > 0
}

function validate() {
  const required = [
    ['correo', form.correo],
    ['telefono', form.telefono],
    ['ciudad', form.ciudad],
  ]
  const missing = required.find(([, value]) => !String(value || '').trim())
  if (missing) {
    $q.notify({ type: 'warning', message: 'Completa correo, teléfono y ciudad para continuar.' })
    return false
  }
  if (!form.declaracion_aceptada) {
    $q.notify({ type: 'warning', message: 'Acepta la declaración para continuar.' })
    return false
  }
  const unanswered = requiredQuestions.value.find(question => !isFilled(answerValue(question)))
  if (unanswered) {
    $q.notify({ type: 'warning', message: `Completa la pregunta ${unanswered.numero}.` })
    return false
  }
  return true
}

async function load() {
  loading.value = true
  apiUnavailable.value = false
  try {
    const { data } = await api.get('/publico/solicitud/catalogo')
    questionnaire.value = data.data?.cuestionario || null
    if (!questionnaire.value) throw new Error('No hay cuestionario activo')
  } catch (error) {
    apiUnavailable.value = true
    questionnaire.value = null
    $q.notify({ type: 'negative', message: error.response?.data?.message || 'El backend todavía no está disponible. Puedes reintentar en unos segundos.' })
  } finally {
    loading.value = false
  }
}

async function submit() {
  if (!validate()) return
  sending.value = true
  try {
    const payload = {
      ...form,
      respuestas: Object.entries(answers).map(([pregunta_id, valor]) => ({ pregunta_id: Number(pregunta_id), valor })),
    }
    const { data } = await api.post('/publico/solicitud/evaluacion', payload)
    result.value = data.data
    submitted.value = true
    $q.notify({ type: 'positive', message: 'Evaluación enviada correctamente.' })
  } catch (error) {
    $q.notify({ type: 'negative', message: error.response?.data?.message || 'No se pudo enviar la evaluación.' })
  } finally {
    sending.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="q-pa-md bg-grey-1 no-plan-page">
    <div class="q-mx-auto" style="max-width: 980px">
      <q-card flat bordered class="q-pa-lg">
        <div class="text-overline text-primary">VITI · EVALUACIÓN SIN PLAN</div>
        <div class="text-h4 text-weight-bold q-mb-sm">Primero entendemos lo que necesitas</div>
        <div class="text-body1 text-grey-7 q-mb-lg">
          Puedes completar el cuestionario de FitFamily sin seleccionar todavía un plan de pago. Después de revisar tus respuestas, VITI puede recomendar la configuración y el plan adecuados.
        </div>

        <q-banner class="q-mb-lg" rounded inline-actions>
          <template #avatar><q-icon name="psychology" color="primary" /></template>
          <b>Plan no seleccionado.</b> Esto es intencional: primero definimos el sistema, luego la propuesta comercial.
        </q-banner>

        <div v-if="apiUnavailable" class="q-py-xl text-center">
          <q-icon name="cloud_off" size="72px" color="warning" />
          <div class="text-h6 text-weight-bold q-mt-md">Backend temporalmente no disponible</div>
          <div class="text-body2 text-grey-7 q-mt-sm q-mb-lg">
            La interfaz está funcionando. Render puede estar iniciando la instancia o todavía no tiene desplegado el endpoint de evaluación.
          </div>
          <q-btn color="primary" unelevated no-caps icon="refresh" label="Reintentar" @click="load" />
        </div>

        <div v-else-if="submitted" class="text-center q-py-xl">
          <q-icon name="task_alt" size="72px" color="positive" />
          <div class="text-h5 text-weight-bold q-mt-md">Evaluación recibida</div>
          <div class="text-body1 text-grey-7 q-mt-sm">Código: <b>{{ result?.codigo }}</b></div>
          <div class="text-body2 text-grey-6 q-mt-sm">FitFamily quedó en revisión sin plan seleccionado.</div>
        </div>

        <q-form v-else @submit.prevent="submit">
          <div v-if="loading" class="q-py-xl text-center"><q-spinner-gears color="primary" size="48px" /></div>

          <template v-else>
            <div class="text-h6 text-weight-bold q-mb-md">Responsable</div>
            <div class="row q-col-gutter-md q-mb-lg">
              <div class="col-12 col-md-6"><q-input v-model="form.nombre" outlined label="Nombre completo" /></div>
              <div class="col-12 col-md-6"><q-input v-model="form.correo" outlined label="Correo" type="email" /></div>
              <div class="col-12 col-md-6"><q-input v-model="form.telefono" outlined label="Teléfono" /></div>
              <div class="col-12 col-md-6"><q-input v-model="form.whatsapp" outlined label="WhatsApp" /></div>
              <div class="col-12 col-md-6"><q-input v-model="form.ciudad" outlined label="Ciudad" /></div>
              <div class="col-12 col-md-6"><q-input v-model="form.direccion" outlined label="Dirección" /></div>
            </div>

            <div class="text-h6 text-weight-bold q-mb-md">Sistema que estamos diseñando</div>
            <div class="row q-col-gutter-md q-mb-lg">
              <div class="col-12 col-md-6"><q-input v-model="form.empresa_nombre" outlined label="Empresa" /></div>
              <div class="col-12 col-md-6"><q-input v-model="form.titulo_sistema" outlined label="Nombre del sistema" /></div>
              <div class="col-12"><q-input v-model="form.resumen" outlined type="textarea" label="Resumen" /></div>
            </div>

            <div class="text-h6 text-weight-bold q-mb-md">Cuestionario</div>
            <div class="q-gutter-lg">
              <q-card v-for="question in requiredQuestions" :key="question.id" flat bordered class="q-pa-md">
                <div class="text-subtitle1 text-weight-medium">{{ question.numero }}. {{ question.enunciado }}</div>
                <div v-if="question.ayuda" class="text-caption text-grey-6 q-mt-xs q-mb-sm">{{ question.ayuda }}</div>
                <q-input
                  v-if="!Array.isArray(question.opciones) || question.opciones.length === 0"
                  :model-value="answerValue(question)"
                  outlined
                  class="q-mt-md"
                  @update:model-value="value => setAnswer(question, value)"
                />
                <q-select
                  v-else
                  :model-value="answerValue(question)"
                  :options="question.opciones"
                  outlined
                  emit-value
                  map-options
                  class="q-mt-md"
                  :multiple="String(question.tipo || '').toLowerCase().includes('multiple')"
                  @update:model-value="value => setAnswer(question, value)"
                />
              </q-card>
            </div>

            <q-checkbox v-model="form.declaracion_aceptada" class="q-mt-lg" label="Declaro que la información proporcionada es correcta." />

            <div class="row justify-end q-mt-lg">
              <q-btn type="submit" color="primary" unelevated no-caps label="Enviar evaluación sin plan" :loading="sending" />
            </div>
          </template>
        </q-form>
      </q-card>
    </div>
  </div>
</template>

<style scoped>
.no-plan-page{min-height:100vh}
</style>
