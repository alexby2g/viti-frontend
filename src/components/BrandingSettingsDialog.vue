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
const colorDraft = reactive({})
const softness = reactive({})

const colorFields = [
  {
    key: 'primary_color',
    label: 'Acciones principales',
    short: 'Principal',
    icon: 'ads_click',
    description: 'Botones principales, enlaces activos, progreso y acciones destacadas.',
    neutral: '#667F99',
  },
  {
    key: 'secondary_color',
    label: 'Estados positivos',
    short: 'Secundario',
    icon: 'verified',
    description: 'Confirmaciones, estados correctos, elementos activos y señales de éxito.',
    neutral: '#5F8271',
  },
  {
    key: 'accent_color',
    label: 'Acentos y llamadas',
    short: 'Acento',
    icon: 'auto_awesome',
    description: 'Etiquetas, bordes, énfasis visual y llamadas de atención.',
    neutral: '#A67A52',
  },
  {
    key: 'dark_color',
    label: 'Fondo principal',
    short: 'Fondo',
    icon: 'dark_mode',
    description: 'Base oscura de la interfaz, encabezados y superficies profundas.',
    neutral: '#16283B',
  },
  {
    key: 'drawer_color',
    label: 'Menú lateral',
    short: 'Menú',
    icon: 'view_sidebar',
    description: 'Color del panel lateral donde aparecen los módulos de VITI.',
    neutral: '#173A5D',
  },
]

const themePresets = [
  {
    name: 'VITI original',
    caption: 'Azul + naranja',
    colors: ['#1565C0', '#43A047', '#FB8C00', '#071C3B', '#092B55'],
  },
  {
    name: 'Azul nocturno',
    caption: 'Serio y tecnológico',
    colors: ['#2F80ED', '#32B67A', '#F59E42', '#081827', '#0B315C'],
  },
  {
    name: 'Cian tech',
    caption: 'Más luminoso',
    colors: ['#159DD8', '#45B98D', '#FF9A3D', '#071B2A', '#0A3853'],
  },
  {
    name: 'Índigo premium',
    caption: 'Sobrio y moderno',
    colors: ['#5267D8', '#4CA783', '#E99A46', '#11192E', '#182957'],
  },
]

const guidePositions = [
  { label: 'Lateral derecho, centrada', value: 'right-center' },
  { label: 'Esquina inferior derecha', value: 'right-bottom' },
]

function normalizedHex(value, fallback = '#1565C0') {
  const raw = String(value || '').trim().toUpperCase()
  if (/^#[0-9A-F]{6}$/.test(raw)) return raw
  if (/^#[0-9A-F]{3}$/.test(raw)) {
    return `#${raw[1]}${raw[1]}${raw[2]}${raw[2]}${raw[3]}${raw[3]}`
  }
  return fallback
}

function mixHex(color, target, amount = 0) {
  const a = normalizedHex(color).slice(1)
  const b = normalizedHex(target).slice(1)
  const ratio = Math.max(0, Math.min(1, Number(amount) / 100))
  const channel = index => {
    const start = parseInt(a.slice(index, index + 2), 16)
    const end = parseInt(b.slice(index, index + 2), 16)
    return Math.round(start + (end - start) * ratio).toString(16).padStart(2, '0')
  }
  return `#${channel(0)}${channel(2)}${channel(4)}`.toUpperCase()
}


function syncColorControls() {
  for (const field of colorFields) {
    const current = normalizedHex(form[field.key], branding[field.key])
    colorDraft[field.key] = current
    softness[field.key] = 0
  }
}

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
  syncColorControls()
}

watch(() => props.modelValue, async open => {
  if (!open) return
  await branding.load(true)
  syncForm()
}, { immediate: true })

watch(colorDraft, values => {
  for (const field of colorFields) {
    const base = normalizedHex(values[field.key], form[field.key])
    form[field.key] = mixHex(base, field.neutral, softness[field.key] || 0)
  }
}, { deep: true })

watch(softness, values => {
  for (const field of colorFields) {
    const base = normalizedHex(colorDraft[field.key], form[field.key])
    form[field.key] = mixHex(base, field.neutral, values[field.key] || 0)
  }
}, { deep: true })

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

function applyPreset(preset) {
  colorFields.forEach((field, index) => {
    colorDraft[field.key] = preset.colors[index]
    softness[field.key] = 0
    form[field.key] = preset.colors[index]
  })
}

