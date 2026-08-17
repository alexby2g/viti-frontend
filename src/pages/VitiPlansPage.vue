<script setup>
import { computed, onMounted, ref } from 'vue'
import { useQuasar } from 'quasar'
import { api } from '../boot/axios'

const $q = useQuasar()
const loading = ref(true)
const plans = ref([])
const billingMode = ref('mensual')

const fallback = [
  {
    codigo: 'basico-1800', nombre: 'VITI Inicial', descripcion: 'Para una microempresa que necesita organizar clientes, equipos, agenda, órdenes, técnicos, historial y mensajes.',
    precio_proyecto: 1800, precio_mensual: 89, precio_anual: 890, dias_prueba: 14, max_usuarios: 3, max_aplicaciones: 1,
    modulos: ['inicio','agenda','ordenes','clientes','equipos','tecnicos','historial','buzon'],
  },
  {
    codigo: 'profesional-1950', nombre: 'VITI Profesional', descripcion: 'Para servicios técnicos que además necesitan pagos, saldos, garantías, comprobantes y mayor control operativo.',
    precio_proyecto: 2400, precio_mensual: 129, precio_anual: 1290, dias_prueba: 14, max_usuarios: 6, max_aplicaciones: 1,
    modulos: ['inicio','agenda','ordenes','clientes','equipos','tecnicos','pagos','garantias','historial','buzon'],
  },
  {
    codigo: 'empresa-2500', nombre: 'VITI Empresa', descripcion: 'Para operaciones con mayor volumen que requieren inventario técnico, pagos, garantías, más usuarios y hasta 3 aplicaciones.',
    precio_proyecto: 3200, precio_mensual: 189, precio_anual: 1890, dias_prueba: 14, max_usuarios: 15, max_aplicaciones: 3,
    modulos: ['inicio','agenda','ordenes','clientes','equipos','tecnicos','inventario','pagos','garantias','historial','buzon'],
  },
  {
    codigo: 'personalizado', nombre: 'Cotización personalizada', descripcion: 'Para necesidades fuera de los planes estándar, integraciones o proyectos con alcance especial.',
    precio_proyecto: null, precio_mensual: null, precio_anual: null, dias_prueba: 14, max_usuarios: null, max_aplicaciones: null, modulos: [],
  },
]

const currentPlans = computed(() => plans.value.length ? plans.value : fallback)
const annualSaving = plan => {
  if (plan.precio_mensual == null || plan.precio_anual == null) return 0
  return Math.max(0, Number(plan.precio_mensual) * 12 - Number(plan.precio_anual))
}
const money = value => value == null ? 'Cotizar' : `${Number(value).toFixed(0)} Bs`
const modules = plan => Array.isArray(plan.modulos) ? plan.modulos : []
const moduleLabels = {
  inicio: 'Panel principal', agenda: 'Agenda', ordenes: 'Órdenes de servicio', clientes: 'Clientes', equipos: 'Equipos',
  tecnicos: 'Técnicos', inventario: 'Inventario', pagos: 'Pagos', garantias: 'Garantías', historial: 'Historial', buzon: 'Buzón y soporte',
}

