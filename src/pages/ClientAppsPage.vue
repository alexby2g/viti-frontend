<script setup>
import { computed, onMounted, ref } from 'vue'
import { api } from '../boot/axios'
import PageHeader from '../components/PageHeader.vue'

const loading=ref(true), apps=ref([])
const available=computed(()=>apps.value.filter(app=>app.puede_usar&&app.url_externa))
const pending=computed(()=>apps.value.filter(app=>!app.puede_usar||!app.url_externa))
function pretty(value){return String(value||'').replaceAll('_',' ').replace(/\b\w/g,char=>char.toUpperCase())}
function color(state){return ({activa:'positive',gracia:'orange',suspendida:'negative',lista_entrega:'teal',pruebas:'orange',preparacion:'blue',cancelada:'grey'}[state]||'grey')}
function openExternal(url){if(url&&/^https?:\/\//i.test(url))window.open(url,'_blank','noopener,noreferrer')}
onMounted(async()=>{try{apps.value=(await api.get('/mi/aplicaciones')).data.data||[]}finally{loading.value=false}})
</script>

<template>
  <q-page class="client-apps-page">
    <q-inner-loading :showing="loading" dark/>
    <PageHeader eyebrow="Mi espacio VITI" title="Mis sistemas" subtitle="VITI conserva los accesos; cada sistema se abre en su propio sitio y funciona de manera independiente."/>

    <template v-if="!loading">
      <section v-if="available.length" class="apps-grid">
        <article v-for="app in available" :key="app.id" class="app-card">
          <div class="app-head"><span class="app-icon"><q-icon name="language"/></span><div><small>{{app.empresa?.nombre_comercial}}</small><h3>{{app.nombre}}</h3></div><q-badge :color="color(app.estado_servicio)">{{pretty(app.estado_servicio)}}</q-badge></div>
          <p>{{app.estado_mensaje||'Tu sistema está disponible.'}}</p>
          <button class="external-launch" type="button" @click="openExternal(app.url_externa)"><span><small>SITIO EXTERNO</small><b>{{app.url_externa}}</b></span><q-icon name="open_in_new"/></button>
          <div v-if="app.entrega?.apk_url" class="secondary-actions"><q-btn flat no-caps icon="android" label="Descargar APK" @click="openExternal(app.entrega.apk_url)"/></div>
          <div v-if="app.estado_servicio==='suspendida'" class="service-note danger"><q-icon name="lock"/>El acceso está pausado temporalmente.</div>
          <div v-else-if="app.estado_servicio==='gracia'" class="service-note"><q-icon name="schedule"/>El sistema continúa disponible durante el periodo indicado.</div>
        </article>
      </section>

      <section v-if="pending.length" class="pending-card q-mt-lg">
        <div class="pending-head"><div class="eyebrow">EN PREPARACIÓN</div><h3>Próximos sistemas</h3><p>VITI mostrará el enlace cuando el sistema esté entregado y disponible.</p></div>
        <article v-for="app in pending" :key="app.id" class="pending-row"><span class="app-icon small"><q-icon name="construction"/></span><div class="pending-copy"><b>{{app.nombre}}</b><span>{{app.proyecto?`${app.proyecto.progreso||0}% del trabajo`:(app.estado_mensaje||'En preparación')}}</span></div><q-badge outline :color="color(app.estado_servicio)">{{pretty(app.estado_servicio)}}</q-badge></article>
      </section>

      <div v-if="!apps.length" class="apps-empty"><q-icon name="language" size="58px"/><h2>Todavía no tienes un sistema disponible</h2><p>Cuando VITI termine y entregue tu sistema, su enlace aparecerá aquí.</p><q-btn outline color="orange" no-caps icon="timeline" label="Ver mi trabajo" to="/mi-proyecto"/></div>
    </template>
  </q-page>
</template>

<style scoped>
.client-apps-page{min-height:100%;color:#edf4fb}.apps-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(310px,1fr));gap:16px}.app-card,.pending-card{background:linear-gradient(180deg,rgba(12,34,57,.94),rgba(9,27,47,.96));border:1px solid rgba(89,122,152,.24);border-radius:20px;overflow:hidden}.app-card{padding:22px}.app-head{display:flex;align-items:center;gap:12px}.app-head>div{min-width:0;flex:1}.app-head small{font-size:9px;color:#8198ac;text-transform:uppercase;letter-spacing:.08em}.app-head h3{margin:4px 0 0;font-size:20px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.app-icon{width:48px;height:48px;border-radius:14px;background:rgba(36,107,199,.16);color:#79b1ff;display:grid;place-items:center;font-size:23px;flex:0 0 auto}.app-icon.small{width:39px;height:39px;border-radius:11px;font-size:19px}.app-card>p{color:#9fb2c3;line-height:1.55;min-height:44px}.external-launch{width:100%;font:inherit;color:#dce7f1;background:rgba(6,21,37,.5);border:1px solid rgba(242,139,48,.22);border-radius:14px;padding:14px;text-align:left;display:flex;align-items:center;gap:12px;cursor:pointer}.external-launch:hover{background:rgba(242,139,48,.06);border-color:rgba(242,139,48,.4)}.external-launch span{display:grid;min-width:0;flex:1}.external-launch small{font-size:8px;letter-spacing:.09em;color:#f28b30}.external-launch b{font-size:10px;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.external-launch>.q-icon{font-size:21px;color:#f28b30}.secondary-actions{margin-top:8px}.service-note{display:flex;align-items:flex-start;gap:7px;margin-top:14px;padding:10px;border-radius:11px;background:rgba(242,139,48,.07);border:1px solid rgba(242,139,48,.16);font-size:10px;color:#c6d2dd;line-height:1.5}.service-note.danger{background:rgba(218,68,83,.08);border-color:rgba(218,68,83,.2)}.pending-head{padding:20px;border-bottom:1px solid rgba(89,122,152,.14)}.eyebrow{font-size:9px;font-weight:900;letter-spacing:.12em;color:#f28b30}.pending-head h3{margin:5px 0;font-size:20px}.pending-head p{margin:0;color:#91a7b9;font-size:11px}.pending-row{display:flex;align-items:center;gap:12px;padding:14px 18px;border-bottom:1px solid rgba(89,122,152,.12)}.pending-row:last-child{border-bottom:0}.pending-copy{display:grid;min-width:0;flex:1}.pending-copy b{font-size:13px}.pending-copy span{color:#8198ac;font-size:10px;margin-top:3px}.apps-empty{min-height:440px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;color:#879eb1}.apps-empty>.q-icon{color:#f28b30}.apps-empty h2{color:#edf4fb;margin:14px 0 5px}.apps-empty p{max-width:540px;line-height:1.6}@media(max-width:650px){.pending-row{align-items:flex-start;flex-wrap:wrap}.app-card{padding:18px}}
</style>
