<script setup>
import { computed, onMounted, ref } from 'vue'
import { api } from '../boot/axios'
import AppBrand from '../components/AppBrand.vue'

const loadingPlans = ref(false)
const plans = ref([])
const billing = ref('mensual')

const fallbackPlans = [
  { codigo:'basico-1800', nombre:'VITI Inicial', descripcion:'Para comenzar a digitalizar clientes, equipos, agenda y servicios.', precio_proyecto:1800, precio_mensual:89, precio_anual:890, dias_prueba:14, max_usuarios:3, modulos:['Clientes','Equipos','Agenda','Órdenes','Técnicos','Historial','Buzón'] },
  { codigo:'profesional-1950', nombre:'VITI Profesional', descripcion:'Para negocios que necesitan además pagos, garantías y mayor control operativo.', precio_proyecto:2400, precio_mensual:129, precio_anual:1290, dias_prueba:14, max_usuarios:6, modulos:['Todo lo de Inicial','Pagos','Garantías','Comprobantes','Historial avanzado'] },
  { codigo:'empresa-2500', nombre:'VITI Empresa', descripcion:'Para operaciones con mayor volumen y necesidades de inventario y crecimiento.', precio_proyecto:3200, precio_mensual:189, precio_anual:1890, dias_prueba:14, max_usuarios:15, modulos:['Todo lo de Profesional','Inventario','Hasta 3 aplicaciones','Más usuarios','Mayor capacidad'] },
]

const currentPlans = computed(() => plans.value.length ? plans.value : fallbackPlans)
const price = plan => billing.value === 'anual' ? plan.precio_anual : plan.precio_mensual
const annualSaving = plan => Math.max(0, Number(plan.precio_mensual || 0) * 12 - Number(plan.precio_anual || 0))
const money = value => value == null ? 'Cotizar' : `${Number(value).toFixed(0)} Bs`

async function loadPlans () {
  loadingPlans.value = true
  try {
    const response = await api.get('/publico/planes')
    plans.value = response.data?.data || []
  } catch {
    plans.value = []
  } finally {
    loadingPlans.value = false
  }
}

onMounted(loadPlans)
</script>

