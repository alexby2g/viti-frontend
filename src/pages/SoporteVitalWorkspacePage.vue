<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route=useRoute()
const section=computed(()=>route.meta.supportSection||'inicio')
const meta={
  inicio:{title:'Inicio',subtitle:'Resumen del trabajo técnico y estado de las reparaciones.'},
  clientes:{title:'Clientes',subtitle:'Registro y consulta de personas que dejan sus equipos.'},
  equipos:{title:'Computadoras',subtitle:'Ficha de cada computadora, pieza o equipo recibido.'},
  tecnicos:{title:'Técnicos',subtitle:'Personal responsable de diagnóstico y reparación.'},
  ordenes:{title:'Órdenes de servicio',subtitle:'Seguimiento desde la recepción hasta la entrega.'},
  agenda:{title:'Agenda',subtitle:'Organización de recepciones, revisiones y entregas.'},
}
const current=computed(()=>meta[section.value]||meta.inicio)
const stages=['Recibido','En diagnóstico','Esperando aprobación','En reparación','En pruebas','Listo para entregar','Entregado']
const clientFields=['Nombre completo','Teléfono / WhatsApp','Dirección','Observaciones']
const equipmentFields=['Cliente propietario','Tipo de equipo','Marca','Modelo','Número de serie','Accesorios / piezas recibidas','Problema informado','Estado físico de recepción']
const technicianFields=['Nombre','Teléfono','Especialidad','Usuario vinculado','Estado']
const orderFields=['Cliente','Computadora','Técnico asignado','Fecha y hora','Problema reportado','Diagnóstico','Propuesta de solución','Estado del servicio']
</script>

