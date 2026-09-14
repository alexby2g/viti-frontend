<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { api, initCsrf } from '../boot/axios'
import AppBrand from '../components/AppBrand.vue'

const route = useRoute()
const router = useRouter()
const $q = useQuasar()
const loading = ref(true)
const saving = ref(false)
const valid = ref(false)
const invitationInfo = ref(null)
const showPassword = ref(false)
const form = reactive({ usuario:'', password:'', password_confirmation:'' })

const prefill = computed(() => invitationInfo.value?.prefill || {})
const email = computed(() => invitationInfo.value?.correo || '')

function validate() {
  if (!/^(?=.*[a-z])[a-z0-9_-]{4,40}$/.test(form.usuario)) {
    $q.notify({ type:'warning', message:'Crea un usuario de 4 a 40 caracteres, con al menos una letra.' })
    return false
  }
  if (form.password.length < 10 || !/[A-Za-z]/.test(form.password) || !/\d/.test(form.password)) {
    $q.notify({ type:'warning', message:'La contraseña debe tener al menos 10 caracteres e incluir letras y números.' })
    return false
  }
  if (form.password !== form.password_confirmation) {
    $q.notify({ type:'warning', message:'Las contraseñas no coinciden.' })
    return false
  }
  return true
}

async function load() {
  loading.value = true
  try {
    const { data } = await api.get(`/publico/registro/${route.params.token}`)
    invitationInfo.value = data?.data || null
    if (!invitationInfo.value?.vinculada_solicitud) throw new Error('Invitación no vinculada')
    valid.value = true
  } catch (error) {
    valid.value = false
    $q.notify({ type:'negative', message:error?.response?.data?.message || 'Este enlace no está disponible o ya venció.' })
  } finally {
    loading.value = false
  }
}

