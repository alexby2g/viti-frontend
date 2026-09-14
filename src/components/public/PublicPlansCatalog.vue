<script setup>
import { onMounted } from 'vue'
import { useVitiPublicPlans } from '../../composables/useVitiPublicPlans'
defineProps({ embedded:{type:Boolean,default:false}, showIntro:{type:Boolean,default:true} })
const {loading,online,billingMode,currentPlans,annualSaving,money,accessTo,load}=useVitiPublicPlans()
onMounted(load)
</script>

<template>
  <section class="catalog" :class="{embedded}">
    <div v-if="showIntro" class="catalog-head">
      <div><div class="section-kicker">Planes VITI</div><h2>Elige una referencia para empezar.</h2><p>El precio final se confirma después de revisar tu necesidad. Si tu proyecto no encaja en un plan, preparamos una cotización a medida.</p></div>
      <q-btn-toggle v-model="billingMode" no-caps unelevated rounded toggle-color="orange" color="transparent" text-color="grey-4" :options="[{label:'Mensual',value:'mensual'},{label:'Anual',value:'anual'}]"/>
    </div>
    <div v-else class="catalog-switch"><q-btn-toggle v-model="billingMode" no-caps unelevated rounded toggle-color="orange" color="transparent" text-color="grey-4" :options="[{label:'Mensual',value:'mensual'},{label:'Anual',value:'anual'}]"/></div>

    <div v-if="loading" class="catalog-loading"><q-spinner-dots color="orange" size="40px"/><span>Cargando planes...</span></div>

    <div class="catalog-grid" aria-live="polite">
      <q-card v-for="plan in currentPlans" :key="plan.codigo" flat class="plan-card" :class="{'featured-plan':plan.codigo==='profesional-1950'}">
        <q-card-section class="plan-body">
          <div class="plan-top"><div><div class="plan-name">{{plan.nombre}}</div><div class="plan-cap">{{plan.max_usuarios?`Hasta ${plan.max_usuarios} usuarios`:'Alcance personalizado'}}</div></div><q-badge v-if="plan.codigo==='profesional-1950'" color="orange" text-color="dark" label="Recomendado"/></div>
          <p class="plan-description">{{plan.descripcion}}</p>

          <div class="price-block"><div class="price-label">Implementación</div><div class="price-value">{{money(plan.precio_proyecto)}}</div><div class="price-note">Pago inicial por análisis, desarrollo, configuración y puesta en marcha.</div></div>
          <q-separator class="q-my-lg"/>
          <div class="price-block"><div class="price-label">Servicio {{billingMode}}</div><div class="price-value">{{money(billingMode==='anual'?plan.precio_anual:plan.precio_mensual)}}<span v-if="(billingMode==='mensual'?plan.precio_mensual:plan.precio_anual)!=null" class="price-period"> / {{billingMode==='mensual'?'mes':'año'}}</span></div><div v-if="billingMode==='anual'&&annualSaving(plan)" class="saving-chip">Ahorro aproximado: {{annualSaving(plan).toFixed(0)}} Bs/año</div><div class="price-note">Alojamiento, mantenimiento y soporte según el alcance contratado.</div></div>

          <div class="simple-features">
            <div><q-icon name="check_circle"/> Seguimiento del proyecto</div>
            <div><q-icon name="check_circle"/> Desarrollo según lo acordado</div>
            <div><q-icon name="check_circle"/> Pruebas, puesta en marcha y entrega</div>
            <div v-if="plan.max_aplicaciones"><q-icon name="check_circle"/> {{plan.max_aplicaciones}} sistema{{plan.max_aplicaciones>1?'s':''}} administrado{{plan.max_aplicaciones>1?'s':''}}</div>
            <div v-else><q-icon name="check_circle"/> Alcance definido contigo</div>
          </div>

          <q-btn :outline="plan.codigo==='personalizado'" color="primary" unelevated no-caps class="full-width plan-action" :label="plan.codigo==='personalizado'?'Pedir cotización':'Solicitar este plan'" :to="accessTo(plan)"/>
        </q-card-section>
      </q-card>
    </div>
    <div v-if="!online" class="catalog-note"><q-icon name="info"/><span>Mostramos los precios de referencia disponibles. El alcance final se confirma antes de iniciar.</span></div>
  </section>
</template>

<style scoped>
.catalog-head{display:flex;justify-content:space-between;gap:30px;align-items:end;margin-bottom:30px}.section-kicker,.price-label{font-size:11px;font-weight:900;letter-spacing:.13em;text-transform:uppercase;color:#f28b30}.catalog-head h2{font-size:clamp(30px,4vw,48px);line-height:1.05;letter-spacing:-.04em;margin:10px 0;color:#f6faff}.catalog-head p{color:#a9bac8;font-size:16px;line-height:1.6;max-width:720px}.catalog-switch{display:flex;justify-content:center;margin-bottom:25px}.catalog-loading{min-height:160px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;color:#94a8ba}.catalog-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}.plan-card{height:100%;border-radius:22px;background:linear-gradient(180deg,#0a192a,#10243c)!important;color:#eaf0f7!important;border:1px solid rgba(73,108,142,.34);box-shadow:0 16px 38px rgba(0,0,0,.16);transition:.2s ease}.plan-card:hover{transform:translateY(-3px);border-color:rgba(242,139,48,.44)}.featured-plan{background:linear-gradient(180deg,#10253f,#153256)!important;border:1px solid #f28b30;box-shadow:0 20px 55px rgba(0,0,0,.22)}.plan-body{height:100%;display:flex;flex-direction:column;padding:22px}.plan-top{display:flex;align-items:flex-start;gap:10px;justify-content:space-between}.plan-name{font-size:22px;font-weight:850}.plan-cap{font-size:11px;color:#91a6b9;margin-top:4px}.plan-description{min-height:120px;line-height:1.6;color:#b5c3cf;margin:18px 0 20px}.price-value{font-size:30px;font-weight:900;line-height:1.05;margin-top:6px}.price-period{font-size:12px;color:#9eb0c0}.price-note{color:#8fa3b5;font-size:11px;line-height:1.5;margin-top:5px}.saving-chip{display:inline-block;margin-top:8px;padding:5px 9px;border-radius:999px;background:rgba(242,139,48,.12);color:#ffb067;font-size:10px;font-weight:800}.plan-card :deep(.q-separator){background:rgba(157,178,198,.16)}.simple-features{display:grid;gap:8px;margin:20px 0;color:#ccd7e1;font-size:12px}.simple-features>div{display:flex;gap:8px;align-items:flex-start}.simple-features .q-icon{color:#55d58f;font-size:17px;margin-top:-1px}.plan-action{margin-top:auto;min-height:46px;border-radius:12px}.catalog-note{margin-top:18px;padding:12px 15px;border-radius:13px;background:rgba(10,23,39,.9);color:#aebfcd;display:flex;gap:9px;align-items:center;font-size:11px;border:1px solid rgba(242,139,48,.18)}.catalog-note .q-icon{color:#f28b30}@media(max-width:1050px){.catalog-grid{grid-template-columns:repeat(2,1fr)}.plan-description{min-height:80px}}@media(max-width:650px){.catalog-head{flex-direction:column;align-items:flex-start}.catalog-grid{grid-template-columns:1fr}.plan-description{min-height:0}}
</style>
