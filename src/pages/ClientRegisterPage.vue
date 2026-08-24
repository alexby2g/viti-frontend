<script setup>
import AppBrand from '../components/AppBrand.vue'
</script>

<template>
  <q-page class="legacy-page flex flex-center">
    <q-card flat class="viti-card legacy-card text-center">
      <q-card-section>
        <AppBrand />
        <q-icon name="route" size="64px" color="primary" class="q-mt-xl" />
        <div class="text-h5 text-weight-bold q-mt-md">Este acceso fue actualizado</div>
        <p class="text-grey-7 q-mt-md">
          VITI ya no crea cuentas desde este formulario. La solicitud ahora sigue un único proceso: conocer VITI, elegir un plan, completar los datos y enviar la propuesta para evaluación.
        </p>
        <q-banner rounded class="q-mt-lg text-left bg-blue-1 text-primary">
          <template #avatar><q-icon name="lock" color="primary" /></template>
          La cuenta y el código de acceso solo se habilitan después de la aprobación de AGR Studio.
        </q-banner>
        <q-btn color="primary" unelevated no-caps icon="assignment" label="Iniciar solicitud VITI" to="/solicitud" class="full-width q-mt-lg" />
        <q-btn outline color="primary" no-caps icon="login" label="Ya tengo una cuenta" to="/login?tipo=cliente" class="full-width q-mt-sm" />
      </q-card-section>
    </q-card>
  </q-page>
</template>

<style scoped>
.legacy-page{min-height:100vh;background:var(--viti-bg);padding:20px}.legacy-card{width:min(560px,100%);padding:24px}.body--light .legacy-page{background:#f5f7fb}@media(max-width:600px){.legacy-page{padding:0}.legacy-card{width:100%;min-height:100vh;border-radius:0;padding:32px 16px}}
</style>
