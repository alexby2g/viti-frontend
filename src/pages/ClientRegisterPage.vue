<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { useAuthStore } from '../stores/auth'
import AppBrand from '../components/AppBrand.vue'

const route = useRoute()
const router = useRouter()
const $q = useQuasar()
const auth = useAuthStore()
const showPassword = ref(false)
const formRef = ref(null)

const googleMode = computed(() => String(route.query.google || '') === 'created' && Boolean(route.query.token))
const fromRequest = computed(() => String(route.query.origen || '') === 'solicitud')
const form = reactive({
  nombre:'', correo:'', celular:'', whatsapp_same:true, whatsapp:'',
  business_whatsapp_different:false, whatsapp_business:'', password:'', password_confirmation:'',
})
const effectiveWhatsapp = computed(() => form.whatsapp_same ? form.celular : form.whatsapp)

watch(() => form.celular, value => { if (form.whatsapp_same) form.whatsapp = digits(value) })
watch(() => form.whatsapp_same, enabled => { if (enabled) form.whatsapp = digits(form.celular) })
watch(() => form.business_whatsapp_different, enabled => { if (!enabled) form.whatsapp_business = '' })

function digits(value) { return String(value ?? '').replace(/\D/g, '').slice(0,15) }
function normalize(field,value) { form[field]=digits(value) }
function validPhone(value, optional=false) { const v=digits(value); if(!v&&optional)return true; return /^\d{7,15}$/.test(v)||'Usa entre 7 y 15 dígitos.' }
function errorMessage(error) { const errors=error?.response?.data?.errors; return errors?Object.values(errors).flat()[0]:error?.response?.data?.message||'No pudimos crear tu cuenta.' }

async function submit() {
  const valid=await formRef.value?.validate(); if(valid===false)return
  try {
    if(googleMode.value){
      await auth.registerClient({
        token:String(route.query.token), nombre:form.nombre.trim(), celular:form.celular,
        whatsapp:effectiveWhatsapp.value||null,
        whatsapp_business:form.business_whatsapp_different?form.whatsapp_business:null,
      })
    } else {
      await auth.createClientAccount({
        nombre:form.nombre.trim(), correo:form.correo.trim().toLowerCase(), celular:form.celular,
        whatsapp:effectiveWhatsapp.value||null,
        whatsapp_business:form.business_whatsapp_different?form.whatsapp_business:null,
        password:form.password, password_confirmation:form.password_confirmation,
      })
    }
    $q.notify({type:'positive',message:fromRequest.value?'Tu cuenta está lista y tu solicitud quedó vinculada.':'Tu cuenta VITI está lista.'})
    await router.replace('/mi-cuenta?bienvenida=1')
  } catch(error) {
    const message=errorMessage(error)
    if (/ya (?:existe|tienes) una cuenta|inicia sesi[oó]n/i.test(message)) {
      $q.dialog({
        title:'Ya tienes una cuenta VITI',
        message:'No necesitas registrarte otra vez. Inicia sesión y VITI mantendrá tus solicitudes vinculadas.',
        ok:{label:'Iniciar sesión',color:'primary',unelevated:true}, cancel:{label:'Quedarme aquí',flat:true},
      }).onOk(()=>router.push({path:'/login',query:{correo:form.correo}}))
      return
    }
    $q.notify({type:'negative',message})
  }
}

onMounted(async()=>{
  if(googleMode.value){
    await auth.initialize(true).catch(()=>{})
    const full=[auth.user?.nombre,auth.user?.apellido].filter(Boolean).join(' ').trim()
    if(full)form.nombre=full
    if(auth.user?.correo)form.correo=auth.user.correo
  } else {
    if(route.query.nombre) form.nombre=String(route.query.nombre)
    if(route.query.correo) form.correo=String(route.query.correo).toLowerCase()
    if(route.query.celular) form.celular=digits(route.query.celular)
    if(route.query.whatsapp){ form.whatsapp_same=false; form.whatsapp=digits(route.query.whatsapp) }
  }
})
</script>

