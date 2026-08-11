<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useQuasar } from 'quasar'
import { api } from '../boot/axios'
import { formatDateTime } from '../utils/date'
import PageHeader from '../components/PageHeader.vue'

const $q = useQuasar()
const rows = ref([])
const dialog = ref(false)
const editing = ref(null)
const loading = ref(false)
const empty = () => ({ nombre:'', apellido:'', usuario:'', documento:'', telefono:'', correo:'', rol:'administrador', estado:'activo', password:'', password_confirmation:'', codigo_secreto:'' })
const form = reactive(empty())
const isClientAccount = row => Boolean(row?.cliente_id) || row?.rol === 'cliente'
const isPrimaryAccount = row => row?.rol === 'superadmin'
const roleLocked = computed(() => isClientAccount(editing.value) || isPrimaryAccount(editing.value))
const stateLocked = computed(() => isPrimaryAccount(editing.value))
const roleOptions = computed(() => {
  if (isClientAccount(editing.value)) return [{ label:'Cliente', value:'cliente' }]
  if (isPrimaryAccount(editing.value)) return [{ label:'Superadministrador principal', value:'superadmin' }]
  return [
    { label:'Administrador', value:'administrador' },
    { label:'Soporte interno', value:'soporte' },
  ]
})
const roleLabel = row => {
  if (isClientAccount(row)) return 'Cliente'
  if (row?.rol === 'superadmin') return 'Superadministrador principal'
  if (row?.rol === 'administrador') return 'Administrador'
  if (row?.rol === 'soporte') return 'Soporte interno'
  return row?.rol || 'Sin rol'
}
const columns = [
  { name:'actions', label:'', field:'actions', align:'left' },
  { name:'nombre', label:'Persona', field:r=>`${r.nombre} ${r.apellido||''}`, align:'left' },
  { name:'usuario', label:'Usuario', field:'usuario', align:'left' },
  { name:'documento', label:'CI', field:'documento', align:'left' },
  { name:'telefono', label:'Teléfono', field:'telefono', align:'left' },
  { name:'rol', label:'Tipo de cuenta', field:roleLabel, align:'left' },
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
  if (isClientAccount(row)) form.rol = 'cliente'
  if (isPrimaryAccount(row)) {
    form.rol = 'superadmin'
    form.estado = 'activo'
  }
  dialog.value = true
}

