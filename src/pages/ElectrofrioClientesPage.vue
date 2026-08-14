<script setup>
import { computed, inject, onMounted, reactive, ref } from 'vue'
import { useQuasar } from 'quasar'
import { useRoute } from 'vue-router'
import { api } from '../boot/axios'

const $q = useQuasar()
const route = useRoute()
const canManageSource = inject('electrofrioCanManage', ref(false))
const loading = ref(false)
const saving = ref(false)
const clients = ref([])
const search = ref('')
const dialog = ref(false)
const accessDialog = ref(false)
const editingId = ref(null)
const selected = ref(null)

const form = reactive({ nombre:'', telefono:'', direccion:'', referencia:'', observaciones:'', activo:true })
const accessForm = reactive({ usuario:'', documento:'', telefono:'', password:'', password_confirmation:'' })

const clientMode = computed(() => route.path.startsWith('/mi-apps/electrofrio'))
const base = computed(() => clientMode.value ? '/mi/apps/electrofrio' : '/apps/electrofrio')
const canManage = computed(() => Boolean(canManageSource?.value ?? canManageSource))
const normalize = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
const rows = computed(() => {
  const term = normalize(search.value.trim())
  return [...clients.value]
    .sort((a,b) => Number(b.id) - Number(a.id))
    .filter(row => !term || normalize([row.nombre,row.telefono,row.direccion,row.referencia,row.observaciones].filter(Boolean).join(' ')).includes(term))
})

const columns = [
  {name:'nombre',label:'Cliente',field:'nombre',align:'left',sortable:true},
  {name:'telefono',label:'Teléfono',field:'telefono',align:'left'},
  {name:'direccion',label:'Dirección',field:'direccion',align:'left'},
  {name:'portal',label:'Portal',field:'acceso_estado',align:'center'},
  {name:'estado',label:'Estado',field:'activo',align:'center'},
  {name:'acciones',label:'',field:'id',align:'right'},
]

function resetForm(){
  editingId.value = null
  Object.assign(form,{nombre:'',telefono:'',direccion:'',referencia:'',observaciones:'',activo:true})
}
function openForm(row=null){
  resetForm()
  if(row){
    editingId.value = row.id
    Object.assign(form,{nombre:row.nombre||'',telefono:row.telefono||'',direccion:row.direccion||'',referencia:row.referencia||'',observaciones:row.observaciones||'',activo:Boolean(row.activo)})
  }
  dialog.value = true
}
function clean(source){ return Object.fromEntries(Object.entries(source).map(([key,value])=>[key,value===''?null:value])) }
function notifyError(error,fallback){
  const errors = error.response?.data?.errors
  const first = errors ? Object.values(errors).flat()[0] : null
  $q.notify({type:'negative',message:first || error.response?.data?.message || fallback})
}

async function load(){
  loading.value = true
  try{
    const response = await api.get(`${base.value}/clientes`)
    clients.value = response.data.data || []
  }catch(error){ notifyError(error,'No se pudieron cargar los clientes de Electrofrío.') }
  finally{ loading.value = false }
}

async function save(){
  if(!form.nombre.trim()){
    $q.notify({type:'warning',message:'Ingresa el nombre del cliente.'})
    return
  }
  saving.value = true
  try{
    const response = editingId.value
      ? await api.put(`${base.value}/clientes/${editingId.value}`,clean({...form}))
      : await api.post(`${base.value}/clientes`,clean({...form}))
    dialog.value = false
    $q.notify({type:'positive',message:editingId.value?'Cliente actualizado.':'Cliente registrado.'})
    await load()
    if(!editingId.value && response.data?.data?.id){
      const created = clients.value.find(item=>Number(item.id)===Number(response.data.data.id))
      if(created) clients.value = [created,...clients.value.filter(item=>Number(item.id)!==Number(created.id))]
    }
  }catch(error){ notifyError(error,'No se pudo guardar el cliente.') }
  finally{ saving.value = false }
}

