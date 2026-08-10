<script setup>
import { computed, onMounted, ref } from 'vue'
import { api } from '../boot/axios'
import PageHeader from '../components/PageHeader.vue'

const loading = ref(true)
const data = ref({ negocio:null, configuracion:null, proyectos:[] })
const qrFailed = ref(false)

const money = value => `${Number(value || 0).toFixed(2)} Bs`
const pretty = value => String(value || '').replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase())
const statusColor = value => ({pagado:'positive',pendiente_saldo:'orange',pendiente_anticipo:'negative',activa:'positive',gracia:'orange',suspendida:'negative',cancelada:'grey'}[value]||'grey')
const qrSrc = computed(() => data.value.configuracion?.qr_url && !qrFailed.value ? data.value.configuracion.qr_url : '/viti-payment-qr.png')
const payerName = payment => payment.pagador ? `${payment.pagador.nombre||''} ${payment.pagador.apellido||''}`.trim() : ''

onMounted(async()=>{
  try{data.value=(await api.get('/mi/pagos')).data.data}
  finally{loading.value=false}
})
</script>

<template>
<q-page class="viti-page">
  <PageHeader eyebrow="Mi espacio VITI" title="Mis pagos" subtitle="Revisa los pagos de tu proyecto y el estado de tus suscripciones VITI." />
  <q-inner-loading :showing="loading" />

  <template v-if="!loading">
    <q-banner rounded class="bg-blue-1 text-primary q-mb-lg">
      <template #avatar><q-icon name="account_balance_wallet"/></template>
      Método habitual de {{data.negocio?.nombre_comercial||'tu negocio'}}: <strong>{{pretty(data.negocio?.metodo_pago_preferido||'qr')}}</strong>. Cada pago mantiene registrado el método que realmente se utilizó.
    </q-banner>

    <div class="row q-col-gutter-lg">
      <div class="col-12 col-lg-8">
        <q-card v-for="project in data.proyectos||[]" :key="project.id" flat class="viti-card q-mb-lg">
          <q-card-section class="row items-start q-col-gutter-md">
            <div class="col"><div class="section-label">{{project.codigo}}</div><div class="text-h6 text-weight-bold">{{project.nombre}}</div><div class="text-caption text-grey-6">{{project.empresa?.nombre_comercial}}</div></div>
            <div class="col-auto"><q-badge :color="statusColor(project.estado_pago)">{{pretty(project.estado_pago)}}</q-badge></div>
          </q-card-section>
          <q-separator/>
          <q-card-section>
            <div class="row q-col-gutter-md">
              <div class="col-12 col-sm-4"><div class="text-caption text-grey-6">Total acordado</div><div class="text-h6 text-weight-bold">{{project.precio_acordado===null?'Por definir':money(project.precio_acordado)}}</div></div>
              <div class="col-12 col-sm-4"><div class="text-caption text-grey-6">Pagado</div><div class="text-h6 text-positive text-weight-bold">{{money(project.pagado)}}</div></div>
              <div class="col-12 col-sm-4"><div class="text-caption text-grey-6">Pendiente</div><div class="text-h6 text-weight-bold">{{money(project.pendiente)}}</div></div>
            </div>
          </q-card-section>
          <q-separator v-if="project.pagos?.length"/>
          <q-list v-if="project.pagos?.length" separator>
            <q-item v-for="payment in project.pagos" :key="payment.id"><q-item-section avatar><q-avatar color="green-1" text-color="positive" icon="check"/></q-item-section><q-item-section><q-item-label class="text-weight-bold">{{pretty(payment.tipo)}} · {{money(payment.monto)}}</q-item-label><q-item-label caption>{{payment.fecha_pago}} · {{pretty(payment.metodo)}}<span v-if="payerName(payment)"> · Cuenta: {{payerName(payment)}}</span></q-item-label></q-item-section></q-item>
          </q-list>

          <template v-if="project.suscripcion">
            <q-separator/>
            <q-card-section class="subscription-box">
              <div class="row items-center q-col-gutter-md">
                <div class="col"><div class="text-caption text-grey-6">Suscripción</div><div class="text-h6 text-weight-bold">{{project.suscripcion.plan||'VITI'}}</div><div class="text-body2">{{money(project.suscripcion.monto)}} / {{project.suscripcion.frecuencia==='anual'?'año':'mes'}} · Vence {{project.suscripcion.fecha_vencimiento}}</div></div>
                <div class="col-auto"><q-badge :color="statusColor(project.suscripcion.estado)">{{project.suscripcion.en_prueba?'Prueba gratuita':pretty(project.suscripcion.estado)}}</q-badge></div>
              </div>
              <q-banner v-if="project.suscripcion.en_prueba" rounded class="bg-green-1 text-green-9 q-mt-md"><template #avatar><q-icon name="verified"/></template>Prueba gratuita hasta {{project.suscripcion.prueba_hasta}}. Durante este periodo no se cobra mensualidad.</q-banner>
              <q-banner v-if="project.suscripcion.primer_cobro_monto!==null&&!project.suscripcion.primer_cobro_pagado" rounded class="bg-orange-1 text-orange-10 q-mt-md"><template #avatar><q-icon name="calendar_month"/></template>Primer periodo pagado: {{project.suscripcion.primer_cobro_desde}} al {{project.suscripcion.primer_cobro_hasta}} · monto proporcional {{money(project.suscripcion.primer_cobro_monto)}}. Desde el mes siguiente corresponde la mensualidad completa.</q-banner>
            </q-card-section>
            <q-list v-if="project.pagos_suscripcion?.length" separator>
              <q-item v-for="payment in project.pagos_suscripcion" :key="payment.id"><q-item-section avatar><q-avatar color="blue-1" text-color="primary" icon="autorenew"/></q-item-section><q-item-section><q-item-label class="text-weight-bold">Pago de suscripción · {{money(payment.monto)}}</q-item-label><q-item-label caption>{{payment.fecha_pago}} · {{pretty(payment.metodo)}}<span v-if="payerName(payment)"> · Cuenta: {{payerName(payment)}}</span></q-item-label></q-item-section></q-item>
            </q-list>
          </template>
        </q-card>

        <div v-if="!(data.proyectos||[]).length" class="empty-state"><q-icon name="payments" size="54px"/><div class="text-h6 q-mt-md">Todavía no hay pagos registrados</div><div class="q-mt-xs">Cuando exista un acuerdo económico o una suscripción, aparecerán aquí.</div></div>
      </div>

      <div class="col-12 col-lg-4">
        <q-card flat class="viti-card sticky-card">
          <q-card-section><div class="text-h6 text-weight-bold">Pagar a VITI</div><div class="text-caption text-grey-6">Escanea el QR e ingresa el monto que corresponda.</div></q-card-section>
          <q-card-section class="text-center q-pt-none"><div class="qr-stage"><img :src="qrSrc" alt="QR de pago VITI" class="qr-img" @error="qrFailed=true"/></div></q-card-section>
          <q-separator/>
          <q-list>
            <q-item><q-item-section avatar><q-icon name="account_balance" color="primary"/></q-item-section><q-item-section><q-item-label caption>Banco</q-item-label><q-item-label class="text-weight-bold">{{data.configuracion?.banco||'Banco Ganadero'}}</q-item-label></q-item-section></q-item>
            <q-item><q-item-section avatar><q-icon name="person" color="primary"/></q-item-section><q-item-section><q-item-label caption>Titular</q-item-label><q-item-label class="text-weight-bold">{{data.configuracion?.titular||'Guzman Ribera Alexander'}}</q-item-label></q-item-section></q-item>
          </q-list>
          <q-card-section v-if="data.configuracion?.observaciones" class="text-body2 text-grey-7">{{data.configuracion.observaciones}}</q-card-section>
          <q-card-actions align="stretch" class="q-pa-md"><q-btn outline color="primary" no-caps icon="support_agent" label="Avisar que ya pagué" to="/mi-buzon" class="full-width"/></q-card-actions>
        </q-card>
      </div>
    </div>
  </template>
</q-page>
</template>

<style scoped>
.subscription-box{background:var(--viti-surface-soft)}.qr-stage{display:flex;align-items:center;justify-content:center;padding:14px;border-radius:14px;background:#fff}.qr-img{display:block;width:100%;max-width:340px;height:auto;object-fit:contain;background:#fff}.sticky-card{position:sticky;top:84px}.empty-state{min-height:300px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;color:var(--viti-muted)}@media(max-width:1023px){.sticky-card{position:static}}
</style>