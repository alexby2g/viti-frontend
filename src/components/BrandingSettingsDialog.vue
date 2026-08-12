<script setup>
import { reactive, ref, watch } from 'vue'
import { useQuasar } from 'quasar'
import { useBrandingStore } from '../stores/branding'

const props = defineProps({ modelValue: Boolean })
const emit = defineEmits(['update:modelValue'])
const $q = useQuasar()
const branding = useBrandingStore()
const logoInput = ref(null)
const uploadingLogo = ref(false)
const form = reactive({})

const colorFields = [
  { key: 'primary_color', label: 'Color principal' },
  { key: 'secondary_color', label: 'Color secundario' },
  { key: 'accent_color', label: 'Color de acento' },
  { key: 'dark_color', label: 'Color oscuro' },
  { key: 'drawer_color', label: 'Color del menú lateral' },
]
const guidePositions = [
  { label: 'Lateral derecho, centrada', value: 'right-center' },
  { label: 'Esquina inferior derecha', value: 'right-bottom' },
]

function syncForm() {
  Object.assign(form, {
    studio_name: branding.studio_name,
    product_name: branding.product_name,
    product_meaning: branding.product_meaning,
    tagline: branding.tagline,
    primary_color: branding.primary_color,
    secondary_color: branding.secondary_color,
    accent_color: branding.accent_color,
    dark_color: branding.dark_color,
    drawer_color: branding.drawer_color,
    guide_enabled: branding.guide_enabled,
    guide_position: branding.guide_position,
  })
}

watch(() => props.modelValue, async open => {
  if (!open) return
  await branding.load(true)
  syncForm()
}, { immediate: true })

function close() { emit('update:modelValue', false) }
function chooseLogo() { logoInput.value?.click() }
async function uploadLogo(event) {
  const file = event.target?.files?.[0]
  if (!file) return
  uploadingLogo.value = true
  try {
    await branding.uploadLogo(file)
    $q.notify({ type: 'positive', message: 'Logotipo actualizado.' })
  } catch (error) {
    $q.notify({ type: 'negative', message: error.response?.data?.message || 'No se pudo actualizar el logotipo.' })
  } finally {
    uploadingLogo.value = false
    if (event.target) event.target.value = ''
  }
}
async function removeLogo() {
  try {
    await branding.removeLogo()
    $q.notify({ type: 'positive', message: 'Se restauró el monograma AGR.' })
  } catch (error) {
    $q.notify({ type: 'negative', message: error.response?.data?.message || 'No se pudo quitar el logotipo.' })
  }
}
function restoreDefaults() {
  const defaults = branding.defaults()
  Object.assign(form, defaults)
}
async function save() {
  try {
    await branding.save({ ...form })
    syncForm()
    $q.notify({ type: 'positive', message: 'Marca y apariencia actualizadas para toda la plataforma.' })
    close()
  } catch (error) {
    const errors = error.response?.data?.errors
    const message = errors ? Object.values(errors).flat()[0] : error.response?.data?.message
    $q.notify({ type: 'negative', message: message || 'No se pudo guardar la configuración.' })
  }
}
</script>

