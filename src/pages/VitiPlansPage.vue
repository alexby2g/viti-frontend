<script setup>
import PublicPlansCatalog from '../components/public/PublicPlansCatalog.vue'
</script>

<template>
  <div class="plans-page">
    <header class="plans-nav">
      <div class="plans-container row items-center no-wrap">
        <q-btn flat round icon="arrow_back" to="/viti" aria-label="Volver a VITI"/>
        <div class="q-ml-sm">
          <div class="text-weight-bolder text-h6">VITI</div>
          <div class="text-caption text-grey-6">Planes y modalidad comercial</div>
        </div>
        <q-space/>
        <q-btn outline color="primary" no-caps icon="login" label="Ingresar" to="/login"/>
      </div>
    </header>

    <main class="plans-container q-py-xl">
      <section class="plans-hero text-center">
        <div class="kicker">Planes VITI</div>
        <h1>Elige cómo quieres organizar tu negocio.</h1>
        <p>VITI separa la implementación del sistema de la suscripción que mantiene la plataforma, alojamiento, base de datos, respaldos, actualizaciones generales y soporte según el plan contratado.</p>
      </section>

      <div class="q-mt-xl">
        <PublicPlansCatalog :embedded="false"/>
      </div>

      <section class="no-plan-card q-mt-xl">
        <div>
          <div class="kicker">¿Todavía no sabes qué plan necesitas?</div>
          <h2>No tienes que elegir un plan todavía.</h2>
          <p>Cuéntanos qué sistema necesitas, completa el cuestionario de VITI y revisaremos tu caso antes de definir el plan adecuado.</p>
        </div>
        <q-btn
          color="primary"
          no-caps
          unelevated
          icon="assignment"
          label="Quiero empezar con el cuestionario"
          to="/solicitud/sin-plan"
        />
      </section>
    </main>

    <footer class="plans-footer">
      <div class="plans-container row justify-between items-center q-gutter-md">
        <span><strong>VITI</strong> · Soluciones informáticas para tu negocio.</span>
        <q-btn flat no-caps color="primary" icon="arrow_back" label="Volver a la presentación" to="/viti"/>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.plans-page{min-height:100vh;background:#f6f9fc;color:#102a43}.plans-container{width:min(1180px,calc(100% - 40px));margin:0 auto}.plans-nav{position:sticky;top:0;z-index:20;background:rgba(246,249,252,.94);backdrop-filter:blur(16px);border-bottom:1px solid rgba(16,42,67,.08)}.plans-nav>.plans-container{min-height:74px}.plans-hero{max-width:850px;margin:0 auto}.kicker{font-size:12px;font-weight:900;letter-spacing:.14em;text-transform:uppercase;color:#0b7593}.plans-hero h1{font-size:clamp(40px,5vw,64px);line-height:1.05;letter-spacing:-.045em;margin:14px 0}.plans-hero p{font-size:18px;line-height:1.7;color:#5d7587}.no-plan-card{display:flex;align-items:center;justify-content:space-between;gap:24px;padding:28px;border:1px solid rgba(16,42,67,.1);border-radius:20px;background:#fff;box-shadow:0 10px 30px rgba(16,42,67,.06)}.no-plan-card h2{margin:8px 0 6px;font-size:clamp(26px,3vw,38px);letter-spacing:-.03em}.no-plan-card p{margin:0;max-width:720px;color:#5d7587;line-height:1.65}.plans-footer{border-top:1px solid rgba(16,42,67,.08);padding:24px 0;color:#61788a;background:#fff}@media(max-width:700px){.plans-container{width:min(100% - 24px,1180px)}.plans-hero{text-align:left}.no-plan-card{flex-direction:column;align-items:flex-start}.no-plan-card .q-btn{width:100%}}
</style>
