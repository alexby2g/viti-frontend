<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useQuasar } from 'quasar'
import { api } from '../../boot/axios'

const props = defineProps({ proyecto: { type: Object, required: true } })
const $q = useQuasar()
const loading = ref(false)
const saving = ref(false)
const dialog = ref(false)
const editingId = ref(null)
const tasks = ref([])
const summary = ref({})
const error = ref('')
const statuses = [
  { label: 'Pendiente', value: 'pendiente', icon: 'schedule', color: 'grey-5' },
  { label: 'En desarrollo', value: 'en_desarrollo', icon: 'code', color: 'blue-4' },
  { label: 'En revisión', value: 'en_revision', icon: 'fact_check', color: 'amber-5' },
  { label: 'Bloqueada', value: 'bloqueada', icon: 'block', color: 'red-4' },
  { label: 'Completada', value: 'completada', icon: 'task_alt', color: 'positive' },
]
const priorities = [
  { label: 'Baja', value: 'baja' }, { label: 'Media', value: 'media' },
  { label: 'Alta', value: 'alta' }, { label: 'Crítica', value: 'critica' },
]
const areas = ['general', 'analisis', 'diseno', 'frontend', 'backend', 'movil', 'infraestructura', 'qa']
const empty = () => ({
  titulo: '', descripcion: '', criterios_aceptacion: '',
  area: 'general', prioridad: 'media', estado: 'pendiente',
  responsable_id: null, fecha_limite: null,
})
const form = reactive(empty())
const canEdit = computed(() => !['cancelado', 'finalizado'].includes(props.proyecto?.estado))
const total = computed(() => Number(summary.value.total || 0))
const completed = computed(() => Number(summary.value.completadas || 0))
const assignees = computed(() => {
  const result = []
  const ids = new Set()
  const add = (user) => {
    if (!user?.id || ids.has(Number(user.id))) return
    ids.add(Number(user.id))
    result.push({ value: Number(user.id), label: [user.nombre, user.apellido].filter(Boolean).join(' ') })
  }
  add(props.proyecto?.responsable)
  for (const member of props.proyecto?.miembros || []) {
    if (member.activo !== false) add(member.usuario)
  }
  return result
})

async function load() {
  if (!props.proyecto?.id) return
  loading.value = true
  error.value = ''
  try {
    const response = await api.get('/proyectos/' + props.proyecto.id + '/tareas')
    tasks.value = Array.isArray(response.data?.data) ? response.data.data : []
    summary.value = response.data?.summary || {}
  } catch (e) {
    error.value = e?.response?.data?.message || 'No se pudo cargar el tablero.'
  } finally {
    loading.value = false
  }
}
function openNew() {
  editingId.value = null
  Object.assign(form, empty())
  dialog.value = true
}
function openEdit(task) {
  editingId.value = task.id
  Object.assign(form, empty(), {
    titulo: task.titulo,
    descripcion: task.descripcion || '',
    criterios_aceptacion: task.criterios_aceptacion || '',
    area: task.area, prioridad: task.prioridad, estado: task.estado,
    responsable_id: task.responsable_id, fecha_limite: task.fecha_limite || null,
  })
  dialog.value = true
}
function notifyFailure(e) {
  const firstError = Object.values(e?.response?.data?.errors || {})[0]
  $q.notify({ type: 'negative', message: (Array.isArray(firstError) && firstError[0]) || e?.response?.data?.message || 'No se pudo guardar.' })
}
async function save() {
  if (!canEdit.value || saving.value) return
  saving.value = true
  try {
    const payload = {
      ...form, titulo: String(form.titulo).trim(),
      descripcion: String(form.descripcion || '').trim() || null,
      criterios_aceptacion: String(form.criterios_aceptacion || '').trim() || null,
      responsable_id: form.responsable_id == null ? null : Number(form.responsable_id),
      fecha_limite: form.fecha_limite || null,
    }
    const base = '/proyectos/' + props.proyecto.id + '/tareas'
    if (editingId.value) await api.patch(base + '/' + editingId.value, payload)
    else await api.post(base, payload)
    dialog.value = false
    $q.notify({ type: 'positive', message: editingId.value ? 'Tarea actualizada.' : 'Tarea creada.' })
    await load()
  } catch (e) {
    notifyFailure(e)
  } finally {
    saving.value = false
  }
}
async function move(task, newStatus) {
  if (!canEdit.value || !newStatus || task.estado === newStatus) return
  if (newStatus === 'completada' && !String(task.criterios_aceptacion || '').trim()) {
    $q.notify({ type: 'warning', message: 'Define criterios de aceptación antes de completar.' })
    openEdit(task)
    form.estado = newStatus
    return
  }
  try {
    await api.patch('/proyectos/' + props.proyecto.id + '/tareas/' + task.id, { estado: newStatus })
    await load()
    $q.notify({ type: 'positive', message: 'Estado actualizado.' })
  } catch (e) {
    notifyFailure(e)
  }
}
function columnTasks(status) { return tasks.value.filter(t => t.estado === status) }
function priorityColor(p) { return { baja: 'grey-5', media: 'blue-4', alta: 'warning', critica: 'negative' }[p] || 'grey-5' }
function formatDue(d) {
  if (!d) return ''
  const v = String(d).slice(0, 10).split('-')
  return v.length === 3 ? v[2] + '/' + v[1] + '/' + v[0] : d
}
onMounted(load)
watch(() => props.proyecto?.id, load)
</script>

