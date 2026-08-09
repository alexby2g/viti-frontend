<script setup>
import { onMounted, reactive, ref } from 'vue'
import { useQuasar } from 'quasar'
import { api } from '../boot/axios'
import { formatDateTime } from '../utils/date'
import PageHeader from '../components/PageHeader.vue'

const $q = useQuasar()
const rows = ref([])
const dialog = ref(false)
const editing = ref(null)
const loading = ref(false)
const empty = () => ({ nombre:'', apellido:'', usuario:'', telefono:'', correo:'', rol:'administrador', estado:'activo', password:'', password_confirmation:'' })
const form = reactive(empty())
const columns = [
  { name:'actions', label:'', field:'actions', align:'left' },
  { name:'nombre', label:'Persona', field:r=>`${r.nombre} ${r.apellido||''}`, align:'left' },
  { name:'usuario', label:'Usuario', field:'usuario', align:'left' },
  { name:'telefono', label:'Teléfono', field:'telefono', align:'left' },
  { name:'rol', label:'Rol', field:'rol', align:'left' },
  { name:'estado', label:'Estado', field:'estado', align:'left' },
  { name:'ultimo_acceso', label:'Último acceso', field:'ultimo_acceso', align:'left' },
]

async function load() {
  loading.value = true
  try { rows.value = (await api.get('/usuarios')).data.data || [] }
  finally { loading.value = false }
}

function open(row = null) {
  editing.value = row
  Object.assign(form, empty(), row || {}, { password:'', password_confirmation:'' })
  dialog.value = true
}

async function save() {
  try {
    form.usuario = String(form.usuario || '').toLowerCase().trim()
    if (editing.value) await api.put(`/usuarios/${editing.value.id}`, form)
    else await api.post('/usuarios', form)
    $q.notify({ type:'positive', message:'Usuario guardado correctamente.' })
    dialog.value = false
    await load()
  } catch (e) {
    const errors = Object.values(e.response?.data?.errors || {}).flat()
    $q.notify({ type:'negative', message:errors[0] || e.response?.data?.message || 'No se pudo guardar el usuario.' })
  }
}

function remove(row) {
  const ownsAccount = Boolean(row.cliente_id)
  const message = ownsAccount
    ? `Se eliminará la cuenta @${row.usuario}, su cliente, empresas, solicitudes, proyectos, aplicaciones y pagos relacionados. Esta acción no se puede deshacer.`
    : `Se eliminará el acceso @${row.usuario}. Las empresas compartidas no serán eliminadas.`

  $q.dialog({
    title:'Eliminar usuario definitivamente',
    message,
    cancel:{ label:'Cancelar', flat:true },
    ok:{ label:'Sí, eliminar', color:'negative', unelevated:true },
    persistent:true,
  }).onOk(async () => {
    try {
      const { data } = await api.delete(`/usuarios/${row.id}`)
      $q.notify({ type:'positive', message:data.message || 'Usuario eliminado.' })
      await load()
    } catch (e) {
      $q.notify({ type:'negative', message:e.response?.data?.message || 'No se pudo eliminar el usuario.' })
    }
  })
}

onMounted(load)
</script>

