<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '../boot/axios'
import { formatDate, formatDateTime } from '../utils/date'
import { downloadFile } from '../utils/download'
import PageHeader from '../components/PageHeader.vue'
const router=useRouter(),item=ref(null),loading=ref(true)
async function load(){loading.value=true;try{item.value=(await api.get('/mi/proyecto')).data.data}finally{loading.value=false}}
function openFile(f){downloadFile(`/mi/archivos/${f.id}/descargar`,f.nombre_original)}
function openApplication(){
  if(!item.value?.aplicacion?.acceso_cliente)return
  const isHair=String(item.value.aplicacion.nombre||'').toLowerCase().includes('peluquer')
  if(isHair)router.push('/mi-apps/peluqueria/inicio')
  else if(item.value.aplicacion.url)window.location.assign(item.value.aplicacion.url)
}
onMounted(load)
</script>
<template>
<q-page class="viti-page"><q-inner-loading :showing="loading"/>
<template v-if="item"><PageHeader eyebrow="Mi proyecto" :title="`${item.codigo} · ${item.nombre}`" :subtitle="item.empresa?.nombre_comercial||'Proyecto en desarrollo'"/>
<div class="row q-col-gutter-lg"><div class="col-12 col-lg-8">
<q-card flat class="viti-card"><q-card-section><div class="row items-center"><div><div class="text-h6 text-weight-bold">Estado actual</div><div class="text-caption text-grey-6">{{item.fase}} · {{item.estado}}</div></div><q-space/><div class="text-h4 text-weight-bold">{{item.progreso}}%</div></div><q-linear-progress rounded size="12px" :value="item.progreso/100" color="primary" class="q-mt-md"/></q-card-section></q-card>
<q-card flat class="viti-card q-mt-lg"><q-card-section><div class="text-h6 text-weight-bold">Avances visibles</div><div class="text-caption text-grey-6">Nuestro equipo irá publicando aquí lo que ya se ha trabajado.</div></q-card-section><q-separator/>
<q-timeline color="primary" class="q-pa-lg"><q-timeline-entry v-for="a in item.avances" :key="a.id" :title="a.titulo" :subtitle="`${a.fase} · ${a.area||'general'} · ${formatDateTime(a.created_at)}`"><div style="white-space:pre-wrap">{{a.descripcion}}</div><q-badge v-if="a.progreso!==null" outline color="primary" class="q-mt-sm">{{a.progreso}}%</q-badge><div v-if="a.archivos?.length" class="q-mt-md"><div class="text-caption text-weight-bold q-mb-xs">Anexos</div><q-chip v-for="f in a.archivos" :key="f.id" icon="attach_file" clickable color="blue-1" text-color="primary" @click="openFile(f)">{{f.nombre_original}}</q-chip></div></q-timeline-entry><div v-if="!item.avances?.length" class="empty-state">Todavía no hay avances publicados para ti.</div></q-timeline>
</q-card></div>
<div class="col-12 col-lg-4"><q-card flat class="viti-card"><q-list><q-item><q-item-section><q-item-label caption>Inicio</q-item-label><q-item-label>{{formatDate(item.fecha_inicio)}}</q-item-label></q-item-section></q-item><q-separator/><q-item><q-item-section><q-item-label caption>Beta</q-item-label><q-item-label>{{formatDate(item.fecha_beta)}}</q-item-label></q-item-section></q-item><q-separator/><q-item><q-item-section><q-item-label caption>Entrega estimada</q-item-label><q-item-label>{{formatDate(item.fecha_entrega)}}</q-item-label></q-item-section></q-item></q-list></q-card>
<q-card v-if="item.aplicacion" flat class="viti-card q-mt-lg"><q-card-section><div class="section-label">Tu aplicación</div><div class="text-h6 text-weight-bold">{{item.aplicacion.nombre}}</div><div class="text-caption text-grey-6">{{item.aplicacion.entorno}} · {{item.aplicacion.estado}}</div><q-badge v-if="item.aplicacion.acceso_cliente" color="positive" class="q-mt-sm">Entregada</q-badge><q-badge v-else color="orange" class="q-mt-sm">Pendiente de entrega</q-badge><div class="q-mt-md"><q-btn v-if="item.aplicacion.acceso_cliente" color="primary" unelevated no-caps icon="apps" label="Abrir aplicación" @click="openApplication"/><div v-else class="text-caption text-grey-7">VITI habilitará el acceso cuando la aplicación haya sido entregada.</div></div></q-card-section></q-card></div></div></template>
<div v-else-if="!loading" class="empty-state"><q-icon name="account_tree" size="56px"/><div class="text-h6 q-mt-sm">Aún no tienes un proyecto activo</div><div>Cuando aprobemos tu solicitud y comience el desarrollo, aparecerá aquí.</div></div>
</q-page>
</template>
