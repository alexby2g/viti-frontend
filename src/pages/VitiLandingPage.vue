<script setup>
import AppBrand from '../components/AppBrand.vue'

const benefits = [
  { icon:'groups', title:'Clientes', text:'Registra a cada cliente una sola vez y conserva sus datos para futuras atenciones.' },
  { icon:'construction', title:'Equipos y servicios', text:'Relaciona equipos, citas, diagnósticos, trabajos realizados y evidencias dentro de un mismo historial.' },
  { icon:'event_available', title:'Citas y seguimiento', text:'Organiza visitas, estados del servicio y próximos pasos sin depender de llamadas, notas o mensajes dispersos.' },
  { icon:'payments', title:'Control del servicio', text:'Según la solución contratada, VITI puede integrar pagos, garantías, inventario e historial técnico.' },
]

const steps = [
  { number:'01', title:'La empresa recibe su acceso', text:'AGR Studio habilita un enlace personal para registrar de forma segura al negocio y su responsable.' },
  { number:'02', title:'Se registra la necesidad', text:'La empresa explica qué servicio brinda, qué problema desea resolver y qué información necesita organizar.' },
  { number:'03', title:'VITI asigna la solución', text:'La solución se configura para el negocio, conservando su identidad, usuarios, datos y flujo de trabajo.' },
  { number:'04', title:'El negocio trabaja desde VITI', text:'Clientes, equipos, citas y servicios quedan centralizados para consultar qué ocurrió, qué falta y qué sigue.' },
]
</script>

