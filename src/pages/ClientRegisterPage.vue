<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { api } from '../boot/axios'
import AppBrand from '../components/AppBrand.vue'

const route=useRoute(),router=useRouter(),$q=useQuasar()
const onboardingToken=ref('')
const token=onboardingToken
const isGoogleOnboarding=computed(()=>route.query.google==='created' && token.value.length===64)
const loading=ref(false)
const form=reactive({
  nombre:'',
  ciudad:'Trinidad',
  whatsapp:'',
  sistema_nombre:'',
  sistema_que_hara:'',
  sistema_publico:'',
  sistema_vision:'',
})

const storageKey='viti:google:onboarding-token'

function continueWithGoogle(){
  const base=String(api.defaults.baseURL||'').replace(/\/api\/v1\/?$/,'')
  if(base) window.location.assign(`${base}/auth/google/redirect`)
}

async function complete(){
  if(!token.value){$q.notify({type:'negative',message:'El enlace de onboarding no es válido o expiró.'});return}
  if(!form.nombre||!form.sistema_nombre||!form.sistema_que_hara||!form.sistema_publico||!form.sistema_vision){
    $q.notify({type:'warning',message:'Completa los campos necesarios para que VITI entienda tu idea.'});return
  }
  loading.value=true
  try{
    await api.post('/auth/cliente/registro',{token:token.value,...form})
    sessionStorage.removeItem(storageKey)
    $q.notify({type:'positive',message:'Listo. Tu espacio VITI ya está preparado.'})
    await router.replace('/mi-cuenta')
  }catch(error){
    const message=error?.response?.data?.message||'No pudimos completar tu alta. Vuelve a iniciar con Google.'
    $q.notify({type:'negative',message})
    if(error?.response?.status===410){
      sessionStorage.removeItem(storageKey)
      await router.replace('/login?tipo=cliente')
    }
  }finally{loading.value=false}
}

onMounted(async()=>{
  const queryToken=String(route.query.token||'')
  const storedToken=sessionStorage.getItem(storageKey)||''
  onboardingToken.value=/^[A-Za-z0-9]{64}$/.test(queryToken)?queryToken:storedToken

  if(onboardingToken.value && queryToken===onboardingToken.value){
    sessionStorage.setItem(storageKey,onboardingToken.value)
    await router.replace({path:'/registro',query:{google:'created'}})
    return
  }

  if(!onboardingToken.value && route.query.google==='created'){
    $q.notify({type:'warning',message:'Tu enlace de onboarding no está disponible. Inicia nuevamente con Google.'})
  }
})
</script>

<template>
  <q-page class="register-page">
    <header class="topbar"><router-link to="/viti" class="brand"><AppBrand/></router-link><q-btn flat no-caps color="primary" label="Volver a VITI" to="/viti"/></header>

    <main class="content">
      <section v-if="isGoogleOnboarding" class="onboarding-card">
        <div class="eyebrow">Primer ingreso · VITI</div>
        <h1>Ahora cuéntame qué quieres construir.</h1>
        <p class="lead">Tu cuenta de Google ya quedó conectada. Solo necesitamos unas pocas ideas para preparar tu espacio y entender qué sistema quieres.</p>

        <div class="progress-row"><span class="step active">1</span><span>Tu idea</span><i></i><span class="step">2</span><span>Tu espacio</span></div>

        <q-form @submit.prevent="complete" class="form-grid">
          <div class="full field-label">Sobre ti</div>
          <q-input v-model="form.nombre" outlined label="Tu nombre" hint="Cómo quieres que te llamemos." class="full"/>
          <q-input v-model="form.ciudad" outlined label="Ciudad o localidad"/>
          <q-input v-model="form.whatsapp" outlined label="WhatsApp (opcional)"/>

          <div class="full field-label top-gap">Tu sistema</div>
          <q-input v-model="form.sistema_nombre" outlined label="¿Cómo se llamará tu sistema?" hint="Ejemplo: FitFamily" class="full"/>
          <q-input v-model="form.sistema_que_hara" outlined type="textarea" autogrow label="¿Qué hará principalmente?" hint="Cuéntalo con tus palabras, sin tecnicismos." class="full"/>
          <q-input v-model="form.sistema_publico" outlined type="textarea" autogrow label="¿Para quién será?" hint="Clientes, empleados, técnicos, estudiantes, etc." class="full"/>
          <q-input v-model="form.sistema_vision" outlined type="textarea" autogrow label="¿Cómo imaginas el resultado?" hint="Qué debería poder hacer o resolver cuando esté listo." class="full"/>

          <div class="summary full"><strong>VITI hará el resto.</strong><span>Con esto crearemos tu primera solicitud en borrador. Después podrás completar detalles, revisar la propuesta y ver los planes dentro de tu espacio.</span></div>

          <q-btn type="submit" class="submit full" color="primary" unelevated no-caps size="lg" label="Entrar a mi espacio VITI" :loading="loading"/>
        </q-form>
      </section>

      <section v-else class="legacy-card">
        <AppBrand/>
        <q-icon name="person_add" size="62px" color="primary" class="q-mt-xl"/>
        <div class="text-h5 text-weight-bold q-mt-md">Crea tu cuenta VITI con Google</div>
        <p class="text-grey-7">La forma más rápida de empezar es con tu cuenta de Google. Después VITI te hará unas pocas preguntas para entender tu sistema.</p>
        <q-btn color="primary" unelevated no-caps label="Continuar con Google" class="full-width q-mt-lg" @click="continueWithGoogle"/>
        <q-btn flat color="primary" no-caps label="Ya tengo una cuenta" to="/login?tipo=cliente" class="full-width q-mt-sm"/>
      </section>
    </main>
    <footer>Desarrollado y administrado por <strong>AGR Studio</strong></footer>
  </q-page>
