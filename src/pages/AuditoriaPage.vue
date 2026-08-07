<script setup>
import { onMounted, ref } from 'vue'
import { api } from '../boot/axios'
import PageHeader from '../components/PageHeader.vue'
import { formatDateTime } from '../utils/date'
const rows=ref([]),loading=ref(false)
const columns=[{name:'created_at',label:'Fecha y hora',field:r=>formatDateTime(r.created_at),align:'left'},{name:'usuario',label:'Usuario',field:r=>r.usuario?`${r.usuario.nombre} ${r.usuario.apellido||''}`:'Sistema',align:'left'},{name:'accion',label:'Acción',field:'accion',align:'left'},{name:'descripcion',label:'Descripción',field:'descripcion',align:'left'},{name:'ip',label:'IP',field:'ip',align:'left'}]
onMounted(async()=>{loading.value=true;try{rows.value=(await api.get('/auditoria')).data.data}finally{loading.value=false}})
</script>
<template><q-page class="viti-page"><PageHeader eyebrow="Control" title="Auditoría" subtitle="Historial de accesos, registros, cambios, archivos y procesos importantes."/><q-table flat class="viti-table" :rows="rows" :columns="columns" row-key="id" :loading="loading" :pagination="{rowsPerPage:30,sortBy:'id',descending:true}"/></q-page></template>
