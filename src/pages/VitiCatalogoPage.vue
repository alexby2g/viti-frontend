<script setup>
import { onMounted, ref } from 'vue'
import { useQuasar } from 'quasar'
import { api, warmBackend } from '../boot/axios'
import AppBrand from '../components/AppBrand.vue'

const $q = useQuasar()
const loading = ref(true)
const plans = ref([])
const plansError = ref(false)

const solutions = [
  {
    icon: 'local_pizza',
    title: 'Gestión para Pizzerías',
    kicker: 'Solución destacada',
    description: 'Pedidos, cocina, clientes, inventario, caja y delivery reunidos en una sola plataforma.',
    features: ['Pedidos y estados', 'Pantalla de cocina', 'Inventario e insumos', 'Clientes e historial', 'Caja y pagos', 'Menú digital y delivery'],
  },
  {
    icon: 'content_cut',
    title: 'Gestión para Salones',
    kicker: 'Servicios y citas',
    description: 'Agenda, clientes, servicios, personal, atenciones y pagos para organizar la operación diaria.',
    features: ['Agenda y citas', 'Clientes', 'Servicios y precios', 'Personal', 'Atenciones', 'Caja e historial'],
  },
  {
    icon: 'build',
    title: 'Servicio Técnico',
    kicker: 'Operación técnica',
    description: 'Clientes, equipos, órdenes, técnicos, materiales, pagos, garantías e historial técnico.',
    features: ['Clientes y equipos', 'Órdenes de servicio', 'Técnicos y agenda', 'Inventario de materiales', 'Pagos', 'Garantías e historial'],
  },
  {
    icon: 'storefront',
    title: 'Soluciones para Comercios',
    kicker: 'Ventas y control',
    description: 'Digitaliza la gestión de productos, ventas, inventario, clientes y reportes de tu negocio.',
    features: ['Productos y catálogo', 'Ventas', 'Inventario', 'Clientes', 'Caja', 'Reportes'],
  },
]

async function loadPlans () {
  loading.value = true
  plansError.value = false
  try {
    await warmBackend()
    const { data } = await api.get('/publico/planes')
    plans.value = data?.data || []
  } catch (error) {
    plansError.value = true
    plans.value = []
    $q.notify({ type: 'warning', message: 'No pudimos cargar los planes en este momento.' })
  } finally {
    loading.value = false
  }
}

function requestSolution (solution = '') {
  const params = new URLSearchParams()
  if (solution) params.set('solucion', solution)
  window.location.href = `/solicitud${params.toString() ? `?${params.toString()}` : ''}`
}

function money (value) {
  if (value === null || value === undefined || value === '') return 'Consultar'
  return `${Number(value).toLocaleString('es-BO', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} Bs`
}

onMounted(loadPlans)
</script>

