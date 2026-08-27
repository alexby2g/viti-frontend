<template>
  <q-page class="viti-platform">
    <header class="topbar">
      <div class="shell topbar-inner">
        <router-link to="/viti" class="brand"><AppBrand /></router-link>
        <nav class="nav-links">
          <a href="#modelo">Modelo</a>
          <a href="#proceso">Proceso</a>
          <router-link to="/viti/planes">Planes</router-link>
        </nav>
        <div class="actions">
          <q-btn flat no-caps color="dark" label="Ingresar" to="/login" />
          <q-btn unelevated no-caps color="primary" label="Empezar" to="/solicitud" />
        </div>
      </div>
    </header>

    <main>
      <section class="hero">
        <div class="shell hero-grid">
          <div>
            <div class="eyebrow"><q-icon name="auto_awesome" /> AGR Studio · VITI</div>
            <h1>Una plataforma para <span>crear sistemas.</span></h1>
            <p>VITI recibe la necesidad de un negocio, organiza el proyecto y permite preparar una solución digital independiente, personalizada y lista para entregar.</p>
            <div class="hero-actions">
              <q-btn size="lg" color="primary" unelevated no-caps label="Cuéntame qué necesitas" to="/solicitud" />
              <q-btn size="lg" flat color="dark" no-caps label="Ver cómo funciona" href="#proceso" />
            </div>
          </div>
          <div class="model-card">
            <div class="model-head"><span class="dot"></span><strong>VITI · Fábrica digital</strong></div>
            <div class="model-flow">
              <div><span>01</span><b>Necesidad</b><small>Entendemos el negocio.</small></div>
              <q-icon name="arrow_forward" />
              <div><span>02</span><b>Diseño</b><small>Definimos la solución.</small></div>
              <q-icon name="arrow_forward" />
              <div><span>03</span><b>Construcción</b><small>Sistema independiente.</small></div>
              <q-icon name="arrow_forward" />
              <div><span>04</span><b>Entrega</b><small>Dominio, APK y soporte.</small></div>
            </div>
          </div>
        </div>
      </section>

      <section id="modelo" class="section dark-section">
        <div class="shell split">
          <div><div class="kicker">El nuevo modelo VITI</div><h2>VITI es la plataforma. Los sistemas viven fuera.</h2></div>
          <div class="copy"><p>Cada solución que construimos puede tener su propio repositorio, despliegue, base de datos, identidad, dominio y aplicación móvil.</p><p>VITI conserva el registro del proyecto, cliente, entrega, suscripción y acceso. Así el crecimiento de una solución no hace pesado el núcleo de la plataforma.</p></div>
        </div>
      </section>

      <section id="proceso" class="section">
        <div class="shell">
          <div class="heading"><div class="kicker">Proceso</div><h2>De la solicitud a una solución entregable.</h2><p>El sistema final se construye fuera del core de VITI y se conecta mediante sus enlaces y metadatos de entrega.</p></div>
          <div class="grid">
            <article v-for="item in steps" :key="item.n" class="card"><span>{{ item.n }}</span><h3>{{ item.title }}</h3><p>{{ item.text }}</p></article>
          </div>
        </div>
      </section>

      <section class="section soft">
        <div class="shell delivery">
          <div><div class="kicker">Entrega</div><h2>Una solución puede salir con su propia identidad.</h2><p>Logo, colores, URL, dominio personalizado, aplicación móvil y reglas de acceso se gestionan como parte de la entrega de cada producto.</p></div>
          <div class="chips"><span>Frontend independiente</span><span>Backend independiente</span><span>Base de datos independiente</span><span>Dominio propio</span><span>APK propia</span><span>Suscripción</span></div>
        </div>
      </section>

      <section class="section cta">
        <div class="shell cta-card">
          <div><div class="kicker">VITI · AGR Studio</div><h2>Primero entendemos. Después construimos.</h2><p>No necesitas decidir un plan ni crear una empresa para explorar una solución. El registro empresarial ocurre cuando el proyecto está listo para convertirse en una instancia.</p></div>
          <q-btn size="lg" color="primary" unelevated no-caps label="Iniciar solicitud" to="/solicitud" />
        </div>
      </section>
    </main>

    <footer class="footer"><div class="shell footer-inner"><div><AppBrand/><p>Plataforma para crear, entregar y administrar soluciones digitales.</p></div><div><router-link to="/viti/planes">Planes</router-link><router-link to="/solicitud">Solicitar</router-link><router-link to="/login">Ingresar</router-link></div></div></footer>
  </q-page>
</template>

<script setup>
import AppBrand from '../components/AppBrand.vue'

const steps = [
  { n:'01', title:'Solicitud', text:'El negocio explica su operación y el resultado que necesita.' },
  { n:'02', title:'Propuesta', text:'VITI organiza alcance, módulos, identidad y forma de entrega.' },
  { n:'03', title:'Construcción', text:'El sistema se desarrolla en su propio repositorio e infraestructura.' },
  { n:'04', title:'Instancia', text:'Cuando corresponde, se registra empresa, propietario, usuarios y suscripción.' },
]
</script>