function remove(row){
  $q.dialog({title:'Eliminar cliente',message:`¿Eliminar a ${row.nombre}? Si tiene órdenes, VITI protegerá su historial y no permitirá borrarlo.`,cancel:true,persistent:true}).onOk(async()=>{
    try{ await api.delete(`${base.value}/clientes/${row.id}`); await load(); $q.notify({type:'positive',message:'Cliente eliminado.'}) }
    catch(error){ notifyError(error,'No se pudo eliminar el cliente.') }
  })
}

function openAccess(row){
  selected.value = row
  Object.assign(accessForm,{
    usuario:row.acceso_usuario||'',documento:row.acceso_documento||'',telefono:row.acceso_telefono||row.telefono||'',password:'',password_confirmation:'',
  })
  accessDialog.value = true
}
async function saveAccess(){
  if(!selected.value) return
  saving.value = true
  try{
    await api.post(`${base.value}/clientes/${selected.value.id}/acceso`,{...accessForm})
    accessDialog.value = false
    $q.notify({type:'positive',message:'Acceso del cliente guardado.'})
    await load()
  }catch(error){ notifyError(error,'No se pudo guardar el acceso del cliente.') }
  finally{ saving.value = false }
}
function revokeAccess(row){
  $q.dialog({title:'Revocar acceso',message:`${row.nombre} ya no podrá entrar al portal, pero su historial se conservará.`,cancel:true,persistent:true}).onOk(async()=>{
    try{ await api.delete(`${base.value}/clientes/${row.id}/acceso`); await load(); $q.notify({type:'positive',message:'Acceso revocado.'}) }
    catch(error){ notifyError(error,'No se pudo revocar el acceso.') }
  })
}

onMounted(load)
</script>