async function save() {
  try {
    form.usuario = String(form.usuario || '').toLowerCase().trim()
    form.documento = String(form.documento || '').replace(/\D/g,'')
    if (isClientAccount(editing.value)) form.rol = 'cliente'
    if (isPrimaryAccount(editing.value)) {
      form.rol = 'superadmin'
      form.estado = 'activo'
    }
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
  if (isPrimaryAccount(row)) {
    $q.notify({ type:'warning', message:'La cuenta principal del superadministrador está protegida.' })
    return
  }
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
    <PageHeader eyebrow="Administración" title="Cuentas y accesos" subtitle="Consulta clientes y crea accesos internos sin compartir tu cuenta de superadministrador.">
      <q-btn class="responsive-primary-action" color="primary" unelevated icon="person_add" label="Crear usuario interno" no-caps @click="open()" />
    </PageHeader>

    <q-banner rounded class="bg-blue-1 text-primary q-mb-lg">
      <template #avatar><q-icon name="verified_user" /></template>
      Las cuentas creadas desde un enlace conservan el rol <strong>Cliente</strong>. Las cuentas internas pueden ser <strong>Administrador</strong> o <strong>Soporte interno</strong>; soporte entra por el login principal y solo ve trabajo asignado.
    </q-banner>

    <q-table v-if="$q.screen.gt.sm" flat class="viti-table" :rows="rows" :columns="columns" row-key="id" :loading="loading" :pagination="{rowsPerPage:20,sortBy:'id',descending:true}">
      <template #body-cell-actions="p"><q-td :props="p"><q-btn flat round dense icon="more_vert"><q-menu><q-list style="min-width:190px"><q-item clickable v-close-popup @click="open(p.row)"><q-item-section avatar><q-icon name="edit" /></q-item-section><q-item-section>Editar datos</q-item-section></q-item><q-item v-if="!isPrimaryAccount(p.row)" clickable v-close-popup class="text-negative" @click="remove(p.row)"><q-item-section avatar><q-icon name="delete_forever" /></q-item-section><q-item-section>Eliminar</q-item-section></q-item></q-list></q-menu></q-btn></q-td></template>
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
            <div class="text-caption text-grey-6 q-mt-xs">CI {{row.documento || 'sin registrar'}} · {{row.telefono || 'Sin teléfono'}}</div>
            <div class="text-caption text-grey-6">{{roleLabel(row)}}</div>
            <q-badge class="q-mt-sm" outline :color="row.estado==='activo'?'positive':'grey'">{{row.estado}}</q-badge>
          </div>
          <q-btn flat round dense icon="more_vert"><q-menu><q-list><q-item clickable v-close-popup @click="open(row)"><q-item-section avatar><q-icon name="edit" /></q-item-section><q-item-section>Editar datos</q-item-section></q-item><q-item v-if="!isPrimaryAccount(row)" clickable v-close-popup class="text-negative" @click="remove(row)"><q-item-section avatar><q-icon name="delete_forever" /></q-item-section><q-item-section>Eliminar</q-item-section></q-item></q-list></q-menu></q-btn>
        </q-card-section>
      </q-card>
      <div v-if="!rows.length && !loading" class="empty-state">No hay usuarios registrados.</div>
    </div>

    <q-dialog v-model="dialog">
      <q-card class="responsive-dialog-card">
        <q-card-section><div class="section-label">{{isClientAccount(editing)?'Cuenta de cliente':'Usuario interno'}}</div><div class="text-h5 text-weight-bold">{{editing?'Editar datos de acceso':'Crear acceso interno'}}</div></q-card-section>
        <q-separator />
        <q-card-section>
          <q-banner v-if="roleLocked" dense rounded class="bg-blue-1 text-primary q-mb-md">
            <template #avatar><q-icon name="lock" /></template>
            {{isClientAccount(editing)?'Esta cuenta pertenece a un cliente. Su tipo de acceso está bloqueado como Cliente.':'Esta es la única cuenta principal y debe conservar el rol Superadministrador.'}}
          </q-banner>
          <div class="row q-col-gutter-md">
          <div class="col-12 col-sm-6"><q-input v-model="form.nombre" outlined label="Nombre *" /></div>
          <div class="col-12 col-sm-6"><q-input v-model="form.apellido" outlined label="Apellido" /></div>
          <div class="col-12 col-sm-6"><q-input v-model="form.usuario" outlined label="Usuario *" autocomplete="username" @update:model-value="v=>form.usuario=String(v||'').toLowerCase().replace(/\s+/g,'')" /></div>
          <div class="col-12 col-sm-6"><q-input v-model="form.documento" outlined :label="editing?'CI':'CI *'" inputmode="numeric" maxlength="15" hint="También sirve para iniciar sesión." @update:model-value="v=>form.documento=String(v||'').replace(/\D/g,'')" /></div>
          <div class="col-12 col-sm-6"><q-input v-model="form.telefono" outlined label="Teléfono" inputmode="numeric" @update:model-value="v=>form.telefono=String(v||'').replace(/\D/g,'')" /></div>
          <div class="col-12"><q-input v-model="form.correo" outlined label="Correo opcional" type="email" /></div>
          <div class="col-12 col-sm-6"><q-select v-model="form.rol" outlined emit-value map-options :options="roleOptions" label="Tipo de cuenta" :disable="roleLocked" /></div>
          <div class="col-12 col-sm-6"><q-select v-model="form.estado" outlined :options="['activo','inactivo']" label="Estado" :disable="stateLocked" /></div>
          <div class="col-12 col-sm-6"><q-input v-model="form.password" outlined type="password" :label="editing?'Nueva contraseña (opcional)':'Contraseña *'" autocomplete="new-password" /></div>
          <div class="col-12 col-sm-6"><q-input v-model="form.password_confirmation" outlined type="password" label="Confirmar contraseña" autocomplete="new-password" /></div>
          <div v-if="!editing" class="col-12"><q-input v-model="form.codigo_secreto" outlined type="password" label="Código secreto del superadministrador *" hint="Se valida una sola vez y no se guarda en la cuenta creada."><template #prepend><q-icon name="key" /></template></q-input></div>
        </div></q-card-section>
        <q-card-actions align="right"><q-btn flat label="Cancelar" v-close-popup /><q-btn color="primary" unelevated label="Guardar" no-caps @click="save" /></q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>
