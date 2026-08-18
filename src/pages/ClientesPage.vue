<script setup>
import { mediaUrl } from '../utils/media.js'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useQuasar } from 'quasar'
import { useRoute } from 'vue-router'
import { api } from '../boot/axios'
import { formatDateTime } from '../utils/date'
import PageHeader from '../components/PageHeader.vue'

const $q = useQuasar(), route = useRoute()
const rows = ref([]), loading = ref(false), dialog = ref(false), editing = ref(null), search = ref(''), step = ref(1), companyDialog = ref(false), companyEditing = ref(null), selectedClient = ref(null)
const emptyClient = () => ({ nombre:'', correo:'', telefono:'', whatsapp:'', documento:'', ci_expedido:'', ciudad:'', direccion:'', observaciones:'', estado:'prospecto' })
const emptyCompany = () => ({ nombre_comercial:'', actividad:'', telefono:'', whatsapp:'', ciudad:'', direccion:'', observaciones:'', estado:'prospecto' })
const form = reactive(emptyClient()), company = reactive(emptyCompany())
const columns = [
  {name:'actions',label:'',field:'actions',align:'left'},
  {name:'nombre',label:'Responsable',field:'nombre',align:'left',sortable:true},
  {name:'telefono',label:'Contacto',field:'telefono',align:'left'},
  {name:'empresas',label:'Empresa / microempresa',field:'empresas',align:'left'},
  {name:'solicitudes',label:'Solicitudes',field:'solicitudes_count',align:'center'},
  {name:'estado',label:'Estado',field:'estado',align:'left'},
  {name:'created_at',label:'Registrado',field:'created_at',align:'left'},
]
const currentCompanies = computed(() => selectedClient.value?.empresas || [])

async function load(){
  loading.value=true
  try{rows.value=(await api.get('/clientes',{params:{buscar:search.value,per_page:100}})).data.data}
  finally{loading.value=false}
}
function openNew(){editing.value=null;step.value=1;Object.assign(form,emptyClient());Object.assign(company,emptyCompany());dialog.value=true}
function openEdit(row){editing.value=row;step.value=1;Object.assign(form,emptyClient(),row);dialog.value=true}
async function save(){
  try{
    if(editing.value){
      await api.put(`/clientes/${editing.value.id}`,form)
      $q.notify({type:'positive',message:'Responsable actualizado.'})
    }else{
      const payload={cliente:{...form},empresa:company.nombre_comercial.trim()?{...company}:null}
      await api.post('/clientes/registro-completo',payload)
      $q.notify({type:'positive',message:company.nombre_comercial.trim()?'Empresa y responsable registrados.':'Responsable registrado.'})
    }
    dialog.value=false;await load()
  }catch(e){$q.notify({type:'negative',message:e.response?.data?.message||'No se pudo guardar.'})}
}
function openCompanies(row){selectedClient.value=row;companyEditing.value=null;Object.assign(company,emptyCompany(),{telefono:row.telefono,whatsapp:row.whatsapp,ciudad:row.ciudad,direccion:row.direccion});companyDialog.value=true}
function editCompany(item){companyEditing.value=item;Object.assign(company,emptyCompany(),item)}
async function saveCompany(){
  try{
    const payload={...company,cliente_id:selectedClient.value.id}
    if(companyEditing.value) await api.put(`/empresas/${companyEditing.value.id}`,payload)
    else await api.post('/empresas',payload)
    $q.notify({type:'positive',message:companyEditing.value?'Empresa actualizada.':'Empresa agregada al responsable.'})
    companyEditing.value=null;Object.assign(company,emptyCompany());await load()
    selectedClient.value=rows.value.find(x=>x.id===selectedClient.value.id) || selectedClient.value
  }catch(e){$q.notify({type:'negative',message:e.response?.data?.message||'No se pudo guardar la empresa.'})}
}
async function verifyPhoto(row){try{await api.put(`/clientes/${row.id}/verificar-foto`);$q.notify({type:'positive',message:row.foto_verificada?'Se retiró la verificación de la fotografía.':'Fotografía verificada.'});await load()}catch(e){$q.notify({type:'negative',message:e.response?.data?.message||'No se pudo verificar la fotografía.'})}}
function remove(row){$q.dialog({title:'Eliminar cuenta y empresas definitivamente',message:`Se eliminará a ${row.nombre}, su cuenta de usuario, empresas, solicitudes, proyectos, aplicaciones y pagos relacionados. Esta acción no se puede deshacer.`,cancel:{label:'Cancelar',flat:true},ok:{label:'Sí, eliminar todo',color:'negative',unelevated:true},persistent:true}).onOk(async()=>{try{const{data}=await api.delete(`/clientes/${row.id}`);$q.notify({type:'positive',message:data.message||'Cuenta eliminada.'});load()}catch(e){$q.notify({type:'negative',message:e.response?.data?.message||'No se puede eliminar.'})}})}
function removeCompany(item){$q.dialog({title:'Eliminar empresa',message:`¿Eliminar ${item.nombre_comercial}?`,cancel:true}).onOk(async()=>{try{await api.delete(`/empresas/${item.id}`);await load();selectedClient.value=rows.value.find(x=>x.id===selectedClient.value.id)}catch(e){$q.notify({type:'negative',message:e.response?.data?.message||'No se puede eliminar la empresa.'})}})}
onMounted(()=>{load();if(route.query.new)openNew()});watch(search,()=>{clearTimeout(window.__vitiClientSearch);window.__vitiClientSearch=setTimeout(load,350)})
</script>

