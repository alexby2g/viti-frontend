<script setup>
import { onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { api } from '../boot/axios'

const route = useRoute()
const router = useRouter()
const $q = useQuasar()
const applicationId = Number(route.params.id)
const loading = ref(false)
const saving = ref(false)
const catalog = ref([])
const planModules = ref(null)
const application = ref(null)
const config = reactive({
  heredar_modulos_plan: true,
  modulos: [],
  branding: { nombre: '', logo_url: '', icono: 'apps', color_principal: '', color_secundario: '' },
})

function allowed(key) {
  return planModules.value === null || planModules.value.includes(key)
}

function enabled(key) {
  return config.modulos.includes(key)
}

function toggleModule(key) {
  if (!allowed(key) || config.heredar_modulos_plan) return
  config.modulos = enabled(key)
    ? config.modulos.filter(x => x !== key)
    : [...config.modulos, key]
}

async function load() {
  if (!Number.isInteger(applicationId) || applicationId <= 0) {
    $q.notify({ type: 'negative', message: 'Aplicación inválida.' })
    router.back()
    return
  }

  loading.value = true
  try {
    const { data } = await api.get(`/aplicaciones/${applicationId}`, { params: { editor: 1 } })
    const payload = data.data || {}
    application.value = payload.aplicacion || null
    catalog.value = payload.catalogo_modulos || []
    planModules.value = payload.plan?.modulos ?? null
    Object.assign(config, {
      heredar_modulos_plan: payload.configuracion?.heredar_modulos_plan !== false,
      modulos: [...(payload.configuracion?.modulos || [])],
      branding: {
        nombre: payload.configuracion?.branding?.nombre || payload.aplicacion?.nombre || '',
        logo_url: payload.configuracion?.branding?.logo_url || '',
        icono: payload.configuracion?.branding?.icono || payload.aplicacion?.icono || 'apps',
        color_principal: payload.configuracion?.branding?.color_principal || '',
        color_secundario: payload.configuracion?.branding?.color_secundario || '',
      },
    })
  } catch (error) {
    $q.notify({ type: 'negative', message: error.response?.data?.message || 'No se pudo cargar el molde.' })
  } finally {
    loading.value = false
  }
}

async function save() {
  if (!application.value) return
  saving.value = true
  try {
    await api.put(`/aplicaciones/${applicationId}`, {
      editor: true,
      heredar_modulos_plan: config.heredar_modulos_plan,
      modulos: config.heredar_modulos_plan ? (planModules.value || config.modulos) : config.modulos,
      branding: config.branding,
    })
    $q.notify({ type: 'positive', message: 'Molde guardado correctamente para esta aplicación.' })
    await load()
  } catch (error) {
    $q.notify({ type: 'negative', message: error.response?.data?.message || 'No se pudo guardar el molde.' })
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<template>
  <q-page class="viti-page q-pa-lg">
    <div class="row items-center q-mb-lg">
      <q-btn flat round icon="arrow_back" @click="router.back()" />
      <div class="col q-ml-sm">
        <div class="text-overline text-primary">VITI · MOLDEADOR</div>
        <div class="text-h5 text-weight-bold">{{ config.branding.nombre || application?.nombre || 'Aplicación' }}</div>
        <div class="text-caption text-grey-6">{{ application?.empresa?.nombre_comercial || 'Empresa' }}</div>
      </div>
      <q-btn color="primary" unelevated icon="save" label="Guardar molde" :loading="saving" :disable="loading || !application" no-caps @click="save" />
    </div>

    <q-inner-loading :showing="loading">
      <q-spinner-gears color="primary" size="48px" />
    </q-inner-loading>

    <div v-if="!loading && application" class="row q-col-gutter-lg">
      <div class="col-12 col-lg-5">
        <q-card flat class="viti-card">
          <q-card-section>
            <div class="text-subtitle1 text-weight-bold">Identidad de la aplicación</div>
            <div class="text-caption text-grey-6 q-mb-md">Esta configuración pertenece solo a esta aplicación.</div>
            <q-input v-model="config.branding.nombre" outlined class="q-mb-md" label="Nombre para el cliente" />
            <q-input v-model="config.branding.logo_url" outlined class="q-mb-md" label="URL del logo" />
            <q-input v-model="config.branding.icono" outlined class="q-mb-md" label="Ícono Quasar" hint="Ej.: ac_unit, content_cut, build" />
            <div class="row q-col-gutter-md">
              <div class="col-12 col-sm-6"><q-input v-model="config.branding.color_principal" outlined label="Color principal" placeholder="#6C5CE7" /></div>
              <div class="col-12 col-sm-6"><q-input v-model="config.branding.color_secundario" outlined label="Color secundario" placeholder="#182848" /></div>
            </div>
          </q-card-section>
        </q-card>

        <q-card flat class="viti-card q-mt-lg">
          <q-card-section>
            <div class="text-subtitle1 text-weight-bold">Regla del plan</div>
            <div class="text-body2 text-grey-7 q-mt-xs">El Moldeador no puede ampliar las capacidades comerciales de la empresa.</div>
            <q-banner rounded class="q-mt-md bg-grey-2 text-grey-8">
              <template #avatar><q-icon name="shield" color="primary" /></template>
              Los módulos no permitidos por el plan permanecen bloqueados.
            </q-banner>
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-lg-7">
        <q-card flat class="viti-card">
          <q-card-section>
            <div class="row items-center">
              <div>
                <div class="text-subtitle1 text-weight-bold">Módulos</div>
                <div class="text-caption text-grey-6">El plan es el techo; el molde define la selección cuando no heredas.</div>
              </div>
              <q-space />
              <q-toggle v-model="config.heredar_modulos_plan" color="primary" label="Heredar plan" />
            </div>

            <q-banner v-if="config.heredar_modulos_plan" rounded class="bg-grey-2 text-grey-8 q-mt-md">
              La aplicación usa automáticamente los módulos incluidos en el plan de la empresa.
            </q-banner>

            <div class="row q-col-gutter-md q-mt-md">
              <div v-for="module in catalog" :key="module.key" class="col-12 col-sm-6">
                <q-card flat bordered class="q-pa-sm module-card" :class="{ 'module-disabled': !allowed(module.key) }" @click="toggleModule(module.key)">
                  <div class="row items-center no-wrap">
                    <q-checkbox :model-value="config.heredar_modulos_plan ? allowed(module.key) : enabled(module.key)" :disable="config.heredar_modulos_plan || !allowed(module.key)" color="primary" @click.stop="toggleModule(module.key)" />
                    <q-icon :name="module.icon" size="24px" color="primary" class="q-mr-sm" />
                    <div class="col">
                      <div class="text-weight-bold">{{ module.label }}</div>
                      <div v-if="!allowed(module.key)" class="text-caption text-negative">No incluido en el plan</div>
                    </div>
                  </div>
                </q-card>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<style scoped>
.module-card{cursor:pointer;transition:.18s ease}.module-card:hover{transform:translateY(-1px);border-color:var(--q-primary)}.module-disabled{opacity:.55;cursor:not-allowed}
</style>