<template>
  <div class="catalog-page">
    <header class="catalog-nav">
      <div class="catalog-container row items-center no-wrap">
        <AppBrand />
        <q-space />
        <nav class="gt-sm row items-center q-gutter-sm">
          <q-btn flat no-caps label="Soluciones" href="#soluciones" />
          <q-btn flat no-caps label="Planes" href="#planes" />
        </nav>
        <q-btn outline color="primary" no-caps label="Ingresar" to="/login" class="q-ml-md" />
      </div>
    </header>

    <main>
      <section class="catalog-hero">
        <div class="catalog-container hero-grid">
          <div>
            <div class="eyebrow">VITI · Catálogo digital</div>
            <h1>Una solución digital para cada tipo de negocio.</h1>
            <p>Conoce las soluciones que podemos adaptar a tu negocio. VITI centraliza la información, organiza la operación y deja todo listo para crecer.</p>
            <div class="row q-gutter-sm q-mt-lg">
              <q-btn color="primary" unelevated no-caps size="lg" icon="rocket_launch" label="Solicitar una propuesta" @click="requestSolution()" />
              <q-btn outline color="primary" no-caps size="lg" icon="login" label="Ya tengo VITI" to="/login" />
            </div>
          </div>
          <div class="catalog-hero-card">
            <q-icon name="hub" size="44px" color="primary" />
            <div class="text-h5 text-weight-bold q-mt-md">VITI como plataforma</div>
            <p>Una misma base para administrar diferentes soluciones, empresas, usuarios, planes y suscripciones.</p>
            <div class="hero-pills">
              <q-badge color="blue-1" text-color="primary" label="Multiempresa" />
              <q-badge color="teal-1" text-color="teal-9" label="Planes" />
              <q-badge color="green-1" text-color="green-9" label="Soporte" />
            </div>
          </div>
        </div>
      </section>

      <section id="soluciones" class="catalog-section">
        <div class="catalog-container">
          <div class="section-heading">
            <div class="eyebrow">Soluciones</div>
            <h2>Elige una base y la adaptamos a tu forma de trabajar.</h2>
            <p>La solución final se define después de conocer los procesos reales del negocio. Esto nos permite evitar módulos innecesarios y construir solo lo que aporta valor.</p>
          </div>

          <div class="solution-grid q-mt-xl">
            <article v-for="solution in solutions" :key="solution.title" class="solution-card" :class="{ featured: solution.title.includes('Pizzerías') }">
              <div class="solution-top row items-start no-wrap">
                <q-avatar size="54px" color="blue-1" text-color="primary" :icon="solution.icon" />
                <q-space />
                <q-badge :label="solution.kicker" color="grey-2" text-color="grey-8" />
              </div>
              <h3>{{ solution.title }}</h3>
              <p>{{ solution.description }}</p>
              <q-list dense class="feature-list q-mt-md">
                <q-item v-for="feature in solution.features" :key="feature" dense>
                  <q-item-section avatar><q-icon name="check_circle" color="positive" size="18px" /></q-item-section>
                  <q-item-section>{{ feature }}</q-item-section>
                </q-item>
              </q-list>
              <q-btn color="primary" unelevated no-caps class="full-width q-mt-lg" label="Quiero esta solución" @click="requestSolution(solution.title)" />
            </article>
          </div>
        </div>
      </section>

      <section id="planes" class="catalog-section soft-section">
        <div class="catalog-container">
          <div class="section-heading">
            <div class="eyebrow">Planes VITI</div>
            <h2>Comienza con el plan que mejor se ajuste a tu operación.</h2>
            <p>Los precios que aparecen aquí son orientativos. Una propuesta final puede variar según los módulos, usuarios, aplicaciones y necesidades de implementación.</p>
          </div>

          <div v-if="loading" class="row justify-center q-my-xl"><q-spinner color="primary" size="48px" /></div>
          <div v-else-if="plansError" class="plan-empty q-my-xl">
            <q-icon name="payments" size="40px" color="warning" />
            <div class="text-h6 text-weight-bold q-mt-md">Planes disponibles bajo consulta</div>
            <div class="text-body2 text-grey-7 q-mt-sm">Podemos preparar una propuesta personalizada para tu negocio.</div>
            <q-btn color="primary" unelevated no-caps label="Solicitar propuesta" class="q-mt-lg" @click="requestSolution()" />
          </div>
          <div v-else class="plan-grid q-mt-xl">
            <article v-for="(plan, index) in plans" :key="plan.id || plan.codigo" class="plan-card" :class="{ featured: index === 1 }">
              <div class="text-overline text-primary text-weight-bold">{{ plan.codigo }}</div>
              <h3>{{ plan.nombre }}</h3>
              <p>{{ plan.descripcion || 'Plan flexible para digitalizar la operación de tu negocio.' }}</p>
              <div class="plan-price">{{ money(plan.precio_mensual) }}<span v-if="plan.precio_mensual !== null">/mes</span></div>
              <div class="plan-annual" v-if="plan.precio_anual !== null">{{ money(plan.precio_anual) }}/año</div>
              <q-separator class="q-my-md" />
              <div class="plan-meta">{{ plan.dias_prueba || 0 }} días de prueba · hasta {{ plan.max_usuarios || 'varios' }} usuarios</div>
              <q-btn color="primary" :outline="index !== 1" unelevated no-caps class="full-width q-mt-lg" label="Consultar este plan" @click="requestSolution(`Plan ${plan.nombre}`)" />
            </article>
          </div>

          <div class="custom-plan q-mt-xl">
            <div>
              <div class="eyebrow">¿Necesitas algo diferente?</div>
              <div class="text-h5 text-weight-bold q-mt-xs">Creamos una propuesta según tu negocio.</div>
              <div class="text-body2 text-grey-7 q-mt-sm">Ideal para restaurantes, pizzerías y empresas con procesos específicos.</div>
            </div>
            <q-btn color="primary" unelevated no-caps size="lg" label="Hablar sobre mi proyecto" icon="chat" @click="requestSolution()" />
          </div>
        </div>
      </section>

      <section class="catalog-cta">
        <div class="catalog-container cta-inner">
          <div>
            <div class="eyebrow">Siguiente paso</div>
            <h2>Cuéntanos qué necesita tu negocio y te preparamos una propuesta.</h2>
          </div>
          <q-btn color="white" text-color="primary" unelevated no-caps size="lg" label="Solicitar propuesta" icon="arrow_forward" @click="requestSolution()" />
        </div>
      </section>
    </main>

    <footer class="catalog-footer">
      <div class="catalog-container row items-center justify-between q-col-gutter-md">
        <div><strong>VITI</strong> · desarrollado y administrado por AGR Studio</div>
        <div class="text-caption">Catálogo digital · Soluciones para negocios</div>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.catalog-page{min-height:100vh;background:#f7fafc;color:#102a43}.catalog-container{width:min(1180px,calc(100% - 40px));margin:0 auto}.catalog-nav{position:sticky;top:0;z-index:30;background:rgba(247,250,252,.95);backdrop-filter:blur(16px);border-bottom:1px solid rgba(16,42,67,.08)}.catalog-nav>.catalog-container{min-height:76px}.catalog-hero{padding:82px 0 90px;background:radial-gradient(circle at 85% 15%,rgba(18,184,200,.18),transparent 28%),linear-gradient(180deg,#f9fdff,#eef6fb)}.hero-grid{display:grid;grid-template-columns:minmax(0,1fr) 390px;gap:70px;align-items:center}.eyebrow{font-size:12px;font-weight:900;letter-spacing:.14em;text-transform:uppercase;color:#0b7593}.catalog-hero h1{font-size:clamp(44px,5vw,68px);line-height:1.02;letter-spacing:-.045em;margin:15px 0 22px}.catalog-hero p{font-size:19px;line-height:1.7;color:#5d7688;max-width:760px}.catalog-hero-card{background:#fff;border:1px solid rgba(16,42,67,.09);border-radius:26px;padding:30px;box-shadow:0 24px 70px rgba(17,58,84,.12)}.catalog-hero-card p{font-size:15px;line-height:1.7;margin-bottom:0}.hero-pills{display:flex;flex-wrap:wrap;gap:8px;margin-top:20px}.catalog-section{padding:90px 0}.soft-section{background:#edf5f9}.section-heading{max-width:820px}.section-heading h2{font-size:clamp(34px,4vw,50px);line-height:1.1;letter-spacing:-.035em;margin:12px 0 18px}.section-heading p{font-size:17px;line-height:1.7;color:#61798a}.solution-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px}.solution-card{background:#fff;border:1px solid rgba(16,42,67,.09);border-radius:24px;padding:28px;transition:transform .18s ease,box-shadow .18s ease}.solution-card:hover{transform:translateY(-4px);box-shadow:0 20px 50px rgba(17,58,84,.1)}.solution-card.featured{border:2px solid rgba(18,184,200,.38);box-shadow:0 24px 60px rgba(18,184,200,.11)}.solution-card h3{font-size:26px;line-height:1.15;margin:22px 0 10px}.solution-card>p{color:#60788a;line-height:1.7;margin:0}.feature-list{color:#345265}.feature-list :deep(.q-item){padding-left:0;padding-right:0}.feature-list :deep(.q-item__section--avatar){min-width:28px}.plan-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px}.plan-card{background:#fff;border:1px solid rgba(16,42,67,.09);border-radius:22px;padding:25px}.plan-card.featured{border:2px solid rgba(18,184,200,.36);box-shadow:0 22px 60px rgba(18,184,200,.1)}.plan-card h3{font-size:27px;margin:8px 0 10px}.plan-card p{color:#60788a;line-height:1.6;min-height:74px}.plan-price{font-size:32px;font-weight:900;color:#0b5f7a;margin-top:18px}.plan-price span{font-size:13px;font-weight:700;color:#7a8f9f}.plan-annual{font-size:13px;color:#5c7586;margin-top:6px}.plan-meta{font-size:13px;color:#6a8190}.plan-empty{border:1px dashed rgba(16,42,67,.2);border-radius:22px;background:#fff;padding:40px;text-align:center}.custom-plan{display:flex;justify-content:space-between;align-items:center;gap:30px;padding:28px 30px;background:#fff;border:1px solid rgba(16,42,67,.09);border-radius:22px}.catalog-cta{padding:24px 0 80px}.cta-inner{background:linear-gradient(135deg,#0b5f7a,#12a9b8);border-radius:28px;padding:42px;display:flex;justify-content:space-between;align-items:center;gap:30px;color:#fff}.cta-inner .eyebrow{color:#b8f6fa}.cta-inner h2{font-size:clamp(30px,3.5vw,44px);line-height:1.1;letter-spacing:-.035em;margin:10px 0 0;max-width:780px}.catalog-footer{border-top:1px solid rgba(16,42,67,.08);padding:28px 0;color:#60798a}.body--dark .catalog-page{background:#061725;color:#f4fbff}.body--dark .catalog-nav{background:rgba(6,23,37,.95);border-color:rgba(255,255,255,.08)}.body--dark .catalog-hero{background:radial-gradient(circle at 85% 15%,rgba(18,184,200,.17),transparent 28%),linear-gradient(180deg,#071b2a,#091827)}.body--dark .catalog-hero p,.body--dark .section-heading p,.body--dark .solution-card>p,.body--dark .plan-card p,.body--dark .custom-plan .text-grey-7{color:#a9c0cf}.body--dark .catalog-hero-card,.body--dark .solution-card,.body--dark .plan-card,.body--dark .custom-plan,.body--dark .plan-empty{background:#0c2435;border-color:rgba(255,255,255,.1)}.body--dark .plan-price{color:#8ee5eb}.body--dark .catalog-footer{border-color:rgba(255,255,255,.08);color:#9db7c7}
@media (max-width: 900px){.hero-grid,.solution-grid,.plan-grid,.cta-inner,.custom-plan{grid-template-columns:1fr;display:grid}.hero-grid{gap:35px}.catalog-hero{padding:60px 0 70px}.catalog-section{padding:65px 0}.custom-plan,.cta-inner{gap:22px}.catalog-container{width:min(100% - 28px,1180px)}}
</style>