</template>

<style scoped>
.register-page{min-height:100vh;background:linear-gradient(180deg,#f7fbfd,#edf5f8);color:#102a43}.topbar{min-height:72px;padding:0 clamp(16px,4vw,54px);display:flex;align-items:center;justify-content:space-between;background:#fff;border-bottom:1px solid #d8e4e9}.brand{display:flex;text-decoration:none;color:inherit}.content{width:min(900px,calc(100% - 24px));margin:0 auto;padding:46px 0 56px}.onboarding-card,.legacy-card{background:#fff;border:1px solid #c7d7df;border-radius:28px;box-shadow:0 22px 70px rgba(16,42,67,.11);padding:40px}.onboarding-card{max-width:860px;margin:0 auto}.legacy-card{width:min(560px,100%);margin:60px auto;text-align:center}.eyebrow{font-size:11px;letter-spacing:.16em;text-transform:uppercase;font-weight:900;color:#0b7593}.onboarding-card h1{font-size:clamp(38px,6vw,64px);line-height:.98;letter-spacing:-.055em;margin:16px 0 16px}.lead{color:#4a6879;line-height:1.7;font-size:17px;max-width:720px}.progress-row{display:flex;align-items:center;gap:10px;margin:28px 0 32px;font-size:12px;font-weight:800;color:#557081}.progress-row i{flex:0 0 50px;height:1px;background:#cbdbe2}.step{width:26px;height:26px;border-radius:50%;display:grid;place-items:center;background:#e8f0f4;color:#557081}.step.active{background:#146ef5;color:#fff}.form-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}.full{grid-column:1/-1}.field-label{font-size:12px;font-weight:900;letter-spacing:.1em;text-transform:uppercase;color:#0b7593}.top-gap{margin-top:12px}.form-grid :deep(.q-field__control){background:#fff;border-radius:13px;min-height:56px}.form-grid :deep(.q-field--outlined .q-field__control:before){border:2px solid #a7bbc7}.form-grid :deep(.q-field__label){color:#486676 !important;font-weight:700 !important}.form-grid :deep(.q-field__native),.form-grid :deep(textarea){color:#102a43 !important;font-size:15px;font-weight:600}.form-grid :deep(.q-field__bottom){color:#5e7684 !important}.summary{display:flex;flex-direction:column;gap:5px;padding:16px 18px;border-radius:14px;background:#eff8fb;border:1px solid #cfe5ec;color:#355767;line-height:1.55}.summary strong{color:#0b7593}.submit{height:56px;border-radius:13px}footer{text-align:center;padding:24px;color:#607886;font-size:11px;border-top:1px solid #d8e4e9;background:#f5f9fb}@media(max-width:700px){.content{padding:24px 0}.onboarding-card,.legacy-card{padding:24px;border-radius:20px}.form-grid{grid-template-columns:1fr}.full{grid-column:1}.progress-row{gap:7px}.progress-row i{flex-basis:24px}}
</style>