async function load() {
  loading.value = true
  try {
    const response = await api.get('/publico/planes')
    plans.value = response.data?.data || []
  } catch (error) {
    plans.value = []
    $q.notify({ type: 'warning', message: 'Mostramos la referencia comercial de VITI. El catálogo en línea no está disponible en este momento.' })
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <q-page class="plans-page">
    <header class="plans-nav">
      <div class="plans-container row items-center no-wrap">
        <q-btn flat round icon="arrow_back" to="/viti" aria-label="Volver a VITI" />
        <div class="q-ml-sm">
          <div class="text-weight-bolder text-h6">VITI</div>
          <div class="text-caption text-grey-6">Planes y modalidad comercial</div>
        </div>
        <q-space />
        <q-btn outline color="primary" no-caps icon="login" label="Ingresar" to="/login" />
      </div>
    </header>

    <main class="plans-container q-py-xl">
      <section class="plans-hero text-center">
        <div class="kicker">Planes VITI</div>
        <h1>Elige cómo quieres organizar tu negocio.</h1>
        <p>VITI separa la implementación del sistema de la suscripción que mantiene la plataforma, alojamiento, base de datos, respaldos, actualizaciones generales y soporte según el plan contratado.</p>

        <div class="billing-switch q-mt-lg">
          <q-btn-toggle v-model="billingMode" no-caps unelevated rounded toggle-color="primary" :options="[{label:'Mensual',value:'mensual'},{label:'Anual',value:'anual'}]" />
        </div>
      </section>

      <section class="plans-grid q-mt-xl" aria-live="polite">
        <q-card v-for="plan in currentPlans" :key="plan.codigo" flat bordered class="plan-card" :class="{'featured-plan': plan.codigo === 'profesional-1950'}">
          <q-card-section>
            <div class="row items-center no-wrap">
              <div>
                <div class="plan-name">{{ plan.nombre }}</div>
                <div class="text-caption text-grey-6">{{ plan.max_usuarios ? `Hasta ${plan.max_usuarios} usuarios` : 'Alcance flexible' }}</div>
              </div>
              <q-space />
              <q-badge v-if="plan.codigo === 'profesional-1950'" color="primary" label="Recomendado" />
            </div>

            <p class="plan-description q-mt-md">{{ plan.descripcion }}</p>

            <div class="price-block q-mt-lg">
              <div class="price-label">Implementación</div>
              <div class="price-value">{{ money(plan.precio_proyecto) }}</div>
              <div class="text-caption text-grey-6">Pago del desarrollo, configuración y puesta en marcha.</div>
            </div>

            <q-separator class="q-my-lg" />

            <div class="price-block">
              <div class="price-label">Suscripción {{ billingMode }}</div>
              <div class="price-value">{{ money(billingMode === 'anual' ? plan.precio_anual : plan.precio_mensual) }}<span v-if="(billingMode === 'mensual' ? plan.precio_mensual : plan.precio_anual) != null" class="price-period"> / {{ billingMode === 'mensual' ? 'mes' : 'año' }}</span></div>
              <div v-if="billingMode === 'anual' && annualSaving(plan)" class="saving-chip">Ahorras {{ annualSaving(plan).toFixed(0) }} Bs al año</div>
              <div class="text-caption text-grey-6 q-mt-xs">{{ plan.dias_prueba || 0 }} días de prueba disponibles.</div>
            </div>

            <q-list dense class="feature-list q-mt-lg">
              <q-item v-for="module in modules(plan)" :key="module" dense>
                <q-item-section avatar><q-icon name="check_circle" color="positive" /></q-item-section>
                <q-item-section>{{ moduleLabels[module] || module }}</q-item-section>
              </q-item>
            </q-list>

            <div class="plan-capacity q-mt-md">
              <q-chip dense color="blue-1" text-color="primary" icon="apps">{{ plan.max_aplicaciones ? `${plan.max_aplicaciones} aplicación${plan.max_aplicaciones > 1 ? 'es' : ''}` : 'Aplicaciones según alcance' }}</q-chip>
              <q-chip dense color="grey-2" text-color="grey-8" icon="support_agent">Soporte VITI</q-chip>
            </div>

            <q-btn color="primary" :outline="plan.codigo === 'personalizado'" unelevated no-caps size="lg" class="full-width q-mt-lg" :label="plan.codigo === 'personalizado' ? 'Solicitar cotización' : 'Elegir plan'" to="/viti" />
          </q-card-section>
        </q-card>
      </section>

      <q-banner rounded class="commercial-note q-mt-xl">
        <template #avatar><q-icon name="info" color="primary" /></template>
        Los precios del catálogo corresponden a la configuración comercial vigente de VITI. La contratación final se valida durante el análisis de la necesidad y la definición del alcance del sistema.
      </q-banner>

      <section class="comparison q-mt-xl">
        <div class="section-kicker">¿Qué incluye la suscripción?</div>
        <h2>No pagas solamente por una pantalla.</h2>
        <div class="comparison-grid q-mt-lg">
          <div v-for="item in ['Continuidad de plataforma','Alojamiento y base de datos','Respaldos','Actualizaciones generales','Soporte ordinario','Control de acceso por plan']" :key="item" class="comparison-item">
            <q-icon name="verified" color="positive" size="22px" />
            <span>{{ item }}</span>
          </div>
        </div>
      </section>
    </main>

    <footer class="plans-footer">
      <div class="plans-container row justify-between items-center q-gutter-md">
        <span><strong>VITI</strong> · Soluciones informáticas para tu negocio.</span>
        <q-btn flat no-caps color="primary" icon="arrow_back" label="Volver a la presentación" to="/viti" />
      </div>
    </footer>
  </q-page>
</template>

<style scoped>
.plans-page{min-height:100vh;background:#f6f9fc;color:#102a43}.plans-container{width:min(1180px,calc(100% - 40px));margin:0 auto}.plans-nav{position:sticky;top:0;z-index:20;background:rgba(246,249,252,.94);backdrop-filter:blur(16px);border-bottom:1px solid rgba(16,42,67,.08)}.plans-nav>.plans-container{min-height:74px}.plans-hero{max-width:850px;margin:0 auto}.kicker,.section-kicker{font-size:12px;font-weight:900;letter-spacing:.14em;text-transform:uppercase;color:#0b7593}.plans-hero h1{font-size:clamp(40px,5vw,64px);line-height:1.05;letter-spacing:-.045em;margin:14px 0}.plans-hero p{font-size:18px;line-height:1.7;color:#5d7587}.billing-switch{display:flex;justify-content:center}.plans-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:18px;align-items:stretch}.plan-card{border-radius:22px;background:#fff;border-color:rgba(16,42,67,.1);box-shadow:0 14px 40px rgba(17,58,84,.06)}.featured-plan{border:2px solid #0b7593;transform:translateY(-8px);box-shadow:0 20px 55px rgba(11,117,147,.16)}.plan-name{font-size:22px;font-weight:850;letter-spacing:-.02em}.plan-description{min-height:116px;line-height:1.6;color:#61798a}.price-label{font-size:12px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#78909c}.price-value{font-size:32px;font-weight:900;line-height:1.05;margin-top:6px}.price-period{font-size:13px;font-weight:700;color:#78909c}.saving-chip{display:inline-block;margin-top:8px;padding:5px 9px;border-radius:999px;background:#e6f7ee;color:#147d55;font-size:11px;font-weight:800}.feature-list{min-height:175px}.feature-list .q-item{padding-left:0;padding-right:0}.plan-capacity{display:flex;flex-wrap:wrap;gap:6px}.commercial-note{background:#e8f5f8;border:1px solid #c9e7ed;color:#294c5c}.comparison{padding:30px 0 60px}.comparison h2{font-size:clamp(30px,4vw,46px);margin:10px 0 0;letter-spacing:-.035em}.comparison-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.comparison-item{background:#fff;border:1px solid rgba(16,42,67,.08);border-radius:15px;padding:16px;display:flex;gap:10px;align-items:center}.plans-footer{border-top:1px solid rgba(16,42,67,.08);padding:24px 0;color:#61788a}.body--dark .plans-page{background:#061725;color:#f3fbff}.body--dark .plans-nav{background:rgba(6,23,37,.94)}.body--dark .plan-card,.body--dark .comparison-item{background:#0c2132;border-color:rgba(255,255,255,.08)}.body--dark .plans-hero p,.body--dark .plan-description{color:#b5c7d2}.body--dark .commercial-note{background:#0b2a37;color:#d7eef3;border-color:#1c4d5e}@media(max-width:1050px){.plans-grid{grid-template-columns:repeat(2,1fr)}.featured-plan{transform:none}}@media(max-width:650px){.plans-container{width:min(100% - 24px,1180px)}.plans-grid,.comparison-grid{grid-template-columns:1fr}.plans-hero{text-align:left}.billing-switch{justify-content:flex-start}.plan-description{min-height:0}}
</style>