<template>
<q-page class="support-page q-pa-md q-pa-lg-md">
  <div class="row items-start q-col-gutter-lg">
    <div class="col-12 col-lg-8">
      <div class="text-overline text-primary">Soporte Vital PC · versión de revisión</div>
      <div class="text-h4 text-weight-bold">{{current.title}}</div>
      <div class="text-body1 text-grey-7 q-mt-xs">{{current.subtitle}}</div>
    </div>
    <div class="col-12 col-lg-4">
      <q-banner rounded class="preview-banner">
        <template #avatar><q-icon name="construction" color="orange"/></template>
        <strong>Avance 50%</strong><br>
        <span class="text-caption">Prototipo navegable. Los datos mostrados aquí todavía no representan una entrega final.</span>
      </q-banner>
    </div>
  </div>

  <template v-if="section==='inicio'">
    <div class="stats-grid q-mt-lg">
      <q-card flat class="viti-card"><q-card-section><q-icon name="people" color="primary" size="30px"/><div class="text-h5 text-weight-bold q-mt-md">Clientes</div><div class="text-caption text-grey-7">Estructura de registro definida</div></q-card-section></q-card>
      <q-card flat class="viti-card"><q-card-section><q-icon name="computer" color="primary" size="30px"/><div class="text-h5 text-weight-bold q-mt-md">Computadoras</div><div class="text-caption text-grey-7">Ficha técnica definida</div></q-card-section></q-card>
      <q-card flat class="viti-card"><q-card-section><q-icon name="engineering" color="primary" size="30px"/><div class="text-h5 text-weight-bold q-mt-md">Técnicos</div><div class="text-caption text-grey-7">Roles y asignación definidos</div></q-card-section></q-card>
      <q-card flat class="viti-card"><q-card-section><q-icon name="fact_check" color="primary" size="30px"/><div class="text-h5 text-weight-bold q-mt-md">Órdenes</div><div class="text-caption text-grey-7">Flujo de reparación definido</div></q-card-section></q-card>
    </div>

    <div class="row q-col-gutter-lg q-mt-sm">
      <div class="col-12 col-lg-7"><q-card flat class="viti-card"><q-card-section><div class="text-h6 text-weight-bold">Flujo de una reparación</div><div class="text-caption text-grey-6">Estados previstos para evitar perder el seguimiento del equipo.</div></q-card-section><q-separator/><q-list separator><q-item v-for="(stage,index) in stages" :key="stage"><q-item-section avatar><q-avatar color="blue-1" text-color="primary" size="32px">{{index+1}}</q-avatar></q-item-section><q-item-section>{{stage}}</q-item-section></q-item></q-list></q-card></div>
      <div class="col-12 col-lg-5"><q-card flat class="viti-card"><q-card-section><div class="text-h6 text-weight-bold">Qué falta para la siguiente etapa</div></q-card-section><q-list><q-item><q-item-section avatar><q-icon name="photo_camera" color="orange"/></q-item-section><q-item-section><q-item-label>Fotografías</q-item-label><q-item-label caption>Recepción y evidencia del equipo.</q-item-label></q-item-section></q-item><q-item><q-item-section avatar><q-icon name="payments" color="orange"/></q-item-section><q-item-section><q-item-label>Pagos y saldos</q-item-label><q-item-label caption>QR, efectivo, anticipos y saldos.</q-item-label></q-item-section></q-item><q-item><q-item-section avatar><q-icon name="analytics" color="orange"/></q-item-section><q-item-section><q-item-label>Reportes</q-item-label><q-item-label caption>Servicios, técnicos, estados y cobros.</q-item-label></q-item-section></q-item><q-item><q-item-section avatar><q-icon name="verified" color="orange"/></q-item-section><q-item-section><q-item-label>Pruebas</q-item-label><q-item-label caption>Validación antes de habilitar la beta.</q-item-label></q-item-section></q-item></q-list></q-card></div>
    </div>
  </template>

  <template v-else-if="section==='clientes'">
    <q-card flat class="viti-card q-mt-lg"><q-card-section class="row items-center"><div><div class="text-h6 text-weight-bold">Ficha de cliente</div><div class="text-caption text-grey-6">Campos preparados para la primera versión.</div></div><q-space/><q-badge outline color="orange" label="Estructura 50%"/></q-card-section><q-separator/><q-card-section><div class="fields-grid"><q-input v-for="field in clientFields" :key="field" outlined readonly :label="field" model-value=""/></div></q-card-section></q-card>
    <q-card flat class="viti-card q-mt-lg"><q-card-section><div class="text-h6 text-weight-bold">Listado de clientes</div><div class="text-caption text-grey-6">Todavía sin datos de producción. La tabla se habilitará cuando la persistencia del módulo pase las pruebas.</div></q-card-section><q-separator/><div class="empty-preview"><q-icon name="person_search" size="52px"/><div class="q-mt-sm">Sin datos de demostración cargados</div></div></q-card>
  </template>

  <template v-else-if="section==='equipos'">
    <q-card flat class="viti-card q-mt-lg"><q-card-section><div class="text-h6 text-weight-bold">Ficha de computadora / equipo</div><div class="text-caption text-grey-6">Basada en la necesidad de registrar los datos del cliente y de la computadora.</div></q-card-section><q-separator/><q-card-section><div class="fields-grid"><q-input v-for="field in equipmentFields" :key="field" outlined readonly :label="field" model-value=""/></div></q-card-section></q-card>
  </template>

  <template v-else-if="section==='tecnicos'">
    <q-card flat class="viti-card q-mt-lg"><q-card-section><div class="text-h6 text-weight-bold">Personal técnico</div><div class="text-caption text-grey-6">Los técnicos tendrán acceso limitado a las órdenes asignadas y al diagnóstico.</div></q-card-section><q-separator/><q-card-section><div class="fields-grid"><q-input v-for="field in technicianFields" :key="field" outlined readonly :label="field" model-value=""/></div></q-card-section></q-card>
  </template>

  <template v-else-if="section==='ordenes'">
    <q-card flat class="viti-card q-mt-lg"><q-card-section><div class="text-h6 text-weight-bold">Nueva orden de servicio</div><div class="text-caption text-grey-6">Recepción, diagnóstico y seguimiento en un solo registro.</div></q-card-section><q-separator/><q-card-section><div class="fields-grid"><q-input v-for="field in orderFields" :key="field" outlined readonly :label="field" model-value=""/></div><div class="q-mt-md"><div class="text-caption text-weight-bold q-mb-sm">Estados disponibles</div><q-chip v-for="stage in stages" :key="stage" outline color="primary">{{stage}}</q-chip></div></q-card-section></q-card>
  </template>

  <template v-else-if="section==='agenda'">
    <q-card flat class="viti-card q-mt-lg"><q-card-section><div class="text-h6 text-weight-bold">Agenda técnica</div><div class="text-caption text-grey-6">Permitirá organizar recepciones, diagnósticos y entregas por fecha y técnico.</div></q-card-section><q-separator/><div class="empty-preview"><q-icon name="calendar_month" size="52px"/><div class="q-mt-sm">Calendario preparado para conexión con las órdenes</div><div class="text-caption text-grey-6">Sin citas ficticias cargadas.</div></div></q-card>
  </template>
</q-page>
</template>

<style scoped>
.support-page{max-width:1450px;margin:0 auto}.preview-banner{background:#fff5e6;border:1px solid #ffd79a}.stats-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px}.fields-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.empty-preview{min-height:220px;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#789;text-align:center}@media(max-width:900px){.stats-grid{grid-template-columns:repeat(2,1fr)}}@media(max-width:600px){.stats-grid,.fields-grid{grid-template-columns:1fr}}
</style>