async function submit() {
  if (!validate()) return
  saving.value = true
  try {
    await initCsrf()
    const { data } = await api.post(`/publico/registro/${route.params.token}`, form)
    $q.notify({ type:'positive', message:'Cuenta creada. Ya puedes ingresar a VITI.' })
    await router.replace(data?.data?.ruta_siguiente || '/login?registro=ok')
  } catch (error) {
    const errors = error?.response?.data?.errors
    const first = errors ? Object.values(errors).flat()[0] : null
    $q.notify({ type:'negative', message:first || error?.response?.data?.message || 'No pudimos crear tu cuenta.' })
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<template>
  <q-page class="access-page">
    <q-inner-loading :showing="loading" dark />
    <div v-if="valid" class="access-shell">
      <header class="access-header"><router-link to="/viti" class="brand-link"><AppBrand /></router-link><q-badge outline color="orange">Invitación segura</q-badge></header>

      <section class="access-grid">
        <div class="access-copy">
          <div class="eyebrow">TU SOLICITUD FUE APROBADA</div>
          <h1>Ahora crea tu acceso a VITI.</h1>
          <p>Ya tenemos tus datos, tu negocio y lo que solicitaste. No vamos a pedirte todo otra vez. Solo crea tu usuario y contraseña.</p>

          <div class="request-summary">
            <div><small>RESPONSABLE</small><b>{{ prefill.nombre }}</b><span>{{ email }}</span></div>
            <div><small>NEGOCIO</small><b>{{ prefill.empresa_nombre }}</b><span>{{ prefill.empresa_actividad || 'Información recibida' }}</span></div>
            <div><small>SOLICITUD</small><b>{{ prefill.titulo_sistema }}</b><span>{{ prefill.resumen }}</span></div>
          </div>
        </div>

        <q-card flat class="access-card">
          <q-card-section class="q-pa-lg">
            <div class="card-icon"><q-icon name="person_add" /></div>
            <h2>Crea tus credenciales</h2>
            <p>Las usarás para revisar el avance, probar la beta y recibir tu sistema cuando esté listo.</p>

            <q-input v-model="form.usuario" outlined label="Nombre de usuario *" autocomplete="username" class="q-mt-lg" hint="Ej.: miempresa o juan.perez" />
            <q-input v-model="form.password" outlined :type="showPassword?'text':'password'" label="Contraseña *" autocomplete="new-password" class="q-mt-md">
              <template #append><q-icon :name="showPassword?'visibility_off':'visibility'" class="cursor-pointer" @click="showPassword=!showPassword" /></template>
            </q-input>
            <q-input v-model="form.password_confirmation" outlined :type="showPassword?'text':'password'" label="Repite la contraseña *" autocomplete="new-password" class="q-mt-md" />
            <div class="password-help"><q-icon name="lock" /> Mínimo 10 caracteres, con letras y números.</div>

            <q-btn color="primary" unelevated no-caps class="full-width create-btn q-mt-lg" label="Crear mi cuenta" icon-right="arrow_forward" :loading="saving" @click="submit" />
            <div class="access-note">No se crea otra empresa ni otra solicitud. Tu cuenta queda vinculada a la solicitud aprobada en VITI.</div>
          </q-card-section>
        </q-card>
      </section>
    </div>

    <div v-else-if="!loading" class="invalid-link">
      <q-icon name="link_off" size="62px" />
      <h2>Este enlace ya no está disponible</h2>
      <p>Puede haber vencido o haber sido utilizado. Contacta a soporte VITI para revisar tu acceso.</p>
      <q-btn outline color="orange" no-caps label="Volver a VITI" to="/viti" />
    </div>
  </q-page>
</template>

<style scoped>
.access-page{min-height:100vh;background:radial-gradient(circle at 12% 10%,rgba(242,139,48,.08),transparent 24rem),radial-gradient(circle at 90% 10%,rgba(20,87,184,.16),transparent 28rem),linear-gradient(180deg,#06111f,#09192b);color:#eef5fb;padding:0 18px}.access-shell{width:min(1120px,100%);margin:0 auto}.access-header{min-height:84px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid rgba(100,132,162,.2)}.brand-link{text-decoration:none;color:inherit}.access-grid{display:grid;grid-template-columns:1.05fr .75fr;gap:70px;align-items:center;min-height:calc(100vh - 110px);padding:46px 0}.eyebrow{color:#f28b30;font-weight:900;font-size:12px;letter-spacing:.15em}.access-copy h1{font-size:clamp(42px,6vw,68px);line-height:1;letter-spacing:-.05em;margin:14px 0;color:#f7fbff}.access-copy>p{font-size:18px;line-height:1.65;color:#adbdcc;max-width:650px}.request-summary{display:grid;gap:10px;margin-top:28px}.request-summary>div{padding:16px 18px;border:1px solid rgba(74,105,134,.3);border-radius:15px;background:rgba(9,28,47,.62)}.request-summary small,.request-summary b,.request-summary span{display:block}.request-summary small{color:#f28b30;font-size:9px;letter-spacing:.13em;font-weight:900}.request-summary b{margin-top:5px}.request-summary span{color:#91a6b9;font-size:12px;margin-top:3px;line-height:1.4}.access-card{background:linear-gradient(180deg,#0d2036,#0a192b)!important;color:#edf4fb;border:1px solid rgba(79,112,143,.35);border-radius:24px;box-shadow:0 26px 70px rgba(0,0,0,.25)}.card-icon{width:52px;height:52px;border-radius:14px;display:grid;place-items:center;background:rgba(242,139,48,.11);border:1px solid rgba(242,139,48,.3);color:#f28b30;font-size:26px}.access-card h2{font-size:28px;margin:18px 0 5px}.access-card p{color:#9fb0c0;line-height:1.55}.access-card :deep(.q-field--outlined .q-field__control){background:#07192a!important;border-radius:14px}.access-card :deep(.q-field--outlined .q-field__control:before){border-color:#294761!important}.access-card :deep(.q-field--focused .q-field__control:before){border-color:#f28b30!important}.access-card :deep(.q-field__native),.access-card :deep(.q-field__input){color:#edf4fb!important}.access-card :deep(.q-field__label){color:#8fa5b9!important}.password-help,.access-note{color:#8197aa;font-size:11px;margin-top:10px;display:flex;align-items:center;gap:6px}.access-note{display:block;text-align:center;line-height:1.5;margin-top:13px}.create-btn{min-height:48px;border-radius:13px}.invalid-link{max-width:560px;margin:0 auto;padding-top:24vh;text-align:center;color:#98adbf}.invalid-link h2{color:#eef5fb}.invalid-link p{line-height:1.55}.invalid-link>.q-icon{color:#f28b30}@media(max-width:850px){.access-grid{grid-template-columns:1fr;gap:28px;padding:44px 0 70px;align-items:start}.access-copy h1{font-size:44px}.access-grid{min-height:0}}@media(max-width:520px){.access-page{padding:0 12px}.access-header{min-height:72px}.access-card .q-card__section{padding:20px!important}}
</style>