<template>
  <q-page padding class="clients-page">
    <div class="row items-start justify-between q-col-gutter-md q-mb-lg">
      <div class="col-12 col-md">
        <div class="text-overline text-primary text-weight-bold">Clientes</div>
        <h1 class="text-h4 text-weight-bold q-my-xs">Clientes</h1>
        <div class="text-body2 text-grey-7">Datos de contacto y acceso al portal. Los equipos se administran únicamente desde el módulo Equipos.</div>
      </div>
      <div class="col-12 col-md-auto row q-gutter-sm">
        <q-btn outline color="primary" icon="refresh" label="Actualizar" no-caps :loading="loading" @click="load"/>
        <q-btn color="primary" icon="person_add" label="Nuevo cliente" no-caps @click="openForm()"/>
      </div>
    </div>

    <q-card flat bordered>
      <q-card-section><q-input v-model="search" outlined dense clearable debounce="180" label="Buscar cliente"><template #prepend><q-icon name="search"/></template></q-input></q-card-section>
      <q-separator/>
      <q-table flat :rows="rows" :columns="columns" row-key="id" :loading="loading" :grid="$q.screen.lt.md" :pagination="{rowsPerPage:20}" no-data-label="Aún no hay clientes registrados.">
        <template #body-cell-nombre="props"><q-td :props="props"><div class="text-weight-bold">{{props.row.nombre}}</div><div class="text-caption text-grey-7">Registro #{{props.row.id}}</div></q-td></template>
        <template #body-cell-portal="props"><q-td :props="props"><q-badge outline :color="props.row.acceso_usuario_id&&props.row.acceso_estado==='activo'?'positive':'grey'" :label="props.row.acceso_usuario_id?(props.row.acceso_estado==='activo'?'Habilitado':'Revocado'):'Sin acceso'"/></q-td></template>
        <template #body-cell-estado="props"><q-td :props="props"><q-badge :color="props.row.activo?'positive':'grey'" :label="props.row.activo?'Activo':'Inactivo'"/></q-td></template>
        <template #body-cell-acciones="props"><q-td :props="props">
          <q-btn v-if="canManage" flat round dense color="primary" icon="manage_accounts" @click="openAccess(props.row)"><q-tooltip>Acceso al portal</q-tooltip></q-btn>
          <q-btn v-if="canManage&&props.row.acceso_usuario_id&&props.row.acceso_estado==='activo'" flat round dense color="orange" icon="person_off" @click="revokeAccess(props.row)"><q-tooltip>Revocar acceso</q-tooltip></q-btn>
          <q-btn flat round dense icon="edit" @click="openForm(props.row)"/><q-btn flat round dense color="negative" icon="delete" @click="remove(props.row)"/>
        </q-td></template>
        <template #item="props"><div class="q-pa-xs col-12 col-sm-6"><q-card flat bordered class="client-card"><q-card-section><div class="row items-start no-wrap"><q-avatar color="primary" text-color="white" icon="person"/><div class="col q-ml-md"><div class="text-weight-bold">{{props.row.nombre}}</div><div class="text-caption text-grey-7">{{props.row.telefono||'Sin teléfono'}}</div><div class="text-body2 q-mt-xs">{{props.row.direccion||'Sin dirección'}}</div></div><q-btn flat round icon="edit" @click="openForm(props.row)"/></div></q-card-section></q-card></div></template>
      </q-table>
    </q-card>

    <q-dialog v-model="dialog" persistent><q-card style="width:720px;max-width:96vw"><q-card-section class="row items-center"><div class="text-h6 text-weight-bold">{{editingId?'Editar cliente':'Nuevo cliente'}}</div><q-space/><q-btn flat round icon="close" v-close-popup/></q-card-section><q-separator/><q-card-section class="row q-col-gutter-md"><div class="col-12 col-sm-6"><q-input v-model="form.nombre" outlined label="Nombre *"/></div><div class="col-12 col-sm-6"><q-input v-model="form.telefono" outlined label="Teléfono"/></div><div class="col-12"><q-input v-model="form.direccion" outlined label="Dirección"/></div><div class="col-12"><q-input v-model="form.referencia" outlined label="Referencia"/></div><div class="col-12"><q-input v-model="form.observaciones" type="textarea" autogrow outlined label="Observaciones"/></div><div class="col-12"><q-toggle v-model="form.activo" label="Cliente activo"/></div></q-card-section><q-card-actions align="right" class="q-pa-md"><q-btn flat label="Cancelar" no-caps v-close-popup/><q-btn color="primary" icon="save" label="Guardar" no-caps :loading="saving" @click="save"/></q-card-actions></q-card></q-dialog>

    <q-dialog v-model="accessDialog" persistent><q-card style="width:650px;max-width:96vw"><q-card-section class="row items-center"><div><div class="text-h6 text-weight-bold">Acceso al portal</div><div class="text-caption text-grey-7">{{selected?.nombre}}</div></div><q-space/><q-btn flat round icon="close" v-close-popup/></q-card-section><q-separator/><q-card-section class="row q-col-gutter-md"><div class="col-12 col-sm-6"><q-input v-model="accessForm.usuario" outlined label="Usuario *"/></div><div class="col-12 col-sm-6"><q-input v-model="accessForm.documento" outlined label="CI / documento"/></div><div class="col-12"><q-input v-model="accessForm.telefono" outlined label="Teléfono"/></div><div class="col-12 col-sm-6"><q-input v-model="accessForm.password" type="password" outlined :label="selected?.acceso_usuario_id?'Nueva contraseña (opcional)':'Contraseña *'"/></div><div class="col-12 col-sm-6"><q-input v-model="accessForm.password_confirmation" type="password" outlined label="Confirmar contraseña"/></div></q-card-section><q-card-actions align="right" class="q-pa-md"><q-btn flat label="Cancelar" no-caps v-close-popup/><q-btn color="primary" icon="save" label="Guardar acceso" no-caps :loading="saving" @click="saveAccess"/></q-card-actions></q-card></q-dialog>
  </q-page>
</template>

<style scoped>
.clients-page{max-width:1500px;margin:0 auto}.clients-page h1{color:var(--viti-text)}.client-card{height:100%;border-radius:16px}.q-card{border-color:var(--viti-border)}
@media(max-width:700px){.clients-page{padding:12px}.clients-page h1{font-size:25px;line-height:1.2}}
</style>
