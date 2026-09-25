<script setup>
import { computed, onMounted, ref } from 'vue'
import { useQuasar } from 'quasar'
import { useRouter } from 'vue-router'
import { api } from '../boot/axios'
import PageHeader from '../components/PageHeader.vue'

const $q=useQuasar(), router=useRouter()
const rows=ref([]), loading=ref(false)
const activeCount=computed(()=>rows.value.filter(x=>x.estado==='activo').length)
const testingCount=computed(()=>rows.value.filter(x=>['beta','pruebas','ajustes'].includes(x.fase)).length)
const deliveredCount=computed(()=>rows.value.filter(x=>['implementacion','entrega'].includes(x.fase)||Number(x.progreso||0)>=100).length)
const avgProgress=computed(()=>rows.value.length?Math.round(rows.value.reduce((a,b)=>a+Number(b.progreso||0),0)/rows.value.length):0)

async function load(){loading.value=true;try{rows.value=(await api.get('/proyectos',{params:{per_page:100}})).data.data||[]}finally{loading.value=false}}
function remove(row){$q.dialog({title:'Eliminar trabajo',message:`¿Eliminar ${row.nombre}?`,cancel:true,persistent:true}).onOk(async()=>{try{await api.delete(`/proyectos/${row.id}`);await load()}catch(e){$q.notify({type:'negative',message:e.response?.data?.message||'No se puede eliminar este trabajo.'})}})}
function phaseLabel(v){return String(v||'levantamiento').replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase())}
function phaseIcon(v){return {levantamiento:'description',analisis:'travel_explore',diseno:'design_services',desarrollo:'code',beta:'science',pruebas:'fact_check',ajustes:'tune',implementacion:'rocket_launch'}[v]||'account_tree'}
function open(row){router.push(`/trabajos/${row.id}`)}
onMounted(load)
</script>

<template>
<q-page class="viti-page jobs-page">
  <PageHeader eyebrow="Producción" title="Trabajos" subtitle="Aquí vive lo que VITI ya aceptó: planificación, desarrollo, pruebas, entrega y cierre.">
    <q-btn class="viti-btn viti-btn--primary" unelevated no-caps icon="inbox" label="Revisar solicitudes" to="/solicitudes"/>
  </PageHeader>

  <section class="job-summary q-mb-lg">
    <div><span>Activos</span><b>{{activeCount}}</b></div>
    <div><span>Pruebas / ajustes</span><b>{{testingCount}}</b></div>
    <div><span>Avance promedio</span><b>{{avgProgress}}%</b></div>
    <div><span>Listos / entregados</span><b>{{deliveredCount}}</b></div>
  </section>

  <q-inner-loading :showing="loading"/>
  <section v-if="!loading&&!rows.length" class="jobs-empty">
    <div class="empty-icon"><q-icon name="account_tree"/></div><div class="section-label">Sin trabajos</div><h2>Primero acepta una solicitud.</h2><p>VITI no crea trabajos sueltos. Cuando una solicitud sea aprobada podrás iniciar aquí el desarrollo y mantener toda la trazabilidad.</p><q-btn class="viti-btn viti-btn--primary q-mt-md" unelevated no-caps icon="inbox" label="Ir a solicitudes" to="/solicitudes"/>
  </section>

  <section v-else class="job-grid">
    <article v-for="row in rows" :key="row.id" class="job-card" @click="open(row)">
      <div class="job-head"><span class="phase-icon"><q-icon :name="phaseIcon(row.fase)"/></span><div class="job-title"><small>{{row.codigo}}</small><h3>{{row.nombre}}</h3></div><q-btn flat round dense icon="more_horiz" @click.stop><q-menu auto-close><q-list style="min-width:170px"><q-item clickable @click="open(row)"><q-item-section avatar><q-icon name="open_in_new"/></q-item-section><q-item-section>Abrir trabajo</q-item-section></q-item><q-item clickable class="text-negative" @click="remove(row)"><q-item-section avatar><q-icon name="delete_outline"/></q-item-section><q-item-section>Eliminar</q-item-section></q-item></q-list></q-menu></q-btn></div>
      <div class="job-company"><q-icon name="business"/>{{row.empresa?.nombre_comercial||row.cliente?.nombre||'Sin cliente'}}</div>
      <div class="progress-head"><span>{{phaseLabel(row.fase)}}</span><b>{{row.progreso||0}}%</b></div><q-linear-progress rounded size="7px" :value="Number(row.progreso||0)/100" color="primary" track-color="blue-grey-9"/>
      <div class="job-dates"><span><small>Inicio</small>{{row.fecha_inicio||'Por definir'}}</span><span><small>Entrega</small>{{row.fecha_entrega||'Por definir'}}</span></div>
      <div class="job-footer"><q-badge outline :color="row.estado==='activo'?'positive':'grey'">{{phaseLabel(row.estado)}}</q-badge><span>Abrir trabajo <q-icon name="arrow_forward"/></span></div>
    </article>
  </section>
