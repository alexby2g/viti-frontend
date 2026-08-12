<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  src: { type: String, default: '' },
  name: { type: String, default: 'Perfil' },
})

const emit = defineEmits(['update:modelValue'])
const opened = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value),
})
</script>

<template>
  <q-dialog v-model="opened">
    <q-card class="profile-photo-zoom-card">
      <q-card-section class="row items-center q-pb-sm">
        <div class="text-subtitle1 text-weight-bold">{{ name }}</div>
        <q-space />
        <q-btn flat round dense icon="close" v-close-popup />
      </q-card-section>
      <q-separator />
      <q-card-section class="profile-photo-zoom-body">
        <img :src="src" :alt="`Fotografía ampliada de ${name}`" class="profile-photo-zoom-image" />
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<style scoped>
.profile-photo-zoom-card{width:min(560px,94vw);border-radius:22px;overflow:hidden}.profile-photo-zoom-body{padding:18px;display:flex;justify-content:center;align-items:center;min-height:280px}.profile-photo-zoom-image{display:block;max-width:100%;max-height:70vh;object-fit:contain;border-radius:18px;box-shadow:0 18px 48px rgba(5,20,40,.28)}
</style>
