<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useQuasar } from 'quasar'
import { api } from '../boot/axios'
import PageHeader from '../components/PageHeader.vue'

const $q = useQuasar()
const loading = ref(false)
const forms = ref([])
const current = ref(null)
const selectedSectionId = ref(null)
const formDialog = ref(false)
const sectionDialog = ref(false)
const questionDialog = ref(false)
const previewDialog = ref(false)
const previewSectionIndex = ref(0)
const editingForm = ref(null)
const editingSection = ref(null)
const editingQuestion = ref(null)
const formEdit = reactive({ nombre: '', version: '1.0', descripcion: '', activo: false })
const sectionEdit = reactive({ titulo: '', descripcion: '', activo: true, orden: 1 })
const questionEdit = reactive({ pregunta: '', tipo: 'texto', opciones_texto: '', ayuda: '', obligatoria: false, activo: true, orden: 1 })

const typeOptions = [
  { label: 'Texto', value: 'texto' },
  { label: 'Número', value: 'numero' },
  { label: 'Selección única', value: 'seleccion_unica' },
  { label: 'Selección múltiple', value: 'seleccion_multiple' },
]

const formOptions = computed(() => forms.value.map(row => ({ label: row.nombre, value: row.id, caption: `v${row.version} · ${row.secciones_count || 0} secciones` })))
const selectedSection = computed(() => current.value?.secciones?.find(x => Number(x.id) === Number(selectedSectionId.value)) || current.value?.secciones?.[0] || null)
const previewSections = computed(() => current.value?.secciones?.filter(s => s.activo).map(s => ({ ...s, preguntas: (s.preguntas || []).filter(q => q.activo && String(q.pregunta || '').trim()) })).filter(s => s.preguntas.length) || [])
const previewSection = computed(() => previewSections.value[previewSectionIndex.value] || null)
const allQuestions = computed(() => current.value?.secciones?.flatMap(s => s.preguntas || []) || [])
const activeQuestions = computed(() => allQuestions.value.filter(q => q.activo).length)
const totalResponses = computed(() => allQuestions.value.reduce((total, q) => total + Number(q.respuestas_count || 0), 0))
const selectedSectionPosition = computed(() => {
  const sections = current.value?.secciones || []
  const index = sections.findIndex(s => Number(s.id) === Number(selectedSection.value?.id))
  return index >= 0 ? index + 1 : 0
})

function message(error, fallback) {
  const errors = Object.values(error?.response?.data?.errors || {}).flat()
  return errors[0] || error?.response?.data?.message || fallback
}

async function loadForms(selectId = null) {
  loading.value = true
  try {
    const { data } = await api.get('/cuestionarios')
    forms.value = data?.data || []
    const id = selectId || current.value?.id || forms.value[0]?.id
    if (id) await selectForm(id)
    else current.value = null
  } finally {
    loading.value = false
  }
}

async function selectForm(id) {
  if (!id) return
  const { data } = await api.get(`/cuestionarios/${id}`)
  current.value = data?.data || null
  if (!current.value?.secciones?.some(s => Number(s.id) === Number(selectedSectionId.value))) {
    selectedSectionId.value = current.value?.secciones?.[0]?.id || null
  }
}

function openForm(row = null) {
  editingForm.value = row
  Object.assign(formEdit, { nombre: row?.nombre || '', version: row?.version || '1.0', descripcion: row?.descripcion || '', activo: !!row?.activo })
  formDialog.value = true
}

async function saveForm() {
  try {
    const payload = { nombre: formEdit.nombre, version: formEdit.version, descripcion: formEdit.descripcion || null, activo: formEdit.activo }
    const response = editingForm.value ? await api.put(`/cuestionarios/${editingForm.value.id}`, payload) : await api.post('/cuestionarios', payload)
    formDialog.value = false
    await loadForms(response.data?.data?.id)
    $q.notify({ type: 'positive', message: 'Formulario guardado.' })
  } catch (e) {
    $q.notify({ type: 'negative', message: message(e, 'No se pudo guardar el formulario.') })
  }
}

function removeForm(row) {
  $q.dialog({ title: 'Eliminar formulario', message: 'Solo se puede eliminar si nunca fue usado en una solicitud.', cancel: true, persistent: true, ok: { label: 'Eliminar', color: 'negative' } }).onOk(async () => {
    try {
      await api.delete(`/cuestionarios/${row.id}`)
      current.value = null
      await loadForms()
      $q.notify({ type: 'positive', message: 'Formulario eliminado.' })
    } catch (e) {
      $q.notify({ type: 'negative', message: message(e, 'No se pudo eliminar.') })
    }
  })
}