<template>
  <q-page class="register-page">
    <header class="register-header">
      <router-link to="/viti" class="brand-link"><AppBrand /></router-link>
      <div class="header-actions"><q-btn flat no-caps label="Ver demo" to="/demo"/><q-btn outline no-caps color="orange" label="Ya tengo cuenta" to="/login"/></div>
    </header>

    <main class="register-shell">
      <section class="register-copy">
        <div class="eyebrow">CREAR CUENTA VITI</div>
        <h1>{{ fromRequest ? 'Tu solicitud ya está guardada.' : 'Empieza sin elegir un plan.' }}</h1>
        <p v-if="fromRequest">Crea tu acceso con el mismo correo y VITI vinculará automáticamente la solicitud que acabas de enviar.</p>
        <p v-else>Tu cuenta sirve para guardar solicitudes, revisar avances y recibir tus sistemas. Puedes elegir un plan después.</p>
        <div class="benefits"><div><q-icon name="check_circle"/> Sin plan obligatorio</div><div><q-icon name="check_circle"/> Sin datos técnicos</div><div><q-icon name="check_circle"/> Solicitudes vinculadas por correo</div></div>
      </section>

      <q-card flat class="register-card"><q-card-section class="q-pa-lg">
        <div class="card-kicker">{{googleMode?'COMPLETA TU ACCESO':'REGISTRO SIMPLE'}}</div>
        <h2>{{googleMode?'Solo faltan tus datos de contacto.':'Crea tu cuenta en pocos pasos.'}}</h2>
        <p>Crear una cuenta no activa un plan ni genera cobros.</p>
        <q-form ref="formRef" @submit="submit">
          <q-input v-model="form.nombre" outlined label="Nombre completo *" autocomplete="name" class="q-mt-lg" :rules="[v=>String(v||'').trim().length>=3||'Escribe tu nombre completo.']"/>
          <q-input v-if="!googleMode" v-model="form.correo" outlined type="email" label="Correo electrónico *" autocomplete="email" class="q-mt-sm" :rules="[v=>/.+@.+\..+/.test(String(v||''))||'Escribe un correo válido.']"/>
          <q-input v-else v-model="form.correo" outlined label="Correo electrónico" readonly class="q-mt-sm"/>
          <q-input :model-value="form.celular" outlined label="Celular *" inputmode="numeric" autocomplete="tel" class="q-mt-sm" :rules="[v=>validPhone(v)]" @update:model-value="v=>normalize('celular',v)"/>

          <div class="contact-option q-mt-sm">
            <q-toggle v-model="form.whatsapp_same" color="orange" label="Mi celular también tiene WhatsApp"/>
            <q-input v-if="!form.whatsapp_same" :model-value="form.whatsapp" outlined label="WhatsApp *" inputmode="numeric" class="q-mt-sm" :rules="[v=>validPhone(v)]" @update:model-value="v=>normalize('whatsapp',v)"/>
          </div>
          <div class="contact-option q-mt-sm">
            <q-toggle v-model="form.business_whatsapp_different" color="orange" label="Mi negocio atiende desde otro WhatsApp"/>
            <q-input v-if="form.business_whatsapp_different" :model-value="form.whatsapp_business" outlined label="WhatsApp del negocio *" inputmode="numeric" class="q-mt-sm" :rules="[v=>validPhone(v)]" @update:model-value="v=>normalize('whatsapp_business',v)"/>
          </div>

          <template v-if="!googleMode">
            <q-input v-model="form.password" outlined :type="showPassword?'text':'password'" label="Contraseña *" autocomplete="new-password" class="q-mt-md" :rules="[v=>String(v||'').length>=8||'Mínimo 8 caracteres.',v=>/[A-Za-z]/.test(v)&&/\d/.test(v)||'Incluye letras y números.']"><template #append><q-icon :name="showPassword?'visibility_off':'visibility'" class="cursor-pointer" @click="showPassword=!showPassword"/></template></q-input>
            <q-input v-model="form.password_confirmation" outlined :type="showPassword?'text':'password'" label="Confirmar contraseña *" autocomplete="new-password" class="q-mt-sm" :rules="[v=>v===form.password||'Las contraseñas no coinciden.']"/>
          </template>
          <q-btn type="submit" color="primary" unelevated no-caps size="lg" class="full-width register-btn q-mt-lg" :loading="auth.loading" label="Crear mi cuenta VITI" icon-right="arrow_forward"/>
        </q-form>
        <div class="account-note"><q-icon name="info"/> Si ya enviaste una solicitud con este correo, VITI la vinculará; no tienes que repetirla.</div>
      </q-card-section></q-card>
    </main>
    <footer class="register-footer">VITI · Plataforma de sistemas y proyectos <span>· Tecnología desarrollada por AGR Studio</span></footer>
  </q-page>
