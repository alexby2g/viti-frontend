<template>
  <q-page class="fitfamily-solution">
    <header class="topbar">
      <div class="shell topbar-inner">
        <router-link to="/viti" class="brand">VITI · FitFamily</router-link>
        <div class="actions">
          <q-btn flat no-caps color="dark" label="Volver a VITI" to="/viti" />
          <q-btn unelevated no-caps color="primary" label="Quiero esta solución" to="/solicitud/sin-plan?solucion=fitfamily" />
        </div>
      </div>
    </header>

    <main>
      <section class="hero">
        <div class="shell hero-grid">
          <div>
            <div class="eyebrow">VITI · SOLUCIÓN EN CONSTRUCCIÓN</div>
            <h1>FitFamily, listo para <span>personalizarse.</span></h1>
            <p class="lead">Una solución de VITI para negocios de alimentos que necesitan catálogo, productos, pedidos y una experiencia digital propia. Aquí definimos la base; la identidad y la operación final se adaptan al negocio.</p>
            <div class="hero-actions">
              <q-btn size="lg" unelevated no-caps color="primary" label="Quiero adaptar FitFamily" to="/solicitud/sin-plan?solucion=fitfamily" />
              <q-btn size="lg" flat no-caps color="dark" label="Ver módulos" href="#modulos" />
            </div>
          </div>
          <div class="preview-card">
            <div class="preview-brand"><span class="brand-dot"></span><strong>FitFamily</strong><small>Solución VITI</small></div>
            <div class="preview-screen">
              <div class="preview-header"><div class="logo-mark">FF</div><div><small>CATÁLOGO</small><b>Tu negocio, tu identidad</b></div></div>
              <div class="preview-products"><div v-for="item in previewProducts" :key="item" class="product"><div class="product-image"></div><strong>{{ item }}</strong><span>Disponible</span></div></div>
            </div>
            <div class="preview-footer"><span>Identidad configurable</span><span>Módulos activables</span><span>Multiempresa VITI</span></div>
          </div>
        </div>
      </section>

      <section id="modulos" class="section">
        <div class="shell">
          <div class="section-heading">
            <div class="eyebrow">BASE FUNCIONAL</div>
            <h2>La solución empieza aquí.</h2>
            <p>Estos son los bloques que podemos conservar, adaptar o ampliar cuando una empresa elija FitFamily.</p>
          </div>
          <div class="module-grid">
            <article v-for="module in modules" :key="module.title" class="module-card">
              <div class="module-icon"><q-icon :name="module.icon" size="24px" /></div>
              <div><h3>{{ module.title }}</h3><p>{{ module.text }}</p></div>
              <q-badge rounded :label="module.status" />
            </article>
          </div>
        </div>
      </section>

      <section class="section soft">
        <div class="shell personalization-grid">
          <div>
            <div class="eyebrow">PERSONALIZACIÓN</div>
            <h2>El cliente no recibe “la misma app”.</h2>
            <p>VITI parte de una solución base y después adapta identidad, módulos, catálogo, reglas y experiencia de acuerdo con la necesidad del negocio.</p>
          </div>
          <div class="steps">
            <div v-for="step in steps" :key="step.n" class="step"><span>{{ step.n }}</span><div><strong>{{ step.title }}</strong><p>{{ step.text }}</p></div></div>
          </div>
        </div>
      </section>

      <section class="section cta">
        <div class="shell cta-card">
          <div><div class="eyebrow">SIGUIENTE ETAPA</div><h2>Primero entendemos el negocio. Después creamos su instancia.</h2><p>La solicitud no crea todavía una empresa, un propietario ni usuarios FitFamily. Solo inicia el proceso para definir la solución.</p></div>
          <q-btn size="lg" unelevated no-caps color="primary" label="Solicitar personalización" to="/solicitud/sin-plan?solucion=fitfamily" />
        </div>
      </section>
    </main>
  </q-page>
</template>

<script setup>
const previewProducts = ['Bowl Fit', 'Smoothie', 'Snack saludable']
const modules = [
  { title: 'Catálogo', text: 'Presentación pública de productos y categorías.', icon: 'storefront', status: 'Base' },
  { title: 'Productos', text: 'Precios, stock, disponibilidad y visibilidad.', icon: 'inventory_2', status: 'Base' },
  { title: 'Pedidos', text: 'Flujo preparado para registrar y seguir pedidos.', icon: 'shopping_bag', status: 'Preparado' },
  { title: 'Clientes', text: 'Relación del negocio con sus compradores.', icon: 'groups', status: 'Adaptable' },
  { title: 'Marca', text: 'Nombre, logo, colores y experiencia visual.', icon: 'palette', status: 'Personalizable' },
  { title: 'Reglas', text: 'Capacidades y módulos activados según el negocio.', icon: 'tune', status: 'Personalizable' },
]
const steps = [
  { n: '01', title: 'Seleccionar solución', text: 'El cliente parte de FitFamily como base.' },
  { n: '02', title: 'Definir operación', text: 'VITI recoge productos, procesos y necesidades.' },
  { n: '03', title: 'Personalizar', text: 'Se ajustan identidad, módulos y experiencia.' },
  { n: '04', title: 'Crear instancia', text: 'Recién aquí se asocia la solución con una empresa y sus usuarios.' },
]
</script>

