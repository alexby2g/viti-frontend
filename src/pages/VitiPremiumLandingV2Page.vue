<script setup>
import { ref } from 'vue'
import AppBrand from '../components/AppBrand.vue'

const demoOpen = ref(false)
const demoStep = ref(1)

const demoSteps = [
  {
    title: 'Necesidad',
    text: 'Quiero vender alimentos y recibir compras sin depender de mensajes sueltos.',
    icon: 'chat_bubble_outline',
  },
  {
    title: 'Propuesta VITI',
    text: 'VITI interpreta la operación y propone una aplicación llamada FitFamily.',
    icon: 'auto_awesome',
  },
  {
    title: 'Módulos',
    text: 'Catálogo, productos, pedidos y clientes forman el primer núcleo operativo.',
    icon: 'view_quilt',
  },
  {
    title: 'Resultado',
    text: 'La empresa puede operar con su propia aplicación dentro de VITI. El plan se define después.',
    icon: 'task_alt',
  },
]

const solutions = [
  { title: 'Peluquería', text: 'Clientes, agenda, servicios, productos y operación.', icon: 'content_cut' },
  { title: 'ElectroFrío', text: 'Clientes, equipos, técnicos, órdenes, garantías y pagos.', icon: 'ac_unit' },
  { title: 'FitFamily', text: 'Productos, catálogo, carrito, pedidos y clientes.', icon: 'restaurant' },
]

function openDemo() {
  demoStep.value = 1
  demoOpen.value = true
}

function nextDemo() {
  if (demoStep.value < demoSteps.length) demoStep.value += 1
}

function previousDemo() {
  if (demoStep.value > 1) demoStep.value -= 1
}
</script>

