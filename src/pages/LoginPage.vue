<script setup>
import { onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { useAuthStore } from '../stores/auth'
import { api, warmBackend } from '../boot/axios'
import { useFormErrors } from '../composables/useFormErrors'
import AppBrand from '../components/AppBrand.vue'

const auth=useAuthStore(),router=useRouter(),route=useRoute(),$q=useQuasar()
const show=ref(false),showSecret=ref(false),formRef=ref(null),googleNotice=ref(false),needsAdminSecret=ref(false)
const form=reactive({acceso:'',password:'',codigo_secreto:''})
const fieldErrors=useFormErrors()

function clearField(field){fieldErrors.clear(field)}
function credentialsChanged(field){clearField(field);needsAdminSecret.value=false;form.codigo_secreto=''}
function errorMessage(e){return fieldErrors.fromResponse(e,'No se pudo iniciar sesión. Revisa los datos marcados.')}

function continueWithGoogle(){
  const base=String(api.defaults.baseURL||'').replace(/\/api\/v1\/?$/,'')
  if(!base){
    googleNotice.value=true
    $q.notify({type:'negative',message:'No se encontró la dirección del backend de VITI.'})
    return
  }
  window.location.assign(`${base}/auth/google/redirect`)
}

function targetAfterLogin(){
  const requested=typeof route.query.redirect==='string'?route.query.redirect:''
  const safeClientTarget=requested.startsWith('/mi-')?requested:'/mi-cuenta'
  return auth.user?.rol==='cliente'?safeClientTarget:auth.user?.rol==='soporte'?'/soporte':(requested||'/')
}

async function submit(){
  fieldErrors.clear()
  const valid=await formRef.value?.validate()
  if(valid===false){
    if(!form.acceso)fieldErrors.set('acceso','Ingresa tu usuario, celular o correo.')
    if(!form.password)fieldErrors.set('password','Ingresa tu contraseña.')
    fieldErrors.scrollToFirst()
    return
  }
  try{
    await auth.login({...form,codigo_secreto:needsAdminSecret.value&&form.codigo_secreto?form.codigo_secreto:null})
    await router.replace(targetAfterLogin())
  }catch(e){
    if(e?.response?.data?.requires_admin_secret){
      needsAdminSecret.value=true
      if(e?.response?.status===428){
        $q.notify({type:'info',message:'Credenciales correctas. Confirma ahora tu código de seguridad.'})
        return
      }
    }
    const message=errorMessage(e)
    fieldErrors.scrollToFirst()
    $q.notify({type:'negative',message})
  }
}

onMounted(async()=>{
  if (typeof route.query.correo === 'string' && route.query.correo.trim()) form.acceso = route.query.correo.trim()
  await warmBackend().catch(()=>{})
  const google=String(route.query.google||'')
  if(google==='success'){
    const logged=await auth.initialize(true)
    if(logged){
      $q.notify({type:'positive',message:'Google conectado. Bienvenido a VITI.'})
      await router.replace(targetAfterLogin())
      return
    }
    $q.notify({type:'negative',message:'Google validó la cuenta, pero VITI no pudo recuperar la sesión. Inténtalo nuevamente.'})
  }
  if(google==='needs_access')$q.notify({type:'warning',message:'Esta cuenta de Google todavía no tiene acceso a VITI.'})
  if(google==='not_configured')$q.notify({type:'warning',message:'Google todavía no está configurado en el servidor de VITI.'})
  if(google==='cancelled')$q.notify({type:'info',message:'Inicio con Google cancelado.'})
  if(google==='state_mismatch')$q.notify({type:'negative',message:'No pudimos validar la sesión de Google. Inténtalo nuevamente.'})
})
</script>

<template>
  <q-page class="auth-page">
    <header class="access-header">
      <router-link to="/viti" class="brand-link"><AppBrand/></router-link>
      <div class="header-actions">
        <span class="secure-note"><q-icon name="verified_user"/> Acceso seguro</span>
        <q-btn flat no-caps color="primary" label="Volver a VITI" to="/viti"/>
      </div>
    </header>

    <main class="access-main">
      <section class="access-intro">
        <div class="eyebrow">VITI · ACCESO</div>
        <h1>Un solo acceso.<br><span>VITI te lleva a tu espacio.</span></h1>
        <p>No necesitas elegir si eres cliente o parte del equipo. Inicia sesión y VITI reconocerá automáticamente los permisos de tu cuenta.</p>
        <div class="intro-line"><span></span><b>Simple</b><span></span><b>Seguro</b><span></span><b>Sin elegir rol</b></div>
      </section>

      <section class="access-panel">
        <div class="panel-kicker">Acceso a la plataforma</div>
        <h2>Bienvenido a VITI</h2>
        <p class="panel-copy">Ingresa con tu cuenta o continúa con Google.</p>

        <button type="button" class="google-button" @click="continueWithGoogle">
          <span class="google-mark" aria-hidden="true">G</span>
          <span>Continuar con Google</span>
        </button>
        <div v-if="googleNotice" class="google-note">No se pudo iniciar el flujo de Google. Revisa la configuración del backend.</div>

        <div class="divider"><span>o continúa con tu cuenta VITI</span></div>

        <q-form ref="formRef" class="login-form" @submit="submit">
          <div data-error-field="acceso" class="field-block">
            <q-input v-model="form.acceso" outlined label="Usuario, celular o correo" hint="Usa el dato que recuerdes de tu cuenta." autocomplete="username" :error="fieldErrors.has('acceso')" :error-message="fieldErrors.message('acceso')" :rules="[v=>!!v||'Ingresa tu usuario, celular o correo.']" @update:model-value="credentialsChanged('acceso')">
              <template #prepend><q-icon name="person_outline"/></template>
            </q-input>
          </div>
          <div data-error-field="password" class="field-block">
            <q-input v-model="form.password" outlined class="q-mt-md" :type="show?'text':'password'" label="Contraseña" autocomplete="current-password" :error="fieldErrors.has('password')" :error-message="fieldErrors.message('password')" :rules="[v=>!!v||'Ingresa tu contraseña.']" @update:model-value="credentialsChanged('password')">
              <template #prepend><q-icon name="lock_outline"/></template>
              <template #append><q-icon :name="show?'visibility_off':'visibility'" class="cursor-pointer" @click="show=!show"/></template>
            </q-input>
          </div>

          <transition name="fade">
            <div v-if="needsAdminSecret" data-error-field="codigo_secreto" class="security-step field-block">
              <div class="security-copy"><q-icon name="verified_user" color="primary"/><div><b>Verificación de seguridad</b><span>Tu cuenta administrativa requiere una confirmación adicional.</span></div></div>
              <q-input v-model="form.codigo_secreto" outlined :type="showSecret?'text':'password'" label="Código de seguridad" autocomplete="one-time-code" :error="fieldErrors.has('codigo_secreto')" :error-message="fieldErrors.message('codigo_secreto')" @update:model-value="clearField('codigo_secreto')">
                <template #prepend><q-icon name="key"/></template>
                <template #append><q-icon :name="showSecret?'visibility_off':'visibility'" class="cursor-pointer" @click="showSecret=!showSecret"/></template>
              </q-input>
            </div>
          </transition>

          <q-btn type="submit" color="primary" unelevated no-caps class="full-width submit-button q-mt-lg" size="lg" :loading="auth.loading" :label="needsAdminSecret?'Confirmar y entrar':'Entrar a VITI'">
            <template #loading><q-spinner size="22px" class="q-mr-sm"/><span>{{ auth.loginStage || 'Conectando...' }}</span></template>
          </q-btn>
        </q-form>

        <div class="under-action"><span>¿Aún no tienes cuenta?</span><router-link to="/registro">Crear cuenta gratis</router-link></div>
        <div class="guest-action"><router-link to="/demo"><q-icon name="visibility"/> Explorar VITI como invitado</router-link><span>·</span><router-link to="/solicitud">Solicitar un sistema</router-link></div>
      </section>
    </main>

    <footer class="access-footer"><strong>VITI</strong> · Plataforma de sistemas y proyectos <span>· Tecnología desarrollada por AGR Studio</span></footer>
  </q-page>
</template>

<style scoped>
.auth-page{min-height:100vh;background:radial-gradient(circle at 86% 10%,rgba(36,107,199,.18),transparent 30rem),radial-gradient(circle at 8% 88%,rgba(242,139,48,.05),transparent 30rem),linear-gradient(180deg,#06111f,#091a2e);color:#edf4fb}.access-header{min-height:74px;padding:0 clamp(18px,4vw,54px);display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid rgba(121,151,179,.16);background:rgba(7,18,32,.86);backdrop-filter:blur(16px);position:sticky;top:0;z-index:20}.brand-link{display:flex;text-decoration:none;color:inherit}.header-actions{display:flex;align-items:center;gap:10px}.secure-note{display:inline-flex;align-items:center;gap:6px;font-size:12px;color:#9fb2c2}.access-main{width:min(1080px,calc(100% - 32px));margin:0 auto;min-height:calc(100vh - 128px);display:grid;grid-template-columns:1fr 470px;gap:76px;align-items:center;padding:58px 0}.access-intro{max-width:620px}.eyebrow,.panel-kicker{font-size:11px;font-weight:900;letter-spacing:.15em;text-transform:uppercase;color:#ff9a3c}.access-intro h1{font-size:clamp(50px,6vw,78px);line-height:.96;letter-spacing:-.06em;margin:20px 0 24px;color:#f7faff}.access-intro h1 span{color:#66a8ff}.access-intro p{font-size:18px;line-height:1.75;color:#a9bac9;max-width:590px}.intro-line{display:flex;align-items:center;gap:9px;margin-top:30px;flex-wrap:wrap;color:#b8c7d4;font-size:11px}.intro-line span{width:6px;height:6px;border-radius:50%;background:#f28b30}.access-panel{background:linear-gradient(180deg,rgba(11,28,47,.97),rgba(13,35,59,.95));border:1px solid rgba(91,125,157,.30);border-radius:26px;padding:38px;box-shadow:0 24px 70px rgba(0,0,0,.26);color:#edf4fb}.access-panel h2{font-size:38px;line-height:1.02;letter-spacing:-.045em;margin:10px 0;color:#f5f9ff}.panel-copy{margin:0 0 18px;color:#a8bac9;line-height:1.6}.google-button{width:100%;height:52px;border:1px solid #294864;border-radius:12px;background:rgba(255,255,255,.025);color:#e9f1f8;font:inherit;font-weight:800;display:flex;align-items:center;justify-content:center;gap:11px;cursor:pointer;transition:.18s ease}.google-button:hover{border-color:rgba(242,139,48,.45);background:rgba(242,139,48,.05);transform:translateY(-1px)}.google-mark{width:24px;height:24px;display:grid;place-items:center;color:#66a8ff;font-weight:900;font-size:17px}.google-note{margin-top:10px;font-size:11px;line-height:1.5;color:#91a7b9}.divider{display:flex;align-items:center;gap:12px;margin:23px 0;color:#8fa5b8;font-size:11px;font-weight:700}.divider:before,.divider:after{content:'';flex:1;height:1px;background:rgba(108,139,168,.22)}.security-step{margin-top:16px;padding:14px;border:1px solid rgba(242,139,48,.23);border-radius:14px;background:rgba(16,41,67,.76)}.security-copy{display:flex;align-items:flex-start;gap:9px;margin-bottom:12px}.security-copy b,.security-copy span{display:block}.security-copy span{margin-top:2px;color:#a8bac9;font-size:11px;line-height:1.45}.submit-button{height:56px;border-radius:13px}.under-action{display:flex;justify-content:center;gap:7px;margin-top:19px;font-size:12px;color:#9db0c0}.under-action a{color:#ffb067;text-decoration:none;font-weight:900}.guest-action{display:flex;justify-content:center;gap:8px;align-items:center;flex-wrap:wrap;margin-top:10px;font-size:11px;color:#72899c}.guest-action a{display:inline-flex;align-items:center;gap:5px;color:#90a9bd;text-decoration:none}.guest-action a:hover{color:#ffad62}.access-footer{text-align:center;padding:22px;color:#71889d;font-size:11px;border-top:1px solid rgba(121,151,179,.16);background:#071321}.fade-enter-active,.fade-leave-active{transition:.18s ease}.fade-enter-from,.fade-leave-to{opacity:0;transform:translateY(-5px)}
:deep(.q-field--outlined .q-field__control){background:#0a1a2c!important;color:#f3f7fc!important;border-radius:14px;min-height:54px}:deep(.q-field--outlined .q-field__control:before){border-color:#294864!important}:deep(.q-field--outlined:hover .q-field__control:before){border-color:#4b6d8b!important}:deep(.q-field--focused .q-field__control){background:#0d2239!important;box-shadow:0 0 0 3px rgba(242,139,48,.08)!important}:deep(.q-field--focused .q-field__control:after){color:#f28b30!important}:deep(.q-field__label){color:#91a6b9!important}:deep(.q-field--focused .q-field__label){color:#ffb067!important}:deep(.q-field__native),:deep(.q-field__input){color:#f4f8fc!important}:deep(.q-field__native::placeholder),:deep(.q-field__input::placeholder){color:#657f98!important;opacity:1!important}:deep(.q-field__marginal){color:#7891a8!important}
@media(max-width:900px){.access-main{grid-template-columns:1fr;gap:32px;padding:38px 0}.access-intro{display:none}}@media(max-width:540px){.access-header{min-height:66px}.secure-note{display:none}.access-main{width:min(100% - 20px,1080px);padding:18px 0 28px}.access-panel{padding:24px;border-radius:20px}.access-panel h2{font-size:32px}}
</style>