</template>

<style scoped>
.register-page{min-height:100vh;background:radial-gradient(circle at 88% 4%,rgba(36,107,199,.18),transparent 30rem),linear-gradient(180deg,#06111f,#09192b);color:#edf4fb;padding:0 20px}.register-header{width:min(1160px,100%);margin:auto;min-height:80px;display:flex;align-items:center;justify-content:space-between;gap:16px;border-bottom:1px solid rgba(99,132,162,.18)}.brand-link{text-decoration:none;color:inherit}.header-actions{display:flex;gap:8px}.header-actions :deep(.q-btn){border-radius:12px}.register-shell{width:min(1060px,100%);min-height:calc(100vh - 140px);margin:auto;display:grid;grid-template-columns:1fr 480px;gap:70px;align-items:center;padding:50px 0}.eyebrow,.card-kicker{font-size:11px;font-weight:900;letter-spacing:.15em;color:#f28b30}.register-copy h1{font-size:clamp(46px,6vw,72px);line-height:.98;letter-spacing:-.055em;margin:14px 0 22px;color:#f7fbff}.register-copy>p{max-width:610px;color:#adbdcc;font-size:18px;line-height:1.7}.benefits{display:grid;gap:10px;margin-top:28px;color:#c2cfda}.benefits>div{display:flex;gap:9px;align-items:center}.benefits .q-icon{color:#f28b30}.register-card{background:linear-gradient(180deg,#0d2036,#0a192b)!important;color:#edf4fb;border:1px solid rgba(79,112,143,.35);border-radius:24px;box-shadow:0 26px 70px rgba(0,0,0,.25)}.register-card h2{font-size:29px;line-height:1.08;letter-spacing:-.035em;margin:9px 0}.register-card p{color:#9fb0c0;margin:0;line-height:1.55}.register-card :deep(.q-field--outlined .q-field__control){background:#07192a!important;border-radius:14px}.register-card :deep(.q-field--outlined .q-field__control:before){border-color:#294761!important}.register-card :deep(.q-field--focused .q-field__control:before){border-color:#f28b30!important}.register-card :deep(.q-field__native),.register-card :deep(.q-field__input){color:#edf4fb!important}.register-card :deep(.q-field__label){color:#8fa5b9!important}.contact-option{padding:10px 13px;border:1px solid #294761;border-radius:14px;background:#07192a}.register-btn{min-height:50px;border-radius:13px}.account-note{margin-top:14px;color:#8298ac;font-size:11px;display:flex;gap:7px;align-items:flex-start;line-height:1.5}.register-footer{text-align:center;color:#71879b;font-size:11px;padding:22px 0 30px}.register-footer span{opacity:.75}@media(max-width:900px){.register-shell{grid-template-columns:1fr;gap:28px;align-items:start;padding:44px 0 70px}.register-copy h1{font-size:48px}}@media(max-width:600px){.register-page{padding:0 12px 70px}.register-header{min-height:70px}.header-actions .q-btn:first-child{display:none}.register-copy h1{font-size:40px}.register-copy>p{font-size:16px}.register-card .q-card__section{padding:20px!important}.register-footer{text-align:left;padding-left:4px}.register-footer span{display:block;margin-top:4px}}
</style>
