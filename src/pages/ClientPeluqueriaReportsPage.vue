<script setup>
import { onMounted, reactive, ref } from 'vue'
import { api } from '../boot/axios'
const base='/mi/apps/peluqueria'
const loading=ref(false)
const report=ref({resumen:{},top_servicios:[],top_combos:[],top_productos:[],top_personal:[]})
const now=new Date(),first=new Date(now.getFullYear(),now.getMonth(),1)
const date=d=>d.toISOString().slice(0,10)
const filters=reactive({desde:date(first),hasta:date(now)})
const money=v=>`${Number(v||0).toFixed(2)} Bs`
async function load(){loading.value=true;try{report.value=(await api.get(`${base}/reportes`,{params:filters})).data.data||report.value}finally{loading.value=false}}
onMounted(load)
</script>
<template><q-page class="hair-page q-pa-md q-pa-lg-xl"><q-inner-loading :showing="loading"/>
<div class="q-mb-lg"><div class="text-overline text-primary">Peluquería</div><div class="text-h4 text-weight-bold">Reportes</div><div class="text-body2 text-grey-7">Información útil para decidir qué vende más y cómo va el negocio.</div></div>
<q-card flat class="hair-card q-mb-lg"><q-card-section class="row q-col-gutter-md items-end"><div class="col-12 col-sm-4"><q-input v-model="filters.desde" outlined type="date" label="Desde"/></div><div class="col-12 col-sm-4"><q-input v-model="filters.hasta" outlined type="date" label="Hasta"/></div><div class="col-12 col-sm-auto"><q-btn color="primary" unelevated no-caps icon="refresh" label="Actualizar" @click="load"/></div></q-card-section></q-card>
<div class="metrics-grid q-mb-lg"><q-card v-for="m in [{i:'payments',v:money(report.resumen?.ingresos),l:'Ingresos'},{i:'content_cut',v:report.resumen?.atenciones||0,l:'Atenciones'},{i:'receipt_long',v:money(report.resumen?.ticket_promedio),l:'Ticket promedio'},{i:'person_add',v:report.resumen?.clientes_nuevos||0,l:'Clientes nuevos'},{i:'repeat',v:`${report.resumen?.porcentaje_recurrentes||0}%`,l:'Recurrentes'},{i:'inventory_2',v:report.resumen?.stock_bajo||0,l:'Stock bajo'}]" :key="m.l" flat class="hair-card metric"><q-card-section><q-icon :name="m.i" color="primary" size="28px"/><div class="value">{{m.v}}</div><div class="label">{{m.l}}</div></q-card-section></q-card></div>
<div class="row q-col-gutter-lg"><div v-for="box in [{t:'Servicios más realizados',a:report.top_servicios,e:'Aún no hay datos.'},{t:'Combos más adquiridos',a:report.top_combos,e:'Sin combos vendidos todavía.'},{t:'Productos más vendidos',a:report.top_productos,e:'Sin productos vendidos todavía.'},{t:'Rendimiento del personal',a:report.top_personal,e:'Aún no hay datos.'}]" :key="box.t" class="col-12 col-md-6"><q-card flat class="hair-card"><q-card-section><div class="text-h6 text-weight-bold">{{box.t}}</div></q-card-section><q-list separator><q-item v-for="(x,i) in box.a" :key="x.id"><q-item-section avatar><q-avatar color="blue-1" text-color="primary">{{i+1}}</q-avatar></q-item-section><q-item-section><q-item-label class="text-weight-bold">{{x.nombre}}</q-item-label><q-item-label caption>{{x.cantidad||x.atenciones||0}} registros</q-item-label></q-item-section><q-item-section side>{{money(x.total)}}</q-item-section></q-item><div v-if="!box.a?.length" class="empty">{{box.e}}</div></q-list></q-card></div></div>
</q-page></template>
<style scoped>.hair-page{max-width:1500px;margin:auto}.hair-card{background:#fff;border:1px solid #e4e7ec;border-radius:16px;overflow:hidden}.metrics-grid{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:16px}.value{font-size:24px;font-weight:800;margin-top:8px}.label{font-size:12px;color:#667085}.empty{text-align:center;padding:30px;color:#667085}@media(max-width:1200px){.metrics-grid{grid-template-columns:repeat(3,1fr)}}@media(max-width:650px){.metrics-grid{grid-template-columns:repeat(2,1fr)}}</style>