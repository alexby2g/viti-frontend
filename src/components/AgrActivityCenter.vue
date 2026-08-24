<template>
  <q-card flat bordered class="agr-activity">
    <q-card-section class="row items-center">
      <div>
        <div class="text-overline">AGR CORE</div>
        <div class="text-h6 text-weight-bold">Centro de actividad</div>
        <div class="text-caption text-grey-6">Bitácora de revisiones, prioridades y recomendaciones de AGR.</div>
      </div>
      <q-space />
      <q-btn flat dense round icon="refresh" :loading="loading" @click="load" />
    </q-card-section>
    <q-separator />
    <q-card-section v-if="error" class="text-negative">{{ error }}</q-card-section>
    <q-card-section v-else-if="loading && !items.length" class="text-grey-6">Cargando actividad de AGR…</q-card-section>
    <q-list v-else-if="items.length" separator>
      <q-item v-for="item in items" :key="item.id">
        <q-item-section avatar>
          <q-avatar :color="iconColor(item.type)" text-color="white" :icon="icon(item.type)" />
        </q-item-section>
        <q-item-section>
          <q-item-label class="text-weight-medium">{{ item.title }}</q-item-label>
          <q-item-label caption>{{ item.message }}</q-item-label>
        </q-item-section>
        <q-item-section side>
          <div class="text-caption text-grey-6">{{ formatDate(item.at) }}</div>
        </q-item-section>
      </q-item>
    </q-list>
    <q-card-section v-else class="text-grey-6">AGR todavía no tiene actividad registrada.</q-card-section>
  </q-card>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { api } from '../boot/axios'

const props = defineProps({ limit: { type: Number, default: 12 } })
const items = ref([])
const loading = ref(false)
const error = ref('')

function icon(type) {
  return ({ autopilot_review: 'auto_awesome', priority_detected: 'priority_high', workflow_recommendation: 'route' }[type]) || 'history'
}
function iconColor(type) {
  return ({ autopilot_review: 'primary', priority_detected: 'negative', workflow_recommendation: 'warning' }[type]) || 'grey-7'
}
function formatDate(value) {
  if (!value) return ''
  try { return new Date(value).toLocaleString('es-BO', { dateStyle: 'short', timeStyle: 'short' }) } catch { return value }
}
async function load() {
  if (loading.value) return
  loading.value = true
  error.value = ''
  try { items.value = ((await api.get('/dashboard', { params: { agr_activity: true, limit: props.limit } })).data?.agr_activity || []) }
  catch (err) { error.value = err?.response?.data?.message || 'No pude cargar la actividad de AGR.' }
  finally { loading.value = false }
}
onMounted(load)
</script>

<style scoped>
.agr-activity { border-radius: 20px; }
</style>
