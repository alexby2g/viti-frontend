<script setup>
import AppBrand from '../components/AppBrand.vue'

const solutions = [
  { title:'Peluquería', text:'Clientes, agenda, servicios, productos, caja e historial.', icon:'content_cut' },
  { title:'ElectroFrío', text:'Clientes, equipos, técnicos, órdenes, garantías y pagos.', icon:'ac_unit' },
  { title:'FitFamily', text:'Productos, catálogo, carrito y pedidos como nueva solución VITI.', icon:'restaurant' },
]

const flow = [
  ['01','Cuéntanos qué necesitas','Describe tu negocio y el problema que quieres resolver.'],
  ['02','VITI entiende tu operación','El cuestionario organiza necesidades, procesos y módulos.'],
  ['03','Creamos la solución','Tu empresa recibe una aplicación configurable dentro de VITI.'],
  ['04','Operas y creces','Usuarios, datos, módulos y capacidades evolucionan contigo.'],
]
</script>

<template>
  <div class="premium-landing">
    <header class="topbar">
      <div class="shell topbar-inner">
        <router-link to="/viti" class="brand"><AppBrand /></router-link>
        <nav class="nav-links">
          <a href="#solucion">La solución</a>
          <a href="#como-funciona">Cómo funciona</a>
          <a href="#soluciones">Soluciones</a>
          <router-link to="/viti/planes">Planes</router-link>
        </nav>
        <div class="nav-actions">
          <q-btn flat no-caps color="dark" label="Ingresar" to="/login" />
          <q-btn unelevated no-caps color="primary" label="Empezar" to="/solicitud/sin-plan" />
        </div>
      </div>
    </header>

    <main>
      <section class="hero">
        <div class="shell hero-grid">
          <div class="hero-copy">
            <div class="eyebrow"><q-icon name="auto_awesome" /> AGR Studio · VITI</div>
            <h1>Tu negocio no necesita otro software.<br><span>Necesita un sistema pensado para él.</span></h1>
            <p class="hero-lead">VITI convierte una necesidad de negocio en una solución digital operativa: empresa, aplicaciones, usuarios, módulos, datos y seguimiento dentro de una sola plataforma.</p>
            <div class="hero-actions">
              <q-btn size="lg" color="primary" unelevated no-caps label="Cuéntame qué necesitas" to="/solicitud/sin-plan" />
              <q-btn size="lg" flat color="dark" no-caps label="Ver cómo funciona" href="#como-funciona" />
            </div>
            <div class="hero-points">
              <span><q-icon name="verified" color="positive" /> Configurable</span>
              <span><q-icon name="shield" color="positive" /> Acceso controlado</span>
              <span><q-icon name="hub" color="positive" /> Multiempresa</span>
            </div>
          </div>

          <div class="hero-stage">
            <div class="orb orb-one"></div><div class="orb orb-two"></div>
            <div class="glass-panel">
              <div class="panel-head"><span class="dot"></span><span>VITI · AppHub</span><q-icon name="more_horiz" /></div>
              <div class="panel-body">
                <div class="mini-sidebar"><div class="mini-logo">V</div><span class="mini-active"></span><span></span><span></span><span></span><span></span></div>
                <div class="mini-main">
                  <div class="mini-top"><div><small>ESPACIO DE TRABAJO</small><strong>FitFamily</strong></div><div class="avatar">C</div></div>
                  <div class="mini-cards"><div><small>APLICACIÓN</small><b>FitFamily</b><span>Catálogo + pedidos</span></div><div><small>MÓDULOS</small><b>06</b><span>habilitados</span></div><div><small>ESTADO</small><b class="ok">Activo</b><span>Operación lista</span></div></div>
                  <div class="mini-flow"><div class="flow-title">De la necesidad a la operación</div><div class="flow-row"><span>Necesidad</span><q-icon name="arrow_forward"/><span>Cuestionario</span><q-icon name="arrow_forward"/><span>Aplicación</span><q-icon name="arrow_forward"/><span>Operación</span></div></div>
                </div>
              </div>
            </div>
            <div class="floating-card card-one"><q-icon name="task_alt" color="positive"/><div><small>Solicitud analizada</small><b>FitFamily</b></div></div>
            <div class="floating-card card-two"><q-icon name="view_quilt" color="primary"/><div><small>Aplicación</small><b>Personalizada</b></div></div>
          </div>
        </div>
      </section>

      <section id="solucion" class="section dark-section">
        <div class="shell split">
          <div><div class="kicker">No es un sistema prefabricado</div><h2>Es una plataforma para construir la solución que tu negocio necesita.</h2></div>
          <div class="copy"><p>VITI conecta la identidad del usuario, la empresa y la aplicación. El resultado es un espacio de trabajo que puede tener módulos, permisos y capacidades distintos para cada negocio.</p><p>Por eso Peluquería, ElectroFrío y FitFamily pueden vivir dentro de la misma plataforma sin convertirse en el mismo sistema.</p></div>
        </div>
      </section>

      <section id="como-funciona" class="section">
        <div class="shell">
          <div class="section-heading"><div class="kicker">Cómo funciona</div><h2>De la idea a una operación digital.</h2><p>No necesitas conocer arquitectura, bases de datos ni módulos. VITI traduce tu necesidad a un flujo de trabajo claro.</p></div>
          <div class="flow-grid">
            <article v-for="item in flow" :key="item[0]" class="flow-card"><span>{{ item[0] }}</span><h3>{{ item[1] }}</h3><p>{{ item[2] }}</p></article>
          </div>
        </div>
      </section>

      <section id="soluciones" class="section soft-section">
        <div class="shell">
          <div class="section-heading"><div class="kicker">Ya lo estamos construyendo</div><h2>Una plataforma. Muchas soluciones.</h2><p>VITI puede entregar diferentes aplicaciones sobre la misma base SaaS.</p></div>
          <div class="solution-grid">
            <article v-for="item in solutions" :key="item.title" class="solution-card"><div class="solution-icon"><q-icon :name="item.icon" size="26px" /></div><h3>{{ item.title }}</h3><p>{{ item.text }}</p><div class="solution-link">Ver concepto <q-icon name="arrow_forward" size="17px" /></div></article>
          </div>
        </div>
      </section>

      <section class="section scenario-section">
        <div class="shell scenario">
          <div>
            <div class="kicker">Ejemplo</div>
            <h2>“Necesito un sistema para vender alimentos.”</h2>
            <p>VITI no te obliga a adivinar qué plan corresponde. Puedes explicar primero tu operación y decidir la propuesta después.</p>
            <q-btn color="primary" unelevated no-caps label="Probar con FitFamily" to="/solicitud/sin-plan" />
          </div>
          <div class="scenario-card">
            <div class="scenario-line"><span>Necesidad</span><b>Productos + compras</b></div>
            <div class="scenario-line"><span>Aplicación</span><b>FitFamily</b></div>
            <div class="scenario-line"><span>Módulos</span><b>Catálogo · Productos · Pedidos · Clientes</b></div>
            <div class="scenario-line"><span>Plan</span><b class="pending">Se define después</b></div>
          </div>
        </div>
      </section>

      <section class="section cta-section">
        <div class="shell cta-card">
          <div><div class="kicker">VITI · AGR Studio</div><h2>Cuéntanos qué quieres construir.</h2><p>Empieza sin elegir un plan. Primero entendemos tu sistema; después definimos la mejor forma de ponerlo en marcha.</p></div>
          <div class="cta-actions"><q-btn size="lg" color="primary" unelevated no-caps label="Empezar sin plan" to="/solicitud/sin-plan" /><q-btn size="lg" outline color="primary" no-caps label="Ver planes" to="/viti/planes" /></div>
        </div>
      </section>
    </main>

    <footer class="footer"><div class="shell footer-inner"><div><AppBrand/><p>Soluciones digitales profesionales para negocios que quieren crecer.</p></div><div class="footer-links"><router-link to="/viti">VITI</router-link><router-link to="/viti/planes">Planes</router-link><router-link to="/solicitud/sin-plan">Empezar</router-link><router-link to="/login">Ingresar</router-link></div></div></footer>
  </div>
