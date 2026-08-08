<script setup>
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { api, initCsrf } from '../boot/axios'
import AppBrand from '../components/AppBrand.vue'

const router = useRouter()
const $q = useQuasar()
const step = ref(1)
const saving = ref(false)

const form = reactive({
  nombre:'', telefono:'', whatsapp:'', documento:'', ci_expedido:'', ciudad:'', direccion:'',
  empresa_nombre:'', empresa_actividad:'', empresa_telefono:'', empresa_whatsapp:'', empresa_ciudad:'', empresa_direccion:'',
  titulo_sistema:'', resumen:'',
})

const canContinue1 = computed(() => form.nombre.trim().length >= 3 && /^\d{7,15}$/.test(form.telefono) && form.ciudad.trim().length >= 2)
const canContinue2 = computed(() => form.empresa_nombre.trim().length >= 2 && form.titulo_sistema.trim().length >= 3)

function errorMessage(e, fallback) {
  const bag = e?.response?.data?.errors
  if (bag) return Object.values(bag).flat()[0]
  return e?.response?.data?.message || fallback
}

async function submit() {
  if (!canContinue1.value || !canContinue2.value) return
  saving.value = true
  try {
    await initCsrf()
    const payload = Object.fromEntries(Object.entries(form).filter(([, value]) => String(value ?? '').trim() !== ''))
    const { data } = await api.post('/publico/solicitudes', payload)
    $q.notify({ type:'positive', message:'Datos registrados. Ahora completa el formulario de requerimientos.' })
    await router.replace(data.data.ruta_cuestionario)
  } catch (e) {
    $q.notify({ type:'negative', message:errorMessage(e, 'No pudimos registrar tu solicitud.') })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <q-page class="public-start-page">
    <div class="public-start-shell">
      <div class="row items-center justify-between q-mb-lg">
        <AppBrand />
        <q-badge outline color="primary">Formulario web</q-badge>
      </div>

      <div class="section-label">Nueva solicitud</div>
      <h1 class="page-title">Cuéntanos qué necesitas</h1>
      <p class="page-subtitle">Completa tus datos desde el navegador. No necesitas instalar VITI ni crear una cuenta para enviar tu solicitud.</p>

      <q-banner rounded class="bg-blue-1 text-primary q-mt-lg">
        <template #avatar><q-icon name="language" /></template>
        Tus datos crearán una ficha de contacto, tu negocio y una solicitud. Después pasarás al formulario de requerimientos.
      </q-banner>

      <q-card flat class="viti-card q-mt-lg public-start-card">
        <q-card-section>
          <div class="steps-row">
            <div :class="['step-dot',{active:step>=1}]">1</div><div class="step-line"/>
            <div :class="['step-dot',{active:step>=2}]">2</div><div class="step-line"/>
            <div :class="['step-dot',{active:step>=3}]">3</div>
          </div>
          <div class="row justify-between text-caption text-grey-6 q-mt-sm"><span>Tus datos</span><span>Tu negocio</span><span>Confirmar</span></div>
        </q-card-section>

        <q-separator />

        <q-card-section v-if="step===1" class="q-pa-lg">
          <div class="text-h6 text-weight-bold q-mb-xs">Datos de contacto</div>
          <div class="text-caption text-grey-6 q-mb-lg">Usaremos esta información únicamente para atender y dar seguimiento a tu solicitud.</div>
          <div class="row q-col-gutter-md">
            <div class="col-12 col-sm-8"><q-input v-model="form.nombre" outlined label="Nombre completo *" autocomplete="name" /></div>
            <div class="col-12 col-sm-4"><q-input v-model="form.telefono" outlined label="Teléfono *" inputmode="numeric" maxlength="15" /></div>
            <div class="col-12 col-sm-6"><q-input v-model="form.whatsapp" outlined label="WhatsApp" inputmode="numeric" maxlength="15" hint="Si lo dejas vacío usaremos tu teléfono." /></div>
            <div class="col-12 col-sm-4"><q-input v-model="form.documento" outlined label="Cédula de identidad" /></div>
            <div class="col-12 col-sm-2"><q-input v-model="form.ci_expedido" outlined label="Exp." placeholder="BEN" /></div>
            <div class="col-12 col-sm-5"><q-input v-model="form.ciudad" outlined label="Ciudad o localidad *" /></div>
            <div class="col-12 col-sm-7"><q-input v-model="form.direccion" outlined label="Dirección o zona" /></div>
          </div>
        </q-card-section>

        <q-card-section v-else-if="step===2" class="q-pa-lg">
          <div class="text-h6 text-weight-bold q-mb-xs">Negocio y solicitud</div>
          <div class="text-caption text-grey-6 q-mb-lg">Puede ser una microempresa, institución, emprendimiento o proyecto personal.</div>
          <div class="row q-col-gutter-md">
            <div class="col-12"><q-input v-model="form.empresa_nombre" outlined label="Nombre del negocio, institución o proyecto *" /></div>
            <div class="col-12"><q-input v-model="form.empresa_actividad" outlined label="¿A qué se dedica?" /></div>
            <div class="col-12 col-sm-6"><q-input v-model="form.empresa_telefono" outlined label="Teléfono del negocio" inputmode="numeric" /></div>
            <div class="col-12 col-sm-6"><q-input v-model="form.empresa_whatsapp" outlined label="WhatsApp del negocio" inputmode="numeric" /></div>
            <div class="col-12 col-sm-5"><q-input v-model="form.empresa_ciudad" outlined label="Ciudad del negocio" /></div>
            <div class="col-12 col-sm-7"><q-input v-model="form.empresa_direccion" outlined label="Dirección del negocio" /></div>
            <div class="col-12"><q-input v-model="form.titulo_sistema" outlined label="¿Qué sistema necesitas? *" placeholder="Ej.: Sistema para administrar mi taller" /></div>
            <div class="col-12"><q-input v-model="form.resumen" outlined type="textarea" autogrow label="Cuéntanos brevemente qué problema quieres resolver" /></div>
          </div>
        </q-card-section>

        <q-card-section v-else class="q-pa-lg">
          <div class="text-h6 text-weight-bold q-mb-sm">Revisa antes de continuar</div>
          <div class="text-body2 text-grey-7 q-mb-lg">Al continuar registraremos la solicitud y te enviaremos directamente al cuestionario. No se creará ninguna contraseña.</div>
          <q-list bordered separator class="rounded-borders">
            <q-item><q-item-section avatar><q-icon name="person" color="primary" /></q-item-section><q-item-section><q-item-label>{{form.nombre}}</q-item-label><q-item-label caption>{{form.telefono}} · {{form.ciudad}}</q-item-label></q-item-section></q-item>
            <q-item><q-item-section avatar><q-icon name="business" color="primary" /></q-item-section><q-item-section><q-item-label>{{form.empresa_nombre}}</q-item-label><q-item-label caption>{{form.empresa_actividad || 'Actividad por completar'}}</q-item-label></q-item-section></q-item>
            <q-item><q-item-section avatar><q-icon name="assignment" color="primary" /></q-item-section><q-item-section><q-item-label>{{form.titulo_sistema}}</q-item-label><q-item-label caption>{{form.resumen || 'El detalle se completará en el cuestionario.'}}</q-item-label></q-item-section></q-item>
          </q-list>
        </q-card-section>

        <q-separator />
        <q-card-actions class="q-pa-lg">
          <q-btn v-if="step>1" flat no-caps color="primary" icon="arrow_back" label="Atrás" @click="step--" />
          <q-space />
          <q-btn v-if="step===1" color="primary" unelevated no-caps label="Continuar" icon-right="arrow_forward" :disable="!canContinue1" @click="step=2" />
          <q-btn v-else-if="step===2" color="primary" unelevated no-caps label="Revisar datos" icon-right="arrow_forward" :disable="!canContinue2" @click="step=3" />
          <q-btn v-else color="primary" unelevated no-caps label="Registrar y abrir formulario" icon-right="assignment" :loading="saving" @click="submit" />
        </q-card-actions>
      </q-card>

      <div class="text-caption text-center text-grey-6 q-mt-lg">El enlace puede abrirse desde celular, tablet o computadora.</div>
    </div>
  </q-page>
</template>

<style scoped>
.public-start-page{min-height:100vh;background:var(--viti-bg);padding:28px 14px}.public-start-shell{width:min(900px,100%);margin:0 auto}.public-start-card{overflow:hidden}.steps-row{display:flex;align-items:center}.step-dot{width:34px;height:34px;border-radius:50%;display:grid;place-items:center;background:var(--viti-bg);color:var(--viti-muted);font-weight:800;border:1px solid var(--viti-border)}.step-dot.active{background:#1976d2;color:#fff;border-color:#1976d2}.step-line{height:2px;flex:1;background:var(--viti-border)}.body--dark .public-start-page{background:#06162b}@media(max-width:600px){.public-start-page{padding:16px 10px}.public-start-card{border-radius:18px}.public-start-card .q-card__section{padding:16px!important}.page-title{font-size:28px}}
</style>
