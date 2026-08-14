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
const sheetDialog = ref(false)
const equipmentDialog = ref(false)
const equipos = ref([])
const fichas = ref([])
const clientes = ref([])
const buscar = ref('')
const selected = ref(null)
const editingId = ref(null)
const sheetForm = ref(emptySheet())
const equipmentForm = reactive(emptyEquipment())

const clientMode = computed(() => route.path.startsWith('/mi-apps/electrofrio'))
const apiBase = computed(() => clientMode.value ? '/mi/apps/electrofrio' : '/apps/electrofrio')
const canManage = computed(() => Boolean(canManageSource?.value ?? canManageSource))
const activeClients = computed(() => [...clientes.value].filter(item=>item.activo).sort((a,b)=>Number(b.id)-Number(a.id)))

const columns = [
  { name:'equipo', label:'Equipo', field:'tipo', align:'left', sortable:true },
  { name:'cliente', label:'Cliente', field:'cliente_nombre', align:'left', sortable:true },
  { name:'gas', label:'Gas', field:row=>row.ficha?.gas_refrigerante || '', align:'left' },
  { name:'electricidad', label:'Electricidad', field:row=>row.ficha?.voltaje || '', align:'left' },
  { name:'presiones', label:'Presiones PSI', field:'id', align:'left' },
  { name:'estado', label:'Ficha', field:'id', align:'center' },
  { name:'acciones', label:'', field:'id', align:'right' },
]

const rows = computed(() => {
  const byEquipment = new Map(fichas.value.map(item => [Number(item.equipo_id), item]))
  const term = buscar.value.trim().toLowerCase()
  return [...equipos.value]
    .sort((a,b)=>Number(b.id)-Number(a.id))
    .map(equipo => ({ ...equipo, ficha:byEquipment.get(Number(equipo.id)) || null }))
    .filter(row => {
      if (!term) return true
      const haystack = [row.tipo,row.marca,row.modelo,row.serie,row.capacidad,row.ubicacion,row.cliente_nombre,row.ficha?.gas_refrigerante,row.ficha?.voltaje,row.ficha?.observaciones_tecnicas].filter(Boolean).join(' ').toLowerCase()
      return haystack.includes(term)
    })
})

function emptySheet(){ return {gas_refrigerante:'',voltaje:'',amperaje_nominal:null,presion_succion_psi:null,presion_descarga_psi:null,observaciones_tecnicas:''} }
function emptyEquipment(){ return {cliente_id:null,tipo:'Aire acondicionado',marca:'',modelo:'',serie:'',capacidad:'',ubicacion:'',observaciones:'',activo:true} }
function clean(source){ return Object.fromEntries(Object.entries(source).map(([key,value])=>[key,value===''?null:value])) }
function notifyError(error,fallback){
  const errors = error.response?.data?.errors
  const first = errors ? Object.values(errors).flat()[0] : null
  $q.notify({type:'negative',message:first || error.response?.data?.message || fallback})
}
function equipmentLabel(row){ return [row.tipo,row.marca,row.modelo].filter(Boolean).join(' · ') || 'Equipo' }

function openEquipment(row=null){
  editingId.value = row?.id || null
  Object.assign(equipmentForm,emptyEquipment())
  if(row) Object.assign(equipmentForm,{cliente_id:row.cliente_id,tipo:row.tipo||'Aire acondicionado',marca:row.marca||'',modelo:row.modelo||'',serie:row.serie||'',capacidad:row.capacidad||'',ubicacion:row.ubicacion||'',observaciones:row.observaciones||'',activo:Boolean(row.activo)})
  equipmentDialog.value = true
}

async function saveEquipment(){
  if(!equipmentForm.cliente_id || !String(equipmentForm.tipo||'').trim()){
    $q.notify({type:'warning',message:'Selecciona el cliente e indica el tipo de equipo.'})
    return
  }
  saving.value = true
  try{
    const response = editingId.value
      ? await api.put(`${apiBase.value}/equipos/${editingId.value}`,clean({...equipmentForm}))
      : await api.post(`${apiBase.value}/equipos`,clean({...equipmentForm}))
    equipmentDialog.value = false
    $q.notify({type:'positive',message:editingId.value?'Equipo actualizado.':'Equipo registrado.'})
    await load()
    if(!editingId.value && response.data?.data?.id){
      equipos.value.sort((a,b)=>Number(b.id)-Number(a.id))
    }
  }catch(error){notifyError(error,'No se pudo guardar el equipo.')}
  finally{saving.value = false}
}