<template>
  <q-dialog :model-value="modelValue" @update:model-value="value => emit('update:modelValue', value)">
    <q-card class="branding-dialog">
      <q-card-section class="row items-start q-col-gutter-md">
        <div class="col">
          <div class="section-label">Administración</div>
          <div class="text-h5 text-weight-bold">Marca y apariencia</div>
          <div class="text-caption text-grey-6">Cambia la identidad visible de VITI sin editar código ni volver a compilar el frontend.</div>
        </div>
        <div class="col-auto"><q-btn flat round dense icon="close" @click="close" /></div>
      </q-card-section>
      <q-separator />

      <q-card-section class="scroll" style="max-height:72vh">
        <div class="row q-col-gutter-lg">
          <div class="col-12 col-md-7">
            <div class="text-subtitle1 text-weight-bold q-mb-sm">Identidad</div>
            <div class="row q-col-gutter-md">
              <div class="col-12 col-sm-6"><q-input v-model="form.studio_name" outlined label="Marca / estudio" hint="Ej.: AGR Studio" /></div>
              <div class="col-12 col-sm-6"><q-input v-model="form.product_name" outlined label="Nombre del producto" hint="Ej.: VITI" /></div>
              <div class="col-12"><q-input v-model="form.product_meaning" outlined label="Significado de las siglas" hint="Visión Integral, Tecnología e Innovación" /></div>
              <div class="col-12"><q-input v-model="form.tagline" outlined label="Descripción corta" /></div>
            </div>

            <div class="text-subtitle1 text-weight-bold q-mt-lg q-mb-sm">Colores</div>
            <div class="row q-col-gutter-md">
              <div v-for="field in colorFields" :key="field.key" class="col-12 col-sm-6">
                <q-input v-model="form[field.key]" outlined :label="field.label" maxlength="7">
                  <template #prepend><input v-model="form[field.key]" type="color" class="native-color" :aria-label="field.label" /></template>
                </q-input>
              </div>
            </div>

            <div class="text-subtitle1 text-weight-bold q-mt-lg q-mb-sm">Guía flotante</div>
            <div class="row q-col-gutter-md items-center">
              <div class="col-12 col-sm-5"><q-toggle v-model="form.guide_enabled" label="Mostrar Guía flotante" color="primary" /></div>
              <div class="col-12 col-sm-7"><q-select v-model="form.guide_position" outlined emit-value map-options :options="guidePositions" label="Posición en escritorio" :disable="!form.guide_enabled" /></div>
            </div>
          </div>

          <div class="col-12 col-md-5">
            <q-card flat bordered class="preview-card">
              <q-card-section>
                <div class="section-label">Vista previa</div>
                <div class="preview-shell q-mt-sm" :style="{ background: form.drawer_color }">
                  <div class="preview-logo">
                    <img v-if="branding.logoUrl" :src="branding.logoUrl" alt="Logo actual" />
                    <span v-else>AGR</span>
                  </div>
                  <div class="preview-copy">
                    <small>{{ form.studio_name }}</small>
                    <strong>{{ form.product_name }}</strong>
                    <span>{{ form.product_meaning }}</span>
                    <em>{{ form.tagline }}</em>
                  </div>
                </div>
                <div class="row q-gutter-sm q-mt-md">
                  <q-btn outline color="primary" icon="image" label="Cambiar logo" no-caps :loading="uploadingLogo" @click="chooseLogo" />
                  <q-btn v-if="branding.logo_path" flat color="negative" icon="delete_outline" label="Quitar" no-caps @click="removeLogo" />
                  <input ref="logoInput" type="file" accept="image/jpeg,image/png,image/webp" hidden @change="uploadLogo" />
                </div>
                <div class="text-caption text-grey-6 q-mt-sm">PNG, JPG o WebP hasta 3 MB. Si no hay logo, VITI conserva el monograma AGR.</div>
              </q-card-section>
            </q-card>

            <q-banner rounded class="bg-blue-1 text-primary q-mt-md">
              <template #avatar><q-icon name="info" /></template>
              Los cambios de nombre y color se aplican a la identidad general. Los nombres propios de aplicaciones como Electrofrío o Soporte Vital permanecen independientes.
            </q-banner>
          </div>
        </div>
      </q-card-section>

      <q-separator />
      <q-card-actions align="between" class="q-pa-md">
        <q-btn flat color="grey-7" icon="restart_alt" label="Restaurar valores VITI" no-caps @click="restoreDefaults" />
        <div class="row q-gutter-sm"><q-btn flat label="Cancelar" no-caps @click="close" /><q-btn color="primary" unelevated icon="save" label="Guardar cambios" no-caps :loading="branding.saving" @click="save" /></div>
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<style scoped>
.branding-dialog{width:980px;max-width:96vw}.native-color{width:28px;height:28px;border:0;padding:0;background:transparent;cursor:pointer}.preview-card{border-radius:18px}.preview-shell{display:flex;align-items:flex-start;gap:10px;padding:18px;border-radius:16px;color:#fff;min-height:132px}.preview-logo{display:grid;place-items:center;width:52px;height:52px;flex:0 0 52px;border-radius:13px;background:#111115;border:1px solid rgba(255,255,255,.18);font-weight:900;letter-spacing:.1em;overflow:hidden}.preview-logo img{width:100%;height:100%;object-fit:contain;background:#fff;padding:4px}.preview-copy{min-width:0;display:flex;flex-direction:column}.preview-copy small{text-transform:uppercase;letter-spacing:.14em;opacity:.7;font-weight:800}.preview-copy strong{font-size:25px;letter-spacing:.15em}.preview-copy span{font-size:11px;font-weight:700;line-height:1.25;opacity:.9}.preview-copy em{font-size:10px;line-height:1.25;opacity:.66;font-style:normal;margin-top:4px}@media(max-width:600px){.branding-dialog{width:calc(100vw - 12px)!important;max-width:calc(100vw - 12px)!important}.q-card__actions{display:flex!important;flex-direction:column;align-items:stretch!important}.q-card__actions>.row{display:grid!important;grid-template-columns:1fr!important;width:100%}.q-card__actions .q-btn{width:100%}}
</style>
