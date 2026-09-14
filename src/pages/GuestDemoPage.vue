<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import AppBrand from '../components/AppBrand.vue'

const router = useRouter()
const active = ref('resumen')
const gate = ref(false)

const sections = [
  {key:'resumen',icon:'dashboard',label:'Resumen'},
  {key:'proyecto',icon:'account_tree',label:'Proyecto'},
  {key:'sistema',icon:'apps',label:'Sistema'},
  {key:'soporte',icon:'support_agent',label:'Atención'},
]
function protectedAction(){ gate.value=true }
</script>

<template>
  <q-page class="demo-page">
    <header class="demo-header">
      <router-link to="/viti" class="brand-link"><AppBrand/></router-link>
      <div class="demo-badge"><q-icon name="visibility"/> MODO INVITADO · SOLO LECTURA</div>
      <q-space/>
      <q-btn flat no-caps label="Ingresar" to="/login" />
      <q-btn color="primary" unelevated no-caps label="Crear cuenta" to="/registro" />
    </header>

    <div class="demo-shell">
      <aside class="demo-side">
        <div class="side-copy"><small>VISTA DE EJEMPLO</small><b>Tu espacio VITI</b><span>Explora cómo se ve un proyecto sin crear datos reales.</span></div>
        <button v-for="item in sections" :key="item.key" class="side-item" :class="{active:active===item.key}" @click="active=item.key"><q-icon :name="item.icon"/><span>{{item.label}}</span></button>
        <div class="side-bottom"><q-btn outline color="orange" no-caps class="full-width" label="Usar VITI con mis datos" to="/registro"/></div>
      </aside>

      <main class="demo-content">
        <div class="demo-top"><div><div class="kicker">DEMO VITI</div><h1>{{active==='resumen'?'Así verás tu proyecto.':active==='proyecto'?'Seguimiento claro, sin términos técnicos.':active==='sistema'?'Tus entregas en un solo lugar.':'Soporte conectado a tu proyecto.'}}</h1><p>Esta información es simulada y no se guarda en la base de datos.</p></div><q-badge outline color="orange">Ejemplo</q-badge></div>

        <template v-if="active==='resumen'">
          <section class="status-card"><div><small>ESTADO ACTUAL</small><h2>Sistema de gestión de ejemplo</h2><p>Proyecto en desarrollo. La próxima revisión será una beta navegable.</p><div class="status-meta"><q-badge color="warning">En desarrollo</q-badge><span>68% de avance</span></div></div><div class="progress-ring"><b>68%</b><span>avance</span></div></section>
          <div class="metric-grid"><article><q-icon name="description"/><b>Solicitud aprobada</b><span>Alcance confirmado</span></article><article><q-icon name="account_tree"/><b>Proyecto activo</b><span>Desarrollo en curso</span></article><article><q-icon name="science"/><b>Beta próxima</b><span>Lista para revisión</span></article></div>
        </template>

        <template v-else-if="active==='proyecto'">
          <section class="panel-card"><div class="panel-head"><div><small>PROYECTO</small><h2>Avances y próximos pasos</h2></div><q-badge color="warning">68%</q-badge></div><q-linear-progress :value=".68" rounded color="primary" track-color="blue-grey-9" size="9px"/><div class="timeline"><div class="done"><q-icon name="check"/><b>Solicitud</b><span>Completado</span></div><div class="done"><q-icon name="check"/><b>Diseño</b><span>Completado</span></div><div class="current"><q-icon name="code"/><b>Desarrollo</b><span>En curso</span></div><div><q-icon name="science"/><b>Beta</b><span>Próximo</span></div><div><q-icon name="rocket_launch"/><b>Entrega</b><span>Pendiente</span></div></div><q-btn outline color="orange" no-caps label="Comentar avance" @click="protectedAction"/></section>
        </template>

        <template v-else-if="active==='sistema'">
          <section class="panel-card"><div class="panel-head"><div><small>ENTREGA</small><h2>Tu sistema aparecerá aquí</h2></div><q-icon name="apps" size="34px"/></div><div class="delivery-grid"><article><small>WEB</small><b>Próximamente</b><span>Acceso de producción</span></article><article><small>APK</small><b>v1.0.0</b><span>Se habilita al entregar</span></article><article><small>ESTADO</small><b>En desarrollo</b><span>Sin acceso todavía</span></article></div><q-btn color="primary" unelevated no-caps label="Abrir sistema" @click="protectedAction"/></section>
        </template>

        <template v-else>
          <section class="panel-card"><div class="panel-head"><div><small>ATENCIÓN VITI</small><h2>Consulta sobre tu proyecto</h2></div><q-icon name="support_agent" size="34px"/></div><div class="message-demo"><div class="message team">Hola. Cuando tengas una duda sobre tu proyecto, puedes escribirla aquí.</div><div class="message mine">¿Puedo revisar la beta desde mi celular?</div><div class="message team">Sí. Cuando esté disponible aparecerá el botón de acceso en tu proyecto.</div></div><q-btn outline color="orange" no-caps label="Escribir un mensaje" @click="protectedAction"/></section>
        </template>
      </main>
    </div>

    <q-dialog v-model="gate">
      <q-card class="gate-card"><q-card-section><div class="gate-icon"><q-icon name="lock_open"/></div><h2>Continúa con tu propia cuenta</h2><p>En la demo puedes explorar. Para enviar mensajes, crear solicitudes o abrir una entrega necesitas una cuenta VITI.</p></q-card-section><q-card-actions align="right"><q-btn flat no-caps label="Seguir viendo" v-close-popup/><q-btn color="primary" unelevated no-caps label="Crear cuenta" @click="router.push('/registro')"/></q-card-actions></q-card>
    </q-dialog>
  </q-page>
