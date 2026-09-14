<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '../boot/axios'
import { formatDate, formatDateTime } from '../utils/date'
import { downloadFile } from '../utils/download'
import PageHeader from '../components/PageHeader.vue'

const router=useRouter()
const item=ref(null)
const loading=ref(true)
const plan=computed(()=>item.value?.empresa?.plan_viti||item.value?.solicitud?.plan_viti||null)

async function load(){ loading.value=true; try{ item.value=(await api.get('/mi/proyecto')).data.data } finally{ loading.value=false } }
function openFile(f){ downloadFile(`/mi/archivos/${f.id}/descargar`,f.nombre_original) }
function money(value){ return value===null||value===undefined ? 'Por definir' : `${Number(value).toFixed(0)} Bs` }
function pretty(value){ return String(value||'').replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase()) }
function openApplication(){
  if(!item.value?.aplicacion?.acceso_cliente)return
  const key=item.value.aplicacion.catalogo?.clave
  if(key==='peluqueria')router.push('/mi-apps/peluqueria/inicio')
  else if(key==='electrofrio')router.push('/mi-apps/electrofrio/inicio')
  else if(key==='servicio-tecnico')router.push('/mi-apps/servicio-tecnico/inicio')
  else if(item.value.aplicacion.url)window.location.assign(item.value.aplicacion.url)
}
onMounted(load)
</script>

<template>
  <q-page class="client-project-page">
    <q-inner-loading :showing="loading" dark />

    <template v-if="item">
      <PageHeader eyebrow="Mi proyecto" :title="item.nombre" :subtitle="`${item.codigo} · ${item.empresa?.nombre_comercial||'En desarrollo'}`" />

      <section class="project-hero">
        <div>
          <div class="eyebrow">ESTADO ACTUAL</div>
          <h2>{{pretty(item.fase)}}</h2>
          <p>VITI irá mostrando aquí los avances que necesitas conocer.</p>
          <div class="progress-track"><span :style="{width:`${item.progreso||0}%`}"></span></div>
          <div class="progress-meta"><b>{{item.progreso||0}}% completado</b><span>{{pretty(item.estado)}}</span></div>
        </div>
        <div class="progress-ring"><strong>{{item.progreso||0}}%</strong><span>avance</span></div>
      </section>

      <div class="project-grid q-mt-lg">
        <div>
          <q-card v-if="plan" flat class="client-card commercial-card">
            <q-card-section>
              <div class="eyebrow">TU ACUERDO</div>
              <h3>{{plan.nombre}}</h3>
              <p>{{plan.descripcion}}</p>
              <div class="money-grid">
                <div><small>Implementación</small><b>{{money(item.precio_estimado??plan.precio_proyecto)}}</b><span>Creación y puesta en marcha</span></div>
                <div><small>Servicio</small><b>{{plan.precio_mensual!==null ? `${money(plan.precio_mensual)} / mes` : 'Según acuerdo'}}</b><span>Después de la etapa acordada</span></div>
              </div>
              <div class="plain-note"><q-icon name="info"/> La implementación y el servicio son conceptos separados. Antes de cualquier cobro nuevo podrás verlo en VITI.</div>
            </q-card-section>
          </q-card>

          <q-card flat class="client-card q-mt-lg">
            <q-card-section><h3>Avances</h3><p class="muted">Solo mostramos información útil para que sepas qué se hizo y qué sigue.</p></q-card-section>
            <q-separator/>
            <div v-if="item.avances?.length" class="updates-list">
              <article v-for="a in item.avances" :key="a.id" class="update-row">
                <span class="update-dot"></span>
                <div class="update-body"><div class="update-top"><b>{{a.titulo}}</b><small>{{formatDateTime(a.created_at)}}</small></div><p>{{a.descripcion}}</p><div class="update-foot"><q-badge v-if="a.progreso!==null" outline color="orange">{{a.progreso}}%</q-badge><q-btn v-for="f in a.archivos" :key="f.id" flat dense no-caps icon="attach_file" :label="f.nombre_original" @click="openFile(f)"/></div></div>
              </article>
            </div>
            <div v-else class="empty-updates">Todavía no hay avances publicados. Aparecerán aquí cuando el proyecto comience a moverse.</div>
          </q-card>
        </div>

        <aside>
          <q-card flat class="client-card dates-card">
            <q-card-section><div class="eyebrow">FECHAS</div><h3>Calendario del proyecto</h3></q-card-section>
            <div class="date-row"><span>Inicio</span><b>{{formatDate(item.fecha_inicio)}}</b></div>
            <div class="date-row"><span>Beta estimada</span><b>{{formatDate(item.fecha_beta)}}</b></div>
            <div class="date-row"><span>Entrega estimada</span><b>{{formatDate(item.fecha_entrega)}}</b></div>
          </q-card>

          <q-card v-if="item.aplicacion" flat class="client-card q-mt-lg">
            <q-card-section>
              <div class="eyebrow">TU SISTEMA</div>
              <h3>{{item.aplicacion.nombre}}</h3>
              <p class="muted">{{ item.aplicacion.acceso_cliente ? 'El acceso ya fue habilitado.' : 'Todavía está en preparación. Te avisaremos cuando puedas abrirlo.' }}</p>
              <q-btn v-if="item.aplicacion.acceso_cliente" color="primary" unelevated no-caps class="full-width q-mt-sm" icon="launch" label="Abrir mi sistema" @click="openApplication"/>
              <q-btn v-else outline color="orange" no-caps class="full-width q-mt-sm" icon="apps" label="Ver mis sistemas" to="/mi-aplicaciones"/>
            </q-card-section>
          </q-card>
        </aside>
      </div>
    </template>

    <div v-else-if="!loading" class="project-empty">
      <q-icon name="account_tree" size="56px"/>
      <h2>Aún no tienes un proyecto activo</h2>
      <p>Cuando una solicitud sea aprobada y VITI inicie el proyecto, aparecerá aquí.</p>
      <q-btn outline color="orange" no-caps label="Volver a mi espacio" to="/mi-cuenta"/>
    </div>
  </q-page>
