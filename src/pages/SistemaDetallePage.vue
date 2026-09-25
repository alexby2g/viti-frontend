<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useQuasar } from 'quasar'
import { api } from '../boot/axios'
import PageHeader from '../components/PageHeader.vue'
import { formatDateTime } from '../utils/date'

const route=useRoute(), $q=useQuasar()
const item=ref(null), loading=ref(true), error=ref(''), editMode=ref(false), saving=ref(false), cycleSaving=ref(false)
const form=reactive({nombre:'',version:'',tipo:'web',tecnologias:'',url:'',url_administracion:'',repositorio_url:'',proveedor_hosting:'',notas:''})
const cycle=reactive({entorno:'desarrollo',estado:'en_pruebas'})
const environmentOptions=[{label:'Desarrollo',value:'desarrollo'},{label:'Beta / pruebas',value:'beta'},{label:'Producción',value:'produccion'}]
const operationalOptions=[{label:'En pruebas',value:'en_pruebas'},{label:'Activo',value:'activo'},{label:'Pausado',value:'pausado'},{label:'Retirado',value:'retirado'}]
const isOnline=computed(()=>item.value?.entorno==='produccion'&&item.value?.estado==='activo'&&item.value?.url)

function pretty(value){return String(value||'').replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase())}
function openUrl(url){if(url&&/^https?:\/\//i.test(url))window.open(url,'_blank','noopener,noreferrer')}
function startEdit(){Object.assign(form,{nombre:item.value?.nombre||'',version:item.value?.version||'',tipo:item.value?.tipo||'web',tecnologias:item.value?.tecnologias||'',url:item.value?.url||'',url_administracion:item.value?.url_administracion||'',repositorio_url:item.value?.repositorio_url||'',proveedor_hosting:item.value?.proveedor_hosting||'',notas:item.value?.notas||''});editMode.value=true}
async function load(){loading.value=true;error.value='';try{item.value=(await api.get(`/aplicaciones/${Number(route.params.id)}`)).data.data;Object.assign(cycle,{entorno:item.value.entorno||'desarrollo',estado:item.value.estado||'en_pruebas'})}catch(e){error.value=e.response?.data?.message||'No se pudo cargar el sistema.'}finally{loading.value=false}}
async function save(){saving.value=true;try{await api.put(`/aplicaciones/${item.value.id}`,{empresa_id:item.value.empresa_id,proyecto_id:item.value.proyecto_id,catalogo_aplicacion_id:item.value.catalogo_aplicacion_id,...form,modulos:item.value.modulos||[],configuracion:item.value.configuracion||{}});$q.notify({type:'positive',message:'Ficha del sistema actualizada.'});editMode.value=false;await load()}catch(e){$q.notify({type:'negative',message:e.response?.data?.message||Object.values(e.response?.data?.errors||{}).flat()[0]||'No se pudo guardar.'})}finally{saving.value=false}}
async function saveCycle(){cycleSaving.value=true;try{await api.put(`/aplicaciones/${item.value.id}/ciclo`,cycle);$q.notify({type:'positive',message:'Estado del sistema actualizado.'});await load()}catch(e){$q.notify({type:'negative',message:e.response?.data?.message||'No se pudo actualizar el estado.'})}finally{cycleSaving.value=false}}
onMounted(load)
</script>

<template>
  <q-page class="viti-page system-detail-page">
    <q-inner-loading :showing="loading"/>
    <q-banner v-if="error" rounded class="bg-red-10 text-white">{{error}}<template #action><q-btn flat label="Volver" to="/sistemas"/></template></q-banner>
    <template v-if="item">
      <PageHeader eyebrow="Sistema" :title="item.nombre" :subtitle="item.empresa?.nombre_comercial || 'Sistema administrado por VITI'">
        <q-badge outline :color="isOnline?'positive':'orange'" class="state-badge">{{isOnline?'En línea':`${pretty(item.entorno)} · ${pretty(item.estado)}`}}</q-badge>
        <q-btn v-if="item.url" outline color="orange" no-caps icon="open_in_new" label="Abrir sistema" @click="openUrl(item.url)"/>
      </PageHeader>

      <section v-if="editMode" class="edit-panel q-mb-lg"><div class="edit-head"><div><div class="section-label">Editar ficha</div><h2>URLs e infraestructura</h2></div><q-btn flat round icon="close" @click="editMode=false"/></div><div class="edit-grid"><q-input v-model="form.nombre" outlined label="Nombre *"/><q-input v-model="form.version" outlined label="Versión"/><q-input v-model="form.url" outlined label="URL pública"/><q-input v-model="form.url_administracion" outlined label="URL administrativa"/><q-input v-model="form.repositorio_url" outlined label="Repositorio"/><q-input v-model="form.proveedor_hosting" outlined label="Hosting"/><q-input class="span-2" v-model="form.tecnologias" outlined label="Tecnologías"/><q-input class="span-2" v-model="form.notas" outlined type="textarea" autogrow label="Notas internas"/></div><div class="edit-actions"><q-btn flat no-caps label="Cancelar" @click="editMode=false"/><q-btn color="primary" unelevated no-caps label="Guardar cambios" :loading="saving" @click="save"/></div></section>

      <section v-else class="system-layout">
        <main>
          <div class="access-grid">
            <article class="access-card"><small>URL PÚBLICA</small><h3>{{item.url||'No registrada'}}</h3><q-btn v-if="item.url" flat no-caps color="orange" icon="open_in_new" label="Abrir" @click="openUrl(item.url)"/></article>
            <article class="access-card"><small>ADMINISTRACIÓN</small><h3>{{item.url_administracion||'No registrada'}}</h3><q-btn v-if="item.url_administracion" flat no-caps color="orange" icon="open_in_new" label="Abrir panel" @click="openUrl(item.url_administracion)"/></article>
          </div>
          <section class="technical-card q-mt-md"><div class="section-label">Infraestructura</div><div class="technical-grid"><div><small>Hosting</small><b>{{item.proveedor_hosting||'Por definir'}}</b></div><div><small>Tecnologías</small><b>{{item.tecnologias||'Por definir'}}</b></div><div><small>Repositorio</small><b>{{item.repositorio_url||'No registrado'}}</b><q-btn v-if="item.repositorio_url" dense flat round icon="open_in_new" color="orange" @click="openUrl(item.repositorio_url)"/></div><div><small>Versión</small><b>{{item.version||'Sin versión'}}</b></div><div><small>Publicado</small><b>{{item.publicado_at?formatDateTime(item.publicado_at):'Sin fecha'}}</b></div><div><small>Entregado</small><b>{{item.entregado_at?formatDateTime(item.entregado_at):'Pendiente'}}</b></div></div></section>
          <section v-if="item.mantenimientos?.length" class="technical-card q-mt-md"><div class="section-label">Soporte reciente</div><div class="support-list"><div v-for="support in item.mantenimientos.slice(0,5)" :key="support.id"><span>{{support.titulo||support.descripcion||'Caso de soporte'}}</span><q-badge outline :color="['resuelto','cerrado'].includes(support.estado)?'positive':'orange'">{{pretty(support.estado)}}</q-badge></div></div></section>
        </main>

        <aside class="system-rail">
          <div class="rail-card"><div class="section-label">Administrar</div><q-btn outline color="orange" no-caps icon="edit" label="Editar ficha" @click="startEdit"/><q-btn v-if="item.proyecto?.id" flat no-caps icon="account_tree" label="Abrir trabajo" :to="`/trabajos/${item.proyecto.id}`"/></div>
          <div class="rail-card"><div class="section-label">Estado</div><q-select v-model="cycle.entorno" outlined dense emit-value map-options :options="environmentOptions" label="Etapa"/><q-select v-model="cycle.estado" outlined dense emit-value map-options :options="operationalOptions" label="Disponibilidad"/><q-btn color="primary" unelevated no-caps label="Guardar estado" :loading="cycleSaving" @click="saveCycle"/></div>
          <div class="rail-card compact"><small>CLIENTE</small><b>{{item.empresa?.nombre_comercial||'Sin cliente'}}</b><small>TRABAJO</small><b>{{item.proyecto?.codigo||'Sin trabajo vinculado'}}</b></div>
        </aside>
      </section>
    </template>
  </q-page>
</template>

<style scoped>
.system-detail-page{max-width:1240px;padding-top:32px}.state-badge{padding:6px 10px;border-radius:999px}.system-layout{display:grid;grid-template-columns:minmax(0,1fr) 300px;gap:16px}.access-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.access-card,.technical-card,.rail-card,.edit-panel{border:1px solid rgba(79,111,141,.22);background:linear-gradient(180deg,rgba(13,37,62,.84),rgba(8,27,47,.9));border-radius:18px}.access-card{padding:18px;min-width:0}.access-card small{font-size:8px;font-weight:900;letter-spacing:.1em;color:#f28b30}.access-card h3{font-size:12px;margin:8px 0;color:#dbe6ee;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.access-card .q-btn{padding-left:0}.technical-card{padding:20px}.technical-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-top:14px}.technical-grid>div{border:1px solid rgba(86,117,146,.17);border-radius:12px;padding:12px;min-width:0}.technical-grid small,.technical-grid b{display:block}.technical-grid small{font-size:8px;color:#748da3;letter-spacing:.08em}.technical-grid b{font-size:10px;margin-top:4px;color:#cbd7e1;overflow-wrap:anywhere}.system-rail{display:grid;gap:10px;align-content:start;position:sticky;top:86px}.rail-card{padding:17px;display:grid;gap:10px}.rail-card .q-btn{min-height:40px;border-radius:10px}.rail-card.compact small{font-size:8px;color:#758ea4;letter-spacing:.09em;margin-top:5px}.rail-card.compact b{font-size:10px;color:#d0dce5}.support-list{display:grid;gap:7px;margin-top:13px}.support-list>div{display:flex;justify-content:space-between;gap:12px;align-items:center;padding:10px;border:1px solid rgba(86,117,146,.14);border-radius:10px;font-size:10px}.edit-panel{padding:22px}.edit-head{display:flex;align-items:flex-start;justify-content:space-between}.edit-head h2{font-size:22px;margin:4px 0}.edit-grid{display:grid;grid-template-columns:1fr 1fr;gap:13px;margin-top:18px}.span-2{grid-column:1/-1}.edit-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:18px}.edit-actions .q-btn{min-height:42px;border-radius:11px}
@media(max-width:900px){.system-layout{grid-template-columns:1fr}.system-rail{position:static;grid-template-columns:1fr 1fr}.rail-card.compact{grid-column:1/-1}}@media(max-width:650px){.system-detail-page{padding-top:18px}.access-grid,.technical-grid,.edit-grid,.system-rail{grid-template-columns:1fr}.span-2,.rail-card.compact{grid-column:auto}}
</style>
