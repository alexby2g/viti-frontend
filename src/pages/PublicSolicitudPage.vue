<script setup>
import AppBrand from '../components/AppBrand.vue'
</script>

<template>
  <q-page class="legacy-page flex flex-center">
    <q-card flat class="viti-card legacy-card text-center">
      <q-card-section>
        <AppBrand />
        <q-icon name="upgrade" size="64px" color="primary" class="q-mt-xl" />
        <div class="text-h5 text-weight-bold q-mt-md">Formulario actualizado</div>
        <p class="text-grey-7 q-mt-md">
          Este enlace pertenece a una versión anterior del proceso de solicitudes de VITI. Ahora existe un único formulario público para evitar datos duplicados y mantener una sola trazabilidad.
        </p>
        <q-banner rounded class="q-mt-lg text-left bg-blue-1 text-primary">
          <template #avatar><q-icon name="route" color="primary" /></template>
          El nuevo proceso reúne datos, plan, presupuesto, respuestas y confirmaciones en una sola solicitud antes de la evaluación de AGR Studio.
        </q-banner>
        <q-btn color="primary" unelevated no-caps icon="assignment" label="Ir a la solicitud oficial de VITI" to="/solicitud" class="full-width q-mt-lg" />
        <q-btn outline color="primary" no-caps icon="login" label="Ir al acceso de VITI" to="/acceso" class="full-width q-mt-sm" />
      </q-card-section>
    </q-card>
  </q-page>
</template>

<style scoped>
.legacy-page{min-height:100vh;background:var(--viti-bg);padding:20px}.legacy-card{width:min(600px,100%);padding:24px}.body--light .legacy-page{background:#f5f7fb}@media(max-width:600px){.legacy-page{padding:0}.legacy-card{width:100%;min-height:100vh;border-radius:0;padding:32px 16px}}
</style>