function openSection(row = null) {
  editingSection.value = row
  Object.assign(sectionEdit, { titulo: row?.titulo || '', descripcion: row?.descripcion || '', activo: row ? !!row.activo : true, orden: row?.orden || ((current.value?.secciones?.length || 0) + 1) })
  sectionDialog.value = true
}

async function saveSection() {
  try {
    const payload = { ...sectionEdit, descripcion: sectionEdit.descripcion || null }
    const response = editingSection.value ? await api.put(`/cuestionario-secciones/${editingSection.value.id}`, payload) : await api.post(`/cuestionarios/${current.value.id}/secciones`, payload)
    sectionDialog.value = false
    await selectForm(current.value.id)
    selectedSectionId.value = response.data?.data?.id || selectedSectionId.value
    $q.notify({ type: 'positive', message: 'Sección guardada.' })
  } catch (e) {
    $q.notify({ type: 'negative', message: message(e, 'No se pudo guardar la sección.') })
  }
}

function removeSection(row) {
  $q.dialog({ title: 'Eliminar sección', message: 'Si contiene respuestas históricas, VITI impedirá eliminarla y podrás desactivarla.', cancel: true, persistent: true, ok: { label: 'Eliminar', color: 'negative' } }).onOk(async () => {
    try {
      await api.delete(`/cuestionario-secciones/${row.id}`)
      await selectForm(current.value.id)
      $q.notify({ type: 'positive', message: 'Sección eliminada.' })
    } catch (e) {
      $q.notify({ type: 'negative', message: message(e, 'No se pudo eliminar la sección.') })
    }
  })
}

function openQuestion(row = null) {
  editingQuestion.value = row
  Object.assign(questionEdit, {
    pregunta: row?.pregunta || '',
    tipo: row?.tipo || 'texto',
    opciones_texto: (row?.opciones || []).join('\n'),
    ayuda: row?.ayuda || '',
    obligatoria: row ? !!row.obligatoria : false,
    activo: row ? !!row.activo : true,
    orden: row?.orden || ((selectedSection.value?.preguntas?.length || 0) + 1),
  })
  questionDialog.value = true
}

async function saveQuestion() {
  const options = questionEdit.opciones_texto.split(/\n/).map(x => x.trim()).filter(Boolean)
  const payload = { pregunta: questionEdit.pregunta, tipo: questionEdit.tipo, opciones: options, ayuda: questionEdit.ayuda || null, obligatoria: questionEdit.obligatoria, activo: questionEdit.activo, orden: questionEdit.orden }
  try {
    if (editingQuestion.value) await api.put(`/cuestionario-preguntas/${editingQuestion.value.id}`, payload)
    else await api.post(`/cuestionario-secciones/${selectedSection.value.id}/preguntas`, payload)
    questionDialog.value = false
    await selectForm(current.value.id)
    $q.notify({ type: 'positive', message: 'Pregunta guardada.' })
  } catch (e) {
    $q.notify({ type: 'negative', message: message(e, 'No se pudo guardar la pregunta.') })
  }
}

async function duplicateQuestion(row) {
  try {
    await api.post(`/cuestionario-preguntas/${row.id}/duplicar`)
    await selectForm(current.value.id)
    $q.notify({ type: 'positive', message: 'Pregunta duplicada. Ahora puedes editar la copia.' })
  } catch (e) {
    $q.notify({ type: 'negative', message: message(e, 'No se pudo duplicar.') })
  }
}

function removeQuestion(row) {
  $q.dialog({ title: 'Eliminar pregunta', message: 'Si ya tiene respuestas, VITI protegerá el historial y no permitirá borrarla.', cancel: true, persistent: true, ok: { label: 'Eliminar', color: 'negative' } }).onOk(async () => {
    try {
      await api.delete(`/cuestionario-preguntas/${row.id}`)
      await selectForm(current.value.id)
      $q.notify({ type: 'positive', message: 'Pregunta eliminada.' })
    } catch (e) {
      $q.notify({ type: 'negative', message: message(e, 'No se pudo eliminar la pregunta.') })
    }
  })
}

async function quickToggle(kind, row) {
  try {
    if (kind === 'form') await api.put(`/cuestionarios/${row.id}`, { activo: !row.activo })
    if (kind === 'section') await api.put(`/cuestionario-secciones/${row.id}`, { activo: !row.activo })
    if (kind === 'question') await api.put(`/cuestionario-preguntas/${row.id}`, { activo: !row.activo })
    await loadForms(current.value?.id)
  } catch (e) {
    $q.notify({ type: 'negative', message: message(e, 'No se pudo cambiar el estado.') })
  }
}

