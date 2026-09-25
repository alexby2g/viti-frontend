<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '../boot/axios'
import PageHeader from '../components/PageHeader.vue'

const router = useRouter()
const rows = ref([])
const loading = ref(false)
const search = ref('')
const activeCount = computed(() => rows.value.filter(row => row.estado === 'activo').length)

async function load(){
  loading.value = true
  try { rows.value = (await api.get('/clientes',{params:{buscar:search.value,per_page:100}})).data.data || [] }
  finally { loading.value = false }
}
function open(row){ router.push(`/clientes/${row.id}`) }
function stateColor(value){ return ({activo:'positive',prospecto:'orange',inactivo:'grey'}[value] || 'grey') }
function primaryBusiness(row){ return row.empresas?.[0] || null }

onMounted(load)
watch(search,()=>{ clearTimeout(window.__vitiClientSearch); window.__vitiClientSearch=setTimeout(load,300) })
</script>

<template>
  <q-page class="viti-page clients-page">
    <PageHeader eyebrow="Clientes" title="Personas y negocios con los que trabaja VITI" subtitle="Aquí ves el vínculo comercial. Las operaciones internas de cada negocio permanecen fuera de VITI." />

    <section class="clients-toolbar q-mb-lg">
      <q-input v-model="search" outlined dense clearable placeholder="Buscar por nombre, teléfono, correo o negocio"><template #prepend><q-icon name="search"/></template></q-input>
      <div class="client-stats"><span><b>{{rows.length}}</b> registrados</span><span><b>{{activeCount}}</b> activos</span></div>
    </section>

    <q-inner-loading :showing="loading"/>

    <section v-if="!loading && rows.length" class="clients-grid">
      <article v-for="row in rows" :key="row.id" class="client-card" @click="open(row)">
        <div class="client-head">
          <q-avatar size="46px" class="client-avatar"><img v-if="row.foto_url" :src="row.foto_url"/><q-icon v-else name="person"/></q-avatar>
          <div class="client-title"><small>CLIENTE #{{row.id}}</small><h3>{{row.nombre}}</h3></div>
          <q-badge outline :color="stateColor(row.estado)">{{row.estado || 'prospecto'}}</q-badge>
        </div>
        <div class="client-contact"><span><q-icon name="phone"/>{{row.telefono || 'Sin teléfono'}}</span><span><q-icon name="mail"/>{{row.correo || 'Sin correo'}}</span></div>
        <div class="client-business"><small>NEGOCIO PRINCIPAL</small><b>{{primaryBusiness(row)?.nombre_comercial || 'Sin negocio registrado'}}</b><span>{{primaryBusiness(row)?.actividad || 'Actividad por definir'}}</span></div>
        <div class="client-metrics"><div><b>{{row.solicitudes_count||0}}</b><span>Solicitudes</span></div><div><b>{{row.proyectos_count||0}}</b><span>Trabajos</span></div><div><b>{{row.empresas_count||0}}</b><span>Negocios</span></div></div>
        <div class="client-footer"><span>{{row.ciudad || 'Ciudad no definida'}}</span><span>Ver cliente <q-icon name="arrow_forward"/></span></div>
      </article>
    </section>

    <section v-else-if="!loading" class="clients-empty">
      <q-icon name="groups" size="56px"/>
      <h2>{{search ? 'No encontramos clientes' : 'Todavía no hay clientes'}}</h2>
      <p>{{search ? 'Prueba con otro término de búsqueda.' : 'Los clientes se crearán a partir de las solicitudes y del flujo comercial de VITI.'}}</p>
      <q-btn v-if="!search" outline color="orange" no-caps icon="inbox" label="Ir a solicitudes" to="/solicitudes"/>
    </section>
  </q-page>
</template>

<style scoped>
.clients-page{padding-top:34px}.clients-toolbar{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:12px 14px;border:1px solid var(--viti-border);background:rgba(8,25,45,.58);border-radius:17px}.clients-toolbar .q-field{width:min(560px,100%)}.client-stats{display:flex;gap:18px;color:#8ea5b9;font-size:10px}.client-stats b{color:#eff5fa;font-size:16px;margin-right:3px}.clients-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:15px}.client-card{border:1px solid rgba(83,114,145,.22);background:linear-gradient(180deg,rgba(13,37,62,.84),rgba(8,27,47,.9));border-radius:20px;overflow:hidden;cursor:pointer;transition:.18s}.client-card:hover{transform:translateY(-2px);border-color:rgba(242,139,48,.4)}.client-head{display:flex;align-items:center;gap:11px;padding:18px}.client-avatar{background:rgba(20,87,184,.18);color:#7fb4ff;border:1px solid rgba(90,142,210,.2)}.client-title{min-width:0;flex:1}.client-title small{font-size:8px;color:#708aa2;letter-spacing:.09em}.client-title h3{font-size:17px;margin:3px 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.client-contact{display:grid;gap:7px;padding:0 18px 15px}.client-contact span{font-size:10px;color:#a8bac9;display:flex;align-items:center;gap:6px}.client-contact .q-icon{color:#f28b30}.client-business{margin:0 18px 16px;padding:12px;border-radius:12px;background:rgba(255,255,255,.025);display:grid}.client-business small{font-size:8px;color:#718ca3;letter-spacing:.08em}.client-business b{font-size:12px;margin-top:4px}.client-business span{font-size:9px;color:#849bb0;margin-top:3px}.client-metrics{display:grid;grid-template-columns:repeat(3,1fr);border-top:1px solid rgba(96,126,155,.14);border-bottom:1px solid rgba(96,126,155,.14)}.client-metrics>div{text-align:center;padding:12px;border-right:1px solid rgba(96,126,155,.14)}.client-metrics>div:last-child{border-right:0}.client-metrics b,.client-metrics span{display:block}.client-metrics b{font-size:17px}.client-metrics span{font-size:8px;color:#7f97ab;margin-top:2px}.client-footer{display:flex;align-items:center;justify-content:space-between;padding:11px 18px;color:#849caf;font-size:9px}.client-footer span:last-child{color:#ff9c45}.clients-empty{min-height:400px;border:1px dashed rgba(121,151,181,.3);border-radius:22px;background:rgba(8,25,45,.45);display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;color:#7f97ab}.clients-empty>.q-icon{color:#f28b30}.clients-empty h2{font-size:25px;color:#edf4fb;margin:14px 0 5px}.clients-empty p{max-width:580px;line-height:1.6}
@media(max-width:1050px){.clients-grid{grid-template-columns:repeat(2,1fr)}}@media(max-width:700px){.clients-page{padding-top:18px}.clients-grid{grid-template-columns:1fr}.clients-toolbar{align-items:stretch;flex-direction:column}.clients-toolbar .q-field{width:100%}.client-stats{justify-content:space-between}}
</style>
