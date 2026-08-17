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
const form=reactive({acceso:'',password:'',codigo_secreto:''})
const fieldErrors=useFormErrors()

function clearField(field){fieldErrors.clear(field)}
function errorMessage(e){return fieldErrors.fromResponse(e,'No se pudo iniciar sesión. Revisa los datos marcados.')}

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
    <div class="login-card">
      <AppBrand/>
      <div class="q-mt-xl section-label">VITI · producto de AGR Studio</div>
      <h1 class="page-title">Acceso a la plataforma</h1>
      <p class="page-subtitle">Solicitudes, proyectos, aplicaciones y seguimiento desde un solo espacio.</p>

      <q-btn-toggle
        v-model="mode"
        spread
        no-caps
        unelevated
        toggle-color="primary"
        :color="$q.dark.isActive?'grey-10':'grey-2'"
        :text-color="$q.dark.isActive?'grey-4':'dark'"
        class="q-mt-lg access-toggle"
        :options="[{label:'Administrador / Soporte',value:'admin',icon:'admin_panel_settings'},{label:'Cliente',value:'cliente',icon:'person'}]"
      />

      <q-form ref="formRef" class="q-mt-lg" @submit="submit">
        <div data-error-field="acceso">
          <q-input
            v-model="form.acceso"
            outlined
            label="Usuario, teléfono o CI"
            hint="Puedes ingresar con cualquiera de estos tres datos."
            :error="fieldErrors.has('acceso')"
            :error-message="fieldErrors.message('acceso')"
            :rules="[v=>!!v||'Ingresa tu usuario, teléfono o CI.']"
            @update:model-value="clearField('acceso')"
          ><template #prepend><q-icon name="badge"/></template></q-input>
        </div>
        <div data-error-field="password">
          <q-input
            v-model="form.password"
            outlined
            class="q-mt-sm"
            :type="show?'text':'password'"
            label="Contraseña"
            :error="fieldErrors.has('password')"
            :error-message="fieldErrors.message('password')"
            :rules="[v=>!!v||'Ingresa tu contraseña.']"
            @update:model-value="clearField('password')"
          ><template #append><q-icon :name="show?'visibility_off':'visibility'" class="cursor-pointer" @click="show=!show"/></template></q-input>
        </div>
        <div v-if="mode==='admin'" data-error-field="codigo_secreto">
          <q-input
            v-model="form.codigo_secreto"
            outlined
            class="q-mt-sm"
            :type="showSecret?'text':'password'"
            label="Código secreto (solo superadministrador)"
            hint="Administradores y soporte interno dejan este campo vacío."
            clearable
            :error="fieldErrors.has('codigo_secreto')"
            :error-message="fieldErrors.message('codigo_secreto')"
            @update:model-value="clearField('codigo_secreto')"
          ><template #prepend><q-icon name="key"/></template><template #append><q-icon :name="showSecret?'visibility_off':'visibility'" class="cursor-pointer" @click="showSecret=!showSecret"/></template></q-input>
        </div>
        <q-btn type="submit" color="primary" unelevated label="Ingresar a VITI" no-caps class="full-width q-mt-md" size="lg" :loading="auth.loading"><template #loading><q-spinner size="22px" class="q-mr-sm"/><span>{{ auth.loginStage || 'Conectando...' }}</span></template></q-btn>
      </q-form>

      <div v-if="mode==='cliente'" class="text-center q-mt-lg">
        ¿Es tu primera vez? <router-link to="/viti/acceso">Ver cómo obtener acceso</router-link>
      </div>
      <div v-else class="text-caption text-grey-6 q-mt-md text-center">El código secreto pertenece únicamente al superadministrador. Las cuentas internas usan su usuario y contraseña normal.</div>

      <div class="row justify-center q-gutter-sm q-mt-lg">
        <q-btn flat no-caps color="primary" icon="info" label="Conocer VITI" to="/viti" />
        <q-btn v-if="mode==='cliente'" flat no-caps color="primary" icon="vpn_key" label="Tengo un código" to="/viti/acceso" />
      </div>
      <div class="agr-signature q-mt-lg">Desarrollado y administrado por <strong>AGR Studio</strong></div>
    </div>
  </q-page>
</template>

<style scoped>
.auth-page{min-height:100vh;padding:20px;position:relative;overflow:hidden}.login-card{width:min(510px,100%);padding:40px;border-radius:18px}.page-title{margin-top:8px}.access-toggle{border:1px solid var(--viti-border);border-radius:12px;overflow:hidden}.agr-signature{padding-top:18px;border-top:1px solid var(--viti-border);font-size:11px;color:var(--viti-muted);text-align:center;letter-spacing:.02em}.agr-signature strong{color:var(--viti-text);font-weight:800}@media(max-width:600px){.auth-page{padding:0;align-items:stretch}.login-card{width:100%;min-height:100vh;padding:28px 16px;border-radius:0!important;border-left:0!important;border-right:0!important}.page-title{font-size:28px}.access-toggle{font-size:13px}}
</style>
