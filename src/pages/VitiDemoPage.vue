<script setup>
import { computed, ref } from 'vue'
import AppBrand from '../components/AppBrand.vue'

const section=ref('inicio'),gate=ref(false)
const sections=[
  {key:'inicio',label:'Inicio',icon:'dashboard'},
  {key:'solicitudes',label:'Solicitudes',icon:'description'},
  {key:'proyecto',label:'Proyecto',icon:'account_tree'},
  {key:'aplicaciones',label:'Aplicaciones',icon:'apps'},
  {key:'pagos',label:'Pagos',icon:'payments'},
  {key:'mensajes',label:'Atención',icon:'support_agent'},
]
const title=computed(()=>sections.find(item=>item.key===section.value)?.label||'Inicio')
function protectedAction(){gate.value=true}
</script>

<template>
  <q-layout view="lHh Lpr lFf" class="demo-layout">
    <q-header class="demo-header" bordered>
      <q-toolbar><AppBrand/><q-badge class="q-ml-sm" color="orange" label="DEMO"/><q-space/><q-btn flat no-caps label="Crear cuenta" color="primary" to="/registro"/><q-btn unelevated no-caps label="Ingresar" color="primary" to="/login"/></q-toolbar>
    </q-header>

    <q-drawer show-if-above :model-value="true" :width="260" class="demo-drawer">
      <div class="q-pa-lg"><div class="text-caption text-grey-6">Empresa de demostración</div><div class="text-h6 text-weight-bold">Café Central</div><div class="text-caption text-positive q-mt-xs"><q-icon name="circle" size="8px"/> Datos ficticios</div></div>
      <q-separator/>
      <q-list padding><q-item v-for="item in sections" :key="item.key" clickable :active="section===item.key" active-class="demo-active" @click="section=item.key"><q-item-section avatar><q-icon :name="item.icon"/></q-item-section><q-item-section>{{item.label}}</q-item-section></q-item></q-list>
      <div class="q-pa-md"><q-banner rounded class="demo-note"><div class="text-weight-bold">Modo invitado</div><div class="text-caption q-mt-xs">Puedes explorar. Las acciones que crean o modifican información requieren tu propia cuenta.</div></q-banner></div>
    </q-drawer>

    <q-page-container>
      <q-page class="demo-page">
        <div class="demo-top"><div><div class="kicker">VITI DEMO · SOLO LECTURA</div><h1>{{title}}</h1><p>Explora una experiencia simulada antes de registrarte.</p></div><q-btn outline color="primary" no-caps icon="person_add" label="Usar VITI con mis datos" to="/registro"/></div>

        <template v-if="section==='inicio'">
          <section class="status-card"><div><div class="kicker light">Estado actual</div><h2>Sistema de pedidos Café Central</h2><p>Proyecto en pruebas. El cliente puede seguir avances, pagos y comunicación desde el mismo lugar.</p><div class="row q-gutter-sm q-mt-md"><q-badge color="positive">En pruebas</q-badge><span class="status-copy">75% de avance</span></div></div><div class="progress-ring"><b>75%</b><span>avance</span></div></section>
          <div class="metric-grid q-mt-lg"><q-card v-for="item in [{n:'01',t:'Solicitud activa',i:'description'},{n:'75%',t:'Proyecto',i:'account_tree'},{n:'01',t:'Aplicación',i:'apps'},{n:'0 Bs',t:'Saldo vencido',i:'payments'}]" :key="item.t" flat class="metric-card"><q-card-section><q-icon :name="item.i" color="primary" size="25px"/><strong>{{item.n}}</strong><span>{{item.t}}</span></q-card-section></q-card></div>
          <q-card flat class="demo-card q-mt-lg"><q-card-section class="row items-center"><div><div class="kicker">Próxima acción</div><div class="text-h6 text-weight-bold">Revisar versión de prueba</div><div class="text-body2 text-grey-7">En una cuenta real aquí podrías comentar, adjuntar archivos y aprobar avances.</div></div><q-space/><q-btn color="primary" unelevated no-caps label="Comentar avance" @click="protectedAction"/></q-card-section></q-card>
        </template>

        <template v-else-if="section==='solicitudes'">
          <q-card flat class="demo-card"><q-card-section><div class="row items-center"><div><div class="kicker">SOL-00028</div><div class="text-h5 text-weight-bold">Digitalizar pedidos y catálogo</div><p class="text-grey-7">“Quiero recibir pedidos desde el celular y organizar productos, clientes y pagos.”</p></div><q-space/><q-badge color="orange">En revisión</q-badge></div></q-card-section><q-separator/><q-list separator><q-item><q-item-section><q-item-label caption>Negocio</q-item-label><q-item-label>Café Central</q-item-label></q-item-section></q-item><q-item><q-item-section><q-item-label caption>Solución sugerida</q-item-label><q-item-label>Pedidos + catálogo digital</q-item-label></q-item-section></q-item><q-item><q-item-section><q-item-label caption>Plan</q-item-label><q-item-label>Se define después de la evaluación</q-item-label></q-item-section></q-item></q-list><q-card-actions align="right"><q-btn color="primary" no-caps unelevated label="Crear una solicitud real" @click="protectedAction"/></q-card-actions></q-card>
        </template>

        <template v-else-if="section==='proyecto'">
          <q-card flat class="demo-card"><q-card-section><div class="kicker">PRY-0014</div><div class="text-h4 text-weight-bold">Sistema Café Central</div><p class="text-grey-7">Seguimiento transparente desde análisis hasta entrega.</p><q-linear-progress :value=".75" rounded size="12px" color="primary" class="q-my-lg"/><div class="timeline"><div class="done"><i></i><b>Levantamiento</b><span>Completado</span></div><div class="done"><i></i><b>Diseño</b><span>Completado</span></div><div class="done"><i></i><b>Desarrollo</b><span>Completado</span></div><div class="active"><i></i><b>Pruebas</b><span>En curso</span></div><div><i></i><b>Entrega</b><span>Pendiente</span></div></div></q-card-section></q-card>
        </template>

        <template v-else-if="section==='aplicaciones'">
          <div class="app-grid"><q-card flat class="demo-card app-card"><q-card-section><div class="app-icon"><q-icon name="restaurant" size="30px"/></div><div class="text-h5 text-weight-bold q-mt-md">Pedidos Café Central</div><p class="text-grey-7">Catálogo, pedidos, clientes y seguimiento de ventas.</p><q-badge color="positive">Pruebas</q-badge></q-card-section><q-card-actions><q-btn flat color="primary" no-caps label="Abrir aplicación" @click="protectedAction"/></q-card-actions></q-card><q-card flat class="demo-card app-card muted"><q-card-section><div class="app-icon"><q-icon name="add" size="30px"/></div><div class="text-h6 text-weight-bold q-mt-md">Nueva solución</div><p class="text-grey-7">Solicita otra herramienta cuando tu negocio la necesite.</p></q-card-section><q-card-actions><q-btn flat color="primary" no-caps label="Solicitar" @click="protectedAction"/></q-card-actions></q-card></div>
        </template>

        <template v-else-if="section==='pagos'">
          <div class="payment-explain"><q-icon name="info" color="primary" size="26px"/><div><b>VITI separa implementación y suscripción.</b><span>La implementación corresponde al trabajo de construir/configurar tu solución. La suscripción mantiene plataforma, alojamiento, respaldos, actualizaciones y soporte según lo contratado.</span></div></div>
          <div class="payment-grid q-mt-lg"><q-card flat class="demo-card"><q-card-section><div class="kicker">PAGO ÚNICO</div><div class="text-h4 text-weight-bold">2.400 Bs</div><div class="text-grey-7">Implementación del ejemplo</div><q-separator class="q-my-md"/><div class="text-positive text-weight-bold">Pagado 50% · 1.200 Bs</div></q-card-section></q-card><q-card flat class="demo-card"><q-card-section><div class="kicker">SUSCRIPCIÓN</div><div class="text-h4 text-weight-bold">129 Bs <small>/ mes</small></div><div class="text-grey-7">Empieza después de la activación según el acuerdo.</div><q-separator class="q-my-md"/><div class="text-primary text-weight-bold">14 días de prueba</div></q-card-section></q-card></div>
        </template>

        <template v-else>
          <q-card flat class="demo-card"><q-card-section><div class="kicker">Atención VITI</div><div class="text-h5 text-weight-bold">Comunicación en un solo lugar</div><div class="chat-demo q-mt-lg"><div class="agent">Hola, Carlos. La nueva versión ya está disponible para revisión.</div><div class="client">Perfecto, voy a revisar el flujo de pedidos.</div><div class="agent">Cuando termines, puedes dejar tus observaciones aquí.</div></div></q-card-section><q-card-actions align="right"><q-btn color="primary" unelevated no-caps label="Enviar mensaje" @click="protectedAction"/></q-card-actions></q-card>
        </template>
      </q-page>
    </q-page-container>

    <q-dialog v-model="gate"><q-card class="gate-card"><q-card-section class="text-center q-pa-xl"><q-avatar size="64px" color="blue-1" text-color="primary" icon="lock"/><div class="text-h5 text-weight-bold q-mt-md">Continúa con tu propia cuenta</div><p class="text-grey-7">La demo no guarda datos. Crea una cuenta gratuita para enviar solicitudes, mensajes, archivos o comenzar un proyecto.</p><q-btn color="primary" unelevated no-caps size="lg" class="full-width q-mt-md" label="Crear cuenta gratis" to="/registro" v-close-popup/><q-btn flat color="primary" no-caps class="full-width q-mt-sm" label="Ya tengo una cuenta" to="/login" v-close-popup/></q-card-section></q-card></q-dialog>
  </q-layout>