<template>
  <div class="viti-page">
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
          <q-btn flat no-caps color="primary" label="Ingresar" to="/login" />
          <q-btn unelevated no-caps color="primary" label="Empezar" to="/solicitud/sin-plan" />
        </div>
      </div>
    </header>

    <main>
      <section class="hero">
        <div class="shell hero-grid">
          <div class="hero-copy">
            <div class="eyebrow">AGR Studio · VITI</div>
            <h1>Tu negocio.<br><span>Tu sistema.</span></h1>
            <p>VITI transforma una necesidad de negocio en una solución digital operativa: empresa, aplicación, usuarios, módulos y datos dentro de una sola plataforma.</p>
            <div class="hero-actions">
              <q-btn size="lg" color="primary" unelevated no-caps label="Cuéntame qué necesito" to="/solicitud/sin-plan" />
              <q-btn size="lg" flat no-caps color="dark" label="Explorar FitFamily" icon="play_circle" @click="openDemo" />
            </div>
            <div class="trust-row">
              <span><q-icon name="verified" color="positive" /> Configurable</span>
              <span><q-icon name="hub" color="positive" /> Multiempresa</span>
              <span><q-icon name="security" color="positive" /> Acceso controlado</span>
            </div>
          </div>

          <div class="hero-visual">
            <div class="visual-glow"></div>
            <div class="workspace-card">
              <div class="workspace-top"><span class="status-dot"></span><span>VITI · AppHub</span><q-icon name="more_horiz" /></div>
              <div class="workspace-body">
                <aside class="mini-nav">
                  <div class="mini-logo">V</div>
                  <span class="active"></span><span></span><span></span><span></span>
                </aside>
                <div class="workspace-content">
                  <div class="workspace-title"><div><small>ESPACIO DE TRABAJO</small><h3>FitFamily</h3></div><div class="avatar">C</div></div>
                  <div class="stat-grid">
                    <div><small>APLICACIÓN</small><strong>FitFamily</strong><p>Catálogo + pedidos</p></div>
                    <div><small>MÓDULOS</small><strong>04</strong><p>núcleo operativo</p></div>
                    <div><small>ESTADO</small><strong class="success">Lista</strong><p>para operar</p></div>
                  </div>
                  <div class="journey-card">
                    <div class="journey-head"><span>De la necesidad a la operación</span><b>FitFamily</b></div>
                    <div class="journey-row"><span>Necesidad</span><i></i><span>Cuestionario</span><i></i><span>Aplicación</span><i></i><span>Operación</span></div>
                  </div>
                </div>
              </div>
            </div>
            <div class="floating-card floating-left"><q-icon name="task_alt" color="positive" /><div><small>Solicitud analizada</small><b>FitFamily</b></div></div>
            <div class="floating-card floating-right"><q-icon name="tune" color="primary" /><div><small>Plan</small><b>Se define después</b></div></div>
          </div>
        </div>
      </section>

      <section id="solucion" class="section dark-section">
        <div class="shell split">
          <div><span class="kicker light">La idea</span><h2>No empiezas eligiendo software. Empiezas contando qué necesitas.</h2></div>
          <div class="dark-copy"><p>VITI separa la necesidad del plan comercial. Primero entendemos tu operación; después definimos la aplicación, los módulos y la propuesta adecuada.</p><p>Eso permite que Peluquería, ElectroFrío y FitFamily sean sistemas distintos dentro de la misma plataforma.</p></div>
        </div>
      </section>

      <section id="como-funciona" class="section">
        <div class="shell">
          <div class="section-heading"><span class="kicker">Cómo funciona</span><h2>De una necesidad a una operación digital.</h2><p>El proceso está pensado para que el cliente no tenga que hablar en lenguaje técnico.</p></div>
          <div class="process-grid">
            <article><span>01</span><h3>Describe</h3><p>Cuéntanos qué quieres resolver y cómo trabaja hoy tu negocio.</p></article>
            <article><span>02</span><h3>Analizamos</h3><p>El cuestionario organiza necesidades, procesos y posibles módulos.</p></article>
            <article><span>03</span><h3>Moldeamos</h3><p>La solución se convierte en una aplicación configurable dentro de VITI.</p></article>
            <article><span>04</span><h3>Operas</h3><p>Usuarios, datos y módulos evolucionan contigo sin perder el control.</p></article>
          </div>
        </div>
      </section>

      <section id="soluciones" class="section soft-section">
        <div class="shell">
          <div class="section-heading"><span class="kicker">Soluciones</span><h2>Una plataforma. Diferentes sistemas.</h2><p>La misma infraestructura puede entregar experiencias muy distintas según el negocio.</p></div>
          <div class="solution-grid">
            <article v-for="item in solutions" :key="item.title" class="solution-card">
              <div class="solution-icon"><q-icon :name="item.icon" size="26px" /></div>
              <h3>{{ item.title }}</h3><p>{{ item.text }}</p>
              <span class="solution-type">Aplicación VITI</span>
            </article>
          </div>
        </div>
      </section>

      <section class="section fitfamily-section">
        <div class="shell fitfamily-grid">
          <div class="fit-copy">
            <span class="kicker cyan">Ejemplo real</span>
            <h2>“Necesito un sistema para vender alimentos.”</h2>
            <p>En vez de adivinar un plan, el cliente explica su operación. VITI convierte esa necesidad en una propuesta visible.</p>
            <div class="fit-actions">
              <q-btn color="primary" unelevated no-caps label="Explorar FitFamily" icon="play_arrow" @click="openDemo" />
              <q-btn flat no-caps color="white" label="Quiero construir el mío" to="/solicitud/sin-plan" />
            </div>
          </div>
          <div class="fit-result">
            <div class="result-line"><span>NECESIDAD</span><strong>Productos + compras</strong></div>
            <div class="result-line"><span>APLICACIÓN</span><strong>FitFamily</strong></div>
            <div class="result-line"><span>MÓDULOS</span><strong>Catálogo · Productos · Pedidos · Clientes</strong></div>
            <div class="result-line last"><span>PLAN</span><strong>Se define después</strong></div>
          </div>
        </div>
      </section>

      <section class="section cta-section">
        <div class="shell cta-card">
          <div><span class="kicker">AGR Studio · VITI</span><h2>Cuéntanos qué quieres construir.</h2><p>Empieza sin elegir un plan. Primero entendemos el sistema; después definimos cómo ponerlo en marcha.</p></div>
          <div class="cta-actions"><q-btn size="lg" color="primary" unelevated no-caps label="Empezar sin plan" to="/solicitud/sin-plan" /><q-btn size="lg" outline color="primary" no-caps label="Ver planes" to="/viti/planes" /></div>
        </div>
      </section>
    </main>

    <footer class="footer"><div class="shell footer-inner"><div><AppBrand/><p>Soluciones digitales profesionales para negocios que quieren crecer.</p></div><div class="footer-links"><router-link to="/viti">VITI</router-link><router-link to="/viti/planes">Planes</router-link><router-link to="/solicitud/sin-plan">Empezar</router-link><router-link to="/login">Ingresar</router-link></div></div></footer>

    <q-dialog v-model="demoOpen">
      <q-card class="demo-dialog">
        <q-card-section class="demo-head"><div><span class="kicker">Demo guiada · FitFamily</span><h3>{{ demoSteps[demoStep - 1].title }}</h3></div><q-btn flat round dense icon="close" aria-label="Cerrar" v-close-popup /></q-card-section>
        <q-card-section class="demo-body">
          <div class="demo-icon"><q-icon :name="demoSteps[demoStep - 1].icon" size="34px" /></div>
          <p>{{ demoSteps[demoStep - 1].text }}</p>
          <div class="stepper"><span v-for="step in demoSteps.length" :key="step" :class="{current:step === demoStep,done:step < demoStep}"></span></div>
        </q-card-section>
        <q-card-actions align="between" class="demo-actions">
          <q-btn flat no-caps color="dark" label="Atrás" :disable="demoStep === 1" @click="previousDemo" />
          <q-btn v-if="demoStep < demoSteps.length" unelevated no-caps color="primary" label="Siguiente" @click="nextDemo" />
          <q-btn v-else unelevated no-caps color="primary" label="Quiero construir algo así" to="/solicitud/sin-plan" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<style scoped>
