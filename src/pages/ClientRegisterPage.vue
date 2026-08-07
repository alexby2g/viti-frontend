<script setup>
import { computed, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { useAuthStore } from '../stores/auth'
import AppBrand from '../components/AppBrand.vue'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()
const $q = useQuasar()
const formRef = ref(null)
const show = ref(false)
const errors = ref([])
const photo = ref(null)
const photoPreview = ref('')

const form = reactive({
  nombre: '',
  telefono: '',
  whatsapp: '',
  ci: '',
  ci_expedido: '',
  ciudad: '',
  direccion: '',
  password: '',
  password_confirmation: '',
  canal_origen: route.query.origen === 'agr_studio' ? 'agr_studio' : 'viti',
})

const passwordOk = computed(() =>
  form.password.length >= 10 && /[A-Za-z]/.test(form.password) && /\d/.test(form.password) && form.password === form.password_confirmation
)
const required = v => Boolean(String(v ?? '').trim()) || 'Este campo es obligatorio.'
const phone = v => /^\d{7,15}$/.test(String(v ?? '')) || 'Ingresa entre 7 y 15 dígitos.'
const photoRequired = () => Boolean(photo.value) || 'Sube una fotografía donde se vea claramente tu rostro.'

function serverErrors(e) {
  const bag = e?.response?.data?.errors
  if (bag) return Object.values(bag).flat()
  return [e?.response?.data?.message || 'No pudimos crear tu cuenta.']
}

function onPhoto(file) {
  photo.value = file
  if (photoPreview.value) URL.revokeObjectURL(photoPreview.value)
  photoPreview.value = file ? URL.createObjectURL(file) : ''
}

async function submit() {
  errors.value = []
  if (!(await formRef.value?.validate())) return
  const fd = new FormData()
  Object.entries(form).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') fd.append(key, value)
  })
  fd.set('telefono', String(form.telefono).replace(/\D/g, ''))
  if (form.whatsapp) fd.set('whatsapp', String(form.whatsapp).replace(/\D/g, ''))
  fd.append('foto', photo.value)

  try {
    await auth.registerClient(fd)
    $q.notify({ type: 'positive', message: 'Tu cuenta fue creada. Bienvenido a VITI.' })
    router.replace('/mi-cuenta')
  } catch (e) {
    errors.value = serverErrors(e)
  }
}
</script>

<template>
  <q-page class="auth-page flex flex-center">
    <div class="auth-shell">
      <AppBrand />
      <div class="section-label q-mt-xl">Cuenta de cliente</div>
      <h1 class="page-title">Crea tu perfil VITI</h1>
      <p class="page-subtitle">Estos datos forman tu ficha de identificación. Después completarás el formulario sobre tu negocio y el sistema que necesitas.</p>

      <q-banner v-if="errors.length" rounded class="bg-red-1 text-negative q-mt-lg">
        <template #avatar><q-icon name="error_outline" /></template>
        <ul class="q-my-none q-pl-md"><li v-for="e in errors" :key="e">{{ e }}</li></ul>
      </q-banner>

      <q-form ref="formRef" class="q-mt-lg" @submit.prevent="submit">
        <div class="row q-col-gutter-lg">
          <div class="col-12 col-md-4">
            <div class="photo-panel">
              <q-avatar size="150px" class="profile-photo-preview">
                <img v-if="photoPreview" :src="photoPreview" alt="Vista previa de fotografía" />
                <q-icon v-else name="person" size="72px" color="grey-5" />
              </q-avatar>
              <div class="text-weight-bold q-mt-md">Fotografía de perfil *</div>
              <div class="text-caption text-grey-6 q-mb-md">Usa una foto reciente, de frente, con el rostro visible y fondo sencillo.</div>
              <q-file
                :model-value="photo"
                outlined
                dense
                accept="image/jpeg,image/png,image/webp"
                label="Seleccionar fotografía"
                :rules="[photoRequired]"
                @update:model-value="onPhoto"
              />
            </div>
          </div>

          <div class="col-12 col-md-8">
            <div class="row q-col-gutter-md">
              <div class="col-12"><q-input v-model="form.nombre" outlined label="Nombre completo *" :rules="[required]" /></div>
              <div class="col-12 col-sm-6"><q-input v-model="form.telefono" outlined label="Teléfono *" inputmode="numeric" maxlength="15" :rules="[required, phone]" @update:model-value="v => form.telefono = String(v ?? '').replace(/\D/g,'')" /></div>
              <div class="col-12 col-sm-6"><q-input v-model="form.whatsapp" outlined label="WhatsApp" inputmode="numeric" maxlength="15" @update:model-value="v => form.whatsapp = String(v ?? '').replace(/\D/g,'')" /></div>
              <div class="col-12 col-sm-8"><q-input v-model="form.ci" outlined label="Cédula de identidad (CI) *" :rules="[required]" hint="Se utilizará para identificar tu ficha dentro de VITI." /></div>
              <div class="col-12 col-sm-4"><q-input v-model="form.ci_expedido" outlined label="Expedido" placeholder="Ej. SC, BEN" /></div>
              <div class="col-12 col-sm-6"><q-input v-model="form.ciudad" outlined label="Ciudad o localidad *" :rules="[required]" /></div>
              <div class="col-12 col-sm-6"><q-input v-model="form.direccion" outlined label="Dirección o zona" /></div>
              <div class="col-12 col-sm-6">
                <q-input v-model="form.password" outlined :type="show ? 'text' : 'password'" label="Contraseña *" :rules="[() => passwordOk || 'Usa 10 caracteres o más, con letras y números.']">
                  <template #append><q-icon :name="show ? 'visibility_off' : 'visibility'" class="cursor-pointer" @click="show = !show" /></template>
                </q-input>
              </div>
              <div class="col-12 col-sm-6"><q-input v-model="form.password_confirmation" outlined :type="show ? 'text' : 'password'" label="Confirmar contraseña *" :rules="[v => v === form.password || 'Las contraseñas no coinciden.']" /></div>
            </div>
          </div>
        </div>
        <q-btn type="submit" color="primary" unelevated no-caps size="lg" class="full-width q-mt-lg" label="Crear mi cuenta" :loading="auth.loading" />
      </q-form>
      <div class="text-center q-mt-lg">¿Ya tienes una cuenta? <router-link to="/login">Iniciar sesión</router-link></div>
    </div>
  </q-page>
</template>

<style scoped>
.auth-page{min-height:100vh;background:linear-gradient(135deg,#eef5ff,#fff 55%,#e9f7ef);padding:24px}.auth-shell{width:min(920px,96vw);background:#fff;padding:42px;border-radius:22px;box-shadow:0 22px 65px rgba(18,45,78,.14)}.photo-panel{text-align:center;padding:20px;border:1px solid var(--viti-border);border-radius:18px;background:var(--viti-surface-soft)}.profile-photo-preview{border:4px solid #fff;box-shadow:0 8px 26px rgba(0,0,0,.14);background:#eef3f8}.profile-photo-preview img{width:100%;height:100%;object-fit:cover;object-position:center}.body--dark .auth-page{background:#06162b}.body--dark .auth-shell{background:#0c294c}@media(max-width:600px){.auth-shell{padding:28px 20px}}
</style>