</template>

<style scoped>
.demo-layout{background:#f5f9fb;color:#102a43}.demo-header{background:#fff;color:#102a43}.demo-drawer{background:#fff;border-right:1px solid #dce7ec}.demo-active{background:#e7f4f7;color:#0b7593;border-radius:11px;margin:0 8px}.demo-note{background:#fff8e8;border:1px solid #f3ddb0}.demo-page{padding:36px clamp(20px,4vw,54px);max-width:1400px;margin:0 auto}.demo-top{display:flex;justify-content:space-between;gap:24px;align-items:end}.kicker{font-size:10px;font-weight:900;letter-spacing:.15em;text-transform:uppercase;color:#0b7593}.kicker.light{color:#73cbd7}.demo-top h1{font-size:42px;letter-spacing:-.045em;margin:8px 0}.demo-top p{color:#647c8a;margin:0}.status-card{margin-top:26px;background:#102a43;color:#fff;border-radius:24px;padding:32px 36px;display:flex;align-items:center;justify-content:space-between;gap:28px}.status-card h2{font-size:32px;letter-spacing:-.035em;margin:10px 0}.status-card p{color:#c7d7df;max-width:760px}.status-copy{font-size:12px;color:#b6cad5}.progress-ring{width:130px;height:130px;flex:0 0 130px;border-radius:50%;border:8px solid #0b879f;background:#173b51;display:flex;flex-direction:column;align-items:center;justify-content:center}.progress-ring b{font-size:27px}.progress-ring span{font-size:10px;color:#b8ced7}.metric-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}.metric-card,.demo-card{border:1px solid #dce7ec;border-radius:18px;background:#fff!important;color:#102a43!important}.metric-card strong,.metric-card span{display:block}.metric-card strong{font-size:26px;margin-top:15px}.metric-card span{color:#687f8e;font-size:12px}.timeline{display:grid;grid-template-columns:repeat(5,1fr);gap:10px}.timeline>div{position:relative;padding:18px 12px 12px;border-top:2px solid #d8e4e9}.timeline i{position:absolute;top:-6px;left:8px;width:10px;height:10px;border-radius:50%;background:#c9d8df}.timeline b,.timeline span{display:block}.timeline span{font-size:11px;color:#738895;margin-top:5px}.timeline .done{border-color:#24a66c}.timeline .done i{background:#24a66c}.timeline .active{border-color:#0b7593}.timeline .active i{background:#0b7593}.app-grid,.payment-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:16px}.app-card{min-height:250px}.app-icon{width:54px;height:54px;border-radius:15px;background:#e5f4f7;color:#0b7593;display:grid;place-items:center}.muted{background:#f9fbfc}.payment-explain{display:flex;gap:13px;align-items:flex-start;padding:18px;border:1px solid #cfe2e9;border-radius:16px;background:#eff8fb}.payment-explain b,.payment-explain span{display:block}.payment-explain span{color:#587383;line-height:1.6;margin-top:5px}.payment-grid small{font-size:13px;color:#718895}.chat-demo{display:grid;gap:10px}.chat-demo>div{max-width:70%;padding:12px 14px;border-radius:14px;font-size:13px;line-height:1.5}.chat-demo .agent{background:#eef4f7}.chat-demo .client{background:#0b7593;color:#fff;margin-left:auto}.gate-card{width:460px;max-width:92vw;border-radius:22px;background:#fff!important;color:#102a43!important}@media(max-width:900px){.metric-grid{grid-template-columns:repeat(2,1fr)}.timeline{grid-template-columns:1fr}.timeline>div{border-top:0;border-left:2px solid #d8e4e9;padding:10px 10px 10px 20px}.timeline i{left:-6px;top:15px}.app-grid,.payment-grid{grid-template-columns:1fr}}@media(max-width:650px){.demo-page{padding:24px 14px}.demo-top{align-items:flex-start;flex-direction:column}.demo-top h1{font-size:34px}.status-card{padding:24px;flex-direction:column;align-items:flex-start}.metric-grid{grid-template-columns:1fr}}
</style>