function removeEquipment(row){
  $q.dialog({title:'Eliminar equipo',message:`¿Eliminar ${equipmentLabel(row)}? Si tiene historial de servicio, VITI no permitirá borrarlo.`,cancel:true,persistent:true}).onOk(async()=>{
    try{await api.delete(`${apiBase.value}/equipos/${row.id}`);await load();$q.notify({type:'positive',message:'Equipo eliminado.'})}
    catch(error){notifyError(error,'No se pudo eliminar el equipo.')}
  })
}

function openSheet(row){
  selected.value = row
  const ficha = row.ficha || {}
  sheetForm.value = {
    gas_refrigerante:ficha.gas_refrigerante || '',voltaje:ficha.voltaje || '',
    amperaje_nominal:ficha.amperaje_nominal == null ? null : Number(ficha.amperaje_nominal),
    presion_succion_psi:ficha.presion_succion_psi == null ? null : Number(ficha.presion_succion_psi),
    presion_descarga_psi:ficha.presion_descarga_psi == null ? null : Number(ficha.presion_descarga_psi),
    observaciones_tecnicas:ficha.observaciones_tecnicas || '',
  }
  sheetDialog.value = true
}

async function load(){
  loading.value = true
  try{
    const [equipmentResponse,sheetsResponse,clientsResponse] = await Promise.all([
      api.get(`${apiBase.value}/equipos`),api.get(`${apiBase.value}/fichas-tecnicas`),api.get(`${apiBase.value}/clientes`),
    ])
    equipos.value = (equipmentResponse.data.data || []).sort((a,b)=>Number(b.id)-Number(a.id))
    fichas.value = sheetsResponse.data.data || []
    clientes.value = clientsResponse.data.data || []
  }catch(error){notifyError(error,'No se pudieron cargar los equipos de Electrofrío.')}
  finally{loading.value = false}
}

async function saveSheet(){
  if(!selected.value || !canManage.value) return
  saving.value = true
  try{
    const response = await api.put(`${apiBase.value}/equipos/${selected.value.id}/ficha-tecnica`,sheetForm.value)
    const saved = response.data.data
    const index = fichas.value.findIndex(item => Number(item.equipo_id) === Number(selected.value.id))
    if(index >= 0) fichas.value.splice(index,1,saved); else fichas.value.unshift(saved)
    sheetDialog.value = false
    $q.notify({type:'positive',message:response.data.message || 'Ficha técnica guardada.'})
  }catch(error){notifyError(error,'No se pudo guardar la ficha técnica.')}
  finally{saving.value = false}
}

onMounted(load)
</script>

