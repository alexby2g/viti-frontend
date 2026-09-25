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
  { number:'01', title:'Nos cuentas qué necesitas', text:'Completa una solicitud breve. No necesitas conocer términos técnicos ni definir cómo debe programarse.' },
  { number:'02', title:'VITI revisa y propone', text:'Ordenamos la necesidad, definimos el alcance y te presentamos una propuesta clara antes de iniciar.' },
  { number:'03', title:'Desarrollamos y validamos', text:'Sigues el avance del trabajo y puedes revisar entregas parciales cuando el proyecto lo requiera.' },
  { number:'04', title:'Recibes tu sistema', text:'Entregamos el acceso acordado y dejamos organizado el soporte o mantenimiento contratado.' },
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
        <router-link to="/viti" class="brand-link" aria-label="VITI - Inicio">
          <AppBrand />
        </router-link>

        <nav class="nav-links" aria-label="Navegación principal">
          <a href="#que-hacemos">Qué hacemos</a>
          <a href="#como-funciona">Cómo funciona</a>
          <a href="#planes">Precios</a>
          <a href="#suscripcion">Suscripción</a>
        </nav>

        <div class="nav-actions">
          <q-btn flat no-caps class="nav-login" label="Demo" to="/demo" />
          <q-btn flat no-caps class="nav-login" label="Iniciar sesión" to="/login" />
          <q-btn outline no-caps class="nav-primary" label="Crear cuenta" to="/registro" />
        </div>
      </div>
    </header>

    <main>
      <section class="hero-section">
        <div class="hero-glow hero-glow-one" aria-hidden="true"></div>
        <div class="hero-glow hero-glow-two" aria-hidden="true"></div>

        <div class="landing-container hero-grid">
          <div class="hero-copy">
            <div class="eyebrow">
              <span class="eyebrow-dot"></span>
              VITI · SOLUCIONES DIGITALES
            </div>

            <h1>
              Creamos el sistema que tu negocio necesita
              <span>sin complicarte con lo técnico.</span>
            </h1>

            <p class="hero-lead">
              Cuéntanos qué quieres resolver. VITI organiza el trabajo, desarrolla la solución y te permite seguir el proyecto hasta la entrega.
            </p>

            <div class="hero-actions">
              <q-btn color="primary" unelevated no-caps size="lg" class="hero-main-btn" icon-right="arrow_forward" label="Solicitar evaluación" to="/solicitud" />
              <q-btn outline no-caps size="lg" class="btn-outline" label="Ver demo" to="/demo" />
              <q-btn flat no-caps size="lg" class="btn-text" label="Ver precios" to="/viti/planes" />
            </div>

            <div class="hero-points" aria-label="Beneficios principales">
              <span><q-icon name="check" /> Solicitud simple</span>
              <span><q-icon name="check" /> Presupuesto claro</span>
              <span><q-icon name="check" /> Seguimiento real</span>
            </div>
          </div>

          <div class="visual-stage">
            <div class="float-card float-card-top">
              <span class="float-icon"><q-icon name="task_alt" /></span>
              <div>
                <small>SOLICITUD</small>
                <b>Revisada por VITI</b>
              </div>
              <q-icon name="check_circle" class="float-check" />
            </div>

            <div class="customer-preview" aria-label="Cómo verá el cliente su proyecto en VITI">
              <div class="preview-bar">
                <span></span><span></span><span></span>
                <b>Mi proyecto</b>
                <small>VITI</small>
              </div>

              <div class="preview-body">
                <div class="preview-label">SEGUIMIENTO DEL TRABAJO</div>
                <div class="preview-status">
                  <div>
                    <small>ESTADO ACTUAL</small>
                    <strong>En desarrollo</strong>
                  </div>
                  <q-badge class="progress-badge">68%</q-badge>
                </div>

                <q-linear-progress :value="0.68" rounded size="8px" color="primary" track-color="blue-grey-9" />

                <div class="preview-steps">
                  <div class="done"><q-icon name="check"/><span>Solicitud</span></div>
                  <div class="done"><q-icon name="check"/><span>Diseño</span></div>
                  <div class="active"><q-icon name="code"/><span>Desarrollo</span></div>
                  <div><q-icon name="science"/><span>Pruebas</span></div>
                  <div><q-icon name="rocket_launch"/><span>Entrega</span></div>
                </div>

                <div class="preview-note">
                  <span class="note-icon"><q-icon name="notifications_none" /></span>
                  <div>
                    <small>ÚLTIMA ACTUALIZACIÓN</small>
                    <b>Nuevo avance disponible para revisar.</b>
                  </div>
                  <q-icon name="arrow_forward" class="note-arrow" />
                </div>
              </div>
            </div>

            <div class="float-card float-card-bottom">
              <span class="float-icon blue"><q-icon name="language" /></span>
              <div>
                <small>ENTREGA</small>
                <b>Tu sistema, listo para usar</b>
              </div>
            </div>
          </div>
        </div>

        <div class="landing-container hero-trust">
          <div><q-icon name="description" /><span><b>1.</b> Envías tu necesidad</span></div>
          <span class="trust-line"></span>
          <div><q-icon name="fact_check" /><span><b>2.</b> Acordamos el trabajo</span></div>
          <span class="trust-line"></span>
          <div><q-icon name="developer_mode" /><span><b>3.</b> Lo desarrollamos</span></div>
          <span class="trust-line"></span>
          <div><q-icon name="verified" /><span><b>4.</b> Recibes tu sistema</span></div>
        </div>
      </section>

      <section id="que-hacemos" class="landing-section surface-section">
        <div class="landing-container">
          <div class="section-heading split-heading">
            <div>
              <div class="section-kicker">Qué hacemos</div>
              <h2>Tecnología útil, diseñada alrededor de tu negocio.</h2>
            </div>
            <p>No vendemos una plantilla cerrada. Partimos de una necesidad real y construimos la solución que tenga sentido para tu operación.</p>
          </div>

          <div class="solution-grid q-mt-xl">
            <article v-for="item in solutions" :key="item.title" class="solution-card">
              <div class="solution-icon"><q-icon :name="item.icon"/></div>
              <div class="card-index">VITI</div>
              <h3>{{item.title}}</h3>
              <p>{{item.text}}</p>
            </article>
          </div>
        </div>
      </section>

      <section id="como-funciona" class="landing-section workflow-section">
        <div class="landing-container workflow-layout">
          <div class="workflow-intro">
            <div class="section-kicker">Cómo funciona</div>
            <h2>Un proceso claro de principio a entrega.</h2>
            <p>Tú te concentras en explicar el problema. VITI organiza el resto del trabajo para que siempre sepas qué sigue.</p>
            <q-btn flat no-caps class="text-action" icon-right="arrow_forward" label="Iniciar una solicitud" to="/solicitud" />
          </div>

          <div class="workflow-list">
            <article v-for="item in workflow" :key="item.number" class="workflow-row">
              <span class="workflow-number">{{item.number}}</span>
              <div>
                <h3>{{item.title}}</h3>
                <p>{{item.text}}</p>
              </div>
              <q-icon name="arrow_forward" class="workflow-arrow" />
            </article>
          </div>
        </div>
      </section>

      <section id="planes" class="landing-section plans-section">
        <div class="landing-container">
          <div class="price-explain q-mb-xl">
            <div>
              <div class="section-kicker">Precios claros</div>
              <h2>Desarrollo y servicio, explicados por separado.</h2>
              <p>Primero sabes cuánto cuesta construir tu solución. Después eliges el servicio que necesitas para mantenerla funcionando.</p>
            </div>
            <div class="price-columns">
              <div>
                <span class="price-icon"><q-icon name="construction"/></span>
                <b>Implementación</b>
                <span>Pago por analizar, desarrollar, configurar y poner en marcha tu sistema.</span>
              </div>
              <div>
                <span class="price-icon"><q-icon name="autorenew"/></span>
                <b>Servicio</b>
                <span>Pago mensual o anual por alojamiento, mantenimiento y soporte incluidos.</span>
              </div>
            </div>
          </div>
          <PublicPlansCatalog :show-intro="false" />
        </div>
      </section>

      <section id="suscripcion" class="landing-section surface-section">
        <div class="landing-container subscription-grid">
          <div class="subscription-copy">
            <div class="section-kicker">Después de la entrega</div>
            <h2>Tu sistema sigue acompañado.</h2>
            <p>La suscripción no vuelve a cobrar el desarrollo. Mantiene los servicios que siguen funcionando después de entregar el sistema. El alcance exacto se confirma antes de aprobar el proyecto.</p>
            <q-btn flat no-caps class="text-action" icon-right="arrow_forward" label="Ver planes y costos" to="/viti/planes"/>
          </div>

          <div class="subscription-cards">
            <article v-for="item in subscription" :key="item.title">
              <span class="subscription-icon"><q-icon :name="item.icon"/></span>
              <div><b>{{item.title}}</b><span>{{item.text}}</span></div>
            </article>
          </div>
        </div>
      </section>

      <section class="cta-section">
        <div class="landing-container cta-shell">
          <div class="cta-copy">
            <div class="section-kicker">Empecemos</div>
            <h2>Cuéntanos qué quieres resolver.</h2>
            <p>La solicitud toma pocos minutos. Si tu proyecto es viable, VITI te mostrará el siguiente paso para confirmar alcance, precio y forma de trabajo.</p>
          </div>
          <div class="cta-actions">
            <q-btn color="primary" unelevated no-caps size="lg" icon-right="arrow_forward" label="Solicitar mi sistema" to="/solicitud"/>
            <q-btn outline no-caps size="lg" class="btn-outline" label="Crear cuenta" to="/registro"/>
            <q-btn flat no-caps size="lg" class="btn-text" label="Ya tengo acceso" to="/login"/>
          </div>
        </div>
      </section>
    </main>

    <footer class="landing-footer">
      <div class="landing-container footer-inner">
        <div class="footer-brand">
          <AppBrand/>
          <p>VITI desarrolla, organiza y entrega soluciones digitales.</p>
          <small>Tecnología desarrollada por AGR Studio.</small>
        </div>
        <div class="footer-links">
          <router-link to="/viti/planes">Precios</router-link>
          <router-link to="/demo">Demo</router-link>
          <router-link to="/registro">Crear cuenta</router-link>
          <router-link to="/solicitud">Solicitar sistema</router-link>
          <router-link to="/login">Ingresar</router-link>
        </div>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.landing-page{
  --ink:#f4f8fc;
  --muted:#9fb0c0;
  --muted-2:#72889e;
  --line:rgba(117,151,183,.18);
  --surface:#0b2036;
  --surface-2:#0d2742;
  --orange:#f3953f;
  --blue:#6ea9f5;
  min-height:100vh;
  overflow:hidden;
  background:
    radial-gradient(circle at 84% 8%,rgba(43,116,206,.14),transparent 31rem),
    radial-gradient(circle at 10% 22%,rgba(242,139,48,.045),transparent 24rem),
    linear-gradient(180deg,#06111f 0%,#071625 46%,#091a2c 100%);
  color:var(--ink);
}
.landing-page :deep(.q-btn:not(.q-btn--round)){border-radius:13px;font-weight:700;letter-spacing:-.01em}
.landing-page :deep(.q-btn.q-btn--outline:before){border-width:1.2px!important}
.landing-container{width:min(1180px,calc(100% - 40px));margin:0 auto}

/* Navigation */
.landing-nav{position:sticky;top:0;z-index:50;background:rgba(5,15,27,.78);backdrop-filter:blur(22px);border-bottom:1px solid rgba(122,153,181,.13)}
.nav-inner{min-height:70px;display:flex;align-items:center;gap:30px}
.brand-link{text-decoration:none;color:inherit;min-width:178px}
.brand-link :deep(.viti-mark){width:40px;height:40px;flex-basis:40px;border-radius:11px}
.brand-link :deep(.product-line){font-size:20px;letter-spacing:.13em}
.brand-link :deep(.brand-meaning){font-size:8px;max-width:150px;opacity:.72}
.brand-link :deep(.brand-caption),.brand-link :deep(.studio-line),.brand-link :deep(.brand-version){display:none}
.nav-links{display:flex;align-items:center;gap:26px;margin-left:auto}
.nav-links a,.footer-links a{position:relative;color:#afbfcd;text-decoration:none;font-size:13px;font-weight:650;transition:.2s ease}
.nav-links a:after{content:'';position:absolute;left:0;right:100%;bottom:-8px;height:1px;background:var(--orange);transition:.2s ease}
.nav-links a:hover{color:#f0f5f9}.nav-links a:hover:after{right:0}
.nav-actions{display:flex;align-items:center;gap:5px}.nav-login{color:#b9c7d2!important}.nav-primary{color:#f5a55f!important;border-color:rgba(243,149,63,.75)!important;margin-left:4px}

/* Hero */
.hero-section{position:relative;padding:88px 0 38px;isolation:isolate}
.hero-glow{position:absolute;border-radius:50%;filter:blur(4px);pointer-events:none;z-index:-1}.hero-glow-one{width:420px;height:420px;right:-170px;top:-100px;background:radial-gradient(circle,rgba(49,119,208,.14),transparent 68%)}.hero-glow-two{width:260px;height:260px;left:-130px;top:180px;background:radial-gradient(circle,rgba(243,149,63,.07),transparent 70%)}
.hero-grid{display:grid;grid-template-columns:1fr .95fr;gap:76px;align-items:center;min-height:570px}
.hero-copy{max-width:650px}.eyebrow,.section-kicker{display:inline-flex;align-items:center;gap:9px;font-size:10px;font-weight:900;letter-spacing:.18em;text-transform:uppercase;color:#f3a25a}.eyebrow-dot{width:7px;height:7px;border-radius:50%;background:#f39a48;box-shadow:0 0 0 5px rgba(243,154,72,.09)}
.hero-copy h1{max-width:650px;font-size:clamp(46px,5.1vw,66px);line-height:1.035;letter-spacing:-.052em;margin:20px 0 22px;color:#f5f8fb;font-weight:720}.hero-copy h1 span{display:block;margin-top:6px;color:#73aaf0;font-weight:620}
.hero-lead{font-size:17px;line-height:1.72;color:#a9bac8;max-width:610px;margin:0}
.hero-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:30px}.hero-main-btn{box-shadow:0 12px 34px rgba(32,101,188,.2)}.btn-outline{color:#d7e1ea!important;border-color:#476079!important;background:rgba(255,255,255,.015)!important}.btn-text{color:#9eb1c1!important}
.hero-points{display:flex;flex-wrap:wrap;gap:9px;margin-top:22px}.hero-points span{display:inline-flex;align-items:center;gap:6px;padding:7px 10px;border-radius:999px;background:rgba(255,255,255,.025);border:1px solid rgba(117,151,183,.13);font-size:11px;color:#acbdca}.hero-points .q-icon{font-size:14px;color:#f2a15a}

/* Product preview */
.visual-stage{position:relative;padding:40px 18px 36px 10px}
.customer-preview{position:relative;z-index:2;border:1px solid rgba(101,139,175,.27);border-radius:25px;overflow:hidden;background:linear-gradient(180deg,#0b2035,#0f2a47);box-shadow:0 34px 90px rgba(0,0,0,.32),0 0 0 1px rgba(255,255,255,.018) inset}
.preview-bar{display:flex;align-items:center;gap:7px;background:rgba(5,16,28,.92);padding:14px 17px;border-bottom:1px solid rgba(105,141,174,.16)}.preview-bar span{width:8px;height:8px;border-radius:50%;background:#39556f}.preview-bar span:nth-child(1){background:#fb6e71}.preview-bar span:nth-child(2){background:#f8b24d}.preview-bar span:nth-child(3){background:#4bc77d}.preview-bar b{margin-left:8px;font-size:11px;color:#d8e3ec}.preview-bar small{margin-left:auto;font-size:8px;color:#638099;letter-spacing:.16em}
.preview-body{padding:27px}.preview-label{font-size:8px;letter-spacing:.18em;color:#63819c;font-weight:800;margin-bottom:14px}.preview-status{display:flex;align-items:end;justify-content:space-between;margin-bottom:17px}.preview-status small,.preview-note small{display:block;font-size:8px;color:#7890a6;letter-spacing:.12em}.preview-status strong{display:block;font-size:27px;margin-top:4px;letter-spacing:-.03em;font-weight:750}.progress-badge{background:#f29b49!important;color:#091525!important;font-weight:900;padding:5px 8px;border-radius:7px}
.preview-steps{display:grid;grid-template-columns:repeat(5,1fr);gap:7px;margin-top:23px}.preview-steps>div{display:flex;flex-direction:column;gap:7px;align-items:center;text-align:center;padding:11px 4px;border-radius:12px;color:#70889e;background:rgba(255,255,255,.022);border:1px solid rgba(109,144,176,.11);font-size:8.5px}.preview-steps .q-icon{font-size:14px}.preview-steps .done{color:#7dd5a6}.preview-steps .active{color:#f1a25c;border-color:rgba(242,139,48,.28);background:rgba(242,139,48,.055)}
.preview-note{display:flex;align-items:center;gap:11px;margin-top:17px;padding:13px;border-radius:14px;background:rgba(38,106,190,.085);border:1px solid rgba(88,132,178,.09);color:#d9e4ed}.note-icon{display:grid;place-items:center;width:34px;height:34px;border-radius:10px;background:rgba(242,139,48,.08);color:#f3a056;font-size:18px}.preview-note b{display:block;font-size:11px;margin-top:3px}.note-arrow{margin-left:auto;color:#66859f}
.float-card{position:absolute;z-index:3;display:flex;align-items:center;gap:10px;min-width:205px;padding:11px 13px;border:1px solid rgba(112,150,185,.22);border-radius:14px;background:rgba(8,24,40,.92);box-shadow:0 18px 44px rgba(0,0,0,.28);backdrop-filter:blur(14px)}.float-card-top{right:-8px;top:4px}.float-card-bottom{left:-14px;bottom:0}.float-card small{display:block;font-size:7px;letter-spacing:.15em;color:#6f8ba4}.float-card b{display:block;font-size:10px;color:#dce6ee;margin-top:2px;white-space:nowrap}.float-icon{display:grid;place-items:center;width:30px;height:30px;border-radius:9px;background:rgba(243,149,63,.095);color:#f3a057}.float-icon.blue{background:rgba(71,133,211,.11);color:#78b1f4}.float-check{margin-left:auto;color:#62c990;font-size:16px}

.hero-trust{display:grid;grid-template-columns:auto 1fr auto 1fr auto 1fr auto;align-items:center;gap:15px;margin-top:24px;padding:18px 20px;border-top:1px solid rgba(111,146,178,.13);border-bottom:1px solid rgba(111,146,178,.13);color:#8fa5b8}.hero-trust>div{display:flex;align-items:center;gap:8px;font-size:10.5px;white-space:nowrap}.hero-trust .q-icon{font-size:17px;color:#5f8fbe}.hero-trust b{color:#f2a15b}.trust-line{height:1px;background:linear-gradient(90deg,rgba(102,140,175,.08),rgba(102,140,175,.24),rgba(102,140,175,.08))}

/* Sections */
.landing-section{padding:88px 0}.surface-section{background:linear-gradient(180deg,rgba(11,29,48,.62),rgba(9,25,42,.58));border-top:1px solid rgba(98,132,164,.07);border-bottom:1px solid rgba(98,132,164,.07)}
.section-heading{max-width:860px}.split-heading{display:grid;grid-template-columns:1.05fr .95fr;gap:64px;align-items:end;max-width:none}.section-heading h2,.price-explain h2,.subscription-copy h2,.workflow-intro h2,.cta-section h2{font-size:clamp(31px,3.55vw,46px);line-height:1.08;letter-spacing:-.042em;margin:12px 0;color:#f3f7fb;font-weight:720}.section-heading p,.subscription-copy p,.workflow-intro p,.cta-section p,.price-explain>div>p{font-size:15px;line-height:1.72;color:#9eafbd;margin-bottom:0}
.solution-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}.solution-card{position:relative;min-height:250px;border:1px solid rgba(93,126,157,.18);border-radius:19px;background:linear-gradient(180deg,rgba(15,38,63,.62),rgba(9,27,45,.78));padding:22px;transition:.2s ease;overflow:hidden}.solution-card:after{content:'';position:absolute;left:0;right:0;bottom:0;height:2px;background:linear-gradient(90deg,transparent,rgba(243,149,63,.45),transparent);opacity:0;transition:.2s ease}.solution-card:hover{transform:translateY(-4px);border-color:rgba(242,139,48,.27);background:linear-gradient(180deg,rgba(17,43,70,.72),rgba(10,30,50,.84))}.solution-card:hover:after{opacity:1}.solution-icon{width:44px;height:44px;border-radius:13px;display:grid;place-items:center;color:#f3a15a;background:rgba(242,139,48,.075);border:1px solid rgba(242,139,48,.08);font-size:22px}.card-index{position:absolute;right:18px;top:20px;font-size:8px;letter-spacing:.2em;color:#45637d}.solution-card h3{font-size:17px;margin:42px 0 9px;color:#eaf0f5}.solution-card p{color:#93a7b7;line-height:1.66;font-size:12.5px;margin:0}

/* Workflow */
.workflow-section{background:linear-gradient(180deg,#071624,#081827)}.workflow-layout{display:grid;grid-template-columns:.76fr 1.24fr;gap:78px;align-items:start}.workflow-intro{position:sticky;top:110px}.workflow-intro p{max-width:430px}.text-action{color:#f2a45f!important;margin:15px 0 0 -12px}.workflow-list{border-top:1px solid rgba(105,141,174,.16)}.workflow-row{display:grid;grid-template-columns:52px 1fr 30px;gap:17px;align-items:center;min-height:125px;border-bottom:1px solid rgba(105,141,174,.16);transition:.2s ease}.workflow-row:hover{padding-left:8px;background:linear-gradient(90deg,rgba(243,149,63,.035),transparent 65%)}.workflow-number{font-size:11px;font-weight:900;letter-spacing:.12em;color:#f0a25d}.workflow-row h3{margin:0 0 6px;font-size:17px;color:#e8eef3}.workflow-row p{margin:0;max-width:600px;color:#8fa4b6;line-height:1.58;font-size:12.5px}.workflow-arrow{color:#466782;justify-self:end}

/* Pricing */
.plans-section{background:linear-gradient(180deg,#091a2b,#0a1d31)}.price-explain{display:grid;grid-template-columns:.9fr 1.1fr;gap:50px;align-items:end}.price-explain>div:first-child>p{max-width:520px}.price-columns{display:grid;grid-template-columns:1fr 1fr;gap:11px}.price-columns>div{padding:18px;border:1px solid rgba(94,128,160,.18);border-radius:16px;background:rgba(255,255,255,.018)}.price-icon{display:grid;place-items:center;width:36px;height:36px;border-radius:11px;background:rgba(243,149,63,.075);color:#f1a15b;font-size:20px}.price-columns b,.price-columns span{display:block}.price-columns b{margin:12px 0 6px;font-size:14px;color:#e4ebf1}.price-columns>div>span:last-child{font-size:11.5px;line-height:1.55;color:#91a6b7}

/* Subscription */
.subscription-grid{display:grid;grid-template-columns:.82fr 1.18fr;gap:70px;align-items:center}.subscription-copy p{max-width:500px}.subscription-cards{display:grid;grid-template-columns:1fr 1fr;gap:10px}.subscription-cards article{display:flex;gap:12px;padding:17px;border:1px solid rgba(92,126,158,.18);border-radius:16px;background:rgba(13,35,58,.52)}.subscription-icon{display:grid;place-items:center;width:38px;height:38px;flex:0 0 38px;border-radius:11px;background:rgba(51,114,193,.09);color:#73aaf0;font-size:20px}.subscription-cards b,.subscription-cards span{display:block}.subscription-cards b{font-size:13px;color:#e1e9ef}.subscription-cards span{color:#91a5b5;font-size:11px;line-height:1.55;margin-top:4px}

/* CTA / Footer */
.cta-section{padding:72px 0 86px;background:#071522}.cta-shell{position:relative;display:flex;justify-content:space-between;align-items:center;gap:54px;padding:42px;border:1px solid rgba(105,143,178,.18);border-radius:25px;background:linear-gradient(135deg,rgba(14,43,72,.88),rgba(10,29,49,.94));overflow:hidden}.cta-shell:after{content:'';position:absolute;width:260px;height:260px;border-radius:50%;right:-90px;top:-120px;background:radial-gradient(circle,rgba(66,135,220,.16),transparent 70%);pointer-events:none}.cta-copy{max-width:690px;position:relative;z-index:1}.cta-copy h2{margin-bottom:10px}.cta-actions{position:relative;z-index:1;display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end;max-width:360px}
.landing-footer{padding:34px 0;background:#05101c;border-top:1px solid rgba(93,127,159,.14)}.footer-inner{display:flex;justify-content:space-between;gap:30px;align-items:center}.footer-brand :deep(.viti-mark){width:38px;height:38px;flex-basis:38px}.footer-brand :deep(.product-line){font-size:18px}.footer-brand :deep(.brand-meaning){font-size:8px}.footer-brand :deep(.brand-caption),.footer-brand :deep(.studio-line),.footer-brand :deep(.brand-version){display:none}.footer-inner small{display:block;color:#5e768c;margin-top:4px;font-size:9px}.footer-inner p{color:#8297a9;font-size:11px;margin:7px 0 0}.footer-links{display:flex;gap:17px;align-items:center;flex-wrap:wrap}

@media(max-width:1050px){
  .nav-links{display:none}.hero-grid{grid-template-columns:1fr;gap:42px;min-height:auto}.hero-copy{max-width:760px}.hero-copy h1{max-width:720px}.visual-stage{max-width:720px;margin:0 auto;width:100%}.hero-trust{grid-template-columns:1fr 1fr;gap:14px}.trust-line{display:none}.split-heading,.price-explain,.subscription-grid,.workflow-layout{grid-template-columns:1fr}.split-heading,.workflow-layout{gap:30px}.solution-grid{grid-template-columns:repeat(2,1fr)}.workflow-intro{position:static}.price-explain{gap:24px}.subscription-grid{gap:34px}
}
@media(max-width:700px){
  .landing-container{width:min(100% - 24px,1180px)}.nav-inner{min-height:64px}.nav-actions .nav-login{display:none}.brand-link :deep(.brand-meaning){display:none}.hero-section{padding:58px 0 26px}.hero-grid{gap:30px}.hero-copy h1{font-size:clamp(39px,11.5vw,55px);margin-top:17px}.hero-copy h1 span{margin-top:5px}.hero-lead{font-size:15.5px}.hero-actions{margin-top:24px}.visual-stage{padding:34px 0 30px}.float-card{min-width:178px;padding:9px 10px}.float-card-top{right:-5px}.float-card-bottom{left:-5px}.float-card b{font-size:9px}.hero-trust{margin-top:12px;padding:15px 4px;grid-template-columns:1fr 1fr}.hero-trust>div{white-space:normal;font-size:9.5px}.landing-section{padding:68px 0}.solution-grid,.subscription-cards,.price-columns{grid-template-columns:1fr}.solution-card{min-height:210px}.solution-card h3{margin-top:30px}.section-heading h2,.price-explain h2,.subscription-copy h2,.workflow-intro h2,.cta-section h2{font-size:clamp(29px,9vw,40px)}.preview-body{padding:20px}.preview-status strong{font-size:23px}.preview-steps{grid-template-columns:repeat(3,1fr)}.cta-section{padding:54px 0}.cta-shell{padding:27px 22px;flex-direction:column;align-items:flex-start}.cta-actions{justify-content:flex-start;max-width:none;width:100%}.footer-inner{flex-direction:column;align-items:flex-start}
}
@media(max-width:480px){
  .hero-actions .q-btn,.cta-actions .q-btn{width:100%;flex:auto}.hero-points{display:grid;grid-template-columns:1fr 1fr}.hero-points span:last-child{grid-column:1/-1}.preview-body{padding:17px}.preview-steps{grid-template-columns:1fr 1fr}.float-card{display:none}.hero-trust{grid-template-columns:1fr}.workflow-row{grid-template-columns:42px 1fr}.workflow-arrow{display:none}.footer-links{align-items:flex-start}.customer-preview{border-radius:20px}
}
</style>