function typeLabel(type) {
  return typeOptions.find(x => x.value === type)?.label || type
}

function openPreview() {
  previewSectionIndex.value = 0
  previewDialog.value = true
}

function selectPreviewSection(index) {
  previewSectionIndex.value = index
}

function questionOptionsText(question) {
  const options = question?.opciones || []
  if (!options.length) return ''
  const visible = options.slice(0, 4).join(' · ')
  return options.length > 4 ? `${visible} · +${options.length - 4}` : visible
}

onMounted(loadForms)
</script>

<template>
  <q-page class="viti-page forms-admin-page">
    <PageHeader eyebrow="Administración" title="Formularios VITI" subtitle="Organiza el levantamiento por secciones y edita una pregunta a la vez.">
      <q-btn outline color="primary" icon="add" label="Nuevo formulario" no-caps @click="openForm()" />
    </PageHeader>

    <q-banner rounded class="history-note q-mb-lg">
      <template #avatar><q-icon name="shield" color="orange" /></template>
      <div><b>Historial protegido.</b><span> Las preguntas con respuestas se conservan para no perder trazabilidad. Puedes desactivarlas o duplicarlas.</span></div>
    </q-banner>

    <section class="workspace-toolbar">
      <div class="form-switcher">
        <div class="switcher-label">FORMULARIO ACTUAL</div>
        <q-select
          :model-value="current?.id || null"
          :options="formOptions"
          emit-value
          map-options
          outlined
          dense
          options-dense
          label="Seleccionar formulario"
          @update:model-value="selectForm"
        >
          <template #option="scope">
            <q-item v-bind="scope.itemProps">
              <q-item-section>
                <q-item-label>{{ scope.opt.label }}</q-item-label>
                <q-item-label caption>{{ scope.opt.caption }}</q-item-label>
              </q-item-section>
            </q-item>
          </template>
        </q-select>
      </div>

      <div v-if="current" class="workspace-summary">
        <div class="summary-pill"><q-icon name="view_list" /><span><b>{{ current.secciones?.length || 0 }}</b> secciones</span></div>
        <div class="summary-pill"><q-icon name="quiz" /><span><b>{{ activeQuestions }}</b> preguntas activas</span></div>
        <div class="summary-pill"><q-icon name="forum" /><span><b>{{ totalResponses }}</b> respuestas</span></div>
      </div>

      <div v-if="current" class="workspace-actions">
        <q-btn outline color="primary" icon="visibility" label="Vista previa" no-caps @click="openPreview" />
        <q-btn flat round icon="edit" @click="openForm(current)"><q-tooltip>Editar formulario</q-tooltip></q-btn>
        <q-btn flat round :icon="current.activo ? 'toggle_on' : 'toggle_off'" :color="current.activo ? 'positive' : 'grey'" @click="quickToggle('form', current)"><q-tooltip>{{ current.activo ? 'Desactivar' : 'Activar' }}</q-tooltip></q-btn>
        <q-btn flat round color="negative" icon="delete" @click="removeForm(current)"><q-tooltip>Eliminar</q-tooltip></q-btn>
      </div>
    </section>

    <q-inner-loading :showing="loading" dark />

    <section v-if="current" class="builder-shell">
      <aside class="sections-rail">
        <div class="rail-head">
          <div>
            <div class="rail-kicker">ESTRUCTURA</div>
            <h3>Secciones</h3>
          </div>
          <q-btn round unelevated color="primary" icon="add" size="sm" @click="openSection()"><q-tooltip>Nueva sección</q-tooltip></q-btn>
        </div>

        <div v-if="!current.secciones?.length" class="empty-state compact">
          <q-icon name="segment" />
          <b>Aún no hay secciones</b>
          <span>Crea la primera para comenzar.</span>
        </div>

        <button
          v-for="(section, index) in current.secciones || []"
          :key="section.id"
          type="button"
          class="section-nav-item"
          :class="{ active: selectedSection?.id === section.id, inactive: !section.activo }"
          @click="selectedSectionId = section.id"
        >
          <span class="section-step">{{ index + 1 }}</span>
          <span class="section-nav-copy">
            <b>{{ section.titulo }}</b>
            <small>{{ section.preguntas?.length || 0 }} preguntas</small>
          </span>
          <q-btn flat round dense icon="more_horiz" size="sm" @click.stop>
            <q-menu>
              <q-list dense style="min-width:190px">
                <q-item clickable v-close-popup @click="openSection(section)"><q-item-section avatar><q-icon name="edit" /></q-item-section><q-item-section>Editar sección</q-item-section></q-item>
                <q-item clickable v-close-popup @click="quickToggle('section', section)"><q-item-section avatar><q-icon :name="section.activo ? 'visibility_off' : 'visibility'" /></q-item-section><q-item-section>{{ section.activo ? 'Desactivar' : 'Activar' }}</q-item-section></q-item>
                <q-separator />
                <q-item clickable v-close-popup class="text-negative" @click="removeSection(section)"><q-item-section avatar><q-icon name="delete" /></q-item-section><q-item-section>Eliminar</q-item-section></q-item>
              </q-list>
            </q-menu>
          </q-btn>
        </button>

        <q-btn class="add-section-btn" flat color="primary" icon="add" label="Agregar sección" no-caps @click="openSection()" />
      </aside>

      <main class="questions-canvas">
        <div v-if="selectedSection" class="canvas-head">
          <div class="canvas-heading">
            <div class="canvas-kicker">SECCIÓN {{ selectedSectionPosition }} DE {{ current.secciones?.length || 0 }}</div>
            <h2>{{ selectedSection.titulo }}</h2>
            <p>{{ selectedSection.descripcion || 'Agrega preguntas claras y breves para esta parte del levantamiento.' }}</p>
          </div>
          <q-btn color="primary" unelevated icon="add" label="Nueva pregunta" no-caps @click="openQuestion()" />
        </div>

        <div v-if="selectedSection && !selectedSection.preguntas?.length" class="empty-state questions-empty">
          <q-icon name="quiz" />
          <b>Esta sección está lista para recibir preguntas</b>
          <span>Empieza con una sola pregunta y agrega las demás cuando las necesites.</span>
          <q-btn color="primary" unelevated icon="add" label="Crear pregunta" no-caps @click="openQuestion()" />
        </div>

        <div v-else-if="selectedSection" class="question-list">
          <article
            v-for="(question, index) in selectedSection.preguntas || []"
            :key="question.id"
            class="question-row"
            :class="{ inactive: !question.activo, blank: !String(question.pregunta || '').trim() }"
            @click="openQuestion(question)"
          >
            <div class="question-index">{{ index + 1 }}</div>
            <div class="question-copy">
              <div class="question-title">{{ question.pregunta || 'Pregunta sin texto' }}</div>
              <div class="question-meta">
                <span>{{ typeLabel(question.tipo) }}</span>
                <span v-if="question.obligatoria" class="required-meta">Obligatoria</span>
                <span>{{ question.respuestas_count || 0 }} respuestas</span>
                <span v-if="!question.activo">Inactiva</span>
              </div>
              <div v-if="question.ayuda" class="question-help"><q-icon name="info" />{{ question.ayuda }}</div>
              <div v-if="question.opciones?.length" class="options-preview"><q-icon name="list" />{{ questionOptionsText(question) }}</div>
            </div>
            <q-btn flat round dense icon="more_vert" @click.stop>
              <q-menu>
                <q-list dense style="min-width:200px">
                  <q-item clickable v-close-popup @click="openQuestion(question)"><q-item-section avatar><q-icon name="edit" /></q-item-section><q-item-section>Editar</q-item-section></q-item>
                  <q-item clickable v-close-popup @click="duplicateQuestion(question)"><q-item-section avatar><q-icon name="content_copy" /></q-item-section><q-item-section>Duplicar</q-item-section></q-item>
                  <q-item clickable v-close-popup @click="quickToggle('question', question)"><q-item-section avatar><q-icon :name="question.activo ? 'visibility_off' : 'visibility'" /></q-item-section><q-item-section>{{ question.activo ? 'Desactivar' : 'Activar' }}</q-item-section></q-item>
                  <q-separator />
                  <q-item clickable v-close-popup class="text-negative" @click="removeQuestion(question)"><q-item-section avatar><q-icon name="delete" /></q-item-section><q-item-section>Eliminar</q-item-section></q-item>
                </q-list>
              </q-menu>
            </q-btn>
          </article>

          <button type="button" class="question-add-row" @click="openQuestion()">
            <q-icon name="add_circle_outline" />
            <span><b>Agregar otra pregunta</b><small>Se añadirá al final de esta sección.</small></span>
          </button>
        </div>
      </main>
    </section>

    <div v-else-if="!loading" class="no-form-state">
      <q-icon name="description" />
      <h3>No hay formularios todavía</h3>
      <p>Crea un formulario y organiza el levantamiento por secciones.</p>
      <q-btn color="primary" unelevated icon="add" label="Crear formulario" no-caps @click="openForm()" />
    </div>

    <q-dialog v-model="previewDialog" maximized transition-show="fade" transition-hide="fade">
      <q-card class="preview-dialog">
        <header class="preview-topbar">
          <div>
            <div class="preview-kicker">VISTA PREVIA</div>
            <b>{{ current?.nombre }}</b>
          </div>
          <div class="preview-progress-copy">Sección {{ previewSectionIndex + 1 }} de {{ previewSections.length || 1 }}</div>
          <q-btn flat round icon="close" v-close-popup />
        </header>

        <div v-if="previewSections.length" class="preview-workspace">
          <aside class="preview-steps">
            <button v-for="(section, index) in previewSections" :key="section.id" type="button" :class="{ active: index === previewSectionIndex }" @click="selectPreviewSection(index)">
              <span>{{ index + 1 }}</span>
              <div><b>{{ section.titulo }}</b><small>{{ section.preguntas.length }} preguntas</small></div>
            </button>
          </aside>

          <main v-if="previewSection" class="preview-stage">
            <div class="preview-stage-inner">
              <div class="preview-stage-count">PASO {{ previewSectionIndex + 1 }}</div>
              <h1>{{ previewSection.titulo }}</h1>
              <p v-if="previewSection.descripcion">{{ previewSection.descripcion }}</p>
              <q-linear-progress rounded size="7px" :value="(previewSectionIndex + 1) / previewSections.length" color="primary" track-color="blue-grey-10" class="q-mt-lg q-mb-xl" />

              <div class="preview-question-list">
                <div v-for="question in previewSection.preguntas" :key="question.id" class="preview-question-block">
                  <label>{{ question.pregunta }} <span v-if="question.obligatoria">*</span></label>
                  <small v-if="question.ayuda">{{ question.ayuda }}</small>
                  <q-input v-if="question.tipo === 'texto'" outlined disable type="textarea" autogrow placeholder="Escribe tu respuesta" />
                  <q-input v-else-if="question.tipo === 'numero'" outlined disable type="number" placeholder="0" />
                  <q-option-group v-else-if="question.tipo === 'seleccion_unica'" disable type="radio" :options="(question.opciones || []).map(x => ({ label: x, value: x }))" />
                  <q-option-group v-else disable type="checkbox" :options="(question.opciones || []).map(x => ({ label: x, value: x }))" />
                </div>
              </div>

              <div class="preview-nav">
                <q-btn flat no-caps icon="arrow_back" label="Anterior" :disable="previewSectionIndex === 0" @click="previewSectionIndex--" />
                <q-btn color="primary" unelevated no-caps :label="previewSectionIndex === previewSections.length - 1 ? 'Finalizar vista previa' : 'Continuar'" :icon-right="previewSectionIndex === previewSections.length - 1 ? 'check' : 'arrow_forward'" @click="previewSectionIndex === previewSections.length - 1 ? previewDialog = false : previewSectionIndex++" />
              </div>
            </div>
          </main>
        </div>

        <div v-else class="preview-empty"><q-icon name="visibility_off" /><b>No hay contenido activo para previsualizar.</b></div>
      </q-card>
    </q-dialog>

    <q-dialog v-model="formDialog">
      <q-card class="editor-card">
        <q-card-section><div class="text-overline text-orange">FORMULARIO</div><div class="text-h5 text-weight-bold">{{ editingForm ? 'Editar formulario' : 'Nuevo formulario' }}</div></q-card-section>
        <q-card-section class="q-gutter-md"><q-input v-model="formEdit.nombre" outlined label="Nombre *" /><q-input v-model="formEdit.version" outlined label="Versión" /><q-input v-model="formEdit.descripcion" outlined type="textarea" autogrow label="Descripción" /><q-toggle v-model="formEdit.activo" label="Usar como formulario activo" color="positive" /></q-card-section>
        <q-card-actions align="right" class="q-pa-md"><q-btn flat label="Cancelar" no-caps v-close-popup /><q-btn color="primary" label="Guardar" no-caps @click="saveForm" /></q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="sectionDialog">
      <q-card class="editor-card">
        <q-card-section><div class="text-overline text-orange">SECCIÓN</div><div class="text-h5 text-weight-bold">{{ editingSection ? 'Editar sección' : 'Nueva sección' }}</div></q-card-section>
        <q-card-section class="q-gutter-md"><q-input v-model="sectionEdit.titulo" outlined label="Título *" /><q-input v-model="sectionEdit.descripcion" outlined type="textarea" autogrow label="Descripción" /><q-input v-model.number="sectionEdit.orden" outlined type="number" min="1" label="Orden" /><q-toggle v-model="sectionEdit.activo" label="Visible en el formulario" color="positive" /></q-card-section>
        <q-card-actions align="right" class="q-pa-md"><q-btn flat label="Cancelar" no-caps v-close-popup /><q-btn color="primary" label="Guardar" no-caps @click="saveSection" /></q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="questionDialog" position="right">
      <q-card class="question-drawer">
        <q-card-section class="drawer-head">
          <div><div class="text-overline text-orange">PREGUNTA</div><div class="text-h5 text-weight-bold">{{ editingQuestion ? 'Editar pregunta' : 'Nueva pregunta' }}</div></div>
          <q-btn flat round icon="close" v-close-popup />
        </q-card-section>
        <q-separator />
        <q-card-section class="drawer-body q-gutter-lg">
          <div v-if="editingQuestion?.respuestas_count" class="protected-note"><q-icon name="lock" /><span>Tiene {{ editingQuestion.respuestas_count }} respuestas. Duplica la pregunta si necesitas cambiar su significado.</span></div>
          <q-input v-model="questionEdit.pregunta" outlined type="textarea" autogrow label="Pregunta *" />
          <q-select v-model="questionEdit.tipo" outlined emit-value map-options :options="typeOptions" label="Tipo de respuesta *" />
          <q-input v-if="['seleccion_unica', 'seleccion_multiple'].includes(questionEdit.tipo)" v-model="questionEdit.opciones_texto" outlined type="textarea" autogrow label="Opciones" hint="Una opción por línea" />
          <q-input v-model="questionEdit.ayuda" outlined type="textarea" autogrow label="Texto de ayuda (opcional)" />
          <div class="drawer-settings">
            <q-input v-model.number="questionEdit.orden" outlined type="number" min="1" label="Orden" />
            <q-toggle v-model="questionEdit.obligatoria" label="Obligatoria" color="orange" />
            <q-toggle v-model="questionEdit.activo" label="Activa" color="positive" />
          </div>
        </q-card-section>
        <q-space />
        <q-card-actions align="right" class="drawer-actions"><q-btn flat label="Cancelar" no-caps v-close-popup /><q-btn color="primary" unelevated label="Guardar pregunta" no-caps @click="saveQuestion" /></q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<style scoped>
