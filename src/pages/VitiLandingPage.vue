<script setup>
import AppBrand from '../components/AppBrand.vue'
import PublicPlansCatalog from '../components/public/PublicPlansCatalog.vue'

const solutions = [
  { icon:'web', title:'Sistemas web', text:'Paneles y sistemas para organizar ventas, clientes, pedidos, servicios, reservas, inventario o procesos internos.' },
  { icon:'admin_panel_settings', title:'Panel administrativo', text:'Un espacio sencillo para que tu equipo gestione la operación diaria sin depender de hojas sueltas.' },
  { icon:'android', title:'Aplicaciones y APK', text:'Cuando el proyecto lo requiere, preparamos una versión móvil o una APK conectada a tu sistema.' },
  { icon:'sync_alt', title:'Integraciones', text:'Podemos conectar pagos, mapas, notificaciones, servicios externos u otras herramientas según el alcance.' },
]

const workflow = [
  { number:'01', title:'Nos cuentas qué necesitas', text:'Completa una solicitud corta. No necesitas saber de programación ni definir detalles técnicos.' },
  { number:'02', title:'VITI revisa y cotiza', text:'Revisamos el alcance, el precio de implementación y el servicio que realmente necesitas antes de iniciar.' },
  { number:'03', title:'Desarrollamos y pruebas', text:'Puedes seguir el avance y, cuando corresponda, probar una versión beta antes de la entrega.' },
  { number:'04', title:'Recibes tu sistema', text:'Entregamos el acceso web, panel o APK acordado y mantenemos el soporte según tu plan.' },
]

const subscription = [
  { icon:'cloud_done', title:'Disponibilidad', text:'Nos encargamos de que el servicio contratado quede publicado y disponible para tu negocio.' },
  { icon:'build_circle', title:'Mantenimiento', text:'Correcciones y mantenimiento general dentro del alcance del servicio.' },
  { icon:'backup', title:'Respaldo y continuidad', text:'Cuidamos la continuidad del servicio y el respaldo acordado para que puedas seguir trabajando.' },
  { icon:'support_agent', title:'Soporte', text:'Atención para dudas, incidencias y acompañamiento posterior a la entrega.' },
]
</script>

