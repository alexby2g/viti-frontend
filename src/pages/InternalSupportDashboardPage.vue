<script setup>
import { onMounted, ref } from 'vue'
import { useQuasar } from 'quasar'
import { api } from '../boot/axios'
import PageHeader from '../components/PageHeader.vue'

const $q=useQuasar(),loading=ref(true)
const data=ref({resumen:{},solicitudes:[],proyectos:[],mantenimientos:[],conversaciones:[]})
const tabs=ref('casos')
const states=['abierto','en_proceso','en_espera','resuelto','cerrado']
const pretty=v=>String(v||'').replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase())
async function load(){loading.value=true;try{data.value=(await api.get('/soporte/resumen')).data.data}catch(e){$q.notify({type:'negative',message:e.response?.data?.message||'No se pudo cargar tu trabajo asignado.'})}finally{loading.value=false}}
async function changeState(row,value){try{await api.put(`/soporte/mantenimientos/${row.id}/estado`,{estado:value});row.estado=value;$q.notify({type:'positive',message:'Estado actualizado.'})}catch(e){$q.notify({type:'negative',message:e.response?.data?.message||'No se pudo actualizar el caso.'})}}
onMounted(load)
</script>

<template>
<q-page class="viti-page">
  <PageHeader eyebrow="AGR Studio" title="Mi trabajo de soporte" subtitle="Aquí solo aparecen tareas, proyectos y conversaciones asignadas a tu cuenta."/>
  <q-inner-loading :showing="loading"/>
  <template v-if="!loading">
    <div class="row q-col-gutter-md q-mb-lg">
      <div v-for="card in [
        ['solicitudes','Solicitudes','fact_check'],['proyectos','Proyectos','account_tree'],['casos_abiertos','Casos abiertos','build_circle'],['mensajes_no_leidos','Mensajes nuevos','forum']
      ]" :key="card[0]" class="col-6 col-lg-3">
        <q-card flat class="viti-card q-pa-md"><q-icon :name="card[2]" color="primary" size="28px"/><div class="text-h4 text-weight-bold q-mt-sm">{{data.resumen?.[card[0]]||0}}</div><div class="text-caption text-grey-6">{{card[1]}}</div></q-card>
      </div>
    </div>

    <q-tabs v-model="tabs" align="left" no-caps active-color="primary" indicator-color="primary" class="q-mb-md">
      <q-tab name="casos" icon="build_circle" label="Casos"/>
      <q-tab name="solicitudes" icon="fact_check" label="Solicitudes"/>
      <q-tab name="proyectos" icon="account_tree" label="Proyectos"/>
    </q-tabs>
    <q-tab-panels v-model="tabs" animated class="transparent">
      <q-tab-panel name="casos" class="q-pa-none">
        <div class="row q-col-gutter-md">
          <div v-for="row in data.mantenimientos" :key="row.id" class="col-12 col-lg-6">
            <q-card flat class="viti-card"><q-card-section><div class="row items-start"><div class="col"><div class="text-overline text-primary">{{row.codigo}}</div><div class="text-h6 text-weight-bold">{{row.titulo}}</div><div class="text-caption text-grey-6">{{row.empresa?.nombre_comercial||'Sin empresa'}} · {{pretty(row.prioridad)}}</div></div><q-badge outline color="primary">{{pretty(row.tipo)}}</q-badge></div><div v-if="row.descripcion" class="text-body2 q-mt-md">{{row.descripcion}}</div><q-select :model-value="row.estado" :options="states" outlined dense class="q-mt-md" label="Estado" @update:model-value="v=>changeState(row,v)"><template #selected>{{pretty(row.estado)}}</template><template #option="scope"><q-item v-bind="scope.itemProps"><q-item-section>{{pretty(scope.opt)}}</q-item-section></q-item></template></q-select></q-card-section></q-card>
          </div>
          <div v-if="!data.mantenimientos?.length" class="empty-state full-width">No tienes casos de soporte asignados.</div>
        </div>
      </q-tab-panel>
      <q-tab-panel name="solicitudes" class="q-pa-none"><q-list bordered separator class="rounded-borders"><q-item v-for="row in data.solicitudes" :key="row.id"><q-item-section><q-item-label class="text-weight-bold">{{row.codigo}} · {{row.titulo}}</q-item-label><q-item-label caption>{{row.empresa?.nombre_comercial}} · {{pretty(row.estado)}} · Prioridad {{pretty(row.prioridad)}}</q-item-label></q-item-section></q-item><div v-if="!data.solicitudes?.length" class="empty-state">No tienes solicitudes asignadas.</div></q-list></q-tab-panel>
      <q-tab-panel name="proyectos" class="q-pa-none"><q-list bordered separator class="rounded-borders"><q-item v-for="row in data.proyectos" :key="row.id"><q-item-section><q-item-label class="text-weight-bold">{{row.codigo}} · {{row.nombre}}</q-item-label><q-item-label caption>{{row.empresa?.nombre_comercial}} · {{pretty(row.fase)}} · {{row.progreso}}%</q-item-label><q-linear-progress rounded size="7px" :value="Number(row.progreso||0)/100" color="primary" class="q-mt-sm"/></q-item-section></q-item><div v-if="!data.proyectos?.length" class="empty-state">No tienes proyectos asignados.</div></q-list></q-tab-panel>
    </q-tab-panels>
  </template>
</q-page>
</template>
