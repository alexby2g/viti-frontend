<script setup>
import PublicPlansCatalog from '../components/public/PublicPlansCatalog.vue'
</script>

<template>
  <div class="plans-page">
    <header class="plans-nav"><div class="plans-container nav-row"><q-btn flat round icon="arrow_back" to="/viti" aria-label="Volver a VITI"/><div><b>VITI</b><span>Precios y planes</span></div><q-space/><q-btn flat no-caps label="Demo" to="/demo"/><q-btn flat no-caps label="Iniciar sesión" to="/login"/><q-btn outline color="orange" no-caps label="Crear cuenta" to="/registro"/></div></header>

    <main class="plans-container plans-main">
      <section class="plans-hero"><div class="kicker">PRECIOS VITI</div><h1>Que el cliente entienda qué paga, antes de empezar.</h1><p>Primero desarrollamos e implementamos tu sistema. Después, si el proyecto necesita servicios continuos, eliges una suscripción mensual o anual.</p></section>

      <section class="payment-model">
        <article><div class="model-icon"><q-icon name="construction"/></div><div><small>IMPLEMENTACIÓN</small><h2>El desarrollo inicial</h2><p>Incluye el análisis, desarrollo, configuración, pruebas y puesta en marcha definidos en la propuesta.</p></div></article>
        <article><div class="model-icon"><q-icon name="autorenew"/></div><div><small>SUSCRIPCIÓN</small><h2>Lo que continúa funcionando</h2><p>Cubre alojamiento, mantenimiento y soporte de acuerdo con el plan. No vuelve a cobrarte el desarrollo inicial.</p></div></article>
        <article><div class="model-icon"><q-icon name="add_circle_outline"/></div><div><small>CAMBIOS ADICIONALES</small><h2>Nuevas funciones, cuando las necesites</h2><p>Un módulo o ampliación fuera del alcance original se cotiza por separado antes de desarrollarlo.</p></div></article>
      </section>

      <PublicPlansCatalog class="q-mt-xl" />

      <section class="bottom-note"><div><small>¿NO SABES QUÉ PLAN ELEGIR?</small><h2>No pasa nada. Cuéntanos tu necesidad.</h2><p>VITI revisará tu necesidad y te mostrará la opción adecuada antes de iniciar cualquier trabajo o cobro.</p></div><q-btn color="primary" unelevated no-caps label="Solicitar evaluación" icon-right="arrow_forward" to="/solicitud"/></section>
    </main>

    <footer class="plans-footer"><div class="plans-container">VITI · Desarrollo e implementación de soluciones digitales · Tecnología desarrollada por AGR Studio.</div></footer>
  </div>
</template>

<style scoped>
.plans-page :deep(.q-btn:not(.q-btn--round)){border-radius:13px}.plans-page :deep(.q-btn.q-btn--outline:before){border-width:1.35px!important}.plans-page{min-height:100vh;background:radial-gradient(circle at 88% 0,rgba(36,107,199,.18),transparent 30rem),linear-gradient(180deg,#06111f,#081827 58%,#0a1b2f);color:#edf4fb}.plans-container{width:min(1180px,calc(100% - 40px));margin:0 auto}.plans-nav{position:sticky;top:0;z-index:20;background:rgba(6,17,31,.9);backdrop-filter:blur(16px);border-bottom:1px solid rgba(88,117,151,.2)}.nav-row{min-height:74px;display:flex;align-items:center;gap:12px}.nav-row>div{display:grid}.nav-row b{font-size:17px}.nav-row span{color:#879caf;font-size:10px}.plans-main{padding:70px 0 80px}.plans-hero{max-width:900px}.kicker,.payment-model small,.bottom-note small{font-size:11px;font-weight:900;letter-spacing:.14em;color:#f28b30}.plans-hero h1{font-size:clamp(42px,5.5vw,68px);line-height:1.02;letter-spacing:-.05em;margin:15px 0;color:#f7fbff}.plans-hero p{max-width:800px;font-size:18px;line-height:1.7;color:#afbfcd}.payment-model{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:42px}.payment-model article{display:flex;gap:15px;padding:22px;border-radius:18px;background:linear-gradient(180deg,#0d1e32,#10263f);border:1px solid rgba(83,116,147,.25)}.model-icon{width:44px;height:44px;flex:0 0 44px;border-radius:13px;background:rgba(242,139,48,.1);color:#f28b30;display:grid;place-items:center;font-size:23px}.payment-model h2{font-size:18px;margin:5px 0 7px}.payment-model p{color:#9fb0c0;font-size:12px;line-height:1.55;margin:0}.bottom-note{display:flex;align-items:center;justify-content:space-between;gap:36px;margin-top:44px;padding:28px;border-radius:20px;background:linear-gradient(135deg,#0e243d,#123151);border:1px solid rgba(242,139,48,.2)}.bottom-note h2{font-size:25px;margin:5px 0}.bottom-note p{max-width:760px;color:#9fb1c0;line-height:1.55;margin:0}.bottom-note .q-btn{min-height:46px;border-radius:12px}.plans-footer{border-top:1px solid rgba(88,117,151,.18);padding:26px 0;color:#7690a6;background:#06111f;font-size:11px}@media(max-width:850px){.payment-model{grid-template-columns:1fr}.bottom-note{align-items:flex-start;flex-direction:column}.plans-main{padding-top:48px}}@media(max-width:600px){.plans-container{width:min(100% - 24px,1180px)}.nav-row .q-btn:nth-last-child(2){display:none}.plans-hero h1{font-size:43px}}
</style>