<template>
  <div class="landing-page">
    <header class="landing-nav">
      <div class="landing-container nav-inner">
        <router-link to="/viti" class="brand-link"><AppBrand /></router-link>
        <nav class="nav-links">
          <a href="#que-hacemos">Qué hacemos</a>
          <a href="#como-funciona">Cómo funciona</a>
          <a href="#planes">Precios</a>
          <a href="#suscripcion">Suscripción</a>
        </nav>
        <div class="nav-actions">
          <q-btn flat no-caps class="nav-login" label="Demo" to="/demo" />
          <q-btn flat no-caps class="nav-login" label="Iniciar sesión" to="/login" />
          <q-btn outline no-caps color="orange" label="Crear cuenta" to="/registro" />
        </div>
      </div>
    </header>

    <main>
      <section class="hero-section">
        <div class="landing-container hero-grid">
          <div class="hero-copy">
            <div class="eyebrow"><q-icon name="auto_awesome" /> VITI · SOLUCIONES DIGITALES</div>
            <h1>Creamos el sistema que tu negocio necesita. <span>Sin complicarte con lo técnico.</span></h1>
            <p class="hero-lead">VITI recibe tu solicitud, organiza el desarrollo y te permite seguir el proyecto hasta la entrega. Tú explicas qué necesitas; VITI se encarga de convertirlo en una solución clara.</p>
            <div class="hero-actions">
              <q-btn color="primary" unelevated no-caps size="lg" icon-right="arrow_forward" label="Solicitar evaluación" to="/solicitud" />
              <q-btn outline no-caps size="lg" class="btn-outline" label="Ver demo" to="/demo" />
              <q-btn flat no-caps size="lg" class="btn-text" label="Ver precios" to="/viti/planes" />
            </div>
            <div class="hero-points">
              <span><q-icon name="check_circle" /> Solicitud corta</span>
              <span><q-icon name="check_circle" /> Presupuesto claro</span>
              <span><q-icon name="check_circle" /> Seguimiento del proyecto</span>
            </div>
          </div>

          <div class="customer-preview" aria-label="Cómo verá el cliente su proyecto en VITI">
            <div class="preview-bar"><span></span><span></span><span></span><b>Mi proyecto</b></div>
            <div class="preview-body">
              <div class="preview-status"><div><small>ESTADO</small><strong>En desarrollo</strong></div><q-badge color="orange">68%</q-badge></div>
              <q-linear-progress :value="0.68" rounded size="10px" color="primary" track-color="blue-grey-9" />
              <div class="preview-steps">
                <div class="done"><q-icon name="check"/><span>Solicitud</span></div>
                <div class="done"><q-icon name="check"/><span>Diseño</span></div>
                <div class="active"><q-icon name="code"/><span>Desarrollo</span></div>
                <div><q-icon name="science"/><span>Pruebas</span></div>
                <div><q-icon name="rocket_launch"/><span>Entrega</span></div>
              </div>
              <div class="preview-note"><q-icon name="notifications_active"/><div><small>Última actualización</small><b>Nuevo avance disponible para revisar.</b></div></div>
            </div>
          </div>
        </div>
      </section>

      <section id="que-hacemos" class="landing-section surface-section">
        <div class="landing-container">
          <div class="section-heading"><div class="section-kicker">Qué hacemos</div><h2>Soluciones digitales para hacer más simple tu operación.</h2><p>No vendemos una plantilla cerrada. Revisamos tu necesidad y preparamos el sistema adecuado para tu negocio.</p></div>
          <div class="solution-grid q-mt-xl">
            <article v-for="item in solutions" :key="item.title" class="solution-card"><div class="solution-icon"><q-icon :name="item.icon"/></div><h3>{{item.title}}</h3><p>{{item.text}}</p></article>
          </div>
        </div>
      </section>

      <section id="como-funciona" class="landing-section">
        <div class="landing-container">
          <div class="section-heading"><div class="section-kicker">Cómo funciona</div><h2>Del primer mensaje a un sistema funcionando.</h2><p>El proceso está pensado para que tú nos expliques el problema y nosotros nos encarguemos de convertirlo en una solución.</p></div>
          <div class="workflow-grid q-mt-xl">
            <article v-for="item in workflow" :key="item.number" class="workflow-card"><span class="workflow-number">{{item.number}}</span><h3>{{item.title}}</h3><p>{{item.text}}</p></article>
          </div>
        </div>
      </section>

      <section id="planes" class="landing-section plans-section">
        <div class="landing-container">
          <div class="price-explain q-mb-xl"><div><div class="section-kicker">Precios claros</div><h2>Una cosa es desarrollar. Otra, mantener el servicio.</h2></div><div class="price-columns"><div><q-icon name="construction"/><b>Implementación</b><span>Pago por analizar, desarrollar, configurar y poner en marcha tu sistema.</span></div><div><q-icon name="autorenew"/><b>Servicio</b><span>Pago mensual o anual por alojamiento, mantenimiento y soporte incluidos.</span></div></div></div>
          <PublicPlansCatalog :show-intro="false" />
        </div>
      </section>

      <section id="suscripcion" class="landing-section surface-section">
        <div class="landing-container subscription-grid">
          <div class="subscription-copy"><div class="section-kicker">Después de la entrega</div><h2>¿Qué cubre la suscripción?</h2><p>La suscripción no vuelve a cobrar el desarrollo. Mantiene los servicios que siguen funcionando después de entregar el sistema. El alcance exacto se confirma antes de aprobar el proyecto.</p><q-btn flat no-caps class="text-action" icon-right="arrow_forward" label="Ver planes y costos" to="/viti/planes"/></div>
          <div class="subscription-cards"><article v-for="item in subscription" :key="item.title"><q-icon :name="item.icon"/><div><b>{{item.title}}</b><span>{{item.text}}</span></div></article></div>
        </div>
      </section>

      <section class="cta-section">
        <div class="landing-container cta-inner">
          <div><div class="section-kicker">Empecemos</div><h2>Cuéntanos qué quieres resolver.</h2><p>La solicitud toma pocos minutos. Si tu proyecto es viable, VITI te mostrará el siguiente paso para confirmar alcance, precio y forma de trabajo.</p></div>
          <div class="cta-actions"><q-btn color="primary" unelevated no-caps size="lg" label="Solicitar mi sistema" to="/solicitud"/><q-btn outline no-caps size="lg" class="btn-outline" label="Crear cuenta" to="/registro"/><q-btn flat no-caps size="lg" class="btn-text" label="Ya tengo acceso" to="/login"/></div>
        </div>
      </section>
    </main>

    <footer class="landing-footer"><div class="landing-container footer-inner"><div><AppBrand/><p>VITI desarrolla, organiza y entrega soluciones digitales.</p><small>Tecnología desarrollada por AGR Studio.</small></div><div class="footer-links"><router-link to="/viti/planes">Precios</router-link><router-link to="/demo">Demo</router-link><router-link to="/registro">Crear cuenta</router-link><router-link to="/solicitud">Solicitar sistema</router-link><router-link to="/login">Ingresar</router-link></div></div></footer>
  </div>
