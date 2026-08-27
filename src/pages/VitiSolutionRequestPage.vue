<template>
  <q-page class="solution-request-page">
    <header class="topbar">
      <div class="shell topbar-inner">
        <router-link to="/viti/soluciones/fitfamily" class="brand">VITI · FitFamily</router-link>
        <q-btn flat no-caps color="dark" label="Volver a la solución" to="/viti/soluciones/fitfamily" />
      </div>
    </header>

    <main class="shell content">
      <section class="request-card">
        <div class="eyebrow">SOLICITUD DE SOLUCIÓN</div>
        <h1>Empecemos a adaptar <span>FitFamily</span>.</h1>
        <p class="lead">Todavía no estamos creando una empresa ni una instancia. Primero recogemos la necesidad del negocio para que VITI prepare una propuesta de personalización.</p>

        <div class="info-grid">
          <div class="info"><strong>Producto base</strong><span>FitFamily</span></div>
          <div class="info"><strong>Estado</strong><span>Solución en construcción</span></div>
          <div class="info"><strong>Propietario</strong><span>Aún no asignado</span></div>
          <div class="info"><strong>Instancia</strong><span>Se crea después del registro</span></div>
        </div>

        <q-form class="form" @submit.prevent="continueRequest">
          <q-input v-model="form.negocio" outlined label="¿Qué tipo de negocio tienes?" hint="Ejemplo: cafetería, restaurante, venta de snacks, delivery saludable." />
          <q-input v-model="form.necesidad" outlined type="textarea" autogrow label="¿Qué quieres que haga FitFamily para tu negocio?" hint="Cuéntanos el flujo que necesitas." />
          <q-input v-model="form.personalizacion" outlined type="textarea" autogrow label="¿Qué quieres personalizar?" hint="Marca, colores, catálogo, módulos, pedidos, reglas, etc." />

          <div class="note"><q-icon name="info" size="20px" /><div><strong>Este paso no asigna propietario.</strong><span>Cuando llegue el momento del registro, VITI creará la empresa, definirá al propietario y generará la instancia personalizada.</span></div></div>

          <div class="actions"><q-btn flat no-caps label="Ver la solución" to="/viti/soluciones/fitfamily" /><q-btn type="submit" color="primary" unelevated no-caps label="Continuar con mi solicitud" :disable="!canContinue" /></div>
        </q-form>
      </section>
    </main>
  </q-page>
</template>

<script setup>
import { computed, reactive } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const form = reactive({ negocio: '', necesidad: '', personalizacion: '' })
const canContinue = computed(() => form.negocio.trim() && form.necesidad.trim())

function continueRequest () {
  const payload = { solucion: 'fitfamily', ...form, created_at: new Date().toISOString() }
  sessionStorage.setItem('viti:solution-request', JSON.stringify(payload))
  router.push({ path: '/solicitud/sin-plan', query: { solucion: 'fitfamily' } })
}
</script>

<style scoped>
.solution-request-page{min-height:100vh;background:#f7faf3;color:#3f5d45}.shell{width:min(960px,calc(100% - 32px));margin:0 auto}.topbar{background:rgba(255,255,255,.94);border-bottom:1px solid #dce8d7;position:sticky;top:0;z-index:20}.topbar-inner{min-height:72px;display:flex;align-items:center;justify-content:space-between}.brand{font-weight:900;color:#416348;text-decoration:none}.content{padding:55px 0}.request-card{background:#fff;border:1px solid #d7e3d2;border-radius:28px;padding:42px;box-shadow:0 24px 70px rgba(63,93,69,.12)}.eyebrow{font-size:11px;font-weight:900;letter-spacing:.16em;text-transform:uppercase;color:#69866a}.request-card h1{font-size:clamp(42px,6vw,68px);line-height:.98;letter-spacing:-.055em;margin:18px 0;color:#3b5a41}.request-card h1 span{color:#78a36d}.lead{font-size:18px;line-height:1.8;color:#6a7f69;max-width:760px}.info-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:30px 0}.info{padding:16px;border-radius:16px;background:#eef6e9;border:1px solid #dbe9d3}.info strong,.info span{display:block}.info strong{font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:#758d72}.info span{margin-top:6px;font-size:13px;font-weight:800}.form{display:grid;gap:16px}.form :deep(.q-field__control){border-radius:14px;background:#fff}.note{display:flex;gap:12px;padding:16px 18px;border-radius:16px;background:#f1f8ed;border:1px solid #d7e8ce;color:#5c7059}.note strong,.note span{display:block}.note strong{color:#4c694e}.note span{margin-top:3px;font-size:13px;line-height:1.55}.actions{display:flex;justify-content:flex-end;gap:10px;flex-wrap:wrap;margin-top:8px}@media(max-width:750px){.info-grid{grid-template-columns:1fr 1fr}.request-card{padding:26px}}@media(max-width:520px){.info-grid{grid-template-columns:1fr}.topbar-inner .q-btn{display:none}}
</style>