</template>

<style scoped>
:global(body){margin:0}.premium-landing{min-height:100vh;background:#f7fafc;color:#102a43}.shell{width:min(1180px,calc(100% - 40px));margin:0 auto}.topbar{position:sticky;top:0;z-index:50;background:rgba(247,250,252,.88);backdrop-filter:blur(20px);border-bottom:1px solid rgba(16,42,67,.08)}.topbar-inner{min-height:78px;display:flex;align-items:center;gap:24px}.brand{display:flex;text-decoration:none}.nav-links{display:flex;gap:26px;margin-left:auto}.nav-links a,.nav-links a:visited,.footer a,.footer a:visited{color:#5a7284;text-decoration:none;font-size:13px;font-weight:800}.nav-links a:hover,.footer a:hover{color:#0b7593}.nav-actions{display:flex;gap:8px}.hero{position:relative;overflow:hidden;padding:92px 0 110px;background:radial-gradient(circle at 78% 24%,rgba(11,117,147,.18),transparent 34%),linear-gradient(180deg,#f7fafc 0%,#eef7fa 100%)}.hero-grid{display:grid;grid-template-columns:1.02fr .98fr;gap:60px;align-items:center}.eyebrow,.kicker{font-size:11px;font-weight:900;letter-spacing:.14em;text-transform:uppercase;color:#0b7593}.eyebrow{display:inline-flex;align-items:center;gap:7px;padding:9px 12px;border:1px solid rgba(11,117,147,.14);border-radius:999px;background:#e4f4f7}.hero h1{font-size:clamp(46px,6vw,78px);line-height:.98;letter-spacing:-.06em;margin:22px 0}.hero h1 span{color:#0b7593}.hero-lead{font-size:19px;line-height:1.75;color:#5d7587;max-width:650px}.hero-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:30px}.hero-points{display:flex;gap:16px;flex-wrap:wrap;margin-top:22px;color:#607888;font-size:12px;font-weight:700}.hero-points span{display:flex;align-items:center;gap:5px}.hero-stage{position:relative;min-height:500px;display:grid;place-items:center}.orb{position:absolute;border-radius:50%;filter:blur(2px)}.orb-one{width:260px;height:260px;right:6%;top:6%;background:rgba(11,117,147,.15)}.orb-two{width:180px;height:180px;left:6%;bottom:7%;background:rgba(22,119,255,.12)}.glass-panel{position:relative;z-index:2;width:min(100%,590px);background:rgba(255,255,255,.82);border:1px solid rgba(16,42,67,.1);border-radius:26px;box-shadow:0 35px 100px rgba(22,55,76,.16);backdrop-filter:blur(22px);overflow:hidden;transform:rotate(.8deg)}.panel-head{height:52px;display:flex;align-items:center;gap:9px;padding:0 17px;border-bottom:1px solid #e7edf1;color:#738b9a;font-size:11px}.panel-head .dot{width:8px;height:8px;border-radius:50%;background:#0b7593}.panel-head .q-icon{margin-left:auto}.panel-body{display:grid;grid-template-columns:64px 1fr;min-height:380px}.mini-sidebar{padding:18px 12px;background:#102a43;display:flex;align-items:center;flex-direction:column;gap:18px}.mini-logo{width:35px;height:35px;border-radius:11px;background:#0b7593;color:#fff;display:grid;place-items:center;font-weight:900}.mini-sidebar span{width:31px;height:7px;border-radius:9px;background:rgba(255,255,255,.16)}.mini-sidebar .mini-active{background:#71cad6}.mini-main{padding:26px;background:#f7fafc}.mini-top{display:flex;justify-content:space-between;align-items:center}.mini-top small{display:block;color:#78909c;font-size:9px;letter-spacing:.12em}.mini-top strong{display:block;font-size:24px;margin-top:3px}.avatar{width:38px;height:38px;border-radius:50%;display:grid;place-items:center;background:#e1f1f5;color:#0b7593;font-weight:900}.mini-cards{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:20px}.mini-cards>div,.mini-flow{background:#fff;border:1px solid #e5edf1;border-radius:14px;padding:14px}.mini-cards small{font-size:8px;letter-spacing:.1em;color:#8295a1}.mini-cards b{display:block;margin-top:5px;font-size:17px}.mini-cards span{font-size:10px;color:#8195a2}.ok{color:#149c63}.mini-flow{margin-top:12px}.flow-title{font-weight:800;font-size:12px;margin-bottom:13px}.flow-row{display:flex;align-items:center;gap:7px;flex-wrap:wrap;font-size:10px;color:#5e7687}.flow-row span{padding:8px 10px;border-radius:999px;background:#eff7fa}.floating-card{position:absolute;z-index:4;display:flex;align-items:center;gap:10px;padding:12px 14px;background:rgba(255,255,255,.94);border:1px solid rgba(16,42,67,.08);border-radius:16px;box-shadow:0 18px 40px rgba(22,55,76,.14)}.floating-card small,.floating-card b{display:block}.floating-card small{font-size:9px;color:#8295a1}.floating-card b{font-size:12px}.card-one{left:0;bottom:70px}.card-two{right:0;top:70px}.section{padding:96px 0}.dark-section{background:#102a43;color:#fff}.split{display:grid;grid-template-columns:1.05fr .95fr;gap:80px}.dark-section .kicker{color:#71cad6}.dark-section h2{font-size:clamp(38px,4.7vw,62px);line-height:1;letter-spacing:-.05em;margin:18px 0}.copy{font-size:18px;line-height:1.8;color:#c4d3dc}.section-heading{max-width:820px}.section-heading h2{font-size:clamp(38px,4.6vw,60px);line-height:1;letter-spacing:-.05em;margin:16px 0}.section-heading p{font-size:18px;line-height:1.75;color:#61798a}.soft-section{background:#eef6f8}.flow-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-top:38px}.flow-card{min-height:210px;padding:24px;border:1px solid #e0e9ee;border-radius:20px;background:#fff;box-shadow:0 12px 30px rgba(16,42,67,.05)}.flow-card>span{display:block;font-size:12px;font-weight:900;color:#0b7593;letter-spacing:.1em}.flow-card h3{font-size:24px;letter-spacing:-.025em;margin:34px 0 12px}.flow-card p{line-height:1.65;color:#6a7f8d}.solution-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;margin-top:38px}.solution-card{padding:26px;background:#fff;border:1px solid #dde7ec;border-radius:22px}.solution-icon{width:50px;height:50px;border-radius:14px;background:#e5f4f7;display:grid;place-items:center;color:#0b7593}.solution-card h3{font-size:25px;margin:22px 0 8px}.solution-card p{color:#647c8a;line-height:1.65;min-height:76px}.solution-link{display:flex;align-items:center;gap:5px;color:#1677ff;font-weight:800;font-size:13px}.scenario-section{background:linear-gradient(135deg,#f5f9fb,#e8f5f7)}.scenario{display:grid;grid-template-columns:1fr .9fr;gap:52px;align-items:center}.scenario h2{font-size:clamp(38px,4.8vw,62px);line-height:1.02;letter-spacing:-.05em;margin:16px 0}.scenario p{font-size:18px;line-height:1.75;color:#607888;max-width:650px}.scenario-card{padding:28px;background:#102a43;color:#fff;border-radius:24px;box-shadow:0 28px 70px rgba(16,42,67,.2)}.scenario-line{display:flex;justify-content:space-between;gap:20px;padding:16px 0;border-bottom:1px solid rgba(255,255,255,.12)}.scenario-line:last-child{border-bottom:0}.scenario-line span{color:#91a8b6}.scenario-line b{font-size:14px;text-align:right}.scenario-line .pending{color:#71cad6}.cta-section{padding-top:30px}.cta-card{display:flex;justify-content:space-between;gap:30px;align-items:center;padding:42px 48px;border-radius:28px;background:#fff;border:1px solid #dfe9ee;box-shadow:0 20px 60px rgba(16,42,67,.08)}.cta-card h2{font-size:clamp(34px,4vw,52px);line-height:1.02;letter-spacing:-.045em;margin:14px 0}.cta-card p{max-width:700px;color:#647c8a;font-size:17px;line-height:1.7}.cta-actions{display:flex;gap:8px;flex-wrap:wrap}.footer{background:#0a1d2c;color:#c9d6de;padding:34px 0}.footer-inner{display:flex;justify-content:space-between;gap:35px;align-items:center}.footer p{max-width:430px;color:#8fa3b0}.footer-links{display:flex;gap:22px;flex-wrap:wrap}@media(max-width:900px){.nav-links{display:none}.hero-grid,.split,.scenario{grid-template-columns:1fr}.hero-stage{min-height:430px;margin-top:20px}.flow-grid{grid-template-columns:repeat(2,1fr)}.solution-grid{grid-template-columns:1fr}.cta-card{flex-direction:column;align-items:flex-start}.footer-inner{flex-direction:column;align-items:flex-start}}@media(max-width:600px){.shell{width:min(100% - 24px,1180px)}.topbar-inner{min-height:68px}.nav-actions .q-btn:first-child{display:none}.hero{padding:64px 0 80px}.hero h1{font-size:46px}.hero-lead{font-size:17px}.panel-body{grid-template-columns:48px 1fr}.mini-cards{grid-template-columns:1fr}.floating-card{display:none}.flow-grid{grid-template-columns:1fr}.section{padding:72px 0}.cta-card{padding:28px}.cta-actions .q-btn{width:100%}.footer-links{gap:13px}}
</style>