:global(body){margin:0}.viti-page{min-height:100vh;background:#f7fafc;color:#102a43}.shell{width:min(1180px,calc(100% - 40px));margin:0 auto}.topbar{position:sticky;top:0;z-index:50;background:rgba(247,250,252,.92);backdrop-filter:blur(20px);border-bottom:1px solid #dfe9ef}.topbar-inner{min-height:78px;display:flex;align-items:center;gap:24px}.brand{display:flex;text-decoration:none}.nav-links{display:flex;gap:26px;margin-left:auto}.nav-links a,.nav-links a:visited,.footer a,.footer a:visited{color:#446072;text-decoration:none;font-size:13px;font-weight:800}.nav-links a:hover,.footer a:hover{color:#0b7593}.nav-actions{display:flex;gap:8px}.hero{padding:92px 0 110px;background:radial-gradient(circle at 78% 22%,rgba(11,117,147,.16),transparent 34%),linear-gradient(180deg,#f7fafc 0%,#eef7fa 100%)}.hero-grid{display:grid;grid-template-columns:1fr 1fr;gap:60px;align-items:center}.eyebrow,.kicker{font-size:11px;font-weight:900;letter-spacing:.14em;text-transform:uppercase;color:#0b7593}.eyebrow{display:inline-flex;padding:9px 12px;border-radius:999px;background:#dff1f5;border:1px solid #c6e5ea}.hero h1{font-size:clamp(54px,7vw,86px);line-height:.92;letter-spacing:-.07em;margin:24px 0}.hero h1 span{color:#0b879f}.hero-copy>p{font-size:19px;line-height:1.72;color:#4d6778;max-width:640px}.hero-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:30px}.trust-row{display:flex;gap:18px;flex-wrap:wrap;margin-top:24px;color:#4b6577;font-size:12px;font-weight:800}.trust-row span{display:flex;gap:6px;align-items:center}.hero-visual{position:relative;min-height:500px;display:grid;place-items:center}.visual-glow{position:absolute;width:460px;height:460px;border-radius:50%;background:radial-gradient(circle,rgba(11,117,147,.18),rgba(11,117,147,0) 68%)}.workspace-card{position:relative;z-index:2;width:min(100%,600px);background:#fff;border:1px solid #d7e4ea;border-radius:26px;box-shadow:0 28px 80px rgba(16,42,67,.14);overflow:hidden}.workspace-top{height:50px;display:flex;align-items:center;gap:9px;padding:0 17px;color:#516b7c;font-size:11px;border-bottom:1px solid #e4edf1}.workspace-top .status-dot{width:8px;height:8px;border-radius:50%;background:#0b879f}.workspace-top .q-icon{margin-left:auto}.workspace-body{display:grid;grid-template-columns:62px 1fr;min-height:390px}.mini-nav{background:#102a43;padding:18px 12px;display:flex;align-items:center;flex-direction:column;gap:18px}.mini-logo{width:34px;height:34px;border-radius:11px;background:#0b879f;color:white;display:grid;place-items:center;font-weight:900}.mini-nav span{width:29px;height:7px;border-radius:8px;background:rgba(255,255,255,.16)}.mini-nav span.active{background:#71cad6}.workspace-content{padding:28px;background:#f7fafc}.workspace-title{display:flex;justify-content:space-between;align-items:center}.workspace-title small,.stat-grid small{font-size:8px;letter-spacing:.12em;color:#76909f}.workspace-title h3{font-size:25px;margin:4px 0 0}.avatar{width:40px;height:40px;border-radius:50%;display:grid;place-items:center;background:#dff1f5;color:#0b7593;font-weight:900}.stat-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:22px}.stat-grid>div,.journey-card{background:#fff;border:1px solid #dce8ed;border-radius:15px;padding:14px}.stat-grid strong{display:block;font-size:16px;margin-top:6px;color:#102a43}.stat-grid p{margin:4px 0 0;color:#69808f;font-size:10px}.stat-grid .success{color:#119a62}.journey-card{margin-top:12px}.journey-head{display:flex;justify-content:space-between;gap:12px;font-size:11px;color:#3b5668}.journey-head b{color:#0b7593}.journey-row{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-top:14px}.journey-row span{padding:8px 10px;background:#eef7fa;border:1px solid #dceff3;border-radius:999px;color:#23485c;font-size:10px;font-weight:800}.journey-row i{width:18px;height:1px;background:#9bc5cf;display:block}.floating-card{position:absolute;z-index:4;display:flex;gap:10px;align-items:center;background:#fff;border:1px solid #d7e4ea;border-radius:16px;padding:12px 14px;box-shadow:0 18px 42px rgba(16,42,67,.14)}.floating-card small,.floating-card b{display:block}.floating-card small{font-size:9px;color:#718896}.floating-card b{font-size:12px;color:#102a43}.floating-left{left:0;bottom:60px}.floating-right{right:0;top:62px}.section{padding:96px 0}.dark-section{background:#102a43;color:#fff}.split{display:grid;grid-template-columns:1.02fr .98fr;gap:84px}.dark-section .kicker.light{color:#71cad6}.dark-section h2{font-size:clamp(40px,5vw,64px);line-height:.98;letter-spacing:-.05em;margin:16px 0}.dark-copy{font-size:18px;line-height:1.8;color:#d5e1e7}.section-heading{max-width:820px}.section-heading h2{font-size:clamp(40px,5vw,62px);line-height:.98;letter-spacing:-.05em;margin:14px 0}.section-heading p{font-size:18px;line-height:1.72;color:#526d7e}.process-grid,.solution-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-top:42px}.process-grid article{background:#fff;border:1px solid #d8e5eb;border-radius:18px;padding:24px;min-height:220px;box-shadow:0 14px 30px rgba(16,42,67,.05)}.process-grid span{color:#0b7593;font-weight:900;font-size:12px}.process-grid h3{font-size:23px;margin:28px 0 10px}.process-grid p,.solution-card p{color:#5c7585;line-height:1.65}.soft-section{background:#eef6f8}.solution-grid{grid-template-columns:repeat(3,1fr)}.solution-card{background:#fff;border:1px solid #d7e4ea;border-radius:20px;padding:26px;box-shadow:0 14px 30px rgba(16,42,67,.05)}.solution-icon{width:48px;height:48px;border-radius:14px;background:#dff1f5;color:#0b7593;display:grid;place-items:center}.solution-card h3{font-size:24px;margin:20px 0 9px}.solution-type{display:inline-flex;margin-top:12px;padding:7px 10px;border-radius:999px;background:#f2f7f9;color:#506b7c;font-size:10px;font-weight:900}.fitfamily-section{background:#102a43;color:#fff}.fitfamily-grid{display:grid;grid-template-columns:1.02fr .98fr;gap:60px;align-items:center}.fitfamily-section .kicker.cyan{color:#71cad6}.fit-copy h2{font-size:clamp(42px,5vw,66px);line-height:.98;letter-spacing:-.05em;margin:18px 0}.fit-copy p{font-size:18px;line-height:1.75;color:#d2e0e6;max-width:660px}.fit-actions{display:flex;gap:9px;flex-wrap:wrap;margin-top:26px}.fit-result{background:#143652;border:1px solid #2c536e;border-radius:22px;padding:18px 22px;box-shadow:0 22px 60px rgba(0,0,0,.16)}.result-line{display:flex;align-items:flex-start;justify-content:space-between;gap:30px;padding:20px 0;border-bottom:1px solid #2c536e}.result-line.last{border-bottom:0}.result-line span{font-size:10px;letter-spacing:.12em;color:#9bb4c3;font-weight:900}.result-line strong{color:#fff;font-size:15px;text-align:right;max-width:65%}.result-line.last strong{color:#71cad6}.cta-section{background:#f7fafc}.cta-card{display:flex;align-items:center;justify-content:space-between;gap:40px;padding:44px;border-radius:24px;background:#fff;border:1px solid #d7e4ea;box-shadow:0 18px 50px rgba(16,42,67,.08)}.cta-card h2{font-size:42px;line-height:1;letter-spacing:-.04em;margin:12px 0}.cta-card p{max-width:700px;color:#5b7383;font-size:17px;line-height:1.65}.cta-actions{display:flex;gap:8px;flex-wrap:wrap}.footer{background:#0b1f30;color:#d2e0e6;padding:42px 0}.footer-inner{display:flex;justify-content:space-between;align-items:flex-end;gap:40px}.footer p{color:#9fb2be;max-width:360px;line-height:1.6}.footer-links{display:flex;gap:18px;flex-wrap:wrap}.footer-links a{color:#c7d7df}.demo-dialog{width:min(620px,calc(100vw - 32px));border-radius:22px}.demo-head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:1px solid #e2ebef}.demo-head h3{font-size:34px;line-height:1;margin:10px 0 4px}.demo-body{text-align:center;padding:34px}.demo-icon{width:72px;height:72px;border-radius:20px;background:#dff1f5;color:#0b7593;display:grid;place-items:center;margin:0 auto 18px}.demo-body p{font-size:18px;line-height:1.7;color:#4d6778}.stepper{display:flex;justify-content:center;gap:8px;margin-top:26px}.stepper span{width:34px;height:6px;border-radius:6px;background:#d9e6eb}.stepper span.current{background:#146ef5}.stepper span.done{background:#0b879f}.demo-actions{border-top:1px solid #e2ebef;padding:14px 18px}@media(max-width:980px){.hero-grid,.split,.fitfamily-grid{grid-template-columns:1fr}.hero-copy{text-align:center}.hero-actions,.trust-row{justify-content:center}.hero-visual{margin-top:12px}.process-grid{grid-template-columns:repeat(2,1fr)}.cta-card{flex-direction:column;align-items:flex-start}.nav-links{display:none}}@media(max-width:640px){.shell{width:min(100% - 22px,1180px)}.topbar-inner{min-height:68px}.nav-actions .q-btn:first-child{display:none}.hero{padding:58px 0 70px}.hero h1{font-size:52px}.hero-copy>p{font-size:16px}.hero-stage{min-height:380px}.workspace-body{min-height:300px}.mini-nav{padding:14px 8px}.workspace-content{padding:20px 15px}.stat-grid{grid-template-columns:1fr}.floating-card{display:none}.section{padding:68px 0}.process-grid,.solution-grid{grid-template-columns:1fr}.fit-copy h2{font-size:46px}.result-line{flex-direction:column;gap:8px}.result-line strong{text-align:left;max-width:none}.cta-card{padding:28px}.cta-card h2{font-size:34px}.footer-inner{flex-direction:column;align-items:flex-start}.demo-head h3{font-size:28px}}
</style>
