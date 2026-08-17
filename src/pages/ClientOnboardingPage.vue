<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { api, initCsrf } from '../boot/axios'
import { useFormErrors } from '../composables/useFormErrors'
import AppBrand from '../components/AppBrand.vue'

const route = useRoute()
const router = useRouter()
const $q = useQuasar()
const loading = ref(true)
const saving = ref(false)
const step = ref(1)
const valid = ref(false)
const fileInput = ref(null)
const photo = ref(null)
const photoPreview = ref('')
const showPassword = ref(false)
const fieldErrors = useFormErrors()

const form = reactive({
  nombre:'', usuario:'', telefono:'', whatsapp:'', ci:'', ci_expedido:'', ciudad:'', direccion:'',
  password:'', password_confirmation:'',
  empresa_nombre:'', empresa_actividad:'', empresa_telefono:'', empresa_whatsapp:'', empresa_ciudad:'', empresa_direccion:'',
  titulo_sistema:'', resumen:'',
})

const hasErrors = computed(() => Object.keys(fieldErrors.errors).length > 0)
const step1Fields = ['nombre','usuario','telefono','whatsapp','ci','ci_expedido','ciudad','direccion','password','password_confirmation','foto']
const step2Fields = ['empresa_nombre','empresa_actividad','empresa_telefono','empresa_whatsapp','empresa_ciudad','empresa_direccion','titulo_sistema','resumen']

function clearField(field) { fieldErrors.clear(field) }
function clearFields(fields) { fields.forEach(field => fieldErrors.clear(field)) }
function errorMessage(e, fallback) { return fieldErrors.fromResponse(e, fallback) }

function validateStep1() {
  clearFields(step1Fields)
  if (form.nombre.trim().length < 3) fieldErrors.set('nombre','Escribe tu nombre completo con al menos 3 caracteres.')
  if (!/^(?=.*[a-z])[a-z0-9_-]{4,40}$/.test(form.usuario)) fieldErrors.set('usuario','Usa entre 4 y 40 caracteres: letras minúsculas, números, guion o guion bajo. Debe incluir al menos una letra.')
  if (!/^\d{7,15}$/.test(form.telefono)) fieldErrors.set('telefono','Ingresa un teléfono válido de 7 a 15 dígitos, sin espacios ni símbolos.')
  if (form.whatsapp && !/^\d{7,15}$/.test(form.whatsapp)) fieldErrors.set('whatsapp','Ingresa un WhatsApp válido de 7 a 15 dígitos.')
  if (!/^\d{5,15}$/.test(form.ci)) fieldErrors.set('ci','Ingresa una cédula válida de 5 a 15 dígitos.')
  if (!form.ciudad.trim()) fieldErrors.set('ciudad','Indica tu ciudad o localidad.')
  if (form.password.length < 10) fieldErrors.set('password','La contraseña debe tener al menos 10 caracteres.')
  if (!form.password_confirmation) fieldErrors.set('password_confirmation','Repite la contraseña para confirmarla.')
  else if (form.password !== form.password_confirmation) fieldErrors.set('password_confirmation','Las contraseñas no coinciden.')
  if (Object.keys(fieldErrors.errors).some(field => step1Fields.includes(field))) {
    fieldErrors.scrollToFirst()
    return false
  }
  return true
}

function validateStep2() {
  clearFields(step2Fields)
  if (form.empresa_nombre.trim().length < 2) fieldErrors.set('empresa_nombre','Escribe el nombre del negocio, institución o proyecto.')
  if (form.empresa_telefono && !/^\d{7,15}$/.test(form.empresa_telefono)) fieldErrors.set('empresa_telefono','Ingresa un teléfono válido de 7 a 15 dígitos.')
  if (form.empresa_whatsapp && !/^\d{7,15}$/.test(form.empresa_whatsapp)) fieldErrors.set('empresa_whatsapp','Ingresa un WhatsApp válido de 7 a 15 dígitos.')
  if (form.titulo_sistema.trim().length < 3) fieldErrors.set('titulo_sistema','Describe brevemente qué sistema necesitas.')
  if (Object.keys(fieldErrors.errors).some(field => step2Fields.includes(field))) {
    fieldErrors.scrollToFirst()
    return false
  }
  return true
}

