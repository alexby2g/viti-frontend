<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '../boot/axios'
import PageHeader from '../components/PageHeader.vue'
import { formatDateTime } from '../utils/date'

const route = useRoute()
const router = useRouter()
const item = ref(null)
const loading = ref(true)
const error = ref('')
const activeTab = ref('resumen')

const companies = computed(() => item.value?.empresas || [])
const requests = computed(() => item.value?.solicitudes || [])
const jobs = computed(() => item.value?.proyectos || [])

function pretty(value){ return String(value||'').replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase()) }
function statusColor(value){ return ({activo:'positive',prospecto:'orange',inactivo:'grey'}[value] || 'grey') }
async function load(){loading.value=true;error.value='';try{item.value=(await api.get(`/clientes/${Number(route.params.id)}`)).data.data}catch(e){error.value=e.response?.data?.message||'No se pudo cargar el cliente.'}finally{loading.value=false}}
onMounted(load)
</script>

<template>
  <q-page class="viti-page client-detail-page">
    <q-inner-loading :showing="loading"/>
    <q-banner v-if="error" rounded class="bg-red-10 text-white">{{error}}<template #action><q-btn flat label="Volver" to="/clientes"/></template></q-banner>
    <template v-if="item">
      <PageHeader eyebrow="Cliente" :title="item.nombre" :subtitle="item.correo || item.telefono || 'Contacto sin correo'">
        <q-badge outline :color="statusColor(item.estado)" class="state-badge">{{pretty(item.estado||'prospecto')}}</q-badge>
      </PageHeader>

      <section class="client-overview q-mb-lg">
        <article><small>TELÉFONO</small><b>{{item.telefono||'Sin teléfono'}}</b></article>
        <article><small>WHATSAPP</small><b>{{item.whatsapp||item.telefono||'Sin WhatsApp'}}</b></article>
        <article><small>CIUDAD</small><b>{{item.ciudad||'Sin ciudad'}}</b></article>
        <article><small>NEGOCIOS</small><b>{{companies.length}}</b></article>
      </section>

      <q-tabs v-model="activeTab" dense no-caps align="left" class="client-tabs" active-color="orange" indicator-color="orange">
        <q-tab name="resumen" label="Resumen"/><q-tab name="solicitudes" label="Solicitudes"/><q-tab name="trabajos" label="Trabajos"/><q-tab name="archivos" label="Archivos"/>
      </q-tabs>
      <q-tab-panels v-model="activeTab" animated class="client-panels">
        <q-tab-panel name="resumen">
          <div class="business-grid">
            <article v-for="company in companies" :key="company.id" class="business-card"><small>{{company.codigo||'NEGOCIO'}}</small><h3>{{company.nombre_comercial}}</h3><p>{{company.actividad||'Actividad no especificada.'}}</p><div><span>{{company.telefono||'Sin teléfono'}}</span><q-badge outline :color="company.estado==='activo'?'positive':'grey'">{{pretty(company.estado)}}</q-badge></div></article>
            <div v-if="!companies.length" class="empty-block">Sin negocios asociados.</div>
          </div>
        </q-tab-panel>
        <q-tab-panel name="solicitudes">
          <div class="linked-list"><button v-for="row in requests" :key="row.id" type="button" @click="router.push(`/solicitudes/${row.id}`)"><span><small>{{row.codigo}}</small><b>{{row.titulo}}</b></span><span>{{pretty(row.estado)}}<q-icon name="arrow_forward"/></span></button><div v-if="!requests.length" class="empty-block">Este cliente todavía no tiene solicitudes.</div></div>
        </q-tab-panel>
        <q-tab-panel name="trabajos">
          <div class="linked-list"><button v-for="row in jobs" :key="row.id" type="button" @click="router.push(`/trabajos/${row.id}`)"><span><small>{{row.codigo}}</small><b>{{row.nombre}}</b></span><span>{{row.progreso||0}}%<q-icon name="arrow_forward"/></span></button><div v-if="!jobs.length" class="empty-block">Este cliente todavía no tiene trabajos.</div></div>
        </q-tab-panel>
        <q-tab-panel name="archivos">
          <div class="linked-list"><div v-for="file in item.archivos||[]" :key="file.id" class="file-row"><q-icon name="description"/><span><b>{{file.nombre_original||file.nombre||'Archivo'}}</b><small>{{formatDateTime(file.created_at)}}</small></span></div><div v-if="!(item.archivos||[]).length" class="empty-block">No hay archivos asociados.</div></div>
        </q-tab-panel>
      </q-tab-panels>
    </template>
  </q-page>
</template>

<style scoped>
.client-detail-page{max-width:1180px;padding-top:32px}.state-badge{padding:6px 10px;border-radius:999px}.client-overview{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.client-overview article{padding:14px 16px;border:1px solid rgba(78,110,141,.22);background:rgba(8,25,45,.55);border-radius:14px}.client-overview small,.client-overview b{display:block}.client-overview small{font-size:8px;color:#728ca3;letter-spacing:.09em}.client-overview b{font-size:13px;margin-top:4px}.client-tabs{border:1px solid rgba(78,110,141,.22);background:rgba(8,25,45,.55);border-radius:14px 14px 0 0}.client-panels{background:rgba(8,25,45,.48)!important;color:#edf4fb;border:1px solid rgba(78,110,141,.22);border-top:0;border-radius:0 0 18px 18px}.business-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}.business-card{padding:17px;border:1px solid rgba(78,110,141,.2);background:rgba(13,36,61,.62);border-radius:15px}.business-card small{font-size:8px;color:#f28b30;font-weight:900;letter-spacing:.1em}.business-card h3{font-size:16px;margin:6px 0}.business-card p{color:#91a8bb;font-size:10px;min-height:32px}.business-card>div{display:flex;justify-content:space-between;align-items:center;color:#b8c6d2;font-size:10px}.linked-list{display:grid;gap:8px}.linked-list button,.file-row{font:inherit;color:inherit;border:1px solid rgba(78,110,141,.18);background:rgba(13,36,61,.5);border-radius:12px;padding:13px 15px;display:flex;align-items:center;justify-content:space-between;text-align:left}.linked-list button{cursor:pointer}.linked-list button:hover{border-color:rgba(242,139,48,.35)}.linked-list button span:first-child{display:grid}.linked-list small{color:#748da4;font-size:8px}.linked-list b{font-size:11px;margin-top:2px}.linked-list button span:last-child{color:#ff9d45;font-size:10px}.file-row{justify-content:flex-start;gap:10px}.file-row>.q-icon{color:#f28b30}.file-row span{display:grid}.empty-block{min-height:150px;display:grid;place-items:center;color:#718ba1;border:1px dashed rgba(90,120,150,.2);border-radius:14px}
@media(max-width:760px){.client-detail-page{padding-top:18px}.client-overview{grid-template-columns:repeat(2,1fr)}.business-grid{grid-template-columns:1fr}}
</style>
