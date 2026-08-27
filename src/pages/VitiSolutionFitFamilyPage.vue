<template>
  <q-page class="fitfamily-solution-page">
    <header class="solution-header">
      <div class="header-inner">
        <router-link to="/viti" class="brand-link">VITI</router-link>
        <q-btn flat no-caps color="dark" label="Volver a soluciones" to="/viti#soluciones" />
      </div>
    </header>

    <main class="page-shell">
      <section class="hero">
        <div class="hero-copy">
          <div class="eyebrow">SOLUCIÓN VITI · EN CONSTRUCCIÓN</div>
          <h1>FitFamily</h1>
          <p class="hero-lead">Una solución digital para negocios de alimentación saludable, diseñada para personalizarse antes de entregarse a su empresa.</p>
          <div class="status-row">
            <q-badge class="status-badge" label="Sin propietario asignado" />
            <q-badge class="status-badge" label="Plantilla VITI" />
          </div>
        </div>
        <div class="brand-card">
          <div class="brand-mark">FIT<br />FAMILY</div>
          <div class="brand-caption">Identidad base de la solución</div>
        </div>
      </section>

      <section class="section-block">
        <div class="section-heading">
          <div>
            <div class="eyebrow">ARQUITECTURA DE LA SOLUCIÓN</div>
            <h2>Primero construimos. Después entregamos.</h2>
          </div>
          <p>FitFamily permanece como solución preparada hasta que una empresa se registre en VITI y solicite su instancia.</p>
        </div>

        <div class="flow-grid">
          <q-card v-for="item in lifecycle" :key="item.step" flat bordered class="flow-card">
            <q-card-section>
              <q-badge class="step-badge" :label="item.step" />
              <div class="flow-icon">{{ item.icon }}</div>
              <div class="flow-title">{{ item.title }}</div>
              <div class="flow-copy">{{ item.copy }}</div>
            </q-card-section>
          </q-card>
        </div>
      </section>

      <section class="section-block">
        <div class="section-heading single">
          <div>
            <div class="eyebrow">PERSONALIZACIÓN</div>
            <h2>La solución puede adaptarse sin reconstruirla desde cero.</h2>
          </div>
        </div>

        <div class="config-grid">
          <q-card v-for="item in personalization" :key="item.title" flat bordered class="config-card">
            <q-card-section>
              <div class="config-icon">{{ item.icon }}</div>
              <div class="config-title">{{ item.title }}</div>
              <div class="config-copy">{{ item.copy }}</div>
              <div class="config-state">{{ item.state }}</div>
            </q-card-section>
          </q-card>
        </div>
      </section>

      <section class="section-block modules-section">
        <div class="section-heading">
          <div>
            <div class="eyebrow">MÓDULOS BASE</div>
            <h2>La empresa recibirá solo lo que necesita.</h2>
          </div>
          <p>Estos módulos son el punto de partida de FitFamily; la instancia final se configura al momento de la entrega.</p>
        </div>

        <div class="modules-grid">
          <div v-for="module in modules" :key="module.key" class="module-item">
            <div class="module-check">✓</div>
            <div>
              <div class="module-title">{{ module.name }}</div>
              <div class="module-copy">{{ module.copy }}</div>
            </div>
          </div>
        </div>
      </section>

      <section class="cta-card">
        <div>
          <div class="eyebrow">CUANDO LLEGUE EL CLIENTE</div>
          <h2>FitFamily se convierte en una aplicación propia.</h2>
          <p>VITI registrará la empresa, propietario, usuarios, configuración y módulos de la instancia sin alterar la solución base.</p>
        </div>
        <q-btn color="primary" unelevated no-caps label="Crear esta solución para una empresa" to="/registro" />
      </section>
    </main>

    <footer>Solución desarrollada y administrada por AGR Studio · VITI</footer>
  </q-page>
</template>

<script setup>
const lifecycle = [
  { step: '01', icon: '01', title: 'Solución base', copy: 'VITI define la estructura, identidad y capacidades de FitFamily.' },
  { step: '02', icon: '02', title: 'Personalización', copy: 'Se ajustan branding, módulos y experiencia según la empresa.' },
  { step: '03', icon: '03', title: 'Registro', copy: 'Un cliente se registra en VITI y se crea su contexto empresarial.' },
  { step: '04', icon: '04', title: 'Entrega', copy: 'La instancia personalizada se entrega como su propio sistema.' },
]

const personalization = [
  { icon: 'A', title: 'Identidad', copy: 'Logo, nombre, colores y presencia visual del negocio.', state: 'Configuración base' },
  { icon: 'M', title: 'Módulos', copy: 'Activar solo las funciones contratadas o necesarias.', state: 'Configurable' },
  { icon: 'U', title: 'Usuarios', copy: 'Roles y accesos se asignan después del registro empresarial.', state: 'Pendiente de cliente' },
  { icon: 'D', title: 'Datos', copy: 'Catálogo, categorías y productos empiezan dentro de la instancia del cliente.', state: 'Pendiente de cliente' },
]