<style scoped>
.fitfamily-solution{min-height:100vh;background:#f7faf3;color:#3f5d45}.shell{width:min(1180px,calc(100% - 40px));margin:0 auto}.topbar{background:rgba(255,255,255,.92);border-bottom:1px solid #dce8d7;position:sticky;top:0;z-index:20;backdrop-filter:blur(14px)}.topbar-inner{min-height:74px;display:flex;align-items:center;justify-content:space-between;gap:16px}.brand{font-weight:900;letter-spacing:-.02em;color:#416348;text-decoration:none}.actions{display:flex;gap:8px}.hero{padding:86px 0 100px;background:radial-gradient(circle at 78% 25%,rgba(184,216,168,.55),transparent 32%),linear-gradient(180deg,#f7faf3,#edf4e7)}.hero-grid{display:grid;grid-template-columns:1.05fr .95fr;gap:70px;align-items:center}.eyebrow{font-size:11px;font-weight:900;letter-spacing:.16em;text-transform:uppercase;color:#69866a}.hero h1{font-size:clamp(46px,6vw,78px);line-height:.98;letter-spacing:-.06em;margin:20px 0;color:#3b5a41}.hero h1 span{color:#78a36d}.lead{font-size:18px;line-height:1.8;color:#687d69;max-width:650px}.hero-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:28px}.preview-card{background:#fff;border:1px solid #d7e3d2;border-radius:28px;box-shadow:0 30px 80px rgba(63,93,69,.15);overflow:hidden;transform:rotate(.6deg)}.preview-brand{display:flex;align-items:center;gap:9px;padding:18px 20px;border-bottom:1px solid #e6eee2}.brand-dot{width:11px;height:11px;border-radius:50%;background:#9fc58e}.preview-brand strong{font-size:16px}.preview-brand small{margin-left:auto;color:#90a394}.preview-screen{padding:20px;background:#f7faf3}.preview-header{display:flex;align-items:center;gap:12px}.logo-mark{width:48px;height:48px;border-radius:14px;background:#b8d8a8;color:#3f5d45;display:grid;place-items:center;font-weight:900}.preview-header small{display:block;font-size:9px;letter-spacing:.1em;color:#819481}.preview-header b{display:block;margin-top:3px;font-size:18px}.preview-products{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:18px}.product{padding:10px;background:#fff;border:1px solid #e1eadc;border-radius:15px}.product-image{aspect-ratio:1;background:linear-gradient(135deg,#d7e8c9,#f4e8cf);border-radius:11px}.product strong,.product span{display:block}.product strong{margin-top:9px;font-size:12px}.product span{margin-top:3px;font-size:9px;color:#76916f}.preview-footer{display:flex;gap:8px;flex-wrap:wrap;padding:16px 18px;font-size:10px;color:#71856f}.preview-footer span{padding:7px 9px;border-radius:999px;background:#eef6e9}.section{padding:92px 0}.soft{background:#edf5e8}.section-heading{max-width:760px;margin-bottom:30px}.section-heading h2,.personalization-grid h2,.cta-card h2{font-size:clamp(36px,4.6vw,58px);line-height:1;letter-spacing:-.05em;margin:15px 0;color:#3f5d45}.section-heading p,.personalization-grid p,.cta-card p{font-size:17px;line-height:1.8;color:#6f816f}.module-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}.module-card{padding:20px;background:#fff;border:1px solid #d9e6d3;border-radius:20px;display:grid;grid-template-columns:auto 1fr auto;gap:12px;align-items:start}.module-icon{width:42px;height:42px;border-radius:12px;background:#e5f1df;display:grid;place-items:center;color:#6d9566}.module-card h3{margin:2px 0 7px;font-size:17px}.module-card p{margin:0;color:#758775;font-size:13px;line-height:1.6}.module-card :deep(.q-badge){background:#eff7eb!important;color:#668062!important}.personalization-grid{display:grid;grid-template-columns:1fr 1fr;gap:70px;align-items:start}.steps{display:grid;gap:12px}.step{display:grid;grid-template-columns:50px 1fr;gap:14px;padding:18px;background:#fff;border:1px solid #d9e6d3;border-radius:18px}.step>span{font-weight:900;color:#7ba071}.step strong{display:block}.step p{margin:5px 0 0!important;font-size:13px!important;line-height:1.6!important}.cta{padding-top:30px}.cta-card{display:flex;align-items:center;justify-content:space-between;gap:30px;padding:34px;border-radius:26px;background:#dcebcf;border:1px solid #c9ddbd}.cta-card h2{font-size:clamp(32px,4vw,48px);margin-bottom:10px}@media(max-width:850px){.hero-grid,.personalization-grid{grid-template-columns:1fr}.module-grid{grid-template-columns:1fr 1fr}.hero{padding-top:54px}.cta-card{align-items:flex-start;flex-direction:column}}@media(max-width:560px){.shell{width:min(100% - 24px,1180px)}.module-grid,.preview-products{grid-template-columns:1fr}.actions .q-btn:first-child{display:none}.hero h1{font-size:48px}}
</style>