<template>
  <q-page class="landing-page">
    <header class="landing-nav">
      <div class="landing-container row items-center no-wrap">
        <AppBrand />
        <q-space />
        <nav class="gt-sm row items-center q-gutter-sm">
          <q-btn flat no-caps label="Qué es VITI" href="#que-es" />
          <q-btn flat no-caps label="Cómo funciona" href="#como-funciona" />
          <q-btn flat no-caps label="Guía rápida" href="#guia" />
        </nav>
        <q-btn outline color="primary" no-caps icon="login" label="Ingresar" to="/login" class="q-ml-md" />
      </div>
    </header>

    <main>
      <section class="hero-section">
        <div class="landing-container hero-grid">
          <div class="hero-copy">
            <div class="hero-eyebrow">VITI · una solución de AGR Studio</div>
            <h1>La información de tus servicios, organizada en un solo lugar.</h1>
            <p class="hero-lead">
              VITI ayuda a las microempresas de servicios a registrar, organizar y controlar digitalmente la información de sus clientes, equipos, citas y trabajos realizados.
            </p>
            <div class="row q-gutter-sm q-mt-xl">
              <q-btn color="primary" unelevated no-caps size="lg" icon-right="arrow_forward" label="Conocer cómo funciona" href="#como-funciona" />
              <q-btn outline color="primary" no-caps size="lg" icon="login" label="Ya tengo acceso" to="/login?tipo=cliente" />
            </div>
            <div class="hero-trust q-mt-xl">
              <q-icon name="verified_user" />
              <span>Cada empresa trabaja con su propia información y acceso dentro de VITI.</span>
            </div>
          </div>

          <div class="hero-demo" aria-label="Vista resumida del flujo de VITI">
            <div class="demo-window">
              <div class="demo-topbar">
                <div class="demo-logo"><q-icon name="hub" /></div>
                <div><strong>VITI</strong><span>Gestión de servicios</span></div>
                <q-space />
                <q-badge color="positive" label="Activo" />
              </div>
              <div class="demo-body">
                <div class="demo-sidebar">
                  <div class="active"><q-icon name="home" /> Inicio</div>
                  <div><q-icon name="groups" /> Clientes</div>
                  <div><q-icon name="event" /> Servicios</div>
                  <div><q-icon name="history" /> Historial</div>
                </div>
                <div class="demo-content">
                  <div class="text-caption text-grey-6">Atención de hoy</div>
                  <div class="demo-title">Qué necesita atención</div>
                  <div class="demo-cards">
                    <div><q-icon name="event_available" /><strong>4</strong><span>Citas</span></div>
                    <div><q-icon name="troubleshoot" /><strong>2</strong><span>Diagnósticos</span></div>
                    <div><q-icon name="build" /><strong>3</strong><span>Servicios</span></div>
                  </div>
                  <div class="demo-service q-mt-md">
                    <div class="row items-center"><q-avatar color="blue-1" text-color="primary" icon="person" /><div class="q-ml-sm"><strong>Cliente registrado</strong><div class="text-caption">Equipo → cita → servicio → historial</div></div></div>
                    <q-icon name="arrow_forward" color="primary" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="que-es" class="landing-section">
        <div class="landing-container">
          <div class="section-heading">
            <div class="section-kicker">¿De qué se encarga VITI?</div>
            <h2>Ayuda a convertir información dispersa en un proceso fácil de seguir.</h2>
            <p>En lugar de depender únicamente de llamadas, mensajes, cuadernos o archivos separados, VITI concentra la información que una microempresa necesita para atender y dar seguimiento a sus servicios.</p>
          </div>
          <div class="benefit-grid q-mt-xl">
            <article v-for="item in benefits" :key="item.title" class="benefit-card">
              <q-avatar size="50px" color="blue-1" text-color="primary" :icon="item.icon" />
              <h3>{{ item.title }}</h3>
              <p>{{ item.text }}</p>
            </article>
          </div>
        </div>
      </section>

      <section id="como-funciona" class="landing-section soft-section">
        <div class="landing-container">
          <div class="section-heading compact">
            <div class="section-kicker">Cómo funciona</div>
            <h2>Desde el acceso de la empresa hasta el uso diario del sistema.</h2>
          </div>
          <div class="steps-grid q-mt-xl">
            <article v-for="step in steps" :key="step.number" class="step-card">
              <span class="step-number">{{ step.number }}</span>
              <h3>{{ step.title }}</h3>
              <p>{{ step.text }}</p>
            </article>
          </div>
        </div>
      </section>

      <section id="guia" class="landing-section">
        <div class="landing-container guide-grid">
          <div>
            <div class="section-kicker">Guía rápida</div>
            <h2>¿Es tu primera vez en VITI?</h2>
            <p class="guide-lead">El acceso a una empresa se habilita mediante un enlace personal. Ese enlace permite registrar de forma segura los datos del responsable, del negocio y la necesidad que se desea resolver.</p>
            <q-list class="guide-list q-mt-lg">
              <q-item><q-item-section avatar><q-icon name="looks_one" color="primary" /></q-item-section><q-item-section><q-item-label>Abre el enlace personal enviado por AGR Studio.</q-item-label></q-item-section></q-item>
              <q-item><q-item-section avatar><q-icon name="looks_two" color="primary" /></q-item-section><q-item-section><q-item-label>Completa tus datos y los de tu negocio.</q-item-label></q-item-section></q-item>
              <q-item><q-item-section avatar><q-icon name="looks_3" color="primary" /></q-item-section><q-item-section><q-item-label>Revisa la información y continúa con la solución asignada.</q-item-label></q-item-section></q-item>
            </q-list>
          </div>
          <q-card flat bordered class="access-card">
            <q-card-section>
              <q-icon name="login" size="48px" color="primary" />
              <div class="text-h5 text-weight-bold q-mt-md">¿Ya tienes una cuenta?</div>
              <div class="text-body2 text-grey-7 q-mt-sm">Ingresa con tu usuario, teléfono o CI y continúa trabajando desde tu espacio de VITI.</div>
              <q-btn color="primary" unelevated no-caps size="lg" icon="login" label="Ingresar a VITI" to="/login" class="full-width q-mt-lg" />
              <q-separator class="q-my-lg" />
              <div class="text-body2 text-weight-medium">¿Todavía no tienes acceso?</div>
              <div class="text-caption text-grey-7 q-mt-xs">El registro de nuevas empresas se habilita mediante un enlace personal para proteger la información y evitar registros no autorizados.</div>
              <q-btn flat color="primary" no-caps icon="info" label="Ver cómo funciona el registro" to="/registro" class="full-width q-mt-md" />
            </q-card-section>
          </q-card>
        </div>
      </section>

      <section class="cta-section">
        <div class="landing-container cta-card">
          <div>
            <div class="section-kicker">VITI</div>
            <h2>Organiza el servicio. Conserva el historial. Sabe qué sigue.</h2>
          </div>
          <q-btn color="white" text-color="primary" unelevated no-caps size="lg" icon="login" label="Entrar a la plataforma" to="/login" />
        </div>
      </section>
    </main>

    <footer class="landing-footer">
      <div class="landing-container row items-center justify-between q-col-gutter-md">
        <div><strong>VITI</strong> · desarrollado y administrado por AGR Studio</div>
        <div class="text-caption">Plataforma para digitalizar y organizar la gestión de servicios.</div>
      </div>
    </footer>
  </q-page>
</template>