</template>

<style scoped>
.client-project-page{min-height:100%;color:#edf4fb}.project-hero{display:flex;justify-content:space-between;align-items:center;gap:28px;padding:28px 30px;background:linear-gradient(135deg,#0d2239,#123353);border:1px solid rgba(89,122,152,.28);border-radius:22px}.project-hero>div:first-child{flex:1}.eyebrow{font-size:10px;font-weight:900;letter-spacing:.14em;color:#f28b30}.project-hero h2,.client-card h3{margin:7px 0 6px;color:#f5f9fd}.project-hero h2{font-size:30px}.project-hero p,.client-card p.muted,.commercial-card>div>p{color:#9fb2c3;line-height:1.6}.progress-track{height:8px;background:#071729;border-radius:999px;overflow:hidden;margin-top:18px}.progress-track span{display:block;height:100%;background:linear-gradient(90deg,#246bc7,#f28b30);border-radius:999px}.progress-meta{display:flex;justify-content:space-between;gap:12px;margin-top:8px;font-size:11px;color:#a9bdcb}.progress-ring{width:112px;height:112px;flex:0 0 112px;border-radius:50%;border:7px solid #246bc7;box-shadow:inset 0 0 0 1px rgba(242,139,48,.26);display:flex;flex-direction:column;align-items:center;justify-content:center;background:#0a1d31}.progress-ring strong{font-size:25px}.progress-ring span{font-size:9px;color:#9fb2c3}.project-grid{display:grid;grid-template-columns:minmax(0,1fr) 320px;gap:16px}.client-card{background:linear-gradient(180deg,rgba(12,34,57,.94),rgba(9,27,47,.96))!important;color:#edf4fb;border:1px solid rgba(89,122,152,.24);border-radius:19px;overflow:hidden}.client-card :deep(.q-separator){background:rgba(89,122,152,.17)}.commercial-card h3,.client-card h3{font-size:21px}.money-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:18px}.money-grid>div{padding:14px;border-radius:14px;background:rgba(6,21,37,.4);border:1px solid rgba(89,122,152,.18)}.money-grid small,.money-grid b,.money-grid span{display:block}.money-grid small{color:#f28b30;font-size:9px;text-transform:uppercase;letter-spacing:.08em}.money-grid b{font-size:19px;margin:4px 0}.money-grid span{font-size:10px;color:#859cad}.plain-note{display:flex;gap:8px;align-items:flex-start;margin-top:13px;padding:11px 12px;border:1px solid rgba(36,107,199,.22);background:rgba(36,107,199,.06);border-radius:12px;color:#9fb2c3;font-size:11px;line-height:1.5}.plain-note .q-icon{color:#72aaff;font-size:17px}.updates-list{display:grid}.update-row{display:grid;grid-template-columns:14px 1fr;gap:10px;padding:18px 20px;border-bottom:1px solid rgba(89,122,152,.13)}.update-row:last-child{border-bottom:0}.update-dot{width:9px;height:9px;border-radius:50%;background:#f28b30;margin-top:5px}.update-top{display:flex;justify-content:space-between;gap:16px}.update-top small{color:#768fa4;font-size:10px}.update-body p{color:#a9bdcb;line-height:1.55;white-space:pre-wrap;margin:7px 0 0}.update-foot{display:flex;flex-wrap:wrap;gap:5px;margin-top:10px}.update-foot :deep(.q-btn){color:#9fb6ca}.empty-updates{padding:34px 20px;text-align:center;color:#8299ad}.dates-card{padding-bottom:5px}.date-row{display:flex;justify-content:space-between;gap:10px;padding:14px 18px;border-top:1px solid rgba(89,122,152,.14);font-size:12px}.date-row span{color:#8199ad}.project-empty{min-height:460px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;color:#8fa6ba}.project-empty .q-icon{color:#f28b30}.project-empty h2{color:#edf4fb;margin-bottom:5px}.project-empty p{max-width:520px;line-height:1.6}@media(max-width:900px){.project-grid{grid-template-columns:1fr}.project-hero{align-items:flex-start}.progress-ring{width:90px;height:90px;flex-basis:90px}}@media(max-width:600px){.project-hero{padding:22px;flex-direction:column}.money-grid{grid-template-columns:1fr}.progress-ring{display:none}.update-top{flex-direction:column;gap:3px}}
</style>