<template>
  <q-card flat class="viti-card project-task-board q-mt-lg">
    <q-card-section class="row items-center q-gutter-sm">
      <div class="col">
        <div class="section-label">Planificación técnica</div>
        <div class="text-h6 text-weight-bold">Tablero de tareas</div>
        <div class="text-caption text-grey-5">Gestiona tareas internas sin cambiar automáticamente el progreso del proyecto.</div>
      </div>
      <q-badge outline color="primary">{{ completed }} de {{ total }} completadas</q-badge>
      <q-btn outline no-caps icon="refresh" label="Actualizar" :loading="loading" @click="load"/>
      <q-btn v-if="canEdit" color="primary" unelevated no-caps icon="add_task" label="Nueva tarea" @click="openNew"/>
    </q-card-section>
    <q-separator/>
    <q-card-section>
      <q-banner v-if="error" rounded class="bg-red-10 text-white q-mb-md">{{ error }}</q-banner>
      <div v-if="total" class="q-mb-md">
        <q-linear-progress rounded size="8px" :value="completed / total" color="positive"/>
        <div class="text-caption text-grey-5 q-mt-xs">{{ total }} tareas · {{ summary.bloqueadas || 0 }} bloqueadas</div>
      </div>
      <div v-if="!loading && !tasks.length" class="task-empty">
        <q-icon name="view_kanban" size="38px"/>
        <div>Este trabajo todavía no tiene tareas. Crea la primera para organizar su desarrollo.</div>
      </div>
      <div class="task-scroll">
        <div class="task-columns">
          <section v-for="column in statuses" :key="column.value" class="task-column" :aria-label="column.label">
            <div class="task-column-header">
              <q-icon :name="column.icon" :color="column.color" size="18px"/>
              <strong>{{ column.label }}</strong>
              <q-space/>
              <q-badge color="blue-grey-9">{{ columnTasks(column.value).length }}</q-badge>
            </div>
            <article v-for="task in columnTasks(column.value)" :key="task.id" class="task-item">
              <div class="row items-center no-wrap">
                <q-badge outline :color="priorityColor(task.prioridad)">{{ task.prioridad }}</q-badge>
                <q-space/>
                <q-btn v-if="canEdit" flat dense round size="xs" color="grey-4" icon="edit" :aria-label="'Editar tarea '+task.titulo" @click="openEdit(task)"/>
              </div>
              <strong class="task-title">{{ task.titulo }}</strong>
              <p v-if="task.descripcion" class="task-description">{{ task.descripcion }}</p>
              <small class="task-meta"><q-icon name="layers"/>{{ task.area }}</small>
              <small v-if="task.responsable" class="task-meta"><q-icon name="person"/>{{ task.responsable.nombre }} {{ task.responsable.apellido || '' }}</small>
              <small v-if="task.fecha_limite" class="task-meta"><q-icon name="event"/>{{ formatDue(task.fecha_limite) }}</small>
              <small v-if="task.criterios_aceptacion" class="task-meta"><q-icon name="checklist"/>Criterios definidos</small>
              <q-select
                v-if="canEdit" dense outlined emit-value map-options class="q-mt-sm"
                :model-value="task.estado" :options="statuses"
                option-value="value" option-label="label" label="Mover a"
                @update:model-value="value => move(task, value)"
              />
            </article>
            <div v-if="!columnTasks(column.value).length" class="task-empty-col">Sin tareas</div>
          </section>
        </div>
      </div>
    </q-card-section>
  </q-card>

  <q-dialog v-model="dialog" persistent>
    <q-card class="task-dialog">
      <q-card-section class="row items-center">
        <div class="text-h6">{{ editingId ? 'Editar tarea' : 'Nueva tarea' }}</div>
        <q-space/>
        <q-btn flat round dense icon="close" v-close-popup aria-label="Cerrar"/>
      </q-card-section>
      <q-separator/>
      <q-card-section class="row q-col-gutter-md">
        <div class="col-12"><q-input v-model="form.titulo" outlined label="Título *" maxlength="200" counter/></div>
        <div class="col-12"><q-input v-model="form.descripcion" outlined autogrow type="textarea" label="Descripción" maxlength="5000"/></div>
        <div class="col-12"><q-input v-model="form.criterios_aceptacion" outlined autogrow type="textarea" label="Criterios de aceptación" hint="Qué debemos comprobar antes de completar la tarea."/></div>
        <div class="col-12 col-sm-6"><q-select v-model="form.area" outlined :options="areas" label="Área"/></div>
        <div class="col-12 col-sm-6"><q-select v-model="form.prioridad" outlined emit-value map-options :options="priorities" label="Prioridad"/></div>
        <div class="col-12 col-sm-6"><q-select v-model="form.estado" outlined emit-value map-options :options="statuses" option-value="value" option-label="label" label="Estado"/></div>
        <div class="col-12 col-sm-6"><q-select v-model="form.responsable_id" outlined emit-value map-options clearable :options="assignees" label="Responsable" hint="Solo miembros activos del trabajo."/></div>
        <div class="col-12 col-sm-6"><q-input v-model="form.fecha_limite" type="date" outlined stack-label clearable label="Fecha límite"/></div>
        <div class="col-12 text-caption text-grey-5">No se modificará la fase del proyecto ni se enviará esta tarea al cliente.</div>
      </q-card-section>
      <q-card-actions align="right">
        <q-btn flat no-caps label="Cancelar" v-close-popup/>
        <q-btn color="primary" unelevated no-caps icon="save" label="Guardar tarea" :loading="saving" :disable="!form.titulo.trim()" @click="save"/>
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<style scoped>
.project-task-board{overflow:hidden}
.task-scroll{max-width:100%;overflow-x:auto;padding-bottom:6px}
.task-columns{min-width:1070px;display:grid;grid-template-columns:repeat(5,minmax(204px,1fr));gap:12px}
.task-column{border:1px solid var(--viti-border,rgba(118,170,203,.2));background:rgba(5,24,45,.52);border-radius:12px;min-height:210px;padding:10px;display:flex;flex-direction:column;gap:9px}
.task-column-header{display:flex;align-items:center;gap:5px;padding:3px 2px 9px;border-bottom:1px solid rgba(140,170,205,.16);font-size:12px}
.task-item{display:grid;gap:6px;background:rgba(22,51,77,.8);border:1px solid rgba(120,169,205,.22);border-radius:9px;padding:10px;overflow-wrap:anywhere}
.task-title{font-size:13px;line-height:1.4}
.task-description{font-size:12px;line-height:1.5;color:#bdccdd;margin:0;white-space:pre-line}
.task-meta{display:flex;gap:5px;align-items:center;font-size:11px;color:#aabdd1}
.task-empty{display:grid;justify-items:center;gap:8px;padding:23px 8px;color:#92a8ba;text-align:center;font-size:13px}
.task-empty-col{padding:12px 0;text-align:center;color:#8b9fb0;font-size:12px}
.task-dialog{width:680px;max-width:96vw;max-height:90vh;overflow:auto}
</style>
