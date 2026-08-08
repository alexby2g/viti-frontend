<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useQuasar } from 'quasar'
import { api } from '../boot/axios'

const $q=useQuasar()
const base='/mi/apps/peluqueria'
const tab=ref('servicios'),loading=ref(false),servicios=ref([]),combos=ref([]),dialog=ref(false),type=ref('servicio'),editing=ref(null)
const serviceForm=reactive({nombre:'',categoria:'',duracion_minutos:30,precio:0,descripcion:'',activo:true})
const comboForm=reactive({nombre:'',categoria:'Combo',duracion_minutos:60,precio:0,descripcion:'',activo:true,servicio_ids:[]})
const serviceOptions=computed(()=>servicios.value.filter(x=>x.activo).map(x=>({label:`${x.nombre} · ${Number(x.precio||0).toFixed(2)} Bs`,value:x.id})))
const money=v=>`${Number(v||0).toFixed(2)} Bs`
const error=(e,m='No se pudo completar la operación.')=>$q.notify({type:'negative',message:e.response?.data?.message||m})

async function load(){loading.value=true;try{const [s,c]=await Promise.all([api.get(`${base}/servicios`),api.get(`${base}/combos`)]);servicios.value=(s.data.data||[]).filter(x=>x.tipo!=='combo');combos.value=c.data.data||[]}catch(e){error(e,'No se pudo cargar el catálogo.')}finally{loading.value=false}}
function open(kind,row=null){type.value=kind;editing.value=row;if(kind==='servicio')Object.assign(serviceForm,{nombre:'',categoria:'',duracion_minutos:30,precio:0,descripcion:'',activo:true},row||{});else Object.assign(comboForm,{nombre:'',categoria:'Combo',duracion_minutos:60,precio:0,descripcion:'',activo:true,servicio_ids:row?.componentes?.map(x=>x.id)||[]},row||{}, {servicio_ids:row?.componentes?.map(x=>x.id)||[]});dialog.value=true}
async function save(){try{if(type.value==='servicio'){editing.value?await api.put(`${base}/servicios/${editing.value.id}`,serviceForm):await api.post(`${base}/servicios`,serviceForm)}else{editing.value?await api.put(`${base}/combos/${editing.value.id}`,comboForm):await api.post(`${base}/combos`,comboForm)}dialog.value=false;$q.notify({type:'positive',message:type.value==='combo'?'Combo guardado.':'Servicio guardado.'});await load()}catch(e){error(e)}}
function remove(kind,row){$q.dialog({title:'Confirmar',message:`¿Eliminar ${kind==='combo'?'este combo':'este servicio'}?`,cancel:true,persistent:true}).onOk(async()=>{try{await api.delete(`${base}/${kind==='combo'?'combos':'servicios'}/${row.id}`);await load()}catch(e){error(e)}})}
onMounted(load)
</script>

