<script setup>
import { onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { useAuthStore } from '../stores/auth'
import { warmBackend } from '../boot/axios'
import { useFormErrors } from '../composables/useFormErrors'
import AppBrand from '../components/AppBrand.vue'

const auth=useAuthStore(),router=useRouter(),route=useRoute(),$q=useQuasar()
const show=ref(false),showSecret=ref(false),formRef=ref(null)
const mode=ref(route.query.tipo==='cliente'||String(route.query.redirect||'').startsWith('/mi-')?'cliente':'admin')
const googleNotice=ref(false)
const form=reactive({acceso:'',password:'',codigo_secreto:''})
const fieldErrors=useFormErrors()

function clearField(field){fieldErrors.clear(field)}
function errorMessage(e){return fieldErrors.fromResponse(e,'No se pudo iniciar sesión. Revisa los datos marcados.')}

function continueWithGoogle(){
  googleNotice.value=true
  $q.notify({type:'info',message:'Google OAuth está listo para conectarse al proveedor de identidad de VITI.'})
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
    const requested=typeof route.query.redirect==='string'?route.query.redirect:''
    const safeClientTarget=requested.startsWith('/mi-')?requested:'/mi-aplicaciones'
    const target=auth.user?.rol==='cliente'?safeClientTarget:auth.user?.rol==='soporte'?'/soporte':(requested||'/')
    await router.replace(target)
  }catch(e){
    const message=errorMessage(e)
    fieldErrors.scrollToFirst()
    $q.notify({type:'negative',message})
  }
}

onMounted(()=>{warmBackend().catch(()=>{})})
</script>

<template>
  <q-page class="auth-page flex flex-center">
    <div class="login-shell">
      <div class="login-visual">
        <div class="visual-glow glow-a"></div><div class="visual-glow glow-b"></div>
        <div class="visual-content">
          <div class="visual-kicker">AGR Studio · VITI</div>
          <h1>Tu negocio.<br><span>Tu sistema.</span></h1>
          <p>Entra a tu espacio de trabajo, gestiona tus aplicaciones y sigue la operación de tu empresa desde una sola plataforma.</p>
          <div class="visual-pills"><span>Multiempresa</span><span>Aplicaciones configurables</span><span>Operación trazable</span></div>
        </div>
        <div class="visual-card"><div class="vc-head"><span>VITI · AppHub</span><q-icon name="hub"/></div><div class="vc-app"><div class="vc-logo">V</div><div><small>APLICACIÓN ACTIVA</small><b>FitFamily</b><span>Catálogo · Pedidos · Clientes</span></div><q-icon name="arrow_forward" color="primary"/></div></div>
      </div>

      <div class="login-card">
        <AppBrand/>
        <div class="q-mt-xl section-label">Acceso seguro</div>
        <h2 class="page-title">Bienvenido a VITI</h2>
        <p class="page-subtitle">Ingresa a tu espacio de trabajo o continúa con tu identidad de Google.</p>

        <q-btn unelevated no-caps class="google-btn q-mt-lg full-width" color="white" text-color="dark" icon="login" label="Continuar con Google" @click="continueWithGoogle" />
        <div v-if="googleNotice" class="google-note q-mt-sm">La integración OAuth de Google requiere configurar el cliente de Google y el callback seguro del backend. La interfaz ya está preparada.</div>

        <div class="divider q-my-lg"><span>o usa tu cuenta VITI</span></div>

        <q-btn-toggle
          v-model="mode"
          spread
          no-caps
          unelevated
          toggle-color="primary"
          :color="$q.dark.isActive?'grey-10':'grey-2'"
          :text-color="$q.dark.isActive?'grey-4':'dark'"
          class="q-mb-lg access-toggle"
          :options="[{label:'Administrador / Soporte',value:'admin',icon:'admin_panel_settings'},{label:'Cliente',value:'cliente',icon:'person'}]"
        />

        <q-form ref="formRef" @submit="submit">
          <div data-error-field="acceso">
            <q-input v-model="form.acceso" outlined label="Usuario, teléfono o CI" hint="Puedes ingresar con cualquiera de estos datos." :error="fieldErrors.has('acceso')" :error-message="fieldErrors.message('acceso')" :rules="[v=>!!v||'Ingresa tu usuario, teléfono o CI.']" @update:model-value="clearField('acceso')"><template #prepend><q-icon name="badge"/></template></q-input>
          </div>
          <div data-error-field="password">
            <q-input v-model="form.password" outlined class="q-mt-sm" :type="show?'text':'password'" label="Contraseña" :error="fieldErrors.has('password')" :error-message="fieldErrors.message('password')" :rules="[v=>!!v||'Ingresa tu contraseña.']" @update:model-value="clearField('password')"><template #append><q-icon :name="show?'visibility_off':'visibility'" class="cursor-pointer" @click="show=!show"/></template></q-input>
          </div>
          <div v-if="mode==='admin'" data-error-field="codigo_secreto">
            <q-input v-model="form.codigo_secreto" outlined class="q-mt-sm" :type="showSecret?'text':'password'" label="Código secreto (solo superadministrador)" hint="Administradores y soporte interno dejan este campo vacío." clearable :error="fieldErrors.has('codigo_secreto')" :error-message="fieldErrors.message('codigo_secreto')" @update:model-value="clearField('codigo_secreto')"><template #prepend><q-icon name="key"/></template><template #append><q-icon :name="showSecret?'visibility_off':'visibility'" class="cursor-pointer" @click="showSecret=!showSecret"/></template></q-input>
          </div>
          <q-btn type="submit" color="primary" unelevated label="Ingresar a VITI" no-caps class="full-width q-mt-md" size="lg" :loading="auth.loading"><template #loading><q-spinner size="22px" class="q-mr-sm"/><span>{{ auth.loginStage || 'Conectando...' }}</span></template></q-btn>
        </q-form>

        <div v-if="mode==='cliente'" class="text-center q-mt-lg">¿Es tu primera vez? <router-link to="/registro">Ver cómo obtener acceso</router-link></div>
        <div v-else class="text-caption text-grey-6 q-mt-md text-center">El código secreto pertenece únicamente al superadministrador.</div>
        <div class="row justify-center q-gutter-sm q-mt-lg"><q-btn flat no-caps color="primary" icon="arrow_back" label="Volver a VITI" to="/viti" /></div>
        <div class="agr-signature q-mt-lg">Desarrollado y administrado por <strong>AGR Studio</strong></div>
      </div>
    </div>
  </q-page>
