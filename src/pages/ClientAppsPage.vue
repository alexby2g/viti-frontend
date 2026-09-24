<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '../boot/axios'
import PageHeader from '../components/PageHeader.vue'

const router = useRouter()
const loading = ref(true)
const apps = ref([])
const serviceStates = ['activa','gracia','suspendida','mantenimiento','bloqueado_manual']
const available = computed(() => apps.value.filter(app => serviceStates.includes(app.estado_servicio)))
const pending = computed(() => apps.value.filter(app => !serviceStates.includes(app.estado_servicio)))

const labels = { mantenimiento:'En mantenimiento', bloqueado_manual:'Acceso suspendido', suspendida:'Pausado por pago' }
function pretty(value) { if (labels[value]) return labels[value]; return String(value || '').replaceAll('_',' ').replace(/\b\w/g, char => char.toUpperCase()) }
function openApp(app) { if (app.ruta) router.push(app.ruta) }
function openExternal(url) { if (url && /^https?:\/\//i.test(url)) window.open(url, '_blank', 'noopener,noreferrer') }
function color(state) { return ({activa:'positive',gracia:'orange',suspendida:'negative',mantenimiento:'blue',bloqueado_manual:'deep-orange',lista_entrega:'teal',pruebas:'orange',preparacion:'blue',cancelada:'grey'}[state] || 'grey') }
function icon(app) { return app.catalogo?.icono || (app.tipo==='movil'?'smartphone':'apps') }

onMounted(async () => {
  try { apps.value = (await api.get('/mi/aplicaciones')).data.data || [] }
  finally { loading.value = false }
})
</script>

<template>
  <q-page class="client-apps-page">
    <q-inner-loading :showing="loading" dark />
    <PageHeader eyebrow="Mi espacio VITI" title="Mis sistemas" subtitle="Aquí encontrarás la beta, web o APK cuando estén disponibles para ti." />

    <template v-if="!loading">
      <section v-if="available.length" class="apps-grid">
        <article v-for="app in available" :key="app.id" class="app-card">
          <div class="app-head">
            <span class="app-icon"><q-icon :name="icon(app)"/></span>
            <div><small>{{app.empresa?.nombre_comercial}}</small><h3>{{app.nombre}}</h3></div>
            <q-badge :color="color(app.estado_servicio)">{{ pretty(app.estado_servicio) }}</q-badge>
          </div>
          <p>{{app.estado_mensaje || 'Tu sistema está disponible para continuar.'}}</p>
          <div class="delivery-options">
            <button v-if="app.ruta && app.puede_usar!==false" type="button" @click="openApp(app)"><q-icon name="launch"/><span><small>SISTEMA</small><b>Abrir ahora</b></span></button>
            <button v-if="app.entrega?.apk_url" type="button" @click="openExternal(app.entrega.apk_url)"><q-icon name="android"/><span><small>APK</small><b>{{app.entrega.apk_version || 'Descargar'}}</b></span></button>
            <button v-if="app.entrega?.beta_url" type="button" @click="openExternal(app.entrega.beta_url)"><q-icon name="science"/><span><small>PRUEBA</small><b>Abrir beta</b></span></button>
          </div>
          <div v-if="app.estado_servicio==='mantenimiento'" class="service-note"><q-icon name="construction"/> Estamos actualizando este sistema. Vuelve en unos minutos; tus datos están a salvo.</div>
          <div v-else-if="app.estado_servicio==='bloqueado_manual'" class="service-note danger"><q-icon name="block"/> El acceso está suspendido. Escribe a Atención VITI para más información.</div>
          <div v-else-if="app.estado_servicio==='suspendida'" class="service-note danger"><q-icon name="lock"/> El acceso está pausado por un pago pendiente. Tus datos permanecen guardados. <router-link to="/mi-pagos">Ver mis pagos</router-link></div>
          <div v-else-if="app.estado_servicio==='gracia'" class="service-note"><q-icon name="schedule"/> El sistema continúa disponible durante el periodo indicado.</div>
        </article>
      </section>

      <section v-if="pending.length" class="pending-card q-mt-lg">
        <div class="pending-head"><div><div class="eyebrow">EN PREPARACIÓN</div><h3>Próximos sistemas</h3><p>Cuando haya una beta lista podrás abrirla desde aquí.</p></div></div>
        <article v-for="app in pending" :key="app.id" class="pending-row">
          <span class="app-icon small"><q-icon :name="icon(app)"/></span>
          <div class="pending-copy"><b>{{app.nombre}}</b><span>{{ app.proyecto ? `${app.proyecto.progreso || 0}% del proyecto` : (app.estado_mensaje || 'En preparación') }}</span></div>
          <q-badge outline :color="color(app.estado_servicio)">{{ pretty(app.estado_servicio) }}</q-badge>
          <q-btn v-if="app.entrega?.beta_url" flat no-caps color="orange" icon="science" label="Probar beta" @click="openExternal(app.entrega.beta_url)" />
        </article>
      </section>

      <div v-if="!apps.length" class="apps-empty">
        <q-icon name="apps" size="58px"/>
        <h2>Todavía no tienes un sistema disponible</h2>
        <p>Cuando tu proyecto avance y VITI publique una beta, web o APK aparecerá aquí.</p>
        <q-btn outline color="orange" no-caps icon="timeline" label="Ver mi proyecto" to="/mi-proyecto"/>
      </div>
    </template>
  </q-page>
</template>

<style scoped>
.client-apps-page{min-height:100%;color:#edf4fb}.apps-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(310px,1fr));gap:16px}.app-card,.pending-card{background:linear-gradient(180deg,rgba(12,34,57,.94),rgba(9,27,47,.96));border:1px solid rgba(89,122,152,.24);border-radius:20px;overflow:hidden}.app-card{padding:22px}.app-head{display:flex;align-items:center;gap:12px}.app-head>div{min-width:0;flex:1}.app-head small{font-size:9px;color:#8198ac;text-transform:uppercase;letter-spacing:.08em}.app-head h3{margin:4px 0 0;font-size:20px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.app-icon{width:48px;height:48px;border-radius:14px;background:rgba(36,107,199,.16);color:#79b1ff;display:grid;place-items:center;font-size:23px;flex:0 0 auto}.app-icon.small{width:39px;height:39px;border-radius:11px;font-size:19px}.app-card>p{color:#9fb2c3;line-height:1.55;min-height:44px}.delivery-options{display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:8px;margin-top:17px}.delivery-options button{font:inherit;color:#dce7f1;background:rgba(6,21,37,.44);border:1px solid rgba(89,122,152,.18);border-radius:13px;padding:12px;text-align:left;display:flex;align-items:center;gap:9px;cursor:pointer;transition:.16s ease}.delivery-options button:hover{border-color:rgba(242,139,48,.36);background:rgba(242,139,48,.05)}.delivery-options .q-icon{color:#f28b30;font-size:20px}.delivery-options small,.delivery-options b{display:block}.delivery-options small{font-size:8px;letter-spacing:.09em;color:#8198ac}.delivery-options b{font-size:11px;margin-top:2px}.service-note{display:flex;align-items:flex-start;gap:7px;margin-top:14px;padding:10px;border-radius:11px;background:rgba(242,139,48,.07);border:1px solid rgba(242,139,48,.16);font-size:10px;color:#c6d2dd;line-height:1.5}.service-note.danger{background:rgba(218,68,83,.08);border-color:rgba(218,68,83,.2)}.pending-head{padding:20px;border-bottom:1px solid rgba(89,122,152,.14)}.eyebrow{font-size:9px;font-weight:900;letter-spacing:.12em;color:#f28b30}.pending-head h3{margin:5px 0;font-size:20px}.pending-head p{margin:0;color:#91a7b9;font-size:11px}.pending-row{display:flex;align-items:center;gap:12px;padding:14px 18px;border-bottom:1px solid rgba(89,122,152,.12)}.pending-row:last-child{border-bottom:0}.pending-copy{display:grid;min-width:0;flex:1}.pending-copy b{font-size:13px}.pending-copy span{color:#8198ac;font-size:10px;margin-top:3px}.apps-empty{min-height:440px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;color:#879eb1}.apps-empty>.q-icon{color:#f28b30}.apps-empty h2{color:#edf4fb;margin:14px 0 5px}.apps-empty p{max-width:540px;line-height:1.6}@media(max-width:650px){.pending-row{align-items:flex-start;flex-wrap:wrap}.pending-row .q-btn{width:100%}.app-card{padding:18px}}
</style>