.forms-admin-page{max-width:1580px}.history-note{background:#0c2238;border:1px solid rgba(242,139,48,.22);color:#c8d5e1}.history-note span{color:#91a8ba}.workspace-toolbar{display:grid;grid-template-columns:minmax(260px,360px) minmax(0,1fr) auto;gap:16px;align-items:end;background:#0b1e33;border:1px solid #24435f;border-radius:18px;padding:16px 18px;margin-bottom:16px}.switcher-label,.rail-kicker,.canvas-kicker,.preview-kicker,.preview-stage-count{font-size:9px;font-weight:900;letter-spacing:.14em;color:#f28b30}.form-switcher :deep(.q-field--outlined .q-field__control){background:#07192a;border-radius:12px}.workspace-summary{display:flex;flex-wrap:wrap;gap:8px;align-items:center}.summary-pill{display:flex;align-items:center;gap:7px;border:1px solid rgba(88,123,154,.22);background:#081a2c;border-radius:999px;padding:8px 11px;color:#a9bdcd;font-size:11px}.summary-pill .q-icon{color:#f28b30}.summary-pill b{color:#f2f7fb}.workspace-actions{display:flex;align-items:center;gap:4px;justify-content:flex-end}.builder-shell{display:grid;grid-template-columns:290px minmax(0,1fr);min-height:650px;background:#0b1e33;border:1px solid #24435f;border-radius:20px;overflow:hidden}.sections-rail{border-right:1px solid rgba(100,133,164,.18);background:#091a2c}.rail-head{display:flex;align-items:center;justify-content:space-between;padding:20px 18px 14px}.rail-head h3{margin:3px 0 0;font-size:20px}.section-nav-item{width:100%;display:flex;align-items:center;gap:11px;text-align:left;background:transparent;border:0;border-left:3px solid transparent;color:#dce7f1;padding:12px 10px 12px 14px;cursor:pointer;transition:.16s ease}.section-nav-item:hover{background:#0d243d}.section-nav-item.active{background:#102a47;border-left-color:#f28b30}.section-nav-item.inactive{opacity:.5}.section-step{display:grid;place-items:center;flex:0 0 30px;width:30px;height:30px;border-radius:10px;background:#152d46;color:#f28b30;font-size:11px;font-weight:900}.section-nav-copy{min-width:0;flex:1}.section-nav-copy b,.section-nav-copy small{display:block}.section-nav-copy b{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px}.section-nav-copy small{color:#8099ad;font-size:10px;margin-top:3px}.add-section-btn{width:calc(100% - 24px);margin:12px}.questions-canvas{min-width:0;background:linear-gradient(180deg,#0b1e33 0%,#091a2c 100%)}.canvas-head{display:flex;align-items:flex-start;justify-content:space-between;gap:24px;padding:28px 30px 22px;border-bottom:1px solid rgba(100,133,164,.16)}.canvas-heading{max-width:760px}.canvas-heading h2{margin:5px 0 6px;font-size:28px;line-height:1.15}.canvas-heading p{margin:0;color:#8fa7bb;line-height:1.55}.question-list{padding:14px 18px 28px}.question-row{display:grid;grid-template-columns:38px minmax(0,1fr) 38px;gap:12px;align-items:flex-start;padding:16px 12px;border-bottom:1px solid rgba(100,133,164,.14);cursor:pointer;transition:.15s ease}.question-row:first-child{border-top:1px solid rgba(100,133,164,.14)}.question-row:hover{background:#0f2741}.question-row.inactive{opacity:.5}.question-row.blank{box-shadow:inset 3px 0 #ef5350}.question-index{display:grid;place-items:center;width:32px;height:32px;border-radius:10px;background:#142d47;color:#f28b30;font-weight:900;font-size:11px}.question-copy{min-width:0}.question-title{font-size:14px;font-weight:750;line-height:1.45;color:#eef5fb}.question-meta{display:flex;flex-wrap:wrap;gap:6px;margin-top:7px}.question-meta span{font-size:9px;border:1px solid rgba(111,143,171,.18);border-radius:999px;padding:3px 7px;color:#8fa7bb}.question-meta .required-meta{border-color:rgba(242,139,48,.26);color:#f3a45d}.question-help,.options-preview{display:flex;align-items:flex-start;gap:6px;color:#7f99ad;font-size:10px;line-height:1.5;margin-top:8px}.options-preview{color:#9cafbe}.question-help .q-icon,.options-preview .q-icon{font-size:14px;color:#6483a0;margin-top:1px}.question-add-row{width:100%;display:flex;align-items:center;gap:10px;border:1px dashed rgba(91,126,158,.35);border-radius:14px;background:rgba(7,25,42,.45);color:#9fb2c3;text-align:left;padding:15px 17px;margin-top:14px;cursor:pointer}.question-add-row:hover{border-color:#f28b30;color:#eaf2f9}.question-add-row>.q-icon{font-size:23px;color:#f28b30}.question-add-row b,.question-add-row small{display:block}.question-add-row small{font-size:10px;color:#7892a7;margin-top:2px}.empty-state{display:flex;flex-direction:column;align-items:center;text-align:center;color:#829bae}.empty-state>.q-icon{font-size:38px;color:#50708d;margin-bottom:10px}.empty-state b{color:#d8e5ef}.empty-state span{font-size:11px;max-width:340px;line-height:1.5;margin-top:4px}.empty-state.compact{padding:34px 16px}.questions-empty{padding:90px 24px}.questions-empty .q-btn{margin-top:18px}.no-form-state{display:flex;min-height:420px;flex-direction:column;align-items:center;justify-content:center;text-align:center;background:#0b1e33;border:1px solid #24435f;border-radius:20px;color:#8fa7bb}.no-form-state>.q-icon{font-size:54px;color:#52728f}.no-form-state h3{color:#e9f1f7;margin:12px 0 4px}.no-form-state p{margin:0 0 18px}.editor-card{width:620px;max-width:94vw;background:#0b1e33;color:#edf4fb}.editor-card :deep(.q-field--outlined .q-field__control),.question-drawer :deep(.q-field--outlined .q-field__control){background:#07192a!important}.editor-card :deep(.q-field__label),.question-drawer :deep(.q-field__label){color:#91a7b9!important}.editor-card :deep(.q-field__native),.editor-card :deep(.q-field__input),.question-drawer :deep(.q-field__native),.question-drawer :deep(.q-field__input){color:#edf4fb!important}.question-drawer{width:520px;max-width:100vw;height:100vh;display:flex;flex-direction:column;background:#0b1e33;color:#edf4fb;border-left:1px solid #294761}.drawer-head{display:flex;align-items:flex-start;justify-content:space-between;padding:22px 22px 18px}.drawer-body{overflow:auto;padding:22px}.protected-note{display:flex;gap:9px;align-items:flex-start;border:1px solid rgba(242,139,48,.22);background:rgba(242,139,48,.07);color:#c9d6df;border-radius:12px;padding:12px;font-size:11px;line-height:1.5}.protected-note .q-icon{color:#f28b30;font-size:18px}.drawer-settings{display:grid;grid-template-columns:130px 1fr 1fr;gap:12px;align-items:center}.drawer-actions{padding:16px 20px;border-top:1px solid rgba(100,133,164,.16)}.preview-dialog{background:#06111f;color:#edf4fb}.preview-topbar{height:72px;display:grid;grid-template-columns:1fr auto 1fr;align-items:center;padding:0 24px;border-bottom:1px solid rgba(100,133,164,.18);background:#071522}.preview-topbar>div:first-child b{display:block;margin-top:2px}.preview-topbar>.q-btn{justify-self:end}.preview-progress-copy{color:#8fa7bb;font-size:11px}.preview-workspace{display:grid;grid-template-columns:280px minmax(0,1fr);min-height:calc(100vh - 72px)}.preview-steps{padding:24px 12px;border-right:1px solid rgba(100,133,164,.15);background:#081829;overflow:auto}.preview-steps button{width:100%;display:flex;align-items:center;gap:10px;text-align:left;border:0;border-radius:12px;background:transparent;color:#9db0c0;padding:10px;cursor:pointer}.preview-steps button.active{background:#102a47;color:#eef5fb}.preview-steps button>span{display:grid;place-items:center;flex:0 0 28px;width:28px;height:28px;border-radius:50%;background:#142c45;color:#f28b30;font-size:10px;font-weight:900}.preview-steps b,.preview-steps small{display:block}.preview-steps b{font-size:11px}.preview-steps small{color:#718ca3;font-size:9px;margin-top:2px}.preview-stage{overflow:auto;background:radial-gradient(circle at 90% 5%,rgba(20,87,184,.14),transparent 28rem),#071522}.preview-stage-inner{width:min(780px,calc(100% - 40px));margin:0 auto;padding:64px 0 90px}.preview-stage h1{font-size:clamp(32px,4vw,48px);line-height:1.08;margin:8px 0 9px}.preview-stage>div>p{color:#96aabc;line-height:1.6}.preview-question-list{display:grid;gap:22px}.preview-question-block{padding:22px;background:#0b1e33;border:1px solid #294761;border-radius:18px}.preview-question-block label{display:block;font-size:15px;font-weight:800;line-height:1.45;margin-bottom:6px}.preview-question-block label span{color:#f28b30}.preview-question-block>small{display:block;color:#8199ad;margin-bottom:13px;line-height:1.45}.preview-question-block :deep(.q-field--outlined .q-field__control){background:#07192a!important}.preview-nav{display:flex;align-items:center;justify-content:space-between;margin-top:28px}.preview-empty{height:calc(100vh - 72px);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;color:#829bae}.preview-empty .q-icon{font-size:48px}@media(max-width:1120px){.workspace-toolbar{grid-template-columns:1fr auto}.workspace-summary{grid-column:1/-1;grid-row:2}.builder-shell{grid-template-columns:245px minmax(0,1fr)}}@media(max-width:760px){.workspace-toolbar{grid-template-columns:1fr}.workspace-actions{justify-content:flex-start}.workspace-summary{grid-row:auto}.builder-shell{grid-template-columns:1fr}.sections-rail{border-right:0;border-bottom:1px solid rgba(100,133,164,.18);max-height:330px;overflow:auto}.canvas-head{padding:22px 18px;flex-direction:column}.question-list{padding:10px 8px 20px}.preview-workspace{grid-template-columns:1fr}.preview-steps{display:flex;border-right:0;border-bottom:1px solid rgba(100,133,164,.16);padding:10px;overflow:auto}.preview-steps button{min-width:210px}.preview-stage-inner{padding-top:34px}.preview-topbar{grid-template-columns:1fr auto}.preview-progress-copy{display:none}.drawer-settings{grid-template-columns:1fr}.question-drawer{width:100vw}.question-row{grid-template-columns:34px minmax(0,1fr) 34px}}
</style>