</template>

<style scoped>
.auth-page{min-height:100vh;padding:24px;background:linear-gradient(135deg,#edf7fa 0%,#f7fafc 48%,#eaf2fb 100%);overflow:auto}.login-shell{width:min(1120px,100%);min-height:690px;display:grid;grid-template-columns:1fr 520px;background:#fff;border:1px solid rgba(16,42,67,.08);border-radius:28px;box-shadow:0 35px 100px rgba(16,42,67,.13);overflow:hidden}.login-visual{position:relative;overflow:hidden;padding:58px;background:#102a43;color:#fff;display:flex;flex-direction:column;justify-content:space-between}.visual-glow{position:absolute;border-radius:50%;filter:blur(3px)}.glow-a{width:370px;height:370px;right:-110px;top:-100px;background:rgba(27,176,201,.2)}.glow-b{width:260px;height:260px;left:-130px;bottom:-130px;background:rgba(22,119,255,.2)}.visual-content,.visual-card{position:relative;z-index:1}.visual-kicker{font-size:11px;font-weight:900;letter-spacing:.14em;color:#71cad6}.visual-content h1{font-size:clamp(50px,6vw,78px);line-height:.95;letter-spacing:-.06em;margin:22px 0}.visual-content h1 span{color:#71cad6}.visual-content p{max-width:460px;color:#cad8df;line-height:1.8;font-size:17px}.visual-pills{display:flex;flex-wrap:wrap;gap:8px;margin-top:26px}.visual-pills span{padding:7px 10px;border:1px solid rgba(255,255,255,.16);border-radius:999px;font-size:10px;color:#d6e1e7}.visual-card{padding:18px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.14);border-radius:18px;backdrop-filter:blur(15px)}.vc-head{display:flex;justify-content:space-between;color:#91aab8;font-size:10px;margin-bottom:15px}.vc-app{display:flex;align-items:center;gap:12px}.vc-logo{width:44px;height:44px;border-radius:13px;background:#0b7593;display:grid;place-items:center;font-weight:900}.vc-app small,.vc-app b,.vc-app span{display:block}.vc-app small{font-size:8px;color:#91aab8;letter-spacing:.1em}.vc-app b{margin-top:3px}.vc-app span{font-size:10px;color:#c4d3da}.vc-app .q-icon{margin-left:auto}.login-card{padding:54px 50px;display:flex;flex-direction:column;justify-content:center}.section-label{font-size:11px;font-weight:900;letter-spacing:.14em;text-transform:uppercase;color:#0b7593}.page-title{font-size:42px;line-height:1;letter-spacing:-.045em;margin:12px 0}.page-subtitle{color:#61798a;line-height:1.65}.google-btn{height:52px;border:1px solid #dce5ea!important;border-radius:12px!important;box-shadow:none}.google-note{font-size:11px;color:#6b8190;line-height:1.5}.divider{display:flex;align-items:center;gap:12px;color:#8aa0ad;font-size:11px}.divider:before,.divider:after{content:'';height:1px;background:#e2eaee;flex:1}.access-toggle{border:1px solid var(--viti-border);border-radius:12px;overflow:hidden}.agr-signature{padding-top:18px;border-top:1px solid var(--viti-border);font-size:11px;color:var(--viti-muted);text-align:center}.agr-signature strong{color:var(--viti-text);font-weight:800}@media(max-width:900px){.login-shell{grid-template-columns:1fr}.login-visual{display:none}.login-card{padding:42px 32px}}@media(max-width:600px){.auth-page{padding:0}.login-shell{min-height:100vh;border-radius:0;border:0}.login-card{padding:28px 16px}.page-title{font-size:30px}}
</style>