<template>
  <div class="presentation-page">
    <header class="public-nav">
      <div class="page-container nav-inner">
        <AppBrand />
        <nav class="nav-links">
          <a href="#que-es">Qué es VITI</a>
          <a href="#servicios">Servicios</a>
          <a href="#como-funciona">Cómo funciona</a>
          <a href="#planes">Planes</a>
        </nav>
        <div class="nav-actions">
          <q-btn flat no-caps label="Ver planes" href="#planes" />
          <q-btn unelevated color="primary" no-caps icon="login" label="Ingresar" to="/login" />
        </div>
      </div>
    </header>

    <main>
      <section class="hero">
        <div class="page-container hero-grid">
          <div class="hero-copy">
            <div class="eyebrow">PLATAFORMA DE GESTIÓN DE SERVICIOS</div>
            <h1>Conoce VITI antes de entrar.</h1>
            <p class="hero-text">VITI es una plataforma que ayuda a micro y pequeñas empresas de servicios a organizar clientes, equipos, citas, técnicos, órdenes, pagos, garantías e historial desde un solo lugar.</p>
            <div class="hero-actions">
              <q-btn unelevated color="primary" no-caps size="lg" icon="rocket_launch" label="Conocer VITI" href="#que-es" />
              <q-btn outline color="primary" no-caps size="lg" icon="payments" label="Ver planes y costos" href="#planes" />
            </div>
            <div class="hero-points">
              <span><q-icon name="check_circle" /> Información centralizada</span>
              <span><q-icon name="check_circle" /> Acceso por empresa</span>
              <span><q-icon name="check_circle" /> Crece según tu necesidad</span>
            </div>
          </div>

          <div class="product-shot" aria-label="Vista conceptual de VITI">
            <div class="browser-bar"><span></span><span></span><span></span><b>viti · gestión de servicios</b></div>
            <div class="product-body">
              <aside>
                <div class="side-brand"><q-icon name="hub" /> VITI</div>
                <div class="side-active"><q-icon name="dashboard" /> Inicio</div>
                <div><q-icon name="groups" /> Clientes</div>
                <div><q-icon name="event" /> Agenda</div>
                <div><q-icon name="build" /> Servicios</div>
                <div><q-icon name="payments" /> Pagos</div>
                <div><q-icon name="history" /> Historial</div>
              </aside>
              <section class="dashboard-preview">
                <div class="preview-head"><div><small>Panel de control</small><strong>Resumen de hoy</strong></div><q-badge color="positive" label="Operativo" /></div>
                <div class="metric-grid">
                  <div><q-icon name="groups" /><strong>128</strong><small>Clientes</small></div>
                  <div><q-icon name="event_available" /><strong>12</strong><small>Citas</small></div>
                  <div><q-icon name="engineering" /><strong>8</strong><small>Servicios</small></div>
                </div>
                <div class="preview-flow"><div class="flow-title">Seguimiento de servicio</div><div class="flow-row"><span class="done">Cliente</span><i>→</i><span class="done">Equipo</span><i>→</i><span class="active">Servicio</span><i>→</i><span>Historial</span></div></div>
                <div class="preview-table"><div><span>Servicio técnico</span><b>En proceso</b></div><div><span>Garantía</span><b>Vigente</b></div><div><span>Pago</span><b>Pendiente</b></div></div>
              </section>
            </div>
          </div>
        </div>
      </section>

      <section id="que-es" class="section white-section">
        <div class="page-container">
          <div class="section-heading">
            <div class="eyebrow">¿QUÉ ES VITI?</div>
            <h2>Una plataforma para que el negocio deje de trabajar con información dispersa.</h2>
            <p>VITI reúne en un mismo espacio la información que normalmente termina repartida entre cuadernos, hojas de cálculo, llamadas y conversaciones.</p>
          </div>
          <div class="value-grid">
            <article><q-icon name="hub" /><h3>Todo conectado</h3><p>Cliente, equipo, cita, técnico, servicio, pago y garantía pueden formar parte del mismo historial.</p></article>
            <article><q-icon name="visibility" /><h3>Más control</h3><p>El negocio puede consultar qué ocurrió, qué está pendiente y cuál es el siguiente paso.</p></article>
            <article><q-icon name="business" /><h3>Por empresa</h3><p>Cada negocio trabaja con su propia información, usuarios y configuración dentro de la plataforma.</p></article>
            <article><q-icon name="trending_up" /><h3>Preparada para crecer</h3><p>Los módulos y planes permiten comenzar con lo necesario y ampliar la solución cuando el negocio lo requiera.</p></article>
          </div>
        </div>
      </section>

      <section id="servicios" class="section tinted-section">
        <div class="page-container">
          <div class="section-heading center-heading">
            <div class="eyebrow">SERVICIOS QUE OFRECE VITI</div>
            <h2>La plataforma se adapta al trabajo real del negocio.</h2>
            <p>La disponibilidad de módulos depende del plan y de la configuración contratada.</p>
          </div>
          <div class="service-grid">
            <article><div class="service-icon"><q-icon name="groups" /></div><h3>Clientes</h3><p>Registro y consulta de clientes para mantener una base organizada.</p></article>
            <article><div class="service-icon"><q-icon name="devices_other" /></div><h3>Equipos</h3><p>Historial de equipos, características, diagnósticos y servicios realizados.</p></article>
            <article><div class="service-icon"><q-icon name="event_available" /></div><h3>Agenda y citas</h3><p>Organización de visitas, fechas, técnicos y seguimiento.</p></article>
            <article><div class="service-icon"><q-icon name="engineering" /></div><h3>Servicios técnicos</h3><p>Órdenes, estados, diagnóstico, propuesta, ejecución y cierre.</p></article>
            <article><div class="service-icon"><q-icon name="payments" /></div><h3>Pagos</h3><p>Anticipos, abonos, saldos, comprobantes y control de revisión.</p></article>
            <article><div class="service-icon"><q-icon name="verified" /></div><h3>Garantías</h3><p>Seguimiento de garantías y reingresos relacionados con servicios anteriores.</p></article>
            <article><div class="service-icon"><q-icon name="inventory_2" /></div><h3>Inventario</h3><p>Control de recursos y materiales cuando el plan contratado lo incluye.</p></article>
            <article><div class="service-icon"><q-icon name="notifications" /></div><h3>Notificaciones y buzón</h3><p>Eventos del sistema separados de las conversaciones reales entre usuarios.</p></article>
          </div>
        </div>
      </section>

      <section id="como-funciona" class="section white-section">
        <div class="page-container">
          <div class="section-heading center-heading">
            <div class="eyebrow">CÓMO SE INGRESA</div>
            <h2>Primero conoces VITI. Después solicitas o recibes acceso.</h2>
          </div>
          <div class="process-grid">
            <article><span>01</span><q-icon name="visibility" /><h3>Conoce la plataforma</h3><p>El visitante llega a esta presentación y entiende qué es VITI, qué ofrece y qué puede contratar.</p></article>
            <article><span>02</span><q-icon name="payments" /><h3>Elige una solución</h3><p>Consulta planes, costos, modalidad y módulos incluidos según las necesidades del negocio.</p></article>
            <article><span>03</span><q-icon name="person_add" /><h3>Solicita acceso</h3><p>La empresa registra sus datos y explica qué necesita. AGR Studio revisa la solicitud.</p></article>
            <article><span>04</span><q-icon name="login" /><h3>Entra a VITI</h3><p>Una vez habilitado, el responsable recibe su acceso y comienza a trabajar desde su espacio.</p></article>
          </div>
        </div>
      </section>

      <section id="planes" class="section plans-section">
        <div class="page-container">
          <div class="section-heading center-heading">
            <div class="eyebrow">PLANES Y COSTOS</div>
            <h2>Una implementación y una suscripción según la solución.</h2>
            <p>La implementación corresponde al desarrollo, configuración y puesta en marcha. La suscripción mantiene la plataforma según el plan contratado.</p>
            <q-btn-toggle v-model="billing" class="billing-toggle q-mt-lg" rounded unelevated no-caps toggle-color="primary" :options="[{label:'Mensual',value:'mensual'},{label:'Anual',value:'anual'}]" />
          </div>

          <div class="plans-grid">
            <article v-for="(plan,index) in currentPlans" :key="plan.codigo" class="plan-card" :class="{'featured':index===1}">
              <div v-if="index===1" class="recommended">MÁS RECOMENDADO</div>
              <div class="plan-title-row"><h3>{{ plan.nombre }}</h3><q-icon name="workspace_premium" /></div>
              <p>{{ plan.descripcion }}</p>
              <div class="implementation"><small>IMPLEMENTACIÓN</small><strong>{{ money(plan.precio_proyecto) }}</strong><span>Pago de desarrollo y puesta en marcha.</span></div>
              <div class="subscription"><small>SUSCRIPCIÓN {{ billing.toUpperCase() }}</small><strong>{{ money(price(plan)) }} <em>/ {{ billing === 'mensual' ? 'mes' : 'año' }}</em></strong><span>{{ plan.dias_prueba || 0 }} días de prueba.</span></div>
              <div v-if="billing==='anual' && annualSaving(plan)" class="saving">Ahorro anual: {{ money(annualSaving(plan)) }}</div>
              <ul><li v-for="module in plan.modulos" :key="module"><q-icon name="check_circle" />{{ module }}</li></ul>
              <q-btn color="primary" unelevated no-caps label="Elegir este plan" :to="{path:'/acceso',query:{plan:plan.codigo,modalidad:billing}}" class="full-width" />
            </article>
          </div>

          <div class="plans-note"><q-icon name="info" /><span>Los costos mostrados son la referencia comercial vigente del catálogo de VITI. La contratación final puede ajustarse según alcance, configuración e integración requerida.</span><q-btn flat no-caps color="primary" label="Ver detalle de planes" to="/viti/planes" /></div>
        </div>
      </section>

      <section class="final-cta">
        <div class="page-container final-card">
          <div><div class="eyebrow">LISTO PARA CONOCER VITI</div><h2>De la presentación al sistema que tu negocio necesita.</h2><p>Si ya tienes acceso, ingresa. Si todavía no lo tienes, solicita una evaluación.</p></div>
          <div class="final-actions"><q-btn color="white" text-color="primary" unelevated no-caps size="lg" icon="login" label="Ingresar a VITI" to="/login" /><q-btn outline color="white" no-caps size="lg" icon="person_add" label="Solicitar acceso" to="/acceso" /></div>
        </div>
      </section>
    </main>

    <footer class="public-footer"><div class="page-container"><strong>VITI</strong> · Plataforma de gestión de servicios · AGR Studio</div></footer>
  </div>