</template>

<style scoped>
.demo-page :deep(.q-btn:not(.q-btn--round)){border-radius:13px}.demo-page :deep(.q-btn.q-btn--outline:before){border-width:1.35px!important}.demo-page{min-height:100vh;background:#061425;color:#edf4fb}.demo-header{min-height:72px;padding:0 26px;display:flex;align-items:center;gap:16px;border-bottom:1px solid rgba(95,128,158,.2);background:#071321}.brand-link{text-decoration:none;color:inherit}.demo-badge{display:flex;align-items:center;gap:7px;padding:7px 10px;border-radius:999px;background:rgba(242,139,48,.08);border:1px solid rgba(242,139,48,.22);color:#ffad62;font-size:10px;font-weight:800;letter-spacing:.08em}.demo-shell{display:grid;grid-template-columns:250px 1fr;min-height:calc(100vh - 72px)}.demo-side{padding:28px 16px;background:linear-gradient(180deg,#081a2d,#0a223a);border-right:1px solid rgba(95,128,158,.2);display:flex;flex-direction:column}.side-copy{display:grid;gap:6px;padding:6px 10px 22px}.side-copy small,.kicker,.panel-head small,.status-card small,.delivery-grid small{font-size:10px;font-weight:900;letter-spacing:.14em;color:#f28b30}.side-copy b{font-size:23px}.side-copy span{font-size:12px;color:#95aabc;line-height:1.5}.side-item{display:flex;align-items:center;gap:12px;min-height:48px;padding:0 14px;margin:3px 0;border:1px solid transparent;border-radius:12px;background:transparent;color:#b4c4d1;font:inherit;cursor:pointer}.side-item:hover{background:rgba(255,255,255,.035)}.side-item.active{background:rgba(242,139,48,.09);border-color:rgba(242,139,48,.18);color:#ffad62}.side-bottom{margin-top:auto;padding:10px}.demo-content{padding:42px;max-width:1200px;width:100%;margin:0 auto}.demo-top{display:flex;justify-content:space-between;gap:24px;align-items:flex-start}.demo-top h1{font-size:clamp(34px,4vw,54px);line-height:1.03;letter-spacing:-.045em;margin:11px 0;color:#f7fbff}.demo-top p{color:#92a8ba}.status-card,.panel-card{margin-top:28px;padding:30px;border-radius:23px;background:linear-gradient(135deg,#0d2239,#123353);border:1px solid rgba(87,120,151,.26)}.status-card{display:flex;justify-content:space-between;align-items:center;gap:30px}.status-card h2,.panel-card h2{font-size:30px;margin:9px 0}.status-card p{color:#bdcbd6}.status-meta{display:flex;gap:10px;align-items:center;color:#a8bbca;font-size:12px}.progress-ring{width:128px;height:128px;flex:0 0 128px;border-radius:50%;border:8px solid #246bc7;display:flex;align-items:center;justify-content:center;flex-direction:column;background:#0b2138}.progress-ring b{font-size:27px}.progress-ring span{font-size:10px;color:#9fb4c6}.metric-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:14px}.metric-grid article,.delivery-grid article{padding:22px;border-radius:18px;background:#0b2036;border:1px solid rgba(91,123,153,.24);display:grid;gap:7px}.metric-grid .q-icon{font-size:27px;color:#f28b30}.metric-grid span,.delivery-grid span{font-size:12px;color:#94aabd}.panel-head{display:flex;justify-content:space-between;gap:20px;align-items:center;margin-bottom:22px}.timeline{display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin:24px 0}.timeline>div{padding:16px;border-radius:14px;background:#0a1c30;border:1px solid rgba(91,123,153,.22);display:grid;gap:5px}.timeline .q-icon{color:#718aa1}.timeline .done .q-icon{color:#55d58f}.timeline .current{border-color:#f28b30;background:rgba(242,139,48,.06)}.timeline .current .q-icon{color:#f28b30}.timeline span{font-size:10px;color:#8da3b6}.delivery-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:22px}.message-demo{display:grid;gap:10px;margin:10px 0 22px}.message{max-width:72%;padding:13px 15px;border-radius:16px;background:#0a1c30;border:1px solid rgba(91,123,153,.22);color:#c9d5df}.message.mine{margin-left:auto;background:#12355a;border-color:rgba(66,126,201,.35)}.gate-card{width:470px;max-width:92vw;background:#0c2239!important;color:#edf4fb;border:1px solid #294864;border-radius:20px}.gate-card h2{font-size:25px;margin:14px 0 7px}.gate-card p{color:#9eb2c3;line-height:1.6}.gate-icon{width:48px;height:48px;border-radius:14px;display:grid;place-items:center;background:rgba(242,139,48,.1);color:#f28b30;font-size:25px}@media(max-width:900px){.demo-shell{grid-template-columns:1fr}.demo-side{display:none}.demo-content{padding:28px 18px}.timeline{grid-template-columns:1fr 1fr}.metric-grid,.delivery-grid{grid-template-columns:1fr 1fr}}@media(max-width:600px){.demo-header{padding:0 12px}.demo-badge{display:none}.demo-header .q-btn:first-of-type{display:none}.status-card{align-items:flex-start;flex-direction:column}.metric-grid,.delivery-grid,.timeline{grid-template-columns:1fr}.demo-top{flex-direction:column}.message{max-width:90%}}
</style>
