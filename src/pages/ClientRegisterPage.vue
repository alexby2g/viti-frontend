<script setup>
import AppBrand from '../components/AppBrand.vue'
</script>

<template>
  <q-page class="retired-register-page flex flex-center">
    <q-card flat class="viti-card retired-register-card text-center">
      <q-card-section>
        <AppBrand />
        <q-icon name="verified_user" size="64px" color="primary" class="q-mt-xl" />
        <div class="text-h5 text-weight-bold q-mt-md">Registro mediante invitación</div>
        <p class="text-grey-7 q-mt-md">
          Para proteger los datos de cada empresa, las cuentas nuevas de VITI se crean únicamente desde un enlace personal enviado por AGR Studio.
        </p>
        <q-banner rounded class="invite-banner q-mt-lg text-left">
          <template #avatar><q-icon name="link" color="primary" /></template>
          Si recibiste una invitación, abre exactamente el enlace que te enviaron. Es personal, tiene fecha de vencimiento y solo puede utilizarse una vez.
        </q-banner>
        <q-btn color="primary" unelevated no-caps icon="login" label="Ya tengo una cuenta" to="/login?tipo=cliente" class="full-width q-mt-lg" />
        <q-btn flat color="primary" no-caps icon="info" label="Conocer VITI y cómo funciona" to="/viti" class="full-width q-mt-sm" />
      </q-card-section>
    </q-card>
  </q-page>
</template>

<style scoped>
.retired-register-page{min-height:100vh;background:var(--viti-bg);padding:20px}.retired-register-card{width:min(540px,100%);padding:24px}.invite-banner{background:color-mix(in srgb,var(--viti-card) 88%,var(--agr-purple) 12%);border:1px solid var(--viti-border);color:var(--viti-text)}.body--dark .retired-register-page{background:var(--viti-bg)}@media(max-width:600px){.retired-register-page{align-items:stretch;padding:0}.retired-register-card{width:100%;min-height:100vh;border-radius:0;padding:32px 14px}}
</style>