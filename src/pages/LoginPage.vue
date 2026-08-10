<script setup>
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { useAuthStore } from '../stores/auth'
import AppBrand from '../components/AppBrand.vue'
const auth=useAuthStore(),router=useRouter(),route=useRoute(),$q=useQuasar(),show=ref(false),showSecret=ref(false),mode=ref(route.query.tipo==='cliente'||String(route.query.redirect||'').startsWith('/mi-')?'cliente':'admin')
const form=reactive({acceso:'',password:'',codigo_secreto:''})
function errorMessage(e){const bag=e?.response?.data?.errors;if(bag)return Object.values(bag).flat()[0];return e?.response?.data?.message||'No se pudo iniciar sesión.'}
async function submit(){try{await auth.login({...form,codigo_secreto:mode.value==='admin'?form.codigo_secreto:null});const requested=typeof route.query.redirect==='string'?route.query.redirect:'';const safeClientTarget=requested.startsWith('/mi-')?requested:'/mi-aplicaciones';const target=auth.user?.rol==='cliente'?safeClientTarget:(requested||'/');router.replace(target)}catch(e){$q.notify({type:'negative',message:errorMessage(e)})}}
</script>
<template><q-page class="auth-page flex flex-center"><div class="login-card"><AppBrand/><div class="q-mt-xl section-label">Acceso a VITI</div><h1 class="page-title">Bienvenido</h1><p class="page-subtitle">Ingresa según el tipo de cuenta que utilizas.</p>
<q-btn-toggle v-model="mode" spread no-caps unelevated toggle-color="primary" color="grey-2" text-color="dark" class="q-mt-lg" :options="[{label:'Administrador',value:'admin',icon:'admin_panel_settings'},{label:'Cliente',value:'cliente',icon:'person'}]"/>
<q-form class="q-mt-lg" @submit="submit"><q-input v-model="form.acceso" outlined label="Usuario o teléfono" :rules="[v=>!!v||'Este campo es obligatorio.']"><template #prepend><q-icon name="person"/></template></q-input><q-input v-model="form.password" outlined class="q-mt-sm" :type="show?'text':'password'" label="Contraseña" :rules="[v=>!!v||'Este campo es obligatorio.']"><template #append><q-icon :name="show?'visibility_off':'visibility'" class="cursor-pointer" @click="show=!show"/></template></q-input>
<q-input v-if="mode==='admin'" v-model="form.codigo_secreto" outlined class="q-mt-sm" :type="showSecret?'text':'password'" label="Código secreto administrativo" :rules="[v=>!!v||'Ingresa el código secreto administrativo.']"><template #prepend><q-icon name="key"/></template><template #append><q-icon :name="showSecret?'visibility_off':'visibility'" class="cursor-pointer" @click="showSecret=!showSecret"/></template></q-input>
<q-btn type="submit" color="primary" unelevated label="Iniciar sesión" no-caps class="full-width q-mt-md" size="lg" :loading="auth.loading"/></q-form>
<div v-if="mode==='cliente'" class="text-center q-mt-lg">¿Es tu primera vez? <router-link to="/registro">Crear cuenta de cliente</router-link></div>
<div v-else class="text-caption text-grey-6 q-mt-md text-center">El código secreto solo se valida para el superadministrador y nunca se muestra públicamente.</div></div></q-page></template>
<style scoped>.auth-page{min-height:100vh;background:radial-gradient(circle at 80% 20%,#d9ecff,transparent 34%),#f5f8fc;padding:20px}.login-card{width:min(500px,100%);background:#fff;padding:42px;border-radius:22px;box-shadow:0 22px 65px rgba(18,45,78,.14)}.body--dark .auth-page{background:#06162b}.body--dark .login-card{background:#0c294c}@media(max-width:600px){.auth-page{padding:0;align-items:stretch}.login-card{width:100%;min-height:100vh;padding:28px 16px;border-radius:0;box-shadow:none}.page-title{font-size:28px}.q-btn-toggle{font-size:13px}}</style>
