<script setup>
import { onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { useAuthStore } from '../stores/auth'
import { api, warmBackend } from '../boot/axios'
import { useFormErrors } from '../composables/useFormErrors'
import AppBrand from '../components/AppBrand.vue'

const auth=useAuthStore(),router=useRouter(),route=useRoute(),$q=useQuasar()
const show=ref(false),showSecret=ref(false),formRef=ref(null),googleNotice=ref(false)
const mode=ref(route.query.tipo==='cliente'||String(route.query.redirect||'').startsWith('/mi-')?'cliente':'admin')
const form=reactive({acceso:'',password:'',codigo_secreto:''})
const fieldErrors=useFormErrors()

function clearField(field){fieldErrors.clear(field)}
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

function googleTarget(){
  const requested=typeof route.query.redirect==='string'?route.query.redirect:''
  const safeClientTarget=requested.startsWith('/mi-')?requested:'/mi-aplicaciones'
  return auth.user?.rol==='cliente'?safeClientTarget:auth.user?.rol==='soporte'?'/soporte':(requested||'/')
}

async function submit(){
  fieldErrors.clear()
  const valid=await formRef.value?.validate()
  if(valid===false){
    if(!form.acceso)fieldErrors.set('acceso','Ingresa tu usuario, teléfono o CI.')
    if(!form.password)fieldErrors.set('password','Ingresa tu contraseña.')
    fieldErrors.scrollToFirst()
    return
  }
  try{
    await auth.login({...form,codigo_secreto:mode.value==='admin'&&form.codigo_secreto?form.codigo_secreto:null})
    await router.replace(googleTarget())
  }catch(e){
    const message=errorMessage(e)
    fieldErrors.scrollToFirst()
    $q.notify({type:'negative',message})
  }
}

onMounted(async()=>{
  await warmBackend().catch(()=>{})
  const google=String(route.query.google||'')
  if(google==='success'){
    const logged=await auth.initialize(true)
    if(logged){
      $q.notify({type:'positive',message:'Google conectado. Bienvenido a VITI.'})
      await router.replace(googleTarget())
      return
    }
    $q.notify({type:'negative',message:'Google validó la cuenta, pero VITI no pudo recuperar la sesión. Inténtalo nuevamente.'})
  }
  if(google==='needs_access')$q.notify({type:'warning',message:'Esta cuenta de Google todavía no tiene acceso a VITI. Solicita acceso para continuar.'})
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
        <div class="eyebrow">AGR Studio · VITI</div>
        <h1>Tu negocio.<br><span>Tu sistema.</span></h1>
        <p>Un solo espacio para tus empresas, aplicaciones y operación. Entra a VITI y continúa donde dejaste tu trabajo.</p>
        <div class="intro-line"><span></span><b>Multiempresa</b><span></span><b>Configurable</b><span></span><b>Trazable</b></div>
      </section>

      <section class="access-panel">
        <div class="panel-kicker">Acceso a la plataforma</div>
        <h2>Bienvenido a VITI</h2>
        <p class="panel-copy">Ingresa con tu cuenta o continúa con Google.</p>

        <button type="button" class="google-button" @click="continueWithGoogle">
          <span class="google-mark">G</span>
          <span>Continuar con Google</span>
        </button>
        <div v-if="googleNotice" class="google-note">No se pudo iniciar el flujo de Google. Revisa la configuración del backend.</div>

        <div class="divider"><span>o continúa con tu cuenta VITI</span></div>

        <div class="mode-switch" role="tablist" aria-label="Tipo de acceso">
          <button type="button" :class="{active:mode==='cliente'}" @click="mode='cliente'">Cliente</button>
          <button type="button" :class="{active:mode==='admin'}" @click="mode='admin'">Equipo VITI</button>
        </div>

        <q-form ref="formRef" class="login-form" @submit="submit">
          <div data-error-field="acceso">
            <q-input v-model="form.acceso" outlined label="Usuario, teléfono o CI" hint="Puedes usar cualquiera de estos datos." :error="fieldErrors.has('acceso')" :error-message="fieldErrors.message('acceso')" :rules="[v=>!!v||'Ingresa tu usuario, teléfono o CI.']" @update:model-value="clearField('acceso')"><template #prepend><q-icon name="badge"/></template></q-input>
          </div>
          <div data-error-field="password">
            <q-input v-model="form.password" outlined class="q-mt-sm" :type="show?'text':'password'" label="Contraseña" :error="fieldErrors.has('password')" :error-message="fieldErrors.message('password')" :rules="[v=>!!v||'Ingresa tu contraseña.']" @update:model-value="clearField('password')"><template #append><q-icon :name="show?'visibility_off':'visibility'" class="cursor-pointer" @click="show=!show"/></template></q-input>
          </div>
          <div v-if="mode==='admin'" data-error-field="codigo_secreto" class="admin-secret">
            <q-input v-model="form.codigo_secreto" outlined class="q-mt-sm" :type="showSecret?'text':'password'" label="Código secreto" hint="Solo se usa para cuentas de superadministrador." clearable :error="fieldErrors.has('codigo_secreto')" :error-message="fieldErrors.message('codigo_secreto')" @update:model-value="clearField('codigo_secreto')"><template #prepend><q-icon name="key"/></template><template #append><q-icon :name="showSecret?'visibility_off':'visibility'" class="cursor-pointer" @click="showSecret=!showSecret"/></template></q-input>
          </div>
          <q-btn type="submit" color="primary" unelevated no-caps class="full-width submit-button q-mt-lg" size="lg" :loading="auth.loading" label="Entrar a VITI">
            <template #loading><q-spinner size="22px" class="q-mr-sm"/><span>{{ auth.loginStage || 'Conectando...' }}</span></template>
          </q-btn>
        </q-form>

        <div class="under-action">
          <span v-if="mode==='cliente'">¿Es tu primera vez?</span>
          <router-link v-if="mode==='cliente'" to="/registro">Solicitar acceso</router-link>
          <span v-else>Acceso reservado para el equipo autorizado de VITI.</span>
        </div>
      </section>
    </main>

    <footer class="access-footer">Desarrollado y administrado por <strong>AGR Studio</strong></footer>
  </q-page>
</template>

<style scoped>
.auth-page{min-height:100vh;background:linear-gradient(180deg,#f7fbfd 0%,#eef7fa 100%);color:#102a43}.access-header{min-height:74px;padding:0 clamp(18px,4vw,54px);display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid rgba(16,42,67,.08);background:rgba(255,255,255,.78);backdrop-filter:blur(18px);position:sticky;top:0;z-index:20}.brand-link{display:flex;text-decoration:none;color:inherit}.header-actions{display:flex;align-items:center;gap:10px}.secure-note{display:inline-flex;align-items:center;gap:6px;font-size:12px;color:#647c8c}.access-main{width:min(1080px,calc(100% - 32px));margin:0 auto;min-height:calc(100vh - 128px);display:grid;grid-template-columns:1fr 470px;gap:76px;align-items:center;padding:58px 0}.access-intro{max-width:620px}.eyebrow,.panel-kicker{font-size:11px;font-weight:900;letter-spacing:.15em;text-transform:uppercase;color:#0b7593}.access-intro h1{font-size:clamp(52px,6.6vw,88px);line-height:.94;letter-spacing:-.065em;margin:20px 0 24px}.access-intro h1 span{color:#0b879f}.access-intro p{font-size:18px;line-height:1.75;color:#5f7788;max-width:590px}.intro-line{display:flex;align-items:center;gap:9px;margin-top:30px;flex-wrap:wrap;color:#4c6879;font-size:11px}.intro-line span{width:6px;height:6px;border-radius:50%;background:#12b76a}.access-panel{background:rgba(255,255,255,.92);border:1px solid rgba(16,42,67,.09);border-radius:26px;padding:38px;box-shadow:0 30px 90px rgba(16,42,67,.1)}.access-panel h2{font-size:38px;line-height:1.02;letter-spacing:-.045em;margin:10px 0}.panel-copy{margin:0;color:#637b8b;line-height:1.6}.google-button{width:100%;height:52px;border:1px solid #d9e3e9;border-radius:12px;background:#fff;color:#1f2e38;font:inherit;font-weight:700;display:flex;align-items:center;justify-content:center;gap:11px;cursor:pointer;transition:.18s ease}.google-button:hover{border-color:#b9cbd6;transform:translateY(-1px);box-shadow:0 8px 24px rgba(16,42,67,.07)}.google-mark{width:24px;height:24px;border-radius:7px;display:grid;place-items:center;background:#fff;color:#4285f4;font-weight:900;font-size:17px}.google-note{margin-top:10px;font-size:11px;line-height:1.5;color:#6d8290}.divider{display:flex;align-items:center;gap:12px;margin:23px 0;color:#91a3ad;font-size:11px}.divider:before,.divider:after{content:'';flex:1;height:1px;background:#e1e9ed}.mode-switch{display:grid;grid-template-columns:1fr 1fr;gap:4px;padding:4px;border-radius:13px;background:#f1f5f7;margin-bottom:18px}.mode-switch button{border:0;background:transparent;border-radius:10px;padding:11px 8px;font:inherit;font-size:12px;font-weight:800;color:#6a7f8d;cursor:pointer}.mode-switch button.active{background:#0f6fe8;color:#fff;box-shadow:0 7px 18px rgba(15,111,232,.2)}.submit-button{height:54px;border-radius:12px}.under-action{text-align:center;margin-top:18px;font-size:12px;color:#718693}.under-action a{color:#146ef5;text-decoration:none;font-weight:800;margin-left:5px}.admin-secret{opacity:.92}.access-footer{text-align:center;padding:22px 16px;color:#7b909d;font-size:11px;border-top:1px solid rgba(16,42,67,.06);background:rgba(255,255,255,.66)}.access-footer strong{color:#405868}@media(max-width:900px){.access-main{grid-template-columns:1fr;gap:34px;padding:42px 0}.access-intro{text-align:center;margin:0 auto}.access-intro p{margin-left:auto;margin-right:auto}.intro-line{justify-content:center}.access-panel{width:min(520px,100%);margin:0 auto}.access-intro h1{font-size:clamp(48px,13vw,72px)}}@media(max-width:600px){.access-header{min-height:64px;padding:0 14px}.secure-note{display:none}.header-actions .q-btn{padding-left:6px;padding-right:6px}.access-main{width:min(100% - 20px,1080px);padding:28px 0}.access-intro h1{font-size:50px}.access-intro p{font-size:16px}.access-panel{padding:26px 20px;border-radius:20px}.access-panel h2{font-size:31px}.auth-page{background:#f6fafc}}
</style>