</template>

<style scoped>
.landing-page :deep(.q-btn:not(.q-btn--round)){border-radius:13px}.landing-page :deep(.q-btn.q-btn--outline:before){border-width:1.35px!important}.landing-page{min-height:100vh;background:radial-gradient(circle at 88% 0,rgba(36,107,199,.18),transparent 30rem),linear-gradient(180deg,#06111f 0%,#081728 54%,#0a1b2f 100%);color:#edf4fb}.landing-container{width:min(1180px,calc(100% - 40px));margin:0 auto}.landing-nav{position:sticky;top:0;z-index:50;background:rgba(6,17,31,.88);backdrop-filter:blur(18px);border-bottom:1px solid rgba(103,137,169,.18)}.nav-inner{min-height:76px;display:flex;align-items:center;gap:28px}.brand-link{text-decoration:none;color:inherit}.nav-links{display:flex;align-items:center;gap:20px;margin-left:auto}.nav-links a,.footer-links a{color:#bdcad6;text-decoration:none;font-weight:650}.nav-links a:hover,.footer-links a:hover{color:#ffad62}.nav-actions{display:flex;gap:9px}.nav-login{color:#c7d4df!important}.btn-text{color:#aebfcd!important}.hero-section{padding:88px 0 100px}.hero-grid{display:grid;grid-template-columns:1.05fr .95fr;gap:64px;align-items:center}.hero-copy{max-width:690px}.eyebrow,.section-kicker{display:inline-flex;align-items:center;gap:8px;font-size:11px;font-weight:900;letter-spacing:.16em;text-transform:uppercase;color:#ff9638}.hero-copy h1{font-size:clamp(50px,6.5vw,80px);line-height:.99;letter-spacing:-.055em;margin:18px 0 24px;color:#f8fbff}.hero-copy h1 span{display:block;color:#74adf6}.hero-lead{font-size:19px;line-height:1.75;color:#b2c1ce;max-width:650px}.hero-actions{display:flex;gap:12px;flex-wrap:wrap;margin-top:28px}.btn-outline{color:#d8e3ed!important;border-color:#46627e!important;background:rgba(255,255,255,.02)!important}.hero-points{display:flex;flex-wrap:wrap;gap:18px;margin-top:22px;font-size:13px;color:#c8d4df}.hero-points .q-icon{color:#f28b30}.customer-preview{border:1px solid rgba(92,130,165,.28);border-radius:26px;overflow:hidden;background:linear-gradient(180deg,#0e243c,#112e4d);box-shadow:0 30px 70px rgba(0,0,0,.28)}.preview-bar{display:flex;align-items:center;gap:7px;background:#081522;padding:14px 18px;border-bottom:1px solid rgba(98,135,168,.18)}.preview-bar span{width:9px;height:9px;border-radius:50%;background:#39556f}.preview-bar span:nth-child(1){background:#ff6b6b}.preview-bar span:nth-child(2){background:#ffb44d}.preview-bar span:nth-child(3){background:#43c77a}.preview-bar b{margin-left:7px;font-size:12px;color:#d6e1eb}.preview-body{padding:28px}.preview-status{display:flex;align-items:end;justify-content:space-between;margin-bottom:18px}.preview-status small,.preview-note small{display:block;font-size:9px;color:#8399ad;letter-spacing:.1em}.preview-status strong{display:block;font-size:28px;margin-top:4px}.preview-steps{display:grid;grid-template-columns:repeat(5,1fr);gap:7px;margin-top:24px}.preview-steps>div{display:flex;flex-direction:column;gap:8px;align-items:center;text-align:center;padding:12px 6px;border-radius:12px;color:#7890a5;background:rgba(255,255,255,.025);border:1px solid rgba(109,144,176,.13);font-size:9px}.preview-steps .done{color:#7dd6a5}.preview-steps .active{color:#ffb067;border-color:rgba(242,139,48,.3);background:rgba(242,139,48,.06)}.preview-note{display:flex;align-items:center;gap:11px;margin-top:18px;padding:14px;border-radius:14px;background:rgba(36,107,199,.1);color:#d9e4ee}.preview-note>.q-icon{color:#ff9b43;font-size:23px}.preview-note b{display:block;font-size:12px;margin-top:3px}.landing-section{padding:92px 0}.surface-section{background:rgba(12,29,48,.68);border-top:1px solid rgba(98,132,164,.08);border-bottom:1px solid rgba(98,132,164,.08)}.section-heading{max-width:820px}.section-heading h2,.price-explain h2,.subscription-copy h2,.cta-section h2{font-size:clamp(34px,4.2vw,54px);line-height:1.05;letter-spacing:-.045em;margin:12px 0;color:#f7faff}.section-heading p,.subscription-copy p,.cta-section p{font-size:17px;line-height:1.72;color:#aebdca}.solution-grid,.workflow-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}.solution-card,.workflow-card{border:1px solid rgba(93,126,157,.22);border-radius:20px;background:linear-gradient(180deg,rgba(15,38,63,.72),rgba(10,29,49,.82));padding:24px;transition:.18s ease}.solution-card:hover,.workflow-card:hover{transform:translateY(-3px);border-color:rgba(242,139,48,.34)}.solution-icon{width:48px;height:48px;border-radius:14px;display:grid;place-items:center;color:#ff9d46;background:rgba(242,139,48,.09);font-size:25px}.solution-card h3,.workflow-card h3{font-size:18px;margin:18px 0 8px}.solution-card p,.workflow-card p{color:#a9bac8;line-height:1.65;font-size:14px;margin:0}.workflow-number{font-size:12px;font-weight:900;letter-spacing:.1em;color:#ff9d46}.plans-section{background:linear-gradient(180deg,#081827,#0b1d31)}.price-explain{display:grid;grid-template-columns:.9fr 1.1fr;gap:48px;align-items:end}.price-columns{display:grid;grid-template-columns:1fr 1fr;gap:12px}.price-columns>div{padding:18px;border:1px solid rgba(94,128,160,.22);border-radius:16px;background:rgba(255,255,255,.025)}.price-columns .q-icon{font-size:24px;color:#f28b30}.price-columns b,.price-columns span{display:block}.price-columns b{margin:10px 0 5px}.price-columns span{font-size:12px;line-height:1.55;color:#a9bbc9}.subscription-grid{display:grid;grid-template-columns:.86fr 1.14fr;gap:64px;align-items:center}.subscription-cards{display:grid;grid-template-columns:1fr 1fr;gap:12px}.subscription-cards article{display:flex;gap:13px;padding:18px;border:1px solid rgba(92,126,158,.22);border-radius:17px;background:rgba(14,36,60,.64)}.subscription-cards .q-icon{font-size:25px;color:#ff9a42}.subscription-cards b,.subscription-cards span{display:block}.subscription-cards span{color:#a8bac8;font-size:12px;line-height:1.55;margin-top:4px}.text-action{color:#ffad62!important;margin-left:-12px}.cta-section{padding:82px 0;background:linear-gradient(135deg,#0b1f34,#102d4b);border-top:1px solid rgba(242,139,48,.15)}.cta-inner{display:flex;justify-content:space-between;align-items:center;gap:50px}.cta-inner>div:first-child{max-width:720px}.cta-actions{display:flex;gap:10px;flex-wrap:wrap}.landing-footer{padding:38px 0;background:#06111f;border-top:1px solid rgba(93,127,159,.18)}.footer-inner{display:flex;justify-content:space-between;gap:30px}.footer-inner small{display:block;color:#607a91;margin-top:5px;font-size:10px}.footer-inner p{color:#8499ab;font-size:12px;margin:8px 0 0}.footer-links{display:flex;gap:18px;align-items:center;flex-wrap:wrap}
@media(max-width:1050px){.nav-links{display:none}.hero-grid,.price-explain,.subscription-grid{grid-template-columns:1fr}.solution-grid,.workflow-grid{grid-template-columns:repeat(2,1fr)}.customer-preview{max-width:700px}.price-explain{gap:24px}}
@media(max-width:700px){.landing-container{width:min(100% - 24px,1180px)}.nav-actions .nav-login{display:none}.hero-section{padding:58px 0 74px}.hero-copy h1{font-size:clamp(40px,12vw,60px)}.hero-lead{font-size:17px}.landing-section{padding:68px 0}.solution-grid,.workflow-grid,.subscription-cards,.price-columns{grid-template-columns:1fr}.preview-steps{grid-template-columns:repeat(3,1fr)}.cta-inner,.footer-inner{flex-direction:column;align-items:flex-start}.cta-actions{width:100%}.cta-actions .q-btn{flex:1}.footer-links{align-items:flex-start}}
@media(max-width:480px){.hero-actions .q-btn,.cta-actions .q-btn{width:100%;flex:auto}.hero-points{display:grid}.preview-body{padding:18px}.preview-steps{grid-template-columns:1fr 1fr}}
</style>