function continueFromStep1() { if (validateStep1()) step.value = 2 }
function continueFromStep2() { if (validateStep2()) step.value = 3 }

async function load() {
  loading.value = true
  try {
    await api.get(`/publico/registro/${route.params.token}`)
    valid.value = true
  } catch (e) {
    valid.value = false
    $q.notify({ type:'negative', message:e?.response?.data?.message || 'Este enlace no está disponible o ya venció.' })
  } finally {
    loading.value = false
  }
}

function choosePhoto() { fileInput.value?.click() }
function onPhoto(event) {
  fieldErrors.clear('foto')
  const file = event.target?.files?.[0]
  if (!file) return
  if (!file.type.startsWith('image/')) {
    fieldErrors.set('foto','Selecciona una fotografía en formato de imagen.')
    return
  }
  if (file.size > 4 * 1024 * 1024) {
    fieldErrors.set('foto','La fotografía no puede superar 4 MB.')
    return
  }
  if (photoPreview.value) URL.revokeObjectURL(photoPreview.value)
  photo.value = file
  photoPreview.value = URL.createObjectURL(file)
}

function stepForServerErrors() {
  const fields = Object.keys(fieldErrors.errors)
  if (fields.some(field => step1Fields.includes(field))) return 1
  if (fields.some(field => step2Fields.includes(field))) return 2
  return step.value
}

