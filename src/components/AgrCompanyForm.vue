<template>
  <q-form class="q-mt-md" @submit.prevent="submit">
    <div class="text-subtitle2 text-weight-bold q-mb-md">Revisa los datos de la empresa</div>
    <div class="row q-col-gutter-sm">
      <div class="col-12 col-md-6"><q-input v-model="form.nombre_comercial" outlined dense label="Nombre comercial *" /></div>
      <div class="col-12 col-md-6"><q-input v-model="form.razon_social" outlined dense label="Razón social" /></div>
      <div class="col-12 col-md-6"><q-input v-model="form.actividad" outlined dense label="Actividad o rubro" /></div>
      <div class="col-12 col-md-3"><q-input v-model="form.telefono" outlined dense label="Teléfono" /></div>
      <div class="col-12 col-md-3"><q-input v-model="form.whatsapp" outlined dense label="WhatsApp" /></div>
      <div class="col-12 col-md-6"><q-input v-model="form.ciudad" outlined dense label="Ciudad" /></div>
      <div class="col-12 col-md-6"><q-input v-model="form.direccion" outlined dense label="Dirección" /></div>
    </div>
    <div class="row items-center q-gutter-sm q-mt-md">
      <q-badge color="orange" outline label="CONFIRMACIÓN REQUERIDA" />
      <q-space />
      <q-btn flat no-caps label="Cancelar" @click="$emit('cancel')" />
      <q-btn color="primary" unelevated no-caps icon="business" label="Confirmar empresa" type="submit" :loading="loading" :disable="!form.nombre_comercial.trim()" />
    </div>
  </q-form>
</template>

<script setup>
import { reactive } from 'vue'
import { api } from '../boot/axios'

const props = defineProps({ draft: { type: Object, default: () => ({}) } })
const emit = defineEmits(['success','cancel'])
const loading = reactive({ value: false })
const form = reactive({ nombre_comercial: props.draft.nombre_comercial || '', razon_social: props.draft.razon_social || '', actividad: props.draft.actividad || '', telefono: props.draft.telefono || '', whatsapp: props.draft.whatsapp || '', ciudad: props.draft.ciudad || '', direccion: props.draft.direccion || '' })

async function submit() {
  if (!form.nombre_comercial.trim() || loading.value) return
  loading.value = true
  try {
    const response = (await api.post('/agr/acciones/crear-cliente', { ...form, tipo: 'empresa' })).data
    emit('success', response)
  } finally { loading.value = false }
}
</script>