</q-page>
</template>

<style scoped>
.jobs-page{padding-top:34px}.job-summary{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}.job-summary>div{padding:14px 16px;border:1px solid var(--viti-border);background:rgba(13,36,61,.56);border-radius:15px;display:flex;align-items:center;justify-content:space-between}.job-summary span{font-size:11px;color:var(--viti-muted)}.job-summary b{font-size:20px}.jobs-empty{min-height:400px;border:1px dashed rgba(121,151,181,.34);border-radius:24px;background:rgba(8,25,45,.5);display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:34px}.empty-icon{width:70px;height:70px;border-radius:20px;background:rgba(20,87,184,.12);display:grid;place-items:center;color:#7eb4ff;font-size:31px;margin-bottom:16px}.jobs-empty h2{margin:5px 0;font-size:28px}.jobs-empty p{color:var(--viti-muted);max-width:650px;line-height:1.6}.job-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:15px}.job-card{border:1px solid var(--viti-border);background:linear-gradient(180deg,rgba(15,42,71,.82),rgba(9,28,49,.9));border-radius:20px;padding:19px;cursor:pointer;transition:.2s ease}.job-card:hover{transform:translateY(-3px);border-color:rgba(242,139,48,.4)}.job-head{display:flex;align-items:center;gap:11px}.phase-icon{width:42px;height:42px;border-radius:12px;background:rgba(20,87,184,.18);color:#7fb4ff;display:grid;place-items:center;font-size:21px}.job-title{min-width:0}.job-title small{font-size:9px;color:#7e96ad;letter-spacing:.08em}.job-title h3{font-size:16px;margin:2px 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.job-head .q-btn{margin-left:auto}.job-company{display:flex;align-items:center;gap:7px;color:#a9bacb;font-size:11px;margin:18px 0}.job-company .q-icon{color:#f28b30}.progress-head{display:flex;justify-content:space-between;font-size:10px;color:#9fb2c5;margin-bottom:7px}.progress-head b{color:#eaf1f8}.job-dates{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:14px}.job-dates span{border:1px solid rgba(90,120,150,.16);border-radius:10px;padding:9px;color:#c9d6e0;font-size:10px}.job-dates small{display:block;color:#728ca3;font-size:8px;text-transform:uppercase;letter-spacing:.08em;margin-bottom:3px}.job-footer{display:flex;align-items:center;justify-content:space-between;margin-top:17px}.job-footer>span{font-size:10px;color:#ff9d43}.viti-btn{border-radius:12px;min-height:42px}.viti-btn--primary{background:linear-gradient(135deg,#1457b8,#1a69cf)!important}
@media(max-width:1050px){.job-grid{grid-template-columns:repeat(2,1fr)}}@media(max-width:700px){.jobs-page{padding-top:18px}.job-grid{grid-template-columns:1fr}.job-summary{grid-template-columns:repeat(2,1fr)}}
</style>