<template>
<q-page class="viti-page">
  <PageHeader eyebrow="Empresas" title="Empresas y responsables" subtitle="Administra las empresas que usan VITI y la persona responsable de cada cuenta.">
    <q-btn color="primary" unelevated icon="add_business" label="Nueva cuenta" no-caps @click="openNew"/>
  </PageHeader>

  <q-table v-if="$q.screen.gt.sm" flat class="viti-table" :rows="rows" :columns="columns" row-key="id" :loading="loading" :pagination="{rowsPerPage:20,sortBy:'id',descending:true}">
    <template #top><q-input v-model="search" outlined dense placeholder="Buscar responsable, correo, teléfono o empresa" style="min-width:320px"><template #prepend><q-icon name="search"/></template></q-input></template>
    <template #body-cell-nombre="p"><q-td :props="p"><div class="row items-center no-wrap q-gutter-sm"><q-avatar size="34px" color="blue-1" text-color="primary"><img v-if="p.row.foto_path" :src="p.row.foto_url || mediaUrl(p.row.foto_path)"/><span v-else>{{p.row.nombre?.[0]||'R'}}</span></q-avatar><span>{{p.row.nombre}}</span></div></q-td></template>
    <template #body-cell-telefono="p"><q-td :props="p"><div>{{p.row.telefono}}</div><div v-if="p.row.correo" class="text-caption text-grey-6">{{p.row.correo}}</div></q-td></template>
    <template #body-cell-actions="p"><q-td :props="p"><q-btn flat round dense icon="more_vert"><q-menu><q-list style="min-width:210px"><q-item clickable v-close-popup @click="openEdit(p.row)"><q-item-section avatar><q-icon name="edit"/></q-item-section><q-item-section>Editar responsable</q-item-section></q-item><q-item v-if="p.row.foto_path" clickable v-close-popup @click="verifyPhoto(p.row)"><q-item-section avatar><q-icon :name="p.row.foto_verificada?'verified':'verified_user'"/></q-item-section><q-item-section>{{p.row.foto_verificada?'Quitar verificación de foto':'Verificar fotografía'}}</q-item-section></q-item><q-item clickable v-close-popup @click="openCompanies(p.row)"><q-item-section avatar><q-icon name="business"/></q-item-section><q-item-section>Empresas asociadas</q-item-section></q-item><q-separator/><q-item clickable v-close-popup class="text-negative" @click="remove(p.row)"><q-item-section avatar><q-icon name="delete_outline"/></q-item-section><q-item-section>Eliminar</q-item-section></q-item></q-list></q-menu></q-btn></q-td></template>
    <template #body-cell-empresas="p"><q-td :props="p"><div v-if="p.row.empresas?.length" class="column q-gutter-xs"><div v-for="e in p.row.empresas.slice(0,2)" :key="e.id"><q-badge outline color="primary">{{e.nombre_comercial}}</q-badge></div><span v-if="p.row.empresas.length>2" class="text-caption text-grey-6">+{{p.row.empresas.length-2}} más</span></div><q-btn v-else flat dense no-caps color="primary" icon="add_business" label="Agregar empresa" @click="openCompanies(p.row)"/></q-td></template>
    <template #body-cell-estado="p"><q-td :props="p"><q-badge outline color="primary">{{p.value}}</q-badge></q-td></template>
    <template #body-cell-created_at="p"><q-td :props="p">{{formatDateTime(p.value)}}</q-td></template>
    <template #no-data><div class="empty-state full-width"><q-icon name="business" size="52px"/><div class="text-h6 q-mt-sm">Aún no registraste empresas</div><div>Comienza registrando a la persona responsable y su empresa en un solo proceso.</div></div></template>
  </q-table>

  <div v-else class="mobile-data-list">
    <q-inner-loading :showing="loading" />
    <q-input v-model="search" outlined dense placeholder="Buscar responsable, correo, teléfono o empresa"><template #prepend><q-icon name="search"/></template></q-input>
    <q-card v-for="row in rows" :key="row.id" flat class="viti-card mobile-data-card">
      <q-card-section class="row items-start no-wrap">
        <q-avatar size="48px" color="blue-1" text-color="primary"><img v-if="row.foto_path" :src="row.foto_url || mediaUrl(row.foto_path)"/><span v-else>{{row.nombre?.[0]||'R'}}</span></q-avatar>
        <div class="col q-ml-md min-width-0"><div class="text-subtitle1 text-weight-bold ellipsis">{{row.nombre}}</div><div class="text-caption text-grey-6">Responsable · {{row.telefono}}</div><div v-if="row.correo" class="text-caption text-grey-6">{{row.correo}}</div><div class="q-mt-sm"><q-badge v-for="e in row.empresas?.slice(0,2)" :key="e.id" outline color="primary" class="q-mr-xs q-mb-xs">{{e.nombre_comercial}}</q-badge><span v-if="!row.empresas?.length" class="text-caption text-grey-6">Sin empresa registrada</span></div><div class="text-caption text-grey-6 q-mt-xs">{{row.solicitudes_count||0}} solicitudes · {{row.estado}}</div></div>
        <q-btn flat round dense icon="more_vert"><q-menu><q-list style="min-width:210px"><q-item clickable v-close-popup @click="openEdit(row)"><q-item-section avatar><q-icon name="edit"/></q-item-section><q-item-section>Editar responsable</q-item-section></q-item><q-item clickable v-close-popup @click="openCompanies(row)"><q-item-section avatar><q-icon name="business"/></q-item-section><q-item-section>Empresas asociadas</q-item-section></q-item><q-item v-if="row.foto_path" clickable v-close-popup @click="verifyPhoto(row)"><q-item-section avatar><q-icon name="verified_user"/></q-item-section><q-item-section>Verificar foto</q-item-section></q-item><q-separator/><q-item clickable v-close-popup class="text-negative" @click="remove(row)"><q-item-section avatar><q-icon name="delete_forever"/></q-item-section><q-item-section>Eliminar</q-item-section></q-item></q-list></q-menu></q-btn>
      </q-card-section>
    </q-card>
    <div v-if="!rows.length&&!loading" class="empty-state">No hay empresas registradas.</div>
  </div>

  <q-dialog v-model="dialog" persistent><q-card style="width:860px;max-width:95vw"><q-card-section><div class="section-label">{{editing?'Editar responsable':'Nuevo registro'}}</div><div class="text-h5 text-weight-bold">{{editing?'Actualizar datos del responsable':'Responsable y empresa'}}</div><div class="text-caption text-grey-6">{{editing?'La edición actualiza el mismo registro.':'Dos pasos claros, una sola cuenta de trabajo.'}}</div></q-card-section><q-separator/>
    <q-card-section v-if="editing"><div class="row q-col-gutter-md"><div class="col-12 col-sm-7"><q-input v-model="form.nombre" outlined label="Nombre completo *"/></div><div class="col-12 col-sm-5"><q-input v-model="form.telefono" outlined label="Teléfono *"/></div><div class="col-12"><q-input v-model="form.correo" outlined type="email" label="Correo electrónico" hint="Se usa para invitaciones y acceso VITI."/></div><div class="col-12 col-sm-4"><q-input v-model="form.whatsapp" outlined label="WhatsApp"/></div><div class="col-12 col-sm-3"><q-input v-model="form.documento" outlined label="Cédula de identidad"/></div><div class="col-12 col-sm-2"><q-input v-model="form.ci_expedido" outlined label="Expedido"/></div><div class="col-12 col-sm-4"><q-input v-model="form.ciudad" outlined label="Ciudad"/></div><div class="col-12"><q-input v-model="form.direccion" outlined label="Dirección"/></div><div class="col-12"><q-input v-model="form.observaciones" outlined type="textarea" label="Observaciones"/></div><div class="col-12 col-sm-4"><q-select v-model="form.estado" outlined :options="['prospecto','activo','inactivo']" label="Estado"/></div></div></q-card-section>
    <q-stepper v-else v-model="step" flat animated color="primary" class="bg-transparent">
      <q-step :name="1" title="Responsable" icon="person" :done="step>1"><div class="row q-col-gutter-md"><div class="col-12 col-sm-7"><q-input v-model="form.nombre" outlined label="Nombre completo *"/></div><div class="col-12 col-sm-5"><q-input v-model="form.telefono" outlined label="Teléfono *"/></div><div class="col-12"><q-input v-model="form.correo" outlined type="email" label="Correo electrónico" hint="Se usa para invitaciones y acceso VITI."/></div><div class="col-12 col-sm-4"><q-input v-model="form.whatsapp" outlined label="WhatsApp"/></div><div class="col-12 col-sm-3"><q-input v-model="form.documento" outlined label="Cédula de identidad"/></div><div class="col-12 col-sm-2"><q-input v-model="form.ci_expedido" outlined label="Expedido"/></div><div class="col-12 col-sm-4"><q-input v-model="form.ciudad" outlined label="Ciudad"/></div><div class="col-12"><q-input v-model="form.direccion" outlined label="Dirección"/></div><div class="col-12"><q-input v-model="form.observaciones" outlined type="textarea" label="Observaciones"/></div></div><q-stepper-navigation><q-btn color="primary" label="Siguiente: empresa" no-caps :disable="!form.nombre||!form.telefono" @click="Object.assign(company,{telefono:company.telefono||form.telefono,whatsapp:company.whatsapp||form.whatsapp,ciudad:company.ciudad||form.ciudad,direccion:company.direccion||form.direccion});step=2"/></q-stepper-navigation></q-step>
      <q-step :name="2" title="Empresa o microempresa" icon="business"><q-banner rounded class="bg-blue-1 text-primary q-mb-md">Si la persona responsable todavía no desea registrar su empresa, puedes dejar esta sección vacía y completarla más adelante.</q-banner><div class="row q-col-gutter-md"><div class="col-12 col-sm-7"><q-input v-model="company.nombre_comercial" outlined label="Nombre de la empresa o microempresa"/></div><div class="col-12 col-sm-5"><q-input v-model="company.actividad" outlined label="Actividad o rubro"/></div><div class="col-12 col-sm-4"><q-input v-model="company.telefono" outlined label="Teléfono"/></div><div class="col-12 col-sm-4"><q-input v-model="company.whatsapp" outlined label="WhatsApp"/></div><div class="col-12 col-sm-4"><q-input v-model="company.ciudad" outlined label="Ciudad"/></div><div class="col-12"><q-input v-model="company.direccion" outlined label="Dirección"/></div><div class="col-12"><q-input v-model="company.observaciones" outlined type="textarea" label="Observaciones"/></div></div><q-stepper-navigation><q-btn flat label="Atrás" @click="step=1"/><q-btn color="primary" label="Guardar cuenta" no-caps class="q-ml-sm" @click="save"/></q-stepper-navigation></q-step>
    </q-stepper>
    <q-card-actions v-if="editing" align="right"><q-btn flat label="Cancelar" v-close-popup/><q-btn color="primary" unelevated label="Guardar cambios" no-caps @click="save"/></q-card-actions><q-card-actions v-else align="left"><q-btn flat label="Cancelar" v-close-popup/></q-card-actions>
  </q-card></q-dialog>

  <q-dialog v-model="companyDialog"><q-card style="width:820px;max-width:95vw"><q-card-section><div class="section-label">Ficha del responsable</div><div class="text-h5 text-weight-bold">Empresas de {{selectedClient?.nombre}}</div><div class="text-caption text-grey-6">Administra sus empresas sin salir del módulo de Empresas.</div></q-card-section><q-separator/><q-card-section><q-list bordered separator class="rounded-borders q-mb-lg"><q-item v-for="e in currentCompanies" :key="e.id"><q-item-section avatar><q-avatar icon="business" color="blue-1" text-color="primary"/></q-item-section><q-item-section><q-item-label>{{e.nombre_comercial}}</q-item-label><q-item-label caption>{{e.actividad||'Sin actividad definida'}} · {{e.telefono||'Sin teléfono'}}</q-item-label></q-item-section><q-item-section side><div class="row"><q-btn flat round dense icon="edit" color="primary" @click="editCompany(e)"/><q-btn flat round dense icon="delete_outline" color="negative" @click="removeCompany(e)"/></div></q-item-section></q-item><div v-if="!currentCompanies.length" class="empty-state q-pa-lg">Este responsable todavía no tiene una empresa registrada.</div></q-list>
    <div class="text-subtitle1 text-weight-bold q-mb-md">{{companyEditing?'Editar empresa':'Agregar empresa'}}</div><div class="row q-col-gutter-md"><div class="col-12 col-sm-7"><q-input v-model="company.nombre_comercial" outlined label="Nombre comercial *"/></div><div class="col-12 col-sm-5"><q-input v-model="company.actividad" outlined label="Actividad"/></div><div class="col-12 col-sm-4"><q-input v-model="company.telefono" outlined label="Teléfono"/></div><div class="col-12 col-sm-4"><q-input v-model="company.whatsapp" outlined label="WhatsApp"/></div><div class="col-12 col-sm-4"><q-input v-model="company.ciudad" outlined label="Ciudad"/></div><div class="col-12"><q-input v-model="company.direccion" outlined label="Dirección"/></div></div></q-card-section><q-card-actions align="right"><q-btn flat label="Cerrar" v-close-popup/><q-btn color="primary" unelevated :label="companyEditing?'Guardar cambios':'Agregar empresa'" no-caps :disable="!company.nombre_comercial" @click="saveCompany"/></q-card-actions></q-card></q-dialog>
</q-page>
</template>