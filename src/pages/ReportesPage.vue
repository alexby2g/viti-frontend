<script setup>
import { downloadFile } from '../utils/download'
import PageHeader from '../components/PageHeader.vue'
const reports=[
 {title:'Clientes registrados',description:'Directorio general con empresas, solicitudes y proyectos.',icon:'people',url:'/reportes/clientes.pdf',file:'viti-clientes.pdf'},
 {title:'Empresas registradas',description:'Empresas, responsables, rubros y actividad dentro de VITI.',icon:'business',url:'/reportes/empresas.pdf',file:'viti-empresas.pdf'},
]
</script>
<template><q-page class="viti-page"><PageHeader eyebrow="Control" title="Reportes PDF" subtitle="Descarga documentos actualizados directamente desde la base de datos."/><div class="row q-col-gutter-lg"><div v-for="r in reports" :key="r.url" class="col-12 col-md-6"><q-card flat class="viti-card q-pa-lg"><div class="row items-center"><q-avatar color="blue-1" text-color="primary" :icon="r.icon" size="58px"/><div class="col q-ml-md"><div class="text-h6 text-weight-bold">{{r.title}}</div><div class="text-grey-6">{{r.description}}</div></div><q-btn color="primary" outline icon="download" label="Descargar PDF" no-caps @click="downloadFile(r.url,r.file)"/></div></q-card></div></div><q-banner rounded class="bg-blue-1 text-primary q-mt-lg"><template #avatar><q-icon name="info"/></template>Los PDF individuales del cuestionario y del proyecto se descargan desde el detalle de cada registro.</q-banner></q-page></template>