<template>
  <q-page class="viti-page users-page">
    <PageHeader eyebrow="Administración" title="Usuarios de VITI" subtitle="Administra cuentas internas y accesos de clientes desde un solo lugar.">
      <q-btn class="responsive-primary-action" color="primary" unelevated icon="person_add" label="Nuevo usuario" no-caps @click="open()" />
    </PageHeader>

    <q-table v-if="$q.screen.gt.sm" flat class="viti-table" :rows="rows" :columns="columns" row-key="id" :loading="loading" :pagination="{rowsPerPage:20,sortBy:'id',descending:true}">
      <template #body-cell-actions="p"><q-td :props="p"><q-btn flat round dense icon="more_vert"><q-menu><q-list style="min-width:190px"><q-item clickable v-close-popup @click="open(p.row)"><q-item-section avatar><q-icon name="edit" /></q-item-section><q-item-section>Editar</q-item-section></q-item><q-item clickable v-close-popup class="text-negative" @click="remove(p.row)"><q-item-section avatar><q-icon name="delete_forever" /></q-item-section><q-item-section>Eliminar</q-item-section></q-item></q-list></q-menu></q-btn></q-td></template>
      <template #body-cell-estado="p"><q-td :props="p"><q-badge outline :color="p.value==='activo'?'positive':'grey'">{{p.value}}</q-badge></q-td></template>
      <template #body-cell-ultimo_acceso="p"><q-td :props="p">{{formatDateTime(p.value)}}</q-td></template>
    </q-table>

    <div v-else class="mobile-data-list">
      <q-inner-loading :showing="loading" />
      <q-card v-for="row in rows" :key="row.id" flat class="viti-card mobile-data-card">
        <q-card-section class="row items-start no-wrap">
          <q-avatar color="blue-1" text-color="primary" icon="person" />
          <div class="col q-ml-md min-width-0">
            <div class="text-subtitle1 text-weight-bold ellipsis">{{row.nombre}} {{row.apellido}}</div>
            <div class="text-primary text-weight-medium">@{{row.usuario}}</div>
            <div class="text-caption text-grey-6 q-mt-xs">{{row.telefono || 'Sin teléfono'}} · {{row.rol}}</div>
            <q-badge class="q-mt-sm" outline :color="row.estado==='activo'?'positive':'grey'">{{row.estado}}</q-badge>
          </div>
          <q-btn flat round dense icon="more_vert"><q-menu><q-list><q-item clickable v-close-popup @click="open(row)"><q-item-section avatar><q-icon name="edit" /></q-item-section><q-item-section>Editar</q-item-section></q-item><q-item clickable v-close-popup class="text-negative" @click="remove(row)"><q-item-section avatar><q-icon name="delete_forever" /></q-item-section><q-item-section>Eliminar</q-item-section></q-item></q-list></q-menu></q-btn>
        </q-card-section>
      </q-card>
      <div v-if="!rows.length && !loading" class="empty-state">No hay usuarios registrados.</div>
    </div>

    <q-dialog v-model="dialog">
      <q-card class="responsive-dialog-card">
        <q-card-section><div class="section-label">Usuario</div><div class="text-h5 text-weight-bold">{{editing?'Editar acceso':'Crear acceso'}}</div></q-card-section>
        <q-separator />
        <q-card-section><div class="row q-col-gutter-md">
          <div class="col-12 col-sm-6"><q-input v-model="form.nombre" outlined label="Nombre *" /></div>
          <div class="col-12 col-sm-6"><q-input v-model="form.apellido" outlined label="Apellido" /></div>
          <div class="col-12 col-sm-6"><q-input v-model="form.usuario" outlined label="Usuario *" autocomplete="username" @update:model-value="v=>form.usuario=String(v||'').toLowerCase().replace(/\s+/g,'')" /></div>
          <div class="col-12 col-sm-6"><q-input v-model="form.telefono" outlined label="Teléfono" inputmode="numeric" /></div>
          <div class="col-12"><q-input v-model="form.correo" outlined label="Correo opcional" type="email" /></div>
          <div class="col-12 col-sm-6"><q-select v-model="form.rol" outlined :options="['superadmin','administrador','soporte']" label="Rol" /></div>
          <div class="col-12 col-sm-6"><q-select v-model="form.estado" outlined :options="['activo','inactivo']" label="Estado" /></div>
          <div class="col-12 col-sm-6"><q-input v-model="form.password" outlined type="password" :label="editing?'Nueva contraseña (opcional)':'Contraseña *'" autocomplete="new-password" /></div>
          <div class="col-12 col-sm-6"><q-input v-model="form.password_confirmation" outlined type="password" label="Confirmar contraseña" autocomplete="new-password" /></div>
        </div></q-card-section>
        <q-card-actions align="right"><q-btn flat label="Cancelar" v-close-popup /><q-btn color="primary" unelevated label="Guardar" no-caps @click="save" /></q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>