function restoreDefaults() {
  const defaults = branding.defaults()
  Object.assign(form, defaults)
  syncColorControls()
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
          <div class="text-caption text-grey-6">Elige colores visualmente y decide qué tan intensos deben verse en cada zona de VITI.</div>
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

            <div class="color-heading q-mt-lg">
              <div>
                <div class="text-subtitle1 text-weight-bold">Colores de VITI</div>
                <div class="text-caption text-grey-6">No necesitas escribir códigos. Elige un color y suavízalo si quieres un resultado menos intenso.</div>
              </div>
            </div>

            <div class="theme-presets q-mt-md">
              <button v-for="preset in themePresets" :key="preset.name" type="button" class="theme-preset" @click="applyPreset(preset)">
                <span class="preset-swatches">
                  <i v-for="color in preset.colors.slice(0, 3)" :key="color" :style="{ background: color }"></i>
                </span>
                <span><b>{{ preset.name }}</b><small>{{ preset.caption }}</small></span>
              </button>
            </div>

            <div class="color-zone-list q-mt-md">
              <article v-for="field in colorFields" :key="field.key" class="color-zone-card">
                <div class="zone-top">
                  <div class="zone-icon" :style="{ background: form[field.key], boxShadow: `0 0 24px ${form[field.key]}35` }">
                    <q-icon :name="field.icon" />
                  </div>
                  <div class="zone-copy">
                    <b>{{ field.label }}</b>
                    <span>{{ field.description }}</span>
                  </div>
                  <q-btn outline no-caps icon="palette" label="Elegir color" class="choose-color-btn">
                    <q-popup-proxy transition-show="scale" transition-hide="scale">
                      <q-card class="picker-popover">
                        <q-card-section class="q-pb-sm">
                          <div class="text-subtitle2 text-weight-bold">{{ field.label }}</div>
                          <div class="text-caption text-grey-6">Selecciona el tono que quieres utilizar.</div>
                        </q-card-section>
                        <q-color v-model="colorDraft[field.key]" no-header no-footer format-model="hex" default-view="palette" class="full-width" />
                      </q-card>
                    </q-popup-proxy>
                  </q-btn>
                </div>

                <div class="softness-row">
                  <span>Vivo</span>
                  <q-slider v-model="softness[field.key]" :min="0" :max="65" :step="5" color="primary" track-size="5px" thumb-size="18px" />
                  <span>Suave</span>
                  <div class="result-dot" :style="{ background: form[field.key] }" :title="`${field.short}: color resultante`"></div>
                </div>
              </article>
            </div>

            <div class="text-subtitle1 text-weight-bold q-mt-lg q-mb-sm">Guía flotante</div>
            <div class="row q-col-gutter-md items-center">
              <div class="col-12 col-sm-5"><q-toggle v-model="form.guide_enabled" label="Mostrar Guía flotante" color="primary" /></div>
              <div class="col-12 col-sm-7"><q-select v-model="form.guide_position" outlined emit-value map-options :options="guidePositions" label="Posición en escritorio" :disable="!form.guide_enabled" /></div>
            </div>
          </div>

          <div class="col-12 col-md-5">
            <q-card flat bordered class="preview-card sticky-preview">
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

                <div class="mini-system-preview q-mt-md" :style="{ background: form.dark_color }">
                  <aside :style="{ background: form.drawer_color }">
                    <span class="mini-brand" :style="{ background: form.primary_color }">V</span>
                    <i></i><i></i><i></i>
                  </aside>
                  <div class="mini-content">
                    <div class="mini-topbar"></div>
                    <div class="mini-title"></div>
                    <div class="mini-cards">
                      <span :style="{ borderColor: `${form.primary_color}66` }"></span>
                      <span :style="{ borderColor: `${form.secondary_color}66` }"></span>
                    </div>
                    <div class="mini-actions">
                      <b :style="{ background: form.primary_color }">Acción</b>
                      <b :style="{ color: form.accent_color, borderColor: `${form.accent_color}88` }">Acento</b>
                      <em :style="{ background: form.secondary_color }"></em>
                    </div>
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
              Cada selector cambia una zona distinta. Puedes elegir un tono fuerte y luego moverlo hacia “Suave” sin escribir códigos.
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
.branding-dialog{width:1080px;max-width:96vw}
.preview-card{border-radius:18px}
.sticky-preview{position:sticky;top:0}
.preview-shell{display:flex;align-items:flex-start;gap:10px;padding:18px;border-radius:16px;color:#fff;min-height:132px;transition:background .25s ease}
.preview-logo{display:grid;place-items:center;width:52px;height:52px;flex:0 0 52px;border-radius:13px;background:#111115;border:1px solid rgba(255,255,255,.18);font-weight:900;letter-spacing:.1em;overflow:hidden}
.preview-logo img{width:100%;height:100%;object-fit:contain;background:#fff;padding:4px}.preview-copy{min-width:0;display:flex;flex-direction:column}.preview-copy small{text-transform:uppercase;letter-spacing:.14em;opacity:.7;font-weight:800}.preview-copy strong{font-size:25px;letter-spacing:.15em}.preview-copy span{font-size:11px;font-weight:700;line-height:1.25;opacity:.9}.preview-copy em{font-size:10px;line-height:1.25;opacity:.66;font-style:normal;margin-top:4px}
.color-heading{display:flex;align-items:end;justify-content:space-between;gap:16px}
.theme-presets{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.theme-preset{appearance:none;border:1px solid rgba(113,155,194,.24);background:rgba(19,53,86,.45);border-radius:14px;padding:11px 12px;color:inherit;text-align:left;display:flex;align-items:center;gap:11px;cursor:pointer;transition:.2s ease}.theme-preset:hover{transform:translateY(-1px);border-color:rgba(251,140,0,.42);background:rgba(25,64,101,.58)}.preset-swatches{display:flex;align-items:center}.preset-swatches i{width:22px;height:22px;border-radius:50%;border:2px solid #0b2340;margin-left:-5px}.preset-swatches i:first-child{margin-left:0}.theme-preset b,.theme-preset small{display:block}.theme-preset b{font-size:12px}.theme-preset small{font-size:10px;color:#8fa5ba;margin-top:2px}
.color-zone-list{display:grid;gap:11px}.color-zone-card{border:1px solid rgba(101,144,184,.23);background:linear-gradient(180deg,rgba(16,47,77,.68),rgba(11,37,63,.78));border-radius:16px;padding:14px}.zone-top{display:grid;grid-template-columns:46px 1fr auto;gap:12px;align-items:center}.zone-icon{width:46px;height:46px;border-radius:13px;display:grid;place-items:center;color:#fff;font-size:21px;border:1px solid rgba(255,255,255,.14);transition:.25s ease}.zone-copy b,.zone-copy span{display:block}.zone-copy b{font-size:13px;color:#f0f5f9}.zone-copy span{font-size:10.5px;color:#91a8bc;line-height:1.45;margin-top:3px}.choose-color-btn{color:#dce8f2!important;border-color:rgba(116,157,194,.42)!important}.picker-popover{width:310px;max-width:92vw;background:#0c2540;color:#edf5fb}.softness-row{display:grid;grid-template-columns:auto 1fr auto 24px;gap:9px;align-items:center;margin-top:12px;padding-top:10px;border-top:1px solid rgba(101,144,184,.13)}.softness-row>span{font-size:9px;color:#718ba2;text-transform:uppercase;letter-spacing:.08em}.result-dot{width:22px;height:22px;border-radius:50%;border:2px solid rgba(255,255,255,.3);box-shadow:0 4px 12px rgba(0,0,0,.22);transition:background .25s ease}
.mini-system-preview{height:170px;border-radius:16px;overflow:hidden;display:grid;grid-template-columns:62px 1fr;border:1px solid rgba(120,159,195,.2);transition:background .25s ease}.mini-system-preview aside{padding:14px 10px;display:flex;flex-direction:column;align-items:center;gap:10px;transition:background .25s ease}.mini-brand{width:30px;height:30px;border-radius:9px;display:grid;place-items:center;color:#fff;font-weight:900;font-size:12px;transition:background .25s ease}.mini-system-preview aside i{display:block;width:28px;height:5px;border-radius:999px;background:rgba(255,255,255,.13)}.mini-content{padding:14px}.mini-topbar{width:100%;height:8px;border-radius:999px;background:rgba(255,255,255,.08)}.mini-title{width:42%;height:12px;border-radius:999px;background:rgba(255,255,255,.2);margin:18px 0 12px}.mini-cards{display:grid;grid-template-columns:1fr 1fr;gap:8px}.mini-cards span{height:48px;border:1px solid;border-radius:10px;background:rgba(255,255,255,.035)}.mini-actions{display:flex;align-items:center;gap:7px;margin-top:12px}.mini-actions b{font-size:8px;font-weight:800;padding:6px 8px;border-radius:7px;color:#fff;font-style:normal}.mini-actions b+ b{background:transparent!important;border:1px solid}.mini-actions em{margin-left:auto;width:9px;height:9px;border-radius:50%;box-shadow:0 0 10px rgba(255,255,255,.12)}
@media(max-width:900px){.theme-presets{grid-template-columns:1fr}.zone-top{grid-template-columns:46px 1fr}.choose-color-btn{grid-column:1/-1;width:100%}.sticky-preview{position:static}}
@media(max-width:600px){.branding-dialog{width:calc(100vw - 12px)!important;max-width:calc(100vw - 12px)!important}.q-card__actions{display:flex!important;flex-direction:column;align-items:stretch!important}.q-card__actions>.row{display:grid!important;grid-template-columns:1fr!important;width:100%}.q-card__actions .q-btn{width:100%}.softness-row{grid-template-columns:auto 1fr auto}.result-dot{display:none}}
</style>