</template>

<style scoped>
.presentation-page{min-height:100vh;background:#f5f9fc;color:#102a43}.page-container{width:min(1180px,calc(100% - 40px));margin:auto}.public-nav{position:sticky;top:0;z-index:50;background:rgba(255,255,255,.92);backdrop-filter:blur(18px);border-bottom:1px solid rgba(16,42,67,.08)}.nav-inner{min-height:76px;display:flex;align-items:center;gap:26px}.nav-links{display:flex;gap:24px;margin-left:auto}.nav-links a{color:#526d82;text-decoration:none;font-weight:700;font-size:14px}.nav-links a:hover{color:#0b7593}.nav-actions{display:flex;gap:8px}.hero{padding:96px 0 110px;background:radial-gradient(circle at 85% 20%,rgba(18,184,200,.18),transparent 30%),linear-gradient(135deg,#f9fcff,#eaf5fa)}.hero-grid{display:grid;grid-template-columns:1fr 1fr;gap:68px;align-items:center}.eyebrow{font-size:12px;letter-spacing:.15em;font-weight:900;color:#0b7593}.hero h1{font-size:clamp(48px,6vw,78px);line-height:.98;letter-spacing:-.055em;margin:16px 0 24px;max-width:680px}.hero-text{font-size:20px;line-height:1.65;color:#536d81;max-width:680px}.hero-actions{display:flex;gap:12px;flex-wrap:wrap;margin-top:30px}.hero-points{display:flex;gap:16px;flex-wrap:wrap;margin-top:30px;color:#587184;font-size:13px}.hero-points span{display:flex;gap:6px;align-items:center}.hero-points q-icon{color:#15865b}.product-shot{background:#fff;border:1px solid rgba(11,95,122,.12);border-radius:26px;overflow:hidden;box-shadow:0 30px 90px rgba(17,58,84,.18);transform:rotate(1deg)}.browser-bar{height:48px;background:#edf3f6;display:flex;align-items:center;gap:7px;padding:0 16px;color:#718897;font-size:11px}.browser-bar span{width:9px;height:9px;border-radius:50%;background:#b8c7cf}.browser-bar b{margin:auto;font-weight:600}.product-body{display:grid;grid-template-columns:145px 1fr;min-height:380px}.product-body aside{background:#0a2537;color:#b9cbd5;padding:18px 12px}.product-body aside>div{display:flex;gap:9px;align-items:center;padding:11px 10px;border-radius:10px;font-size:12px}.side-brand{font-size:19px!important;color:#fff;font-weight:900;margin-bottom:15px}.side-brand q-icon{color:#12b8c8}.side-active{background:rgba(18,184,200,.17);color:#fff}.dashboard-preview{padding:25px}.preview-head{display:flex;justify-content:space-between;align-items:center}.preview-head small,.preview-head strong{display:block}.preview-head small{font-size:10px;color:#78909c}.preview-head strong{font-size:20px;margin-top:4px}.metric-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:9px;margin-top:18px}.metric-grid>div{border:1px solid #e1eaf0;border-radius:14px;padding:13px}.metric-grid q-icon{color:#0b7593}.metric-grid strong,.metric-grid small{display:block}.metric-grid strong{font-size:23px;margin-top:7px}.metric-grid small{color:#78909c;font-size:10px}.preview-flow{border:1px solid #e1eaf0;border-radius:15px;padding:16px;margin-top:14px}.flow-title{font-weight:800;font-size:12px}.flow-row{display:flex;align-items:center;gap:7px;margin-top:13px;flex-wrap:wrap;font-size:10px}.flow-row span{padding:6px 8px;background:#edf3f6;border-radius:999px;color:#657d8c}.flow-row .done{background:#e4f6ec;color:#18764e}.flow-row .active{background:#dff5f8;color:#0b7593}.preview-table{margin-top:14px}.preview-table>div{display:flex;justify-content:space-between;border-bottom:1px solid #edf1f4;padding:10px 0;font-size:11px}.preview-table b{color:#0b7593}.section{padding:100px 0}.white-section{background:#fff}.tinted-section{background:#edf5f9}.section-heading{max-width:820px}.center-heading{margin:auto;text-align:center}.section-heading h2{font-size:clamp(34px,4.5vw,54px);line-height:1.06;letter-spacing:-.04em;margin:14px 0 20px}.section-heading p{font-size:17px;line-height:1.7;color:#60788a}.value-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:18px;margin-top:45px}.value-grid article{border:1px solid rgba(16,42,67,.09);border-radius:20px;padding:25px;background:#fff}.value-grid q-icon{font-size:30px;color:#0b7593}.value-grid h3,.service-grid h3,.process-grid h3{font-size:19px;margin:17px 0 9px}.value-grid p,.service-grid p,.process-grid p{color:#60788a;line-height:1.65;margin:0}.service-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:17px;margin-top:45px}.service-grid article{background:#fff;border:1px solid rgba(16,42,67,.08);border-radius:18px;padding:23px}.service-icon{width:45px;height:45px;display:grid;place-items:center;border-radius:13px;background:#e4f6f8;color:#0b7593;font-size:22px}.process-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:18px;margin-top:45px}.process-grid article{position:relative;border:1px solid rgba(16,42,67,.09);border-radius:20px;padding:27px;background:#fff}.process-grid article>span{position:absolute;right:20px;top:20px;font-size:12px;font-weight:900;color:#0b7593}.process-grid q-icon{font-size:30px;color:#0b7593;margin-top:10px}.plans-section{background:#f4f8fb}.billing-toggle{background:#fff}.plans-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-top:45px}.plan-card{position:relative;background:#fff;border:1px solid rgba(16,42,67,.1);border-radius:24px;padding:28px;box-shadow:0 15px 45px rgba(17,58,84,.06)}.plan-card.featured{border:2px solid #0b7593;transform:translateY(-8px);box-shadow:0 25px 60px rgba(11,117,147,.14)}.recommended{position:absolute;top:-13px;left:24px;background:#0b7593;color:#fff;border-radius:999px;padding:6px 11px;font-size:10px;font-weight:900;letter-spacing:.05em}.plan-title-row{display:flex;justify-content:space-between;align-items:center}.plan-title-row h3{font-size:23px;margin:0}.plan-title-row q-icon{color:#0b7593}.plan-card>p{color:#60788a;line-height:1.55;min-height:72px}.implementation,.subscription{border-top:1px solid #e7eef2;padding-top:16px;margin-top:18px}.implementation small,.subscription small{display:block;font-size:10px;letter-spacing:.08em;font-weight:900;color:#78909c}.implementation strong,.subscription strong{display:block;font-size:29px;margin:5px 0}.implementation span,.subscription span{font-size:11px;color:#78909c}.subscription em{font-style:normal;font-size:12px;color:#78909c}.saving{display:inline-block;margin-top:12px;background:#e6f7ee;color:#177a53;border-radius:999px;padding:5px 9px;font-size:11px;font-weight:800}.plan-card ul{list-style:none;padding:0;margin:22px 0;min-height:155px}.plan-card li{display:flex;gap:8px;align-items:center;font-size:13px;padding:6px 0;color:#4f6879}.plan-card li q-icon{color:#15905d}.plans-note{margin-top:25px;background:#e8f5f8;border:1px solid #c9e7ed;border-radius:16px;padding:14px 16px;display:flex;gap:12px;align-items:center;color:#355767;font-size:13px}.plans-note q-icon{color:#0b7593}.plans-note q-btn{margin-left:auto}.final-cta{padding:30px 0 80px}.final-card{background:linear-gradient(135deg,#0a5571,#10a9b8);color:#fff;border-radius:28px;padding:45px;display:flex;justify-content:space-between;align-items:center;gap:35px}.final-card .eyebrow{color:#b9f6f8}.final-card h2{font-size:clamp(32px,4vw,50px);line-height:1.05;margin:12px 0}.final-card p{margin:0;color:#d8f1f4}.final-actions{display:flex;gap:10px;flex-wrap:wrap}.public-footer{padding:27px 0;border-top:1px solid rgba(16,42,67,.08);color:#657d8c;background:#fff}@media(max-width:1000px){.nav-links{display:none}.hero-grid{grid-template-columns:1fr}.value-grid,.service-grid,.process-grid{grid-template-columns:repeat(2,1fr)}.plans-grid{grid-template-columns:1fr}.plan-card.featured{transform:none}.final-card{flex-direction:column;align-items:flex-start}}@media(max-width:600px){.page-container{width:calc(100% - 24px)}.nav-actions .q-btn:first-child{display:none}.hero{padding:65px 0 75px}.hero h1{font-size:48px}.hero-text{font-size:17px}.product-body{grid-template-columns:1fr}.product-body aside{display:none}.metric-grid{grid-template-columns:1fr}.section{padding:70px 0}.value-grid,.service-grid,.process-grid{grid-template-columns:1fr}.plans-note{align-items:flex-start;flex-wrap:wrap}.plans-note q-btn{margin-left:0}.final-card{padding:30px}.final-actions .q-btn{width:100%}}
</style>