const modules = [
  { key: 'catalogo', name: 'Catálogo', copy: 'Productos, categorías, precios y visibilidad.' },
  { key: 'inventario', name: 'Inventario', copy: 'Stock y disponibilidad para la operación.' },
  { key: 'pedidos', name: 'Pedidos', copy: 'Recepción y seguimiento de compras.' },
  { key: 'clientes', name: 'Clientes', copy: 'Gestión de compradores y datos del negocio.' },
  { key: 'reportes', name: 'Reportes', copy: 'Indicadores básicos para la administración.' },
  { key: 'branding', name: 'Personalización', copy: 'Identidad visual y configuración de la instancia.' },
]
</script>

<style scoped>
.fitfamily-solution-page{min-height:100vh;background:#f7faf3;color:#314b35}
.solution-header{position:sticky;top:0;z-index:5;background:rgba(247,250,243,.94);backdrop-filter:blur(14px);border-bottom:1px solid #dce8d7}
.header-inner{width:min(1180px,calc(100% - 32px));margin:0 auto;min-height:72px;display:flex;align-items:center;justify-content:space-between}
.brand-link{font-weight:1000;letter-spacing:.16em;color:#55765a;text-decoration:none}
.page-shell{width:min(1180px,calc(100% - 32px));margin:0 auto;padding:56px 0 80px}
.hero{display:grid;grid-template-columns:1.4fr .8fr;gap:28px;align-items:stretch}
.hero-copy,.brand-card,.flow-card,.config-card,.modules-section,.cta-card{background:#fff;border:1px solid #d8e5d4;box-shadow:0 20px 60px rgba(60,88,60,.08)}
.hero-copy{border-radius:30px;padding:46px}
.eyebrow{font-size:11px;letter-spacing:.17em;font-weight:900;color:#6f9c72;text-transform:uppercase}
h1{font-size:clamp(54px,8vw,92px);line-height:.9;letter-spacing:-.065em;margin:16px 0 18px;color:#45664b}
.hero-lead{max-width:700px;font-size:20px;line-height:1.65;color:#617661}
.status-row{display:flex;flex-wrap:wrap;gap:10px;margin-top:26px}
.status-badge{background:#e8f2e5;color:#4f7154;border:1px solid #cbdfc5;padding:8px 12px}
.brand-card{border-radius:30px;padding:30px;display:flex;flex-direction:column;justify-content:center;align-items:center;background:linear-gradient(145deg,#eff7e9,#dcebd6)}
.brand-mark{width:190px;height:190px;border-radius:50%;display:grid;place-items:center;text-align:center;background:#f8fbf4;color:#55765a;font-size:25px;font-weight:1000;letter-spacing:.09em;line-height:1.05;box-shadow:0 18px 40px rgba(70,103,72,.13)}
.brand-caption{margin-top:18px;font-size:12px;color:#70816f}
.section-block{margin-top:72px}.section-heading{display:flex;align-items:end;justify-content:space-between;gap:30px;margin-bottom:24px}.section-heading.single{display:block}.section-heading h2,.cta-card h2{font-size:clamp(30px,4vw,48px);line-height:1.04;letter-spacing:-.045em;margin:10px 0 0;color:#405f46}.section-heading p{max-width:480px;color:#718271;line-height:1.65;margin:0}
.flow-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}.flow-card{border-radius:22px}.flow-icon{font-size:15px;font-weight:1000;color:#82aa80;margin:22px 0 8px}.flow-title,.config-title{font-size:18px;font-weight:900;color:#405b43}.flow-copy,.config-copy{margin-top:8px;line-height:1.6;color:#758273;font-size:14px}.step-badge{background:#edf6ea;color:#698a69}
.config-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}.config-card{border-radius:22px}.config-icon{width:42px;height:42px;border-radius:13px;display:grid;place-items:center;background:#e7f2e3;color:#6e966d;font-weight:1000;margin-bottom:18px}.config-state{margin-top:16px;font-size:11px;text-transform:uppercase;letter-spacing:.08em;font-weight:900;color:#79a077}
.modules-section{border-radius:28px;padding:34px}.modules-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:14px}.module-item{display:flex;gap:14px;padding:16px;border-radius:18px;background:#f8fbf6;border:1px solid #e0eadc}.module-check{width:28px;height:28px;border-radius:50%;display:grid;place-items:center;background:#dcebd8;color:#55765a;font-weight:1000}.module-title{font-weight:900;color:#465f48}.module-copy{margin-top:4px;font-size:13px;line-height:1.5;color:#778477}
.cta-card{margin-top:72px;border-radius:28px;padding:34px;display:flex;align-items:center;justify-content:space-between;gap:30px;background:#eaf4e6}.cta-card p{max-width:700px;color:#657662;line-height:1.65}.cta-card :deep(.q-btn){border-radius:13px;min-height:52px;padding:0 22px;background:#7fa67a}
footer{border-top:1px solid #dce8d7;text-align:center;padding:24px;color:#768277;font-size:11px}
@media(max-width:900px){.hero{grid-template-columns:1fr}.flow-grid,.config-grid{grid-template-columns:repeat(2,1fr)}.section-heading,.cta-card{align-items:flex-start;flex-direction:column}.modules-grid{grid-template-columns:1fr}}
@media(max-width:600px){.page-shell{padding-top:30px}.hero-copy{padding:28px}.flow-grid,.config-grid{grid-template-columns:1fr}.modules-section{padding:22px}.brand-mark{width:150px;height:150px}}
</style>
