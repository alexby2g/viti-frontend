<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { api } from '../boot/axios'
import AppBrand from '../components/AppBrand.vue'

const route = useRoute()
const remote = ref(null)
const loading = ref(false)

const copy = {
  mantenimiento:{ icon:'construction', kicker:'MANTENIMIENTO', title:'Estamos actualizando este sistema.', text:'Vuelve en unos minutos. Tus datos están a salvo.' },
  bloqueado_pago:{ icon:'lock_clock', kicker:'SERVICIO PAUSADO', title:'El acceso está pausado por un pago pendiente.', text:'Tus datos permanecen guardados. El sistema vuelve a estar disponible en cuanto se confirma el pago.' },
  bloqueado_manual:{ icon:'block', kicker:'ACCESO SUSPENDIDO', title:'El acceso a este sistema está suspendido.', text:'Comunícate con Atención VITI para más información.' },
  pausado:{ icon:'pause_circle', kicker:'SERVICIO PAUSADO', title:'Este sistema está pausado temporalmente.', text:'Comunícate con Atención VITI para más información.' },
  retirado:{ icon:'archive', kicker:'SISTEMA RETIRADO', title:'Este sistema ya no está disponible.', text:'Comunícate con Atención VITI si necesitas recuperar información.' },
}
const query = computed(() => ({
  estado:String(route.query.estado || ''),
  sistema:String(route.query.sistema || ''),
  mensaje:String(route.query.mensaje || ''),
  hasta:String(route.query.hasta || ''),
}))
const state = computed(() => remote.value?.estado || query.value.estado || 'mantenimiento')
const view = computed(() => copy[state.value] || copy.mantenimiento)
const system = computed(() => remote.value?.sistema || query.value.sistema)
const message = computed(() => remote.value?.mensaje || query.value.mensaje || view.value.text)
const until = computed(() => {
  const value = remote.value?.hasta || query.value.hasta
  if (!value) return ''
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString('es-BO', { dateStyle:'medium', timeStyle:'short' })
})
const back = computed(() => {
  const value = String(route.query.volver || '')
  return value.startsWith('/') && !value.startsWith('//') ? value : ''
})

function retry() {
  if (back.value) window.location.assign(back.value)
  else window.location.reload()
}
async function check() {
  const dominio = String(route.query.dominio || '')
  if (!dominio) return
  loading.value = true
  try {
    const { data } = await api.get('/publico/acceso', { params:{ dominio } })
    remote.value = data
  } catch { /* sin respuesta se muestran los datos recibidos en la dirección */ }
  finally { loading.value = false }
}
onMounted(check)
</script>

<template>
  <q-page class="unavailable-page">
    <header class="unavailable-top"><router-link to="/viti" class="brand-link"><AppBrand /></router-link></header>
    <main class="unavailable-card">
      <q-inner-loading :showing="loading" dark />
      <div class="unavailable-icon" :class="`is-${state}`"><q-icon :name="view.icon" /></div>
      <div class="unavailable-kicker">{{ view.kicker }}</div>
      <h1>{{ view.title }}</h1>
      <p v-if="system" class="system-name">{{ system }}</p>
      <p class="unavailable-message">{{ message }}</p>
      <div v-if="until" class="unavailable-until"><q-icon name="event" /> Disponible nuevamente desde {{ until }}</div>
      <div class="unavailable-actions">
        <q-btn unelevated no-caps color="primary" icon="refresh" label="Volver a intentar" @click="retry" />
        <q-btn v-if="state==='bloqueado_pago'" outline no-caps color="orange" icon="receipt_long" label="Ver mis pagos" to="/mi-pagos" />
        <q-btn v-else outline no-caps color="orange" icon="support_agent" label="Atención VITI" to="/mi-buzon" />
      </div>
    </main>
    <footer class="unavailable-footer">VITI · Sistemas administrados por VITI.</footer>
  </q-page>
</template>

<style scoped>
.unavailable-page{min-height:100vh;display:flex;flex-direction:column;align-items:center;padding:0 16px;background:radial-gradient(circle at 80% 0,rgba(36,107,199,.18),transparent 28rem),linear-gradient(180deg,#06111f,#0a1b2f);color:#edf4fb}
.unavailable-top{width:min(980px,100%);min-height:74px;display:flex;align-items:center}.brand-link{color:inherit;text-decoration:none}
.unavailable-card{position:relative;width:min(620px,100%);margin:auto 0;padding:44px 34px;text-align:center;border-radius:28px;border:1px solid rgba(92,130,165,.28);background:linear-gradient(180deg,#0d2036,#09192b);box-shadow:0 30px 80px rgba(0,0,0,.25)}
.unavailable-icon{width:78px;height:78px;margin:0 auto 20px;border-radius:50%;display:grid;place-items:center;font-size:36px;background:rgba(116,173,246,.12);border:1px solid rgba(116,173,246,.35);color:#74adf6}
.unavailable-icon.is-bloqueado_pago,.unavailable-icon.is-bloqueado_manual{background:rgba(242,139,48,.12);border-color:rgba(242,139,48,.38);color:#f28b30}
.unavailable-kicker{font-size:12px;font-weight:900;letter-spacing:.16em;color:#f28b30}
.unavailable-card h1{font-size:clamp(28px,4vw,40px);line-height:1.1;letter-spacing:-.03em;margin:12px 0 8px}
.system-name{font-weight:800;color:#9cc4f5;margin:0 0 8px}
.unavailable-message{color:#adbdcc;font-size:16px;line-height:1.65;margin:0 auto;max-width:480px}
.unavailable-until{display:inline-flex;gap:8px;align-items:center;margin-top:16px;padding:8px 14px;border-radius:999px;background:rgba(116,173,246,.1);color:#c9dcf3;font-size:13px}
.unavailable-actions{display:flex;justify-content:center;gap:10px;flex-wrap:wrap;margin-top:28px}.unavailable-actions .q-btn{border-radius:12px}
.unavailable-footer{padding:26px 0;color:#61788e;font-size:11px}
@media(max-width:560px){.unavailable-card{padding:30px 18px}.unavailable-actions{display:grid}.unavailable-actions .q-btn{width:100%}}
</style>