async function submit() {
  if (!validateStep1()) { step.value = 1; return }
  if (!validateStep2()) { step.value = 2; return }
  fieldErrors.clear()
  saving.value = true
  try {
    const payload = new FormData()
    Object.entries(form).forEach(([key,value]) => { if (value !== '' && value !== null) payload.append(key, value) })
    if (photo.value) payload.append('foto', photo.value)
    await initCsrf()
    const { data } = await api.post(`/publico/registro/${route.params.token}`, payload, { headers:{'Content-Type':'multipart/form-data'} })
    $q.notify({ type:'positive', message:'Registro completado. Ahora elige el plan VITI que mejor encaje con tu negocio.' })
    await router.replace(data.data.ruta_cuestionario)
  } catch (e) {
    const message = errorMessage(e, 'No pudimos completar tu registro. Revisa los campos marcados.')
    step.value = stepForServerErrors()
    fieldErrors.scrollToFirst()
    $q.notify({ type:'negative', message })
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<template>
  <q-page class="onboarding-page">
    <q-inner-loading :showing="loading" />
    <div v-if="valid" class="onboarding-shell">
      <div class="row items-center justify-between q-mb-lg">
        <AppBrand />
        <q-badge outline color="primary">Registro seguro</q-badge>
      </div>

      <div class="section-label">Bienvenido a VITI</div>
      <h1 class="page-title">Cuéntanos quién eres y qué necesitas</h1>
      <p class="page-subtitle">Completa una sola vez tus datos personales, los de tu negocio y una breve necesidad. Si algún dato necesita corrección, VITI marcará el campo y te indicará qué debes revisar.</p>

      <q-banner v-if="hasErrors" rounded class="error-summary q-mt-lg">
        <template #avatar><q-icon name="error_outline" color="negative" /></template>
        <strong>Hay información que necesita tu atención.</strong> Revisa los campos marcados en rojo y corrige el mensaje que aparece debajo de cada uno.
      </q-banner>

      <q-card flat class="viti-card q-mt-lg onboarding-card">
        <q-card-section>
          <div class="steps-mobile">
            <div :class="['step-dot',{active:step>=1}]">1</div><div class="step-line"/><div :class="['step-dot',{active:step>=2}]">2</div><div class="step-line"/><div :class="['step-dot',{active:step>=3}]">3</div>
          </div>
          <div class="row justify-between text-caption text-grey-6 q-mt-sm"><span>Tu información</span><span>Tu negocio</span><span>Confirmar</span></div>
        </q-card-section>

        <q-separator />

        <q-card-section v-if="step===1" class="q-pa-lg">
          <div class="text-h6 text-weight-bold q-mb-xs">Tus datos</div>
          <div class="text-caption text-grey-6 q-mb-lg">Estos datos crearán tu ficha y tu acceso futuro a VITI.</div>
          <div class="row q-col-gutter-md">
            <div class="col-12 col-sm-8" data-error-field="nombre"><q-input v-model="form.nombre" outlined label="Nombre completo *" autocomplete="name" :error="fieldErrors.has('nombre')" :error-message="fieldErrors.message('nombre')" @update:model-value="clearField('nombre')" /></div>
            <div class="col-12 col-sm-4" data-error-field="telefono"><q-input v-model="form.telefono" outlined label="Teléfono *" inputmode="numeric" maxlength="15" :error="fieldErrors.has('telefono')" :error-message="fieldErrors.message('telefono')" @update:model-value="v=>{form.telefono=String(v??'').replace(/\D/g,'');clearField('telefono')}" /></div>
            <div class="col-12" data-error-field="usuario"><q-input v-model="form.usuario" outlined label="Nombre de usuario *" autocomplete="username" maxlength="40" hint="Lo usarás junto con tu contraseña para ingresar a VITI." :error="fieldErrors.has('usuario')" :error-message="fieldErrors.message('usuario')" @update:model-value="v => {form.usuario=String(v ?? '').toLowerCase().replace(/\s+/g,'');clearField('usuario')}"><template #prepend><q-icon name="alternate_email" /></template></q-input></div>
            <div class="col-12 col-sm-6" data-error-field="whatsapp"><q-input v-model="form.whatsapp" outlined label="WhatsApp" inputmode="numeric" maxlength="15" hint="Si lo dejas vacío usaremos tu teléfono." :error="fieldErrors.has('whatsapp')" :error-message="fieldErrors.message('whatsapp')" @update:model-value="v=>{form.whatsapp=String(v??'').replace(/\D/g,'');clearField('whatsapp')}" /></div>
            <div class="col-12 col-sm-6" data-error-field="ci"><q-input v-model="form.ci" outlined label="Cédula de identidad *" inputmode="numeric" maxlength="15" hint="También podrás iniciar sesión con tu CI." :error="fieldErrors.has('ci')" :error-message="fieldErrors.message('ci')" @update:model-value="v=>{form.ci=String(v??'').replace(/\D/g,'');clearField('ci')}" /></div>
            <div class="col-12 col-sm-4" data-error-field="ci_expedido"><q-input v-model="form.ci_expedido" outlined label="Expedido" placeholder="Ej.: BEN" :error="fieldErrors.has('ci_expedido')" :error-message="fieldErrors.message('ci_expedido')" @update:model-value="clearField('ci_expedido')" /></div>
            <div class="col-12 col-sm-8" data-error-field="ciudad"><q-input v-model="form.ciudad" outlined label="Ciudad o localidad *" :error="fieldErrors.has('ciudad')" :error-message="fieldErrors.message('ciudad')" @update:model-value="clearField('ciudad')" /></div>
            <div class="col-12" data-error-field="direccion"><q-input v-model="form.direccion" outlined label="Dirección o zona" :error="fieldErrors.has('direccion')" :error-message="fieldErrors.message('direccion')" @update:model-value="clearField('direccion')" /></div>
            <div class="col-12 col-sm-6" data-error-field="password"><q-input v-model="form.password" outlined :type="showPassword?'text':'password'" label="Crea una contraseña *" :error="fieldErrors.has('password')" :error-message="fieldErrors.message('password')" @update:model-value="clearField('password')"><template #append><q-icon :name="showPassword?'visibility_off':'visibility'" class="cursor-pointer" @click="showPassword=!showPassword"/></template></q-input></div>
            <div class="col-12 col-sm-6" data-error-field="password_confirmation"><q-input v-model="form.password_confirmation" outlined :type="showPassword?'text':'password'" label="Repite la contraseña *" :error="fieldErrors.has('password_confirmation')" :error-message="fieldErrors.message('password_confirmation')" @update:model-value="clearField('password_confirmation')" /></div>
            <div class="col-12" data-error-field="foto">
              <input ref="fileInput" type="file" accept="image/jpeg,image/png,image/webp" hidden @change="onPhoto" />
              <div class="photo-picker" :class="{'photo-picker--error':fieldErrors.has('foto')}" @click="choosePhoto">
                <q-avatar size="72px" color="blue-1" text-color="primary"><img v-if="photoPreview" :src="photoPreview" /><q-icon v-else name="add_a_photo" size="30px" /></q-avatar>
                <div><div class="text-weight-medium">Fotografía de perfil (opcional)</div><div class="text-caption text-grey-6">Puedes agregarla ahora o después desde tu cuenta.</div><div v-if="fieldErrors.has('foto')" class="text-caption text-negative q-mt-xs">{{fieldErrors.message('foto')}}</div></div>
              </div>
            </div>
          </div>
        </q-card-section>

        <q-card-section v-else-if="step===2" class="q-pa-lg">
          <div class="text-h6 text-weight-bold q-mb-xs">Tu negocio o proyecto</div>
          <div class="text-caption text-grey-6 q-mb-lg">Esta información se registra aquí y no volveremos a preguntártela en los pasos siguientes.</div>
          <div class="row q-col-gutter-md">
            <div class="col-12" data-error-field="empresa_nombre"><q-input v-model="form.empresa_nombre" outlined label="Nombre del negocio, institución o proyecto *" :error="fieldErrors.has('empresa_nombre')" :error-message="fieldErrors.message('empresa_nombre')" @update:model-value="clearField('empresa_nombre')" /></div>
            <div class="col-12" data-error-field="empresa_actividad"><q-input v-model="form.empresa_actividad" outlined label="¿A qué se dedica?" :error="fieldErrors.has('empresa_actividad')" :error-message="fieldErrors.message('empresa_actividad')" @update:model-value="clearField('empresa_actividad')" /></div>
            <div class="col-12 col-sm-6" data-error-field="empresa_telefono"><q-input v-model="form.empresa_telefono" outlined label="Teléfono del negocio" inputmode="numeric" :error="fieldErrors.has('empresa_telefono')" :error-message="fieldErrors.message('empresa_telefono')" @update:model-value="v=>{form.empresa_telefono=String(v??'').replace(/\D/g,'');clearField('empresa_telefono')}" /></div>
            <div class="col-12 col-sm-6" data-error-field="empresa_whatsapp"><q-input v-model="form.empresa_whatsapp" outlined label="WhatsApp del negocio" inputmode="numeric" :error="fieldErrors.has('empresa_whatsapp')" :error-message="fieldErrors.message('empresa_whatsapp')" @update:model-value="v=>{form.empresa_whatsapp=String(v??'').replace(/\D/g,'');clearField('empresa_whatsapp')}" /></div>
            <div class="col-12 col-sm-5" data-error-field="empresa_ciudad"><q-input v-model="form.empresa_ciudad" outlined label="Ciudad del negocio" :error="fieldErrors.has('empresa_ciudad')" :error-message="fieldErrors.message('empresa_ciudad')" @update:model-value="clearField('empresa_ciudad')" /></div>
            <div class="col-12 col-sm-7" data-error-field="empresa_direccion"><q-input v-model="form.empresa_direccion" outlined label="Dirección del negocio" :error="fieldErrors.has('empresa_direccion')" :error-message="fieldErrors.message('empresa_direccion')" @update:model-value="clearField('empresa_direccion')" /></div>
            <div class="col-12" data-error-field="titulo_sistema"><q-input v-model="form.titulo_sistema" outlined label="¿Qué sistema necesitas? *" placeholder="Ej.: Sistema para administrar mis servicios técnicos" :error="fieldErrors.has('titulo_sistema')" :error-message="fieldErrors.message('titulo_sistema')" @update:model-value="clearField('titulo_sistema')" /></div>
            <div class="col-12" data-error-field="resumen"><q-input v-model="form.resumen" outlined type="textarea" autogrow label="Cuéntanos brevemente qué problema quieres resolver" :error="fieldErrors.has('resumen')" :error-message="fieldErrors.message('resumen')" @update:model-value="clearField('resumen')" /></div>
          </div>
        </q-card-section>

        <q-card-section v-else class="q-pa-lg">
          <div class="text-h6 text-weight-bold q-mb-sm">Todo listo para elegir tu plan</div>
          <div class="text-body2 text-grey-7 q-mb-lg">Al continuar crearemos tu cuenta, tu ficha, tu negocio y la solicitud. Si el servidor detecta un dato duplicado o inválido, VITI volverá al paso correspondiente y marcará exactamente el campo que necesita corrección.</div>
          <q-list bordered separator class="rounded-borders">
            <q-item><q-item-section avatar><q-icon name="person" color="primary"/></q-item-section><q-item-section><q-item-label>{{form.nombre}}</q-item-label><q-item-label caption>@{{form.usuario}} · {{form.telefono}} · {{form.ciudad}}</q-item-label></q-item-section></q-item>
            <q-item><q-item-section avatar><q-icon name="business" color="primary"/></q-item-section><q-item-section><q-item-label>{{form.empresa_nombre}}</q-item-label><q-item-label caption>{{form.empresa_actividad||'Actividad por completar'}}</q-item-label></q-item-section></q-item>
            <q-item><q-item-section avatar><q-icon name="workspace_premium" color="primary"/></q-item-section><q-item-section><q-item-label>{{form.titulo_sistema}}</q-item-label><q-item-label caption>Después del registro compararás VITI Inicial, Profesional, Empresa y Personalizado.</q-item-label></q-item-section></q-item>
          </q-list>
        </q-card-section>

        <q-separator />
        <q-card-actions class="q-pa-lg">
          <q-btn v-if="step>1" flat no-caps color="primary" icon="arrow_back" label="Atrás" @click="step--" />
          <q-space />
          <q-btn v-if="step===1" color="primary" unelevated no-caps label="Continuar" icon-right="arrow_forward" @click="continueFromStep1" />
          <q-btn v-else-if="step===2" color="primary" unelevated no-caps label="Revisar datos" icon-right="arrow_forward" @click="continueFromStep2" />
          <q-btn v-else color="primary" unelevated no-caps label="Crear registro y elegir plan" icon-right="workspace_premium" :loading="saving" @click="submit" />
        </q-card-actions>
      </q-card>

      <div class="text-caption text-center text-grey-6 q-mt-lg">Tus datos se utilizan únicamente para gestionar tu solicitud y brindarte atención dentro de VITI.</div>
    </div>

    <div v-else-if="!loading" class="invalid-link text-center q-pa-xl">
      <q-icon name="link_off" size="64px" color="grey-6" />
      <div class="text-h5 text-weight-bold q-mt-md">Enlace no disponible</div>
      <div class="text-grey-6 q-mt-sm">Solicita a VITI un nuevo enlace de registro.</div>
      <q-btn flat color="primary" no-caps icon="info" label="Conocer VITI" to="/viti" class="q-mt-md" />
    </div>
  </q-page>
</template>

<style scoped>
.onboarding-page{min-height:100vh;background:var(--viti-bg);padding:28px 14px}.onboarding-shell{width:min(900px,100%);margin:0 auto}.onboarding-card{overflow:hidden}.steps-mobile{display:flex;align-items:center}.step-dot{width:34px;height:34px;border-radius:50%;display:grid;place-items:center;background:var(--viti-bg);color:var(--viti-muted);font-weight:800;border:1px solid var(--viti-border)}.step-dot.active{background:#1976d2;color:#fff;border-color:#1976d2}.step-line{height:2px;flex:1;background:var(--viti-border)}.photo-picker{display:flex;align-items:center;gap:14px;padding:14px;border:1px dashed var(--viti-border);border-radius:16px;cursor:pointer}.photo-picker--error{border-color:#c10015;background:rgba(193,0,21,.04)}.error-summary{background:rgba(193,0,21,.07);border:1px solid rgba(193,0,21,.22);color:var(--viti-text)}.invalid-link{max-width:520px;margin:20vh auto 0}.body--dark .onboarding-page{background:#06162b}@media(max-width:600px){.onboarding-page{padding:16px 10px}.onboarding-card{border-radius:18px}.onboarding-card .q-card__section{padding:16px!important}.page-title{font-size:28px}.photo-picker{align-items:flex-start}}
</style>