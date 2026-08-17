<script setup>
import { computed, inject, onMounted, reactive, ref } from 'vue'
import { useQuasar } from 'quasar'
import { useRoute } from 'vue-router'
import { api } from '../boot/axios'

const $q = useQuasar()
const route = useRoute()
const canManageSource = inject('electrofrioCanManage', ref(false))
const loading = ref(false)
const saving = ref(false)
const config = inject('airSystemConfig', ref(null))
const canManage = computed(() => Boolean(canManageSource?.value ?? canManageSource))
const clientMode = computed(() => route.path.startsWith('/mi-apps/electrofrio'))
const base = computed(() => clientMode.value ? '/mi/apps/electrofrio' : '/apps/electrofrio')

const form = reactive({
  nombre_sistema:'Sistema de Gestión de Servicios de Aire Acondicionado',
  nombre_corto:'Aires Acondicionados',
  logo_url:'', telefono:'', correo:'', direccion:'',
  color_primario:'#0B5F7A', color_secundario:'#12B8C8', moneda:'BOB', garantia_dias_default:0,
  tipos_servicio:[], tipos_equipo:[], metodos_pago:[],
})

const defaults = {
  servicios:['Diagnóstico','Mantenimiento preventivo','Mantenimiento correctivo','Reparación','Instalación','Desinstalación','Limpieza profunda','Carga de refrigerante'],
  equipos:['Aire acondicionado Split','Aire acondicionado Piso Techo','Aire acondicionado Cassette','Aire acondicionado Ventana','Aire acondicionado Portátil','Sistema VRF / VRV','Chiller','Otro'],
  pagos:['efectivo','qr','transferencia','tarjeta','otro'],
}

function apply(data){
  Object.assign(form, {
    nombre_sistema:data?.nombre_sistema || 'Sistema de Gestión de Servicios de Aire Acondicionado',
    nombre_corto:data?.nombre_corto || 'Aires Acondicionados',
    logo_url:data?.logo_url || '', telefono:data?.telefono || '', correo:data?.correo || '', direccion:data?.direccion || '',
    color_primario:data?.color_primario || '#0B5F7A', color_secundario:data?.color_secundario || '#12B8C8',
    moneda:data?.moneda || 'BOB', garantia_dias_default:Number(data?.garantia_dias_default || 0),
    tipos_servicio:[...(data?.tipos_servicio || defaults.servicios)],
    tipos_equipo:[...(data?.tipos_equipo || defaults.equipos)],
    metodos_pago:[...(data?.metodos_pago || defaults.pagos)],
  })
}

async function load(){
  loading.value = true
  try{
    const response = await api.get(`${base.value}/configuracion`)
    config.value = response.data.data
    apply(config.value)
  }catch(error){
    $q.notify({type:'negative',message:error.response?.data?.message || 'No se pudo cargar la configuración del sistema.'})
  }finally{ loading.value = false }
}

function cleanList(values){ return [...new Set((values || []).map(v => String(v || '').trim()).filter(Boolean))] }

async function save(){
  if (!canManage.value) return
  if (!form.nombre_sistema.trim() || !form.nombre_corto.trim()) {
    $q.notify({type:'warning',message:'Completa el nombre del sistema y el nombre corto.'})
    return
  }
  const payload = {
    ...form,
    logo_url:form.logo_url.trim() || null,
    telefono:form.telefono.trim() || null,
    correo:form.correo.trim() || null,
    direccion:form.direccion.trim() || null,
    tipos_servicio:cleanList(form.tipos_servicio),
    tipos_equipo:cleanList(form.tipos_equipo),
    metodos_pago:cleanList(form.metodos_pago),
  }
  if (!payload.tipos_servicio.length || !payload.tipos_equipo.length || !payload.metodos_pago.length) {
    $q.notify({type:'warning',message:'Mantén al menos un tipo de servicio, equipo y método de pago.'})
    return
  }
  saving.value = true
  try{
    const response = await api.put(`${base.value}/configuracion`, payload)
    config.value = response.data.data
    apply(config.value)
    $q.notify({type:'positive',message:response.data.message || 'Configuración guardada.'})
  }catch(error){
    const errors = error.response?.data?.errors
    const first = errors ? Object.values(errors).flat()[0] : null
    $q.notify({type:'negative',message:first || error.response?.data?.message || 'No se pudo guardar la configuración.'})
  }finally{ saving.value = false }
}

function resetLists(){
  form.tipos_servicio = [...defaults.servicios]
  form.tipos_equipo = [...defaults.equipos]
  form.metodos_pago = [...defaults.pagos]
}

onMounted(load)
</script>

<template>
  <q-page padding class="config-page">
    <div class="row items-start justify-between q-col-gutter-md q-mb-lg">
      <div class="col-12 col-md">
        <div class="text-overline text-primary text-weight-bold">Configuración</div>
        <h1 class="text-h4 text-weight-bold q-my-xs">Mi sistema</h1>
        <div class="text-body2 text-grey-7">Personaliza la identidad y las opciones operativas sin modificar código.</div>
      </div>
      <div class="col-12 col-md-auto row q-gutter-sm">
        <q-btn outline color="primary" icon="refresh" label="Recargar" no-caps :loading="loading" @click="load"/>
        <q-btn v-if="canManage" color="primary" icon="save" label="Guardar cambios" no-caps :loading="saving" @click="save"/>
      </div>
    </div>

    <q-banner v-if="!canManage" rounded class="bg-grey-2 text-grey-8 q-mb-lg">
      Tu rol puede consultar la configuración. Solo propietario o administrador puede modificarla.
    </q-banner>

    <div class="row q-col-gutter-lg">
      <div class="col-12 col-lg-7">
        <q-card flat bordered class="config-card q-mb-lg">
          <q-card-section><div class="text-h6 text-weight-bold">Identidad del sistema</div><div class="text-caption text-grey-7">El producto base es genérico; aquí se adapta a cada negocio.</div></q-card-section>
          <q-separator/>
          <q-card-section class="row q-col-gutter-md">
            <div class="col-12"><q-input v-model="form.nombre_sistema" outlined label="Nombre completo del sistema" :readonly="!canManage"/></div>
            <div class="col-12 col-md-6"><q-input v-model="form.nombre_corto" outlined label="Nombre corto" :readonly="!canManage"/></div>
            <div class="col-12 col-md-6"><q-input v-model="form.logo_url" outlined label="URL del logo" hint="Opcional. Puede ser una imagen HTTPS." :readonly="!canManage"/></div>
            <div class="col-12 col-md-4"><q-input v-model="form.telefono" outlined label="Teléfono" :readonly="!canManage"/></div>
            <div class="col-12 col-md-8"><q-input v-model="form.correo" outlined type="email" label="Correo" :readonly="!canManage"/></div>
            <div class="col-12"><q-input v-model="form.direccion" outlined label="Dirección" :readonly="!canManage"/></div>
            <div class="col-6 col-md-4"><q-input v-model="form.color_primario" outlined label="Color principal" :readonly="!canManage"><template #prepend><span class="color-dot" :style="{background:form.color_primario}"/></template></q-input></div>
            <div class="col-6 col-md-4"><q-input v-model="form.color_secundario" outlined label="Color secundario" :readonly="!canManage"><template #prepend><span class="color-dot" :style="{background:form.color_secundario}"/></template></q-input></div>
            <div class="col-6 col-md-4"><q-input v-model="form.moneda" outlined label="Moneda" :readonly="!canManage"/></div>
          </q-card-section>
        </q-card>

        <q-card flat bordered class="config-card">
          <q-card-section class="row items-center"><div><div class="text-h6 text-weight-bold">Configuración operativa</div><div class="text-caption text-grey-7">Estas listas alimentarán los formularios del sistema.</div></div><q-space/><q-btn v-if="canManage" flat color="primary" icon="restart_alt" label="Restaurar listas base" no-caps @click="resetLists"/></q-card-section>
          <q-separator/>
          <q-card-section class="q-gutter-lg">
            <q-select v-model="form.tipos_servicio" outlined multiple use-input use-chips new-value-mode="add-unique" hide-dropdown-icon label="Tipos de servicio" hint="Escribe un servicio y presiona Enter" :readonly="!canManage"/>
            <q-select v-model="form.tipos_equipo" outlined multiple use-input use-chips new-value-mode="add-unique" hide-dropdown-icon label="Tipos de equipo" hint="Escribe un tipo y presiona Enter" :readonly="!canManage"/>
            <q-select v-model="form.metodos_pago" outlined multiple use-input use-chips new-value-mode="add-unique" hide-dropdown-icon label="Métodos de pago" :readonly="!canManage"/>
            <q-input v-model.number="form.garantia_dias_default" outlined type="number" min="0" max="3650" label="Garantía predeterminada (días)" :readonly="!canManage"/>
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-lg-5">
        <q-card flat bordered class="preview-card sticky-preview">
          <q-card-section><div class="text-overline text-primary text-weight-bold">Vista previa</div><div class="text-h6 text-weight-bold">Así verá la empresa su aplicación</div></q-card-section>
          <div class="preview-header" :style="{background:`linear-gradient(135deg, ${form.color_primario}, ${form.color_secundario})`}">
            <q-avatar size="64px" class="bg-white text-primary">
              <img v-if="form.logo_url" :src="form.logo_url" alt="Logo"/>
              <q-icon v-else name="ac_unit" size="36px"/>
            </q-avatar>
            <div class="q-mt-md text-h5 text-weight-bold">{{form.nombre_corto || 'Aires Acondicionados'}}</div>
            <div class="text-body2">{{config?.empresa?.nombre_comercial || 'Nombre de la empresa'}}</div>
          </div>
          <q-card-section>
            <div class="text-weight-bold">{{form.nombre_sistema}}</div>
            <div class="text-caption text-grey-7 q-mt-xs">Gestionado mediante VITI</div>
            <q-separator class="q-my-md"/>
            <div class="text-body2"><strong>{{form.tipos_servicio.length}}</strong> tipos de servicio · <strong>{{form.tipos_equipo.length}}</strong> tipos de equipo</div>
            <div class="text-body2 q-mt-sm">Garantía base: {{form.garantia_dias_default}} días</div>
          </q-card-section>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<style scoped>
.config-page{max-width:1500px;margin:0 auto}.config-page h1{color:var(--viti-text)}.config-card,.preview-card{border-radius:18px}.color-dot{display:inline-block;width:20px;height:20px;border-radius:50%;border:1px solid rgba(0,0,0,.15)}.preview-header{padding:36px;color:#fff;text-align:center}.sticky-preview{position:sticky;top:82px;overflow:hidden}@media(max-width:1023px){.sticky-preview{position:static}}@media(max-width:700px){.config-page{padding:12px}.config-page h1{font-size:25px;line-height:1.2}}
</style>