<style scoped>
.viti-platform{min-height:100vh;background:#f7fafc;color:#102a43}.shell{width:min(1180px,calc(100% - 40px));margin:0 auto}.topbar{position:sticky;top:0;z-index:30;background:rgba(247,250,252,.92);border-bottom:1px solid rgba(16,42,67,.08);backdrop-filter:blur(16px)}.topbar-inner{min-height:76px;display:flex;align-items:center;gap:24px}.brand{display:flex;text-decoration:none}.nav-links{display:flex;gap:24px;margin-left:auto}.nav-links a,.footer a{color:#5a7284;text-decoration:none;font-size:13px;font-weight:800}.actions{display:flex;gap:8px}.hero{padding:90px 0 105px;background:radial-gradient(circle at 80% 24%,rgba(11,117,147,.17),transparent 34%),linear-gradient(180deg,#f7fafc,#eef7fa)}.hero-grid{display:grid;grid-template-columns:1fr 1fr;gap:70px;align-items:center}.eyebrow,.kicker{font-size:11px;font-weight:900;letter-spacing:.14em;text-transform:uppercase;color:#0b7593}.eyebrow{display:inline-flex;align-items:center;gap:7px;padding:9px 12px;border:1px solid rgba(11,117,147,.14);border-radius:999px;background:#e4f4f7}.hero h1{font-size:clamp(46px,6vw,76px);line-height:.98;letter-spacing:-.06em;margin:20px 0}.hero h1 span{color:#0b7593}.hero p{max-width:650px;font-size:19px;line-height:1.75;color:#5d7587}.hero-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:28px}.model-card{background:#fff;border:1px solid #dbe6eb;border-radius:26px;box-shadow:0 30px 80px rgba(22,55,76,.14);overflow:hidden}.model-head{padding:18px 20px;display:flex;gap:10px;align-items:center;border-bottom:1px solid #e7edf1;color:#5f7685;font-size:12px}.dot{width:9px;height:9px;border-radius:50%;background:#0b7593}.model-flow{padding:26px;display:flex;align-items:center;gap:10px;flex-wrap:wrap;background:#f7fafc}.model-flow>div{flex:1;min-width:120px;padding:15px;border:1px solid #dfebef;border-radius:16px;background:#fff}.model-flow span,.model-flow small{display:block}.model-flow span{font-size:10px;color:#0b7593;font-weight:900}.model-flow b{display:block;margin:5px 0;font-size:15px}.model-flow small{font-size:10px;color:#80919d;line-height:1.5}.section{padding:96px 0}.dark-section{background:#102a43;color:#fff}.split{display:grid;grid-template-columns:1.05fr .95fr;gap:80px}.dark-section .kicker{color:#71cad6}.dark-section h2,.heading h2,.delivery h2,.cta-card h2{font-size:clamp(36px,4.7vw,60px);line-height:1;letter-spacing:-.05em;margin:16px 0}.copy{font-size:18px;line-height:1.8;color:#c4d3dc}.heading{max-width:820px;margin-bottom:32px}.heading p,.delivery p,.cta-card p{font-size:18px;line-height:1.75;color:#61798a}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}.card{padding:22px;background:#fff;border:1px solid #dce7ec;border-radius:20px}.card>span{font-weight:900;color:#0b7593}.card h3{margin:18px 0 8px}.card p{margin:0;color:#71838f;line-height:1.65;font-size:14px}.soft{background:#eef7ea}.delivery{display:grid;grid-template-columns:1fr 1fr;gap:70px;align-items:center}.chips{display:flex;gap:10px;flex-wrap:wrap}.chips span{padding:11px 14px;border-radius:999px;background:#fff;border:1px solid #d6e4d0;color:#5f765f;font-size:12px;font-weight:800}.cta{padding-top:30px}.cta-card{padding:36px;border-radius:26px;background:#e0edf3;border:1px solid #cfe0e8;display:flex;align-items:center;justify-content:space-between;gap:30px}.cta-card h2{font-size:clamp(32px,4vw,50px)}.footer{padding:40px 0;background:#fff;border-top:1px solid #dfe8ed}.footer-inner{display:flex;justify-content:space-between;gap:30px}.footer p{color:#78909c;font-size:13px}.footer-inner>div:last-child{display:flex;gap:18px;align-items:center}@media(max-width:850px){.hero-grid,.split,.delivery{grid-template-columns:1fr}.grid{grid-template-columns:1fr 1fr}.nav-links{display:none}.cta-card{align-items:flex-start;flex-direction:column}}@media(max-width:560px){.shell{width:calc(100% - 24px)}.grid{grid-template-columns:1fr}.model-flow{display:grid}.footer-inner,.footer-inner>div:last-child{flex-direction:column;align-items:flex-start}}
</style>