<template>
<q-page class="hair-page q-pa-md q-pa-lg-xl">
  <q-inner-loading :showing="loading"/>
  <div class="row items-center q-col-gutter-md q-mb-lg"><div class="col"><div class="text-overline text-primary">Peluquería</div><div class="text-h4 text-weight-bold">Servicios y combos</div><div class="text-body2 text-grey-7">Define lo que ofrece el negocio. Los combos quedan listos para cargar cuando tengas los datos reales.</div></div></div>

  <q-tabs v-model="tab" dense align="left" active-color="primary" indicator-color="primary" class="tabs q-mb-lg">
    <q-tab name="servicios" icon="content_cut" label="Servicios" no-caps/><q-tab name="combos" icon="redeem" label="Combos" no-caps/>
  </q-tabs>

  <template v-if="tab==='servicios'">
    <div class="toolbar"><div><div class="text-h6 text-weight-bold">Servicios</div><div class="text-caption text-grey-6">Corte, tinte, lavado, tratamiento y otros.</div></div><q-btn color="primary" unelevated no-caps icon="add" label="Nuevo servicio" @click="open('servicio')"/></div>
    <q-table flat class="hair-card" :rows="servicios" row-key="id" :columns="[{name:'nombre',label:'Servicio',field:'nombre',align:'left'},{name:'categoria',label:'Categoría',field:'categoria',align:'left'},{name:'duracion',label:'Duración',field:r=>`${r.duracion_minutos} min`,align:'left'},{name:'precio',label:'Precio',field:r=>money(r.precio),align:'left'},{name:'estado',label:'Estado',field:r=>r.activo?'Activo':'Inactivo',align:'left'},{name:'acciones',label:'',field:'id',align:'right'}]">
      <template #body-cell-acciones="p"><q-td :props="p"><q-btn flat round dense icon="more_vert"><q-menu><q-list style="min-width:150px"><q-item clickable v-close-popup @click="open('servicio',p.row)"><q-item-section avatar><q-icon name="edit"/></q-item-section><q-item-section>Editar</q-item-section></q-item><q-item clickable v-close-popup class="text-negative" @click="remove('servicio',p.row)"><q-item-section avatar><q-icon name="delete"/></q-item-section><q-item-section>Eliminar</q-item-section></q-item></q-list></q-menu></q-btn></q-td></template>
      <template #no-data><div class="empty full-width">Aún no hay servicios registrados.</div></template>
    </q-table>
  </template>

  <template v-else>
    <div class="toolbar"><div><div class="text-h6 text-weight-bold">Combos</div><div class="text-caption text-grey-6">No cargamos ninguno hasta recibir nombres, servicios incluidos y precios reales.</div></div><q-btn color="primary" unelevated no-caps icon="add" label="Nuevo combo" @click="open('combo')"/></div>
    <q-table flat class="hair-card" :rows="combos" row-key="id" :columns="[{name:'nombre',label:'Combo',field:'nombre',align:'left'},{name:'incluye',label:'Incluye',field:r=>(r.componentes||[]).map(x=>x.nombre).join(', ')||'Por definir',align:'left'},{name:'duracion',label:'Duración',field:r=>`${r.duracion_minutos} min`,align:'left'},{name:'precio',label:'Precio',field:r=>money(r.precio),align:'left'},{name:'acciones',label:'',field:'id',align:'right'}]">
      <template #body-cell-acciones="p"><q-td :props="p"><q-btn flat round dense icon="more_vert"><q-menu><q-list style="min-width:150px"><q-item clickable v-close-popup @click="open('combo',p.row)"><q-item-section avatar><q-icon name="edit"/></q-item-section><q-item-section>Editar</q-item-section></q-item><q-item clickable v-close-popup class="text-negative" @click="remove('combo',p.row)"><q-item-section avatar><q-icon name="delete"/></q-item-section><q-item-section>Eliminar</q-item-section></q-item></q-list></q-menu></q-btn></q-td></template>
      <template #no-data><div class="empty full-width"><q-icon name="redeem" size="42px" class="q-mb-sm"/><div class="text-weight-bold">Todavía no hay combos</div><div class="text-caption">La sección queda preparada para cargarlos cuando la clienta confirme nombres y precios.</div></div></template>
    </q-table>
  </template>

  <q-dialog v-model="dialog"><q-card style="width:680px;max-width:94vw"><q-card-section><div class="text-overline text-primary">{{type==='combo'?'Combo':'Servicio'}}</div><div class="text-h5 text-weight-bold">{{editing?'Editar':'Nuevo'}} {{type}}</div></q-card-section><q-card-section><div class="row q-col-gutter-md">
    <template v-if="type==='servicio'"><div class="col-12 col-sm-8"><q-input v-model="serviceForm.nombre" outlined label="Nombre *"/></div><div class="col-12 col-sm-4"><q-input v-model="serviceForm.categoria" outlined label="Categoría"/></div><div class="col-12 col-sm-6"><q-input v-model.number="serviceForm.duracion_minutos" outlined type="number" min="5" label="Duración (min) *"/></div><div class="col-12 col-sm-6"><q-input v-model.number="serviceForm.precio" outlined type="number" min="0" label="Precio (Bs) *"/></div><div class="col-12"><q-input v-model="serviceForm.descripcion" outlined type="textarea" label="Descripción"/></div></template>
    <template v-else><div class="col-12 col-sm-8"><q-input v-model="comboForm.nombre" outlined label="Nombre del combo *"/></div><div class="col-12 col-sm-4"><q-input v-model="comboForm.categoria" outlined label="Categoría"/></div><div class="col-12"><q-select v-model="comboForm.servicio_ids" outlined multiple emit-value map-options use-chips :options="serviceOptions" label="Servicios incluidos" hint="Puedes dejarlo vacío y completarlo después."/></div><div class="col-12 col-sm-6"><q-input v-model.number="comboForm.duracion_minutos" outlined type="number" min="5" label="Duración (min) *"/></div><div class="col-12 col-sm-6"><q-input v-model.number="comboForm.precio" outlined type="number" min="0" label="Precio (Bs) *"/></div><div class="col-12"><q-input v-model="comboForm.descripcion" outlined type="textarea" label="Descripción"/></div></template>
  </div></q-card-section><q-card-actions align="right"><q-btn flat no-caps label="Cancelar" v-close-popup/><q-btn color="primary" unelevated no-caps label="Guardar" @click="save"/></q-card-actions></q-card></q-dialog>
</q-page>
</template>

<style scoped>
.hair-page{max-width:1500px;margin:auto}.hair-card{background:#fff;border:1px solid #e4e7ec;border-radius:16px;overflow:hidden}.toolbar{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:16px}.tabs{background:#fff;border:1px solid #e4e7ec;border-radius:12px}.empty{text-align:center;padding:44px 20px;color:#667085}@media(max-width:600px){.toolbar{align-items:flex-start;flex-direction:column}.toolbar .q-btn{width:100%}}
</style>