<style scoped>
.landing-page{min-height:100vh;background:#f6f9fc;color:#102a43}.landing-container{width:min(1180px,calc(100% - 40px));margin:0 auto}.landing-nav{position:sticky;top:0;z-index:20;background:rgba(246,249,252,.94);backdrop-filter:blur(16px);border-bottom:1px solid rgba(16,42,67,.08)}.landing-nav>.landing-container{min-height:76px}.hero-section{padding:82px 0 92px;background:radial-gradient(circle at 85% 18%,rgba(18,184,200,.18),transparent 28%),linear-gradient(180deg,#f8fcff,#eef6fb)}.hero-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(420px,.9fr);gap:64px;align-items:center}.hero-eyebrow,.section-kicker{font-size:12px;font-weight:900;letter-spacing:.14em;text-transform:uppercase;color:#0b7593}.hero-copy h1{font-size:clamp(42px,5vw,68px);line-height:1.02;letter-spacing:-.045em;margin:14px 0 22px;max-width:780px}.hero-lead{font-size:20px;line-height:1.65;color:#526d82;max-width:720px}.hero-trust{display:flex;align-items:center;gap:10px;color:#526d82;font-size:14px}.hero-trust .q-icon{color:#16835b;font-size:22px}.demo-window{border:1px solid rgba(11,95,122,.12);background:#fff;border-radius:26px;overflow:hidden;box-shadow:0 30px 80px rgba(17,58,84,.18);transform:rotate(1.2deg)}.demo-topbar{height:74px;padding:0 20px;display:flex;align-items:center;border-bottom:1px solid #e5edf3}.demo-logo{width:42px;height:42px;border-radius:13px;display:grid;place-items:center;background:linear-gradient(135deg,#0b5f7a,#12b8c8);color:#fff;font-size:22px}.demo-topbar>div:nth-child(2){display:flex;flex-direction:column;margin-left:10px}.demo-topbar span{font-size:11px;color:#78909c}.demo-body{display:grid;grid-template-columns:145px 1fr;min-height:340px}.demo-sidebar{padding:18px 12px;background:#0b2436;color:#afc3d0}.demo-sidebar div{display:flex;gap:8px;align-items:center;padding:11px 10px;border-radius:10px;font-size:12px}.demo-sidebar .active{background:rgba(18,184,200,.16);color:#fff}.demo-content{padding:26px}.demo-title{font-size:22px;font-weight:800;margin-top:4px}.demo-cards{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:18px}.demo-cards>div{padding:16px 12px;border:1px solid #e2ebf1;border-radius:16px;display:flex;flex-direction:column;gap:4px}.demo-cards .q-icon{color:#0b7593;font-size:22px}.demo-cards strong{font-size:25px}.demo-cards span{font-size:10px;color:#78909c}.demo-service{display:flex;justify-content:space-between;align-items:center;border:1px solid #e2ebf1;border-radius:16px;padding:14px}.landing-section{padding:90px 0}.soft-section{background:#edf5f9}.section-heading{max-width:800px}.section-heading.compact{max-width:680px}.section-heading h2,.guide-grid h2,.cta-card h2{font-size:clamp(32px,4vw,48px);line-height:1.1;letter-spacing:-.035em;margin:12px 0 18px}.section-heading p,.guide-lead{font-size:17px;line-height:1.7;color:#5f788a}.benefit-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:18px}.benefit-card,.step-card{background:#fff;border:1px solid rgba(16,42,67,.09);border-radius:20px;padding:25px}.benefit-card h3,.step-card h3{font-size:19px;margin:18px 0 9px}.benefit-card p,.step-card p{color:#60788a;line-height:1.65;margin:0}.steps-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:18px}.step-number{display:inline-flex;font-size:13px;font-weight:900;color:#0b7593;background:#e4f6f8;padding:7px 10px;border-radius:999px}.guide-grid{display:grid;grid-template-columns:1.15fr .85fr;gap:70px;align-items:center}.guide-list{border-left:3px solid #12b8c8}.access-card{border-radius:24px;padding:12px;box-shadow:0 20px 50px rgba(17,58,84,.08)}.cta-section{padding:24px 0 80px}.cta-card{background:linear-gradient(135deg,#0b5f7a,#12a9b8);color:#fff;border-radius:28px;padding:42px;display:flex;justify-content:space-between;gap:30px;align-items:center}.cta-card .section-kicker{color:#b8f6fa}.cta-card h2{margin-bottom:0;max-width:760px}.landing-footer{border-top:1px solid rgba(16,42,67,.08);padding:28px 0;color:#61788a}.body--dark .landing-page{background:#061725;color:#f3fbff}.body--dark .landing-nav{background:rgba(6,23,37,.94);border-color:rgba(255,255,255,.08)}.body--dark .hero-section{background:radial-gradient(circle at 85% 18%,rgba(18,184,200,.14),transparent 28%),#071c2d}.body--dark .hero-lead,.body--dark .section-heading p,.body--dark .guide-lead,.body--dark .benefit-card p,.body--dark .step-card p,.body--dark .hero-trust{color:#aac1cf}.body--dark .demo-window,.body--dark .benefit-card,.body--dark .step-card,.body--dark .access-card{background:#0d2940;color:#f3fbff;border-color:rgba(255,255,255,.1)}.body--dark .soft-section{background:#081f31}.body--dark .demo-topbar,.body--dark .demo-cards>div,.body--dark .demo-service{border-color:rgba(255,255,255,.09)}.body--dark .demo-content{background:#0d2940}.body--dark .landing-footer{border-color:rgba(255,255,255,.08);color:#9fb7c5}@media(max-width:1000px){.hero-grid,.guide-grid{grid-template-columns:1fr}.hero-demo{max-width:700px}.benefit-grid,.steps-grid{grid-template-columns:repeat(2,1fr)}}@media(max-width:650px){.landing-container{width:min(100% - 24px,1180px)}.landing-nav>.landing-container{min-height:66px}.hero-section{padding:55px 0 65px}.hero-copy h1{font-size:39px}.hero-lead{font-size:17px}.hero-copy .row{flex-direction:column;align-items:stretch}.hero-copy .q-btn{width:100%}.hero-demo{display:none}.landing-section{padding:64px 0}.benefit-grid,.steps-grid{grid-template-columns:1fr}.cta-card{padding:28px;align-items:stretch;flex-direction:column}.cta-card .q-btn{width:100%}}
</style>
