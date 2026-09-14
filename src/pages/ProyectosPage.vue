<script setup>
import { computed, onMounted, ref } from 'vue'
import { useQuasar } from 'quasar'
import { useRouter } from 'vue-router'
import { api } from '../boot/axios'
import PageHeader from '../components/PageHeader.vue'

const $q=useQuasar(), router=useRouter()
const rows=ref([]), loading=ref(false)
const activeCount=computed(()=>rows.value.filter(x=>x.estado==='activo').length)
const betaCount=computed(()=>rows.value.filter(x=>['beta','pruebas'].includes(x.fase)).length)
const avgProgress=computed(()=>rows.value.length?Math.round(rows.value.reduce((a,b)=>a+Number(b.progreso||0),0)/rows.value.length):0)

async function load(){ loading.value=true; try{ rows.value=(await api.get('/proyectos',{params:{per_page:100}})).data.data||[] } finally{ loading.value=false } }
function remove(row){$q.dialog({title:'Eliminar proyecto',message:`¿Eliminar ${row.nombre}?`,cancel:true}).onOk(async()=>{try{await api.delete(`/proyectos/${row.id}`);load()}catch(e){$q.notify({type:'negative',message:e.response?.data?.message||'No se puede eliminar.'})}})}
function phaseLabel(v){return String(v||'levantamiento').replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase())}
function phaseIcon(v){return {levantamiento:'description',analisis:'travel_explore',diseno:'design_services',desarrollo:'code',beta:'science',pruebas:'fact_check',ajustes:'tune',implementacion:'rocket_launch'}[v]||'account_tree'}
onMounted(load)
</script>

<template>
<q-page class="viti-page projects-page">
  <PageHeader eyebrow="Desarrollo" title="Proyectos" subtitle="Los proyectos comienzan desde una solicitud aprobada. Aquí solo administras lo que ya está en marcha.">
    <q-btn class="viti-btn viti-btn--primary" unelevated no-caps icon="fact_check" label="Revisar solicitudes" to="/solicitudes"/>
  </PageHeader>

  <section class="project-summary q-mb-lg">
    <div><span>Activos</span><b>{{activeCount}}</b></div><div><span>En beta/pruebas</span><b>{{betaCount}}</b></div><div><span>Avance promedio</span><b>{{avgProgress}}%</b></div><div><span>Total</span><b>{{rows.length}}</b></div>
  </section>

  <q-inner-loading :showing="loading"/>
  <section v-if="!loading&&!rows.length" class="projects-empty">
    <div class="empty-icon"><q-icon name="account_tree"/></div><div class="section-label">Sin proyectos</div><h2>Todo empieza por una solicitud.</h2><p>Aprueba una solicitud, habilita el acceso del cliente y desde esa misma revisión podrás iniciar el proyecto. Así no duplicas empresas ni responsables.</p><q-btn class="viti-btn viti-btn--primary q-mt-md" unelevated no-caps icon="fact_check" label="Ir a solicitudes" to="/solicitudes"/>
  </section>

  <section v-else class="project-grid">
    <article v-for="row in rows" :key="row.id" class="project-card" @click="router.push(`/proyectos/${row.id}`)">
      <div class="project-head"><span class="phase-icon"><q-icon :name="phaseIcon(row.fase)"/></span><div class="project-title"><small>{{row.codigo}}</small><h3>{{row.nombre}}</h3></div><q-btn flat round dense icon="more_horiz" @click.stop><q-menu auto-close><q-list style="min-width:170px"><q-item clickable @click="router.push(`/proyectos/${row.id}`)"><q-item-section avatar><q-icon name="open_in_new"/></q-item-section><q-item-section>Abrir</q-item-section></q-item><q-item clickable class="text-negative" @click="remove(row)"><q-item-section avatar><q-icon name="delete_outline"/></q-item-section><q-item-section>Eliminar</q-item-section></q-item></q-list></q-menu></q-btn></div>
      <div class="project-company"><q-icon name="business"/>{{row.empresa?.nombre_comercial||'Sin empresa'}}</div>
      <div class="progress-head"><span>{{phaseLabel(row.fase)}}</span><b>{{row.progreso||0}}%</b></div><q-linear-progress rounded size="7px" :value="Number(row.progreso||0)/100" color="primary" track-color="blue-grey-9"/>
      <div class="project-footer"><q-badge outline :color="row.estado==='activo'?'positive':'grey'">{{phaseLabel(row.estado)}}</q-badge><span>Abrir proyecto <q-icon name="arrow_forward"/></span></div>
    </article>
  </section>
</q-page>
</template>

<style scoped>
.projects-page{padding-top:34px}.project-summary{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}.project-summary>div{padding:14px 16px;border:1px solid var(--viti-border);background:rgba(13,36,61,.56);border-radius:15px;display:flex;align-items:center;justify-content:space-between}.project-summary span{font-size:11px;color:var(--viti-muted)}.project-summary b{font-size:20px}.projects-empty{min-height:400px;border:1px dashed rgba(121,151,181,.34);border-radius:24px;background:rgba(8,25,45,.5);display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:34px}.empty-icon{width:70px;height:70px;border-radius:20px;background:rgba(20,87,184,.12);display:grid;place-items:center;color:#7eb4ff;font-size:31px;margin-bottom:16px}.projects-empty h2{margin:5px 0;font-size:28px}.projects-empty p{color:var(--viti-muted);max-width:650px;line-height:1.6}.project-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:15px}.project-card{border:1px solid var(--viti-border);background:linear-gradient(180deg,rgba(15,42,71,.82),rgba(9,28,49,.9));border-radius:20px;padding:19px;cursor:pointer;transition:.2s ease}.project-card:hover{transform:translateY(-3px);border-color:rgba(242,139,48,.4)}.project-head{display:flex;align-items:center;gap:11px}.phase-icon{width:42px;height:42px;border-radius:12px;background:rgba(20,87,184,.18);color:#7fb4ff;display:grid;place-items:center;font-size:21px}.project-title{min-width:0}.project-title small{font-size:9px;color:#7e96ad;letter-spacing:.08em}.project-title h3{font-size:16px;margin:2px 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.project-head .q-btn{margin-left:auto}.project-company{display:flex;align-items:center;gap:7px;color:#a9bacb;font-size:11px;margin:18px 0}.project-company .q-icon{color:#f28b30}.progress-head{display:flex;justify-content:space-between;font-size:10px;color:#9fb2c5;margin-bottom:7px}.progress-head b{color:#eaf1f8}.project-footer{display:flex;align-items:center;justify-content:space-between;margin-top:17px}.project-footer>span{font-size:10px;color:#ff9d43}.viti-btn{border-radius:12px;min-height:42px}.viti-btn--primary{background:linear-gradient(135deg,#1457b8,#1a69cf)!important}@media(max-width:1050px){.project-grid{grid-template-columns:repeat(2,1fr)}}@media(max-width:700px){.projects-page{padding-top:18px}.project-grid{grid-template-columns:1fr}.project-summary{grid-template-columns:repeat(2,1fr)}}
</style>
