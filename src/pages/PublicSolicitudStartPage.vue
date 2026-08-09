<script setup>
import AppBrand from '../components/AppBrand.vue'
</script>

<template>
  <q-page class="retired-link-page flex flex-center">
    <q-card flat class="viti-card retired-link-card text-center">
      <q-card-section>
        <AppBrand />
        <q-icon name="security" size="64px" color="primary" class="q-mt-xl" />
        <div class="text-h5 text-weight-bold q-mt-md">Ahora el registro es personal y seguro</div>
        <p class="text-grey-7 q-mt-md">
          Este enlace general ya no crea solicitudes sin acceso. Pide a AGR Studio un nuevo enlace personal para crear tu usuario, contraseña y formulario de VITI.
        </p>
        <q-btn color="primary" unelevated no-caps icon="login" label="Ya tengo una cuenta" to="/login?tipo=cliente" class="full-width q-mt-md" />
      </q-card-section>
    </q-card>
  </q-page>
</template>

<style scoped>
.retired-link-page{min-height:100vh;background:var(--viti-bg);padding:20px}.retired-link-card{width:min(520px,100%);padding:24px}.body--dark .retired-link-page{background:#06162b}@media(max-width:600px){.retired-link-page{align-items:stretch;padding:0}.retired-link-card{width:100%;min-height:100vh;border-radius:0;padding:32px 14px}}
</style>
