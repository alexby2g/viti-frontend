<script setup>
import { onMounted } from 'vue'
import { publicModuleLabels, useVitiPublicPlans } from '../../composables/useVitiPublicPlans'
const props=defineProps({embedded:{type:Boolean,default:false},showIntro:{type:Boolean,default:true}})
const {loading,online,plans,billingMode,currentPlans,annualSaving,money,modules,accessTo,load}=useVitiPublicPlans()
onMounted(load)
</script>
<template>
  <section class="catalog" :class="{embedded}">
    <div v-if="showIntro" class="catalog-head"><div><div class="section-kicker">Planes VITI</div><h2>Elige el nivel que necesita tu empresa.</h2><p>Compara implementación, suscripción y capacidades antes de solicitar acceso.</p></div><q-btn-toggle v-model="billingMode" no-caps unelevated rounded toggle-color="primary" :options="[{label:'Mensual',value:'mensual'},{label:'Anual',value:'anual'}]"/></div>
    <div v-else class="catalog-switch"><q-btn-toggle v-model="billingMode" no-caps unelevated rounded toggle-color="primary" :options="[{label:'Mensual',value:'mensual'},{label:'Anual',value:'anual'}]"/></div>
    <div v-if="loading" class="catalog-loading"><q-spinner-dots color="primary" size="40px"/><span>Cargando planes...</span></div>
    <div class="catalog-grid" aria-live="polite">
      <q-card v-for="plan in currentPlans" :key="plan.codigo" flat bordered class="plan-card" :class="{'featured-plan':plan.codigo==='profesional-1950'}"><q-card-section>
        <div class="row items-center no-wrap"><div><div class="plan-name">{{plan.nombre}}</div><div class="text-caption text-grey-6">{{plan.max_usuarios?`Hasta ${plan.max_usuarios} usuarios`:'Alcance flexible'}}</div></div><q-space/><q-badge v-if="plan.codigo==='profesional-1950'" color="primary" label="Recomendado"/></div>
        <p class="plan-description q-mt-md">{{plan.descripcion}}</p>
        <div class="price-block q-mt-lg"><div class="price-label">Implementación</div><div class="price-value">{{money(plan.precio_proyecto)}}</div><div class="text-caption text-grey-6">Desarrollo, configuración y puesta en marcha.</div></div>
        <q-separator class="q-my-lg"/>
        <div class="price-block"><div class="price-label">Suscripción {{billingMode}}</div><div class="price-value">{{money(billingMode==='anual'?plan.precio_anual:plan.precio_mensual)}}<span v-if="(billingMode==='mensual'?plan.precio_mensual:plan.precio_anual)!=null" class="price-period"> / {{billingMode==='mensual'?'mes':'año'}}</span></div><div v-if="billingMode==='anual'&&annualSaving(plan)" class="saving-chip">Ahorras {{annualSaving(plan).toFixed(0)}} Bs al año</div><div class="text-caption text-grey-6 q-mt-xs">{{plan.dias_prueba||0}} días de prueba disponibles.</div></div>
        <q-list dense class="feature-list q-mt-lg"><q-item v-for="module in modules(plan)" :key="module" dense><q-item-section avatar><q-icon name="check_circle" color="positive"/></q-item-section><q-item-section>{{publicModuleLabels[module]||module}}</q-item-section></q-item></q-list>
        <div class="plan-capacity q-mt-md"><q-chip dense color="blue-1" text-color="primary" icon="apps">{{plan.max_aplicaciones?`${plan.max_aplicaciones} aplicación${plan.max_aplicaciones>1?'es':''}`:'Aplicaciones según alcance'}}</q-chip><q-chip dense color="grey-2" text-color="grey-8" icon="support_agent">Soporte VITI</q-chip></div>
        <q-btn color="primary" :outline="plan.codigo==='personalizado'" unelevated no-caps size="lg" class="full-width q-mt-lg" :label="plan.codigo==='personalizado'?'Solicitar cotización':'Elegir plan'" :to="accessTo(plan)"/>
      </q-card-section></q-card>
    </div>
    <div v-if="!online" class="catalog-note"><q-icon name="info" color="primary"/><span>Mostramos el catálogo comercial disponible mientras el catálogo en línea no responde.</span></div>
  </section>
</template>
<style scoped>
.catalog-head{display:flex;justify-content:space-between;gap:30px;align-items:end;margin-bottom:30px}.section-kicker,.price-label{font-size:12px;font-weight:900;letter-spacing:.12em;text-transform:uppercase;color:#0b7593}.catalog-head h2{font-size:clamp(30px,4vw,48px);line-height:1.05;letter-spacing:-.04em;margin:10px 0}.catalog-head p{color:#61798a;font-size:16px}.catalog-switch{display:flex;justify-content:center;margin-bottom:25px}.catalog-loading{min-height:160px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;color:#61798a}.catalog-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:18px}.plan-card{border-radius:22px;background:#fff;border-color:rgba(16,42,67,.1);box-shadow:0 14px 40px rgba(17,58,84,.06)}.featured-plan{border:2px solid #0b7593;transform:translateY(-8px);box-shadow:0 20px 55px rgba(11,117,147,.16)}.plan-name{font-size:22px;font-weight:850}.plan-description{min-height:116px;line-height:1.6;color:#61798a}.price-value{font-size:30px;font-weight:900;line-height:1.05;margin-top:6px}.price-period{font-size:12px;color:#78909c}.saving-chip{display:inline-block;margin-top:8px;padding:5px 9px;border-radius:999px;background:#e6f7ee;color:#147d55;font-size:11px;font-weight:800}.feature-list{min-height:165px}.plan-capacity{display:flex;flex-wrap:wrap;gap:6px}.catalog-note{margin-top:18px;padding:12px 15px;border-radius:13px;background:#e8f5f8;color:#355666;display:flex;gap:9px;align-items:center;font-size:12px}@media(max-width:1050px){.catalog-grid{grid-template-columns:repeat(2,1fr)}.featured-plan{transform:none}}@media(max-width:650px){.catalog-head{flex-direction:column;align-items:flex-start}.catalog-grid{grid-template-columns:1fr}.plan-description{min-height:0}}
</style>