<template>
  <q-page padding class="electro-equipment-page">
    <div class="row items-start justify-between q-col-gutter-md q-mb-lg">
      <div class="col-12 col-md"><div class="text-overline text-primary text-weight-bold">Equipos</div><h1 class="text-h4 text-weight-bold q-my-xs">Equipos y ficha técnica</h1><div class="text-body2 text-grey-7">Este es el único módulo para registrar equipos, editar sus datos y mantener su ficha técnica.</div></div>
      <div class="col-12 col-md-auto row q-gutter-sm"><q-btn outline color="primary" icon="refresh" label="Actualizar" no-caps :loading="loading" @click="load"/><q-btn color="primary" icon="add" label="Nuevo equipo" no-caps @click="openEquipment()"/></div>
    </div>

    <q-card flat bordered class="sheet-summary q-mb-lg"><q-card-section class="row q-col-gutter-md items-center"><div class="col-12 col-sm-4"><div class="text-caption text-grey-7">Equipos registrados</div><div class="text-h5 text-weight-bold">{{equipos.length}}</div></div><div class="col-12 col-sm-4"><div class="text-caption text-grey-7">Con ficha técnica</div><div class="text-h5 text-weight-bold">{{fichas.length}}</div></div><div class="col-12 col-sm-4"><div class="text-caption text-grey-7">Pendientes de ficha</div><div class="text-h5 text-weight-bold">{{Math.max(0,equipos.length-fichas.length)}}</div></div></q-card-section></q-card>

    <q-card flat bordered><q-card-section><q-input v-model="buscar" outlined dense clearable debounce="180" label="Buscar equipo, cliente, gas o modelo" class="search-box"><template #prepend><q-icon name="search"/></template></q-input></q-card-section><q-separator/>
      <q-table flat :rows="rows" :columns="columns" row-key="id" :loading="loading" :grid="$q.screen.lt.md" :pagination="{rowsPerPage:15}" no-data-label="No hay equipos que coincidan con la búsqueda.">
        <template #body-cell-equipo="props"><q-td :props="props"><div class="text-weight-bold">{{equipmentLabel(props.row)}}</div><div class="text-caption text-grey-7">Registro #{{props.row.id}} · {{props.row.serie?`Serie ${props.row.serie}`:'Sin serie'}} · {{props.row.capacidad||'Capacidad sin registrar'}}</div></q-td></template>
        <template #body-cell-electricidad="props"><q-td :props="props"><div>{{props.row.ficha?.voltaje||'—'}}</div><div class="text-caption text-grey-7">{{props.row.ficha?.amperaje_nominal?`${props.row.ficha.amperaje_nominal} A`:'Amperaje sin registrar'}}</div></q-td></template>
        <template #body-cell-presiones="props"><q-td :props="props"><div>S: {{props.row.ficha?.presion_succion_psi??'—'}}</div><div class="text-caption text-grey-7">D: {{props.row.ficha?.presion_descarga_psi??'—'}}</div></q-td></template>
        <template #body-cell-estado="props"><q-td :props="props"><q-badge :color="props.row.ficha?'positive':'grey-6'" :label="props.row.ficha?'Registrada':'Pendiente'"/></q-td></template>
        <template #body-cell-acciones="props"><q-td :props="props"><q-btn flat round icon="edit" @click="openEquipment(props.row)"><q-tooltip>Editar equipo</q-tooltip></q-btn><q-btn flat round color="primary" icon="description" @click="openSheet(props.row)"><q-tooltip>Ficha técnica</q-tooltip></q-btn><q-btn flat round color="negative" icon="delete" @click="removeEquipment(props.row)"><q-tooltip>Eliminar equipo</q-tooltip></q-btn></q-td></template>
        <template #item="props"><div class="q-pa-sm col-12 col-sm-6"><q-card flat bordered class="equipment-card"><q-card-section><div class="row items-start justify-between no-wrap"><div><div class="text-weight-bold">{{equipmentLabel(props.row)}}</div><div class="text-caption text-grey-7">{{props.row.cliente_nombre}}</div></div><q-badge :color="props.row.ficha?'positive':'grey-6'" :label="props.row.ficha?'Ficha lista':'Sin ficha'"/></div><q-separator class="q-my-md"/><div class="row q-col-gutter-sm text-body2"><div class="col-6"><span class="text-grey-7">Gas:</span> {{props.row.ficha?.gas_refrigerante||'—'}}</div><div class="col-6"><span class="text-grey-7">Voltaje:</span> {{props.row.ficha?.voltaje||'—'}}</div><div class="col-6"><span class="text-grey-7">Succión:</span> {{props.row.ficha?.presion_succion_psi??'—'}} PSI</div><div class="col-6"><span class="text-grey-7">Descarga:</span> {{props.row.ficha?.presion_descarga_psi??'—'}} PSI</div></div></q-card-section><q-card-actions align="right"><q-btn flat icon="edit" label="Editar" no-caps @click="openEquipment(props.row)"/><q-btn flat color="primary" icon="description" label="Ficha" no-caps @click="openSheet(props.row)"/></q-card-actions></q-card></div></template>
      </q-table>
    </q-card>

    <q-dialog v-model="equipmentDialog" persistent><q-card style="width:760px;max-width:96vw"><q-card-section class="row items-center"><div class="text-h6 text-weight-bold">{{editingId?'Editar equipo':'Nuevo equipo'}}</div><q-space/><q-btn flat round icon="close" v-close-popup/></q-card-section><q-separator/><q-card-section class="row q-col-gutter-md"><div class="col-12"><q-select v-model="equipmentForm.cliente_id" outlined emit-value map-options :options="activeClients.map(item=>({label:item.nombre,value:item.id}))" label="Cliente *"/></div><div class="col-12 col-sm-6"><q-input v-model="equipmentForm.tipo" outlined label="Tipo de equipo *"/></div><div class="col-12 col-sm-6"><q-input v-model="equipmentForm.marca" outlined label="Marca"/></div><div class="col-12 col-sm-6"><q-input v-model="equipmentForm.modelo" outlined label="Modelo"/></div><div class="col-12 col-sm-6"><q-input v-model="equipmentForm.serie" outlined label="Serie"/></div><div class="col-12 col-sm-6"><q-input v-model="equipmentForm.capacidad" outlined label="Capacidad"/></div><div class="col-12 col-sm-6"><q-input v-model="equipmentForm.ubicacion" outlined label="Ubicación"/></div><div class="col-12"><q-input v-model="equipmentForm.observaciones" type="textarea" autogrow outlined label="Observaciones"/></div><div class="col-12"><q-toggle v-model="equipmentForm.activo" label="Equipo activo"/></div></q-card-section><q-card-actions align="right" class="q-pa-md"><q-btn flat label="Cancelar" no-caps v-close-popup/><q-btn color="primary" icon="save" label="Guardar equipo" no-caps :loading="saving" @click="saveEquipment"/></q-card-actions></q-card></q-dialog>

    <q-dialog v-model="sheetDialog" persistent><q-card style="width:760px;max-width:96vw"><q-card-section class="row items-start justify-between"><div><div class="text-h6 text-weight-bold">Ficha técnica</div><div class="text-caption text-grey-7">{{selected?equipmentLabel(selected):''}} · {{selected?.cliente_nombre}}</div></div><q-btn flat round dense icon="close" v-close-popup/></q-card-section><q-separator/><q-card-section class="q-gutter-md"><div class="row q-col-gutter-md"><div class="col-12 col-sm-6"><q-input v-model="sheetForm.gas_refrigerante" outlined label="Gas refrigerante" hint="Ej.: R410A, R32, R22" :readonly="!canManage"/></div><div class="col-12 col-sm-6"><q-input v-model="sheetForm.voltaje" outlined label="Voltaje" hint="Ej.: 220V" :readonly="!canManage"/></div><div class="col-12 col-sm-4"><q-input v-model.number="sheetForm.amperaje_nominal" type="number" step="0.01" outlined label="Amperaje nominal (A)" :readonly="!canManage"/></div><div class="col-12 col-sm-4"><q-input v-model.number="sheetForm.presion_succion_psi" type="number" step="0.01" outlined label="Presión succión (PSI)" :readonly="!canManage"/></div><div class="col-12 col-sm-4"><q-input v-model.number="sheetForm.presion_descarga_psi" type="number" step="0.01" outlined label="Presión descarga (PSI)" :readonly="!canManage"/></div><div class="col-12"><q-input v-model="sheetForm.observaciones_tecnicas" type="textarea" autogrow outlined label="Observaciones técnicas" :readonly="!canManage"/></div></div><q-banner v-if="!canManage" rounded class="bg-grey-2 text-grey-8">Tu rol puede consultar la ficha técnica, pero solo un propietario o administrador puede modificarla.</q-banner></q-card-section><q-card-actions align="right" class="q-pa-md"><q-btn flat label="Cerrar" no-caps v-close-popup/><q-btn v-if="canManage" color="primary" icon="save" label="Guardar ficha" no-caps :loading="saving" @click="saveSheet"/></q-card-actions></q-card></q-dialog>
  </q-page>
</template>

<style scoped>
.electro-equipment-page{max-width:1500px;margin:0 auto}.electro-equipment-page h1{color:var(--viti-text)}.sheet-summary{border-radius:18px;background:linear-gradient(135deg,color-mix(in srgb,var(--electro-primary) 8%,var(--viti-card)),var(--viti-card))}.search-box{max-width:560px}.equipment-card{height:100%;border-radius:16px}.q-card{border-color:var(--viti-border)}
@media(max-width:600px){.electro-equipment-page{padding:14px}.electro-equipment-page h1{font-size:25px;line-height:1.2}}
</style>
