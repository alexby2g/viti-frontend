<script setup>
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { useAuthStore } from '../stores/auth'
import AppBrand from '../components/AppBrand.vue'

const auth = useAuthStore()
const router = useRouter()
const $q = useQuasar()
const formRef = ref(null)
const showPassword = ref(false)
const showSecret = ref(false)
const serverErrors = ref([])

const form = reactive({
  codigo_secreto: '', nombre: '', apellido: '', usuario: '', telefono: '', password: '', password_confirmation: '',
})

const passwordChecks = computed(() => ({
  length: form.password.length >= 12,
  lower: /[a-z]/.test(form.password),
  upper: /[A-Z]/.test(form.password),
  number: /\d/.test(form.password),
  matches: Boolean(form.password) && form.password === form.password_confirmation,
}))
const passwordIsValid = computed(() => Object.values(passwordChecks.value).every(Boolean))
const rules = {
  required: v => Boolean(String(v ?? '').trim()) || 'Este campo es obligatorio.',
  username: v => /^[A-Za-z0-9_-]{4,80}$/.test(String(v ?? '')) || 'Usa entre 4 y 80 caracteres: letras, números, guion o guion bajo.',
  phone: v => /^\d{7,15}$/.test(String(v ?? '').replace(/\D/g, '')) || 'Ingresa entre 7 y 15 dígitos.',
  password: () => passwordIsValid.value || 'La contraseña todavía no cumple todos los requisitos.',
  confirmation: v => v === form.password || 'Las contraseñas no coinciden.',
}
function extractErrors(error) {
  const bag = error?.response?.data?.errors
  if (bag && typeof bag === 'object') return [...new Set(Object.values(bag).flat().filter(Boolean))]
  return [error?.response?.data?.message || 'No se pudo completar la configuración.']
}
async function submit() {
  serverErrors.value = []
  const valid = await formRef.value?.validate()
  if (!valid) return
  try {
    await auth.setup({
      codigo_secreto: form.codigo_secreto,
      nombre: form.nombre.trim(), apellido: form.apellido.trim() || null,
      usuario: form.usuario.trim(), telefono: form.telefono.replace(/\D/g, ''),
      password: form.password, password_confirmation: form.password_confirmation,
    })
    $q.notify({ type: 'positive', message: 'VITI quedó configurado y bloqueado para nuevos administradores.' })
    await router.replace('/')
  } catch (error) { serverErrors.value = extractErrors(error) }
}
</script>

<template>
  <q-page class="auth-page flex flex-center">
    <div class="auth-shell">
      <div class="q-mb-xl"><AppBrand /></div>
      <div class="section-label">Primera configuración protegida</div>
      <h1 class="page-title">Crea el administrador único de VITI</h1>
      <p class="page-subtitle">La instalación solo puede completarse con el código secreto del propietario. Después de crear este usuario, esta pantalla queda bloqueada.</p>

      <q-banner v-if="serverErrors.length" rounded class="bg-red-1 text-negative q-mt-lg">
        <template #avatar><q-icon name="error_outline" /></template>
        <div class="text-weight-medium q-mb-xs">Revisa los siguientes datos:</div>
        <ul class="q-my-none q-pl-md"><li v-for="message in serverErrors" :key="message">{{ message }}</li></ul>
      </q-banner>

      <q-form ref="formRef" class="q-mt-lg" @submit.prevent="submit">
        <q-input v-model="form.codigo_secreto" outlined :type="showSecret ? 'text' : 'password'" label="Código secreto de instalación *" lazy-rules :rules="[rules.required]" class="q-mb-md">
          <template #prepend><q-icon name="key" /></template>
          <template #append><q-icon :name="showSecret ? 'visibility_off' : 'visibility'" class="cursor-pointer" @click="showSecret = !showSecret" /></template>
        </q-input>
        <div class="text-caption text-grey-6 q-mb-lg">Este código se valida solamente en el servidor y no se guarda como usuario ni como contraseña de acceso.</div>

        <div class="row q-col-gutter-md">
          <div class="col-12 col-sm-6"><q-input v-model="form.nombre" outlined label="Nombre *" lazy-rules :rules="[rules.required]" /></div>
          <div class="col-12 col-sm-6"><q-input v-model="form.apellido" outlined label="Apellido" /></div>
          <div class="col-12 col-sm-6"><q-input v-model="form.usuario" outlined label="Usuario *" maxlength="80" lazy-rules :rules="[rules.required, rules.username]" /></div>
          <div class="col-12 col-sm-6"><q-input v-model="form.telefono" outlined label="Teléfono *" inputmode="numeric" maxlength="15" lazy-rules :rules="[rules.required, rules.phone]" @update:model-value="v => form.telefono = String(v ?? '').replace(/\D/g, '')" /></div>
          <div class="col-12 col-sm-6"><q-input v-model="form.password" outlined :type="showPassword ? 'text' : 'password'" label="Contraseña *" lazy-rules :rules="[rules.password]"><template #append><q-icon :name="showPassword ? 'visibility_off' : 'visibility'" class="cursor-pointer" @click="showPassword = !showPassword" /></template></q-input></div>
          <div class="col-12 col-sm-6"><q-input v-model="form.password_confirmation" outlined :type="showPassword ? 'text' : 'password'" label="Confirmar contraseña *" lazy-rules :rules="[rules.required, rules.confirmation]" /></div>
        </div>

        <div class="password-help rounded-borders q-pa-md q-mt-sm">
          <div class="text-weight-medium q-mb-sm">La contraseña debe incluir:</div>
          <div class="row q-col-gutter-sm">
            <div class="col-12 col-sm-6" v-for="[key,label] in [['length','12 caracteres o más'],['lower','Una minúscula'],['upper','Una mayúscula'],['number','Un número'],['matches','Ambas contraseñas coinciden']]" :key="key">
              <q-icon :name="passwordChecks[key] ? 'check_circle' : 'radio_button_unchecked'" :color="passwordChecks[key] ? 'positive' : 'grey-6'" /> {{ label }}
            </div>
          </div>
        </div>
        <q-btn type="submit" color="primary" unelevated label="Configurar VITI" no-caps class="full-width q-mt-lg" size="lg" :loading="auth.loading" />
      </q-form>
    </div>
  </q-page>
</template>

<style scoped>
.auth-page{min-height:100vh;background:linear-gradient(135deg,#eef5ff,#fff 55%,#e9f7ef);padding:24px}.auth-shell{width:min(720px,94vw);background:#fff;padding:42px;border-radius:22px;box-shadow:0 22px 65px rgba(18,45,78,.14)}.password-help{background:#f7f9fc;border:1px solid #e1e8f0;font-size:13px}.body--dark .auth-page{background:#06162b}.body--dark .auth-shell{background:#0c294c}.body--dark .password-help{background:#0a2340;border-color:#23476c}@media(max-width:600px){.auth-shell{padding:28px 20px}.page-title{font-size:28px}}
</style>
