<script setup>
import { computed, onMounted, ref } from 'vue'
import { api } from '../boot/axios'

const loading=ref(true),error=ref(''),data=ref({cliente:null,ordenes:[]})
const openOrders=computed(()=>data.value.ordenes.filter(order=>order.etapa!=='cerrada'))
const equipmentLabel=row=>[row.equipo_tipo||row.tipo,row.equipo_marca||row.marca,row.equipo_modelo||row.modelo].filter(Boolean).join(' · ')||'Equipo sin detalle'
const date=value=>value?new Date(`${String(value).slice(0,10)}T12:00:00`).toLocaleDateString('es-BO'):'—'
const pretty=value=>String(value||'').replaceAll('_',' ').replace(/\b\w/g,letter=>letter.toUpperCase())
async function load(){loading.value=true;error.value='';try{data.value=(await api.get('/portal/electrofrio/resumen')).data.data}catch(requestError){error.value=requestError.response?.data?.message||'No pudimos cargar tu información. Revisa tu conexión e inténtalo nuevamente.'}finally{loading.value=false}}
onMounted(load)
</script>

<template>
  <q-page class="customer-page q-pa-md q-pb-xl">
    <q-inner-loading :showing="loading"/>
    <q-banner v-if="error" rounded class="bg-red-1 text-negative"><template #avatar><q-icon name="cloud_off"/></template>{{error}}<template #action><q-btn flat no-caps color="negative" label="Reintentar" @click="load"/></template></q-banner>
    <template v-if="data.cliente">
      <div class="hero"><div class="text-overline">Mi servicio técnico</div><div class="text-h4 text-weight-bold">Hola, {{data.cliente.nombre}}</div><div>Revisa tus próximas visitas y el avance de cada atención con {{data.cliente.empresa?.nombre_comercial||'Electrofrío'}}.</div><q-btn class="q-mt-md" color="white" text-color="primary" unelevated no-caps icon="forum" label="Escribir al negocio" to="/portal/electrofrio/mensajes"/></div>
      <div class="summary-grid q-mt-lg"><q-card flat class="summary-card"><q-card-section><q-icon name="event_available" color="primary" size="34px"/><div class="metric">{{openOrders.length}}</div><div class="text-caption">Atenciones en curso</div></q-card-section></q-card><q-card flat class="summary-card"><q-card-section><q-icon name="ac_unit" color="primary" size="34px"/><div class="metric">{{data.cliente.equipos?.length||0}}</div><div class="text-caption">Equipos registrados</div></q-card-section></q-card></div>
      <div class="text-h6 text-weight-bold q-mt-xl q-mb-sm">Mis equipos</div>
      <div v-if="data.cliente.equipos?.length" class="equipment-grid"><q-card v-for="equipment in data.cliente.equipos" :key="equipment.id" flat class="equipment-card"><q-card-section class="row items-center no-wrap"><q-avatar color="blue-1" text-color="primary" icon="ac_unit"/><div class="q-ml-md min-width-0"><div class="text-weight-bold ellipsis">{{equipmentLabel(equipment)}}</div><div class="text-caption text-grey-6">{{[equipment.capacidad,equipment.ubicacion,equipment.serie&&`Serie ${equipment.serie}`].filter(Boolean).join(' · ')||'Sin detalles adicionales'}}</div></div></q-card-section></q-card></div>
      <div v-else class="empty compact">Todavía no tienes equipos registrados.</div>
      <div class="text-h6 text-weight-bold q-mt-xl q-mb-sm">Mis atenciones</div>
      <q-card v-for="order in data.ordenes" :key="order.id" flat class="order-card q-mb-md"><q-card-section><div class="row items-start"><div><div class="text-subtitle1 text-weight-bold">{{order.codigo}}</div><div class="text-caption text-grey-6">{{date(order.fecha_cita)}} {{String(order.hora_cita||'').slice(0,5)}} · {{equipmentLabel(order)}}</div></div><q-space/><q-badge color="primary">{{pretty(order.etapa)}}</q-badge></div><div class="q-mt-md"><strong>Motivo:</strong> {{order.problema_reportado}}</div><div v-if="order.diagnostico" class="q-mt-sm"><strong>Diagnóstico:</strong> {{order.diagnostico}}</div><div v-if="order.propuesta" class="q-mt-sm"><strong>Propuesta:</strong> {{order.propuesta}}</div><div v-if="order.trabajo_realizado" class="q-mt-sm"><strong>Trabajo realizado:</strong> {{order.trabajo_realizado}}</div><div v-if="order.recomendaciones" class="q-mt-sm"><strong>Recomendaciones:</strong> {{order.recomendaciones}}</div></q-card-section></q-card>
      <div v-if="!data.ordenes.length" class="empty">Todavía no tienes atenciones registradas.</div>
    </template>
  </q-page>
</template>

<style scoped>
.customer-page{max-width:1000px;margin:auto}.hero{padding:28px;border-radius:24px;color:#fff;background:linear-gradient(135deg,#0b5f7a,#12b8c8);box-shadow:0 18px 40px rgba(11,95,122,.2)}.summary-grid,.equipment-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.summary-card,.equipment-card,.order-card{border:1px solid rgba(11,95,122,.12);border-radius:18px}.metric{font-size:30px;font-weight:800;margin-top:8px}.empty{text-align:center;padding:42px;color:#78909c}.empty.compact{padding:22px}.min-width-0{min-width:0}@media(max-width:600px){.summary-grid,.equipment-grid{grid-template-columns:1fr}.hero{padding:22px 18px}.hero .text-h4{font-size:27px}}
</style>
