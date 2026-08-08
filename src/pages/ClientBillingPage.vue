<script setup>
import { computed, onMounted, ref } from 'vue'
import { api } from '../boot/axios'
import PageHeader from '../components/PageHeader.vue'
import { paymentQrData } from '../assets/paymentQr'

const loading=ref(true)
const data=ref({configuracion:null,proyectos:[]})
const money=v=>`${Number(v||0).toFixed(2)} Bs`
const pretty=v=>String(v||'').replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase())
const statusColor=v=>({pagado:'positive',pendiente_saldo:'orange',pendiente_anticipo:'negative',activa:'positive',gracia:'orange',suspendida:'negative',cancelada:'grey'}[v]||'grey')
const hasAnyBilling=computed(()=>data.value.proyectos.some(p=>p.precio_acordado!==null||p.suscripcion))

onMounted(async()=>{try{data.value=(await api.get('/mi/pagos')).data.data}finally{loading.value=false}})
</script>

<template>
<q-page class="viti-page">
  <q-inner-loading :showing="loading"/>
  <PageHeader eyebrow="Mi espacio VITI" title="Mis pagos" subtitle="Consulta el estado de tu proyecto, tu suscripción y los datos oficiales de cobro de VITI." />

  <template v-if="!loading">
    <div v-if="hasAnyBilling" class="row q-col-gutter-lg">
      <div class="col-12 col-lg-8">
        <q-card v-for="project in data.proyectos" :key="project.id" flat class="viti-card q-mb-lg">
          <q-card-section class="row items-start q-col-gutter-md">
            <div class="col"><div class="section-label">{{project.codigo}}</div><div class="text-h6 text-weight-bold">{{project.nombre}}</div><div class="text-caption text-grey-6">{{project.empresa?.nombre_comercial}}</div></div>
            <div class="col-auto"><q-badge v-if="project.precio_acordado!==null" :color="statusColor(project.estado_pago)">{{pretty(project.estado_pago)}}</q-badge></div>
          </q-card-section>
          <q-separator/>
          <q-card-section v-if="project.precio_acordado!==null">
            <div class="row q-col-gutter-md">
              <div class="col-6 col-md-3"><div class="text-caption text-grey-6">Proyecto</div><div class="text-h6 text-weight-bold">{{money(project.precio_acordado)}}</div></div>
              <div class="col-6 col-md-3"><div class="text-caption text-grey-6">Pagado</div><div class="text-h6 text-positive text-weight-bold">{{money(project.pagado)}}</div></div>
              <div class="col-6 col-md-3"><div class="text-caption text-grey-6">Pendiente</div><div class="text-h6 text-weight-bold">{{money(project.pendiente)}}</div></div>
              <div class="col-6 col-md-3"><div class="text-caption text-grey-6">Anticipo acordado</div><div class="text-h6 text-weight-bold">{{money(project.anticipo_monto)}}</div></div>
            </div>
            <div v-if="project.pagos?.length" class="q-mt-lg"><div class="text-subtitle2 text-weight-bold q-mb-sm">Pagos registrados</div><q-list bordered separator class="rounded-borders"><q-item v-for="payment in project.pagos" :key="payment.id"><q-item-section avatar><q-icon name="check_circle" color="positive"/></q-item-section><q-item-section><q-item-label>{{pretty(payment.tipo)}} · {{money(payment.monto)}}</q-item-label><q-item-label caption>{{payment.fecha_pago}} · {{pretty(payment.metodo)}}{{payment.referencia?` · ${payment.referencia}`:''}}</q-item-label></q-item-section></q-item></q-list></div>
          </q-card-section>
          <q-card-section v-else class="text-grey-6">El acuerdo económico de este proyecto todavía no fue registrado en VITI.</q-card-section>

          <template v-if="project.suscripcion">
            <q-separator/><q-card-section><div class="row items-center q-gutter-sm"><div class="text-h6 text-weight-bold">Suscripción</div><q-badge :color="statusColor(project.suscripcion.estado)">{{pretty(project.suscripcion.estado)}}</q-badge></div><div class="row q-col-gutter-md q-mt-xs"><div class="col-12 col-sm-4"><div class="text-caption text-grey-6">Plan</div><div>{{project.suscripcion.plan}}</div></div><div class="col-6 col-sm-4"><div class="text-caption text-grey-6">Monto</div><div>{{money(project.suscripcion.monto)}} / {{project.suscripcion.frecuencia==='anual'?'año':'mes'}}</div></div><div class="col-6 col-sm-4"><div class="text-caption text-grey-6">Próximo vencimiento</div><div>{{project.suscripcion.fecha_vencimiento}}</div></div></div><q-banner v-if="project.suscripcion.estado==='gracia'" rounded class="bg-orange-1 text-orange-10 q-mt-md">Tu pago venció, pero todavía estás dentro del periodo de gracia. La aplicación sigue disponible.</q-banner><q-banner v-if="project.suscripcion.estado==='suspendida'" rounded class="bg-red-1 text-negative q-mt-md">La suscripción está suspendida. Tus datos permanecen guardados; regulariza el pago para reactivar el acceso.</q-banner></q-card-section>
          </template>
        </q-card>
      </div>

      <div class="col-12 col-lg-4">
        <q-card flat class="viti-card sticky-card"><q-card-section class="text-center"><div class="text-h6 text-weight-bold">Pagar a VITI</div><div class="text-caption text-grey-6">Escanea el QR e ingresa el monto indicado en tu estado de cuenta.</div><img :src="paymentQrData" alt="QR de pago VITI" class="qr-img q-mt-md"/><div class="text-subtitle2 text-weight-bold q-mt-md">{{data.configuracion?.banco||'Banco Ganadero'}}</div><div>{{data.configuracion?.titular||'Guzman Ribera Alexander'}}</div><div class="text-caption text-grey-6 q-mt-xs">Moneda: {{data.configuracion?.moneda||'BOB'}}</div></q-card-section><q-separator/><q-card-actions vertical><q-btn color="primary" unelevated no-caps icon="forum" label="Avisar que ya pagué" to="/mi-buzon"/><q-btn flat color="primary" no-caps icon="support_agent" label="Hablar con VITI" to="/mi-buzon"/></q-card-actions></q-card>
      </div>
    </div>

    <div v-else class="empty-state"><q-icon name="payments" size="58px"/><div class="text-h6 q-mt-md">Todavía no tienes cobros registrados</div><div class="q-mt-xs">Cuando exista un acuerdo económico o una suscripción, aparecerá aquí.</div></div>
  </template>
</q-page>
</template>

<style scoped>.qr-img{width:min(100%,320px);aspect-ratio:1/1;object-fit:contain;background:#fff;border-radius:16px;padding:12px;border:1px solid var(--viti-border)}.sticky-card{position:sticky;top:88px}.empty-state{min-height:320px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;color:var(--viti-muted)}@media(max-width:1023px){.sticky-card{position:static}}</style>
