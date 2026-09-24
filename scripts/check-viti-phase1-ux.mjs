import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
const root=process.cwd(),read=f=>fs.readFileSync(path.join(root,f),'utf8'),has=(c,n,l)=>assert.ok(c.includes(n),`${l}: falta ${n}`),not=(c,n,l)=>assert.ok(!c.includes(n),`${l}: no debe contener ${n}`);
const login=read('src/pages/LoginPage.vue'),register=read('src/pages/ClientRegisterPage.vue'),request=read('src/pages/PublicSolicitudStartPage.vue'),landing=read('src/pages/VitiLandingPage.vue'),plans=read('src/pages/VitiPlansPage.vue'),demo=read('src/pages/GuestDemoPage.vue'),app=read('src/css/app.scss'),brand=read('src/components/AppBrand.vue'),branding=read('src/stores/branding.js');
// Acceso sin selector de rol y con registro/demo independientes.
has(login,'VITI reconocerá automáticamente los permisos','Login automático');not(login,'q-select v-model="form.rol"','Login sin rol');has(login,"path:'/registro'",'Login registro conserva el destino');has(login,'to="/demo"','Login demo');
// Registro breve y moderno.
for(const term of ['Nombre completo *','Correo electrónico *','Celular *','Mi celular también tiene WhatsApp','Mi negocio atiende desde otro WhatsApp','Contraseña *','Confirmar contraseña *']) has(register,term,'Registro');
for(const term of ['CI / documento','Expedido','Dirección / zona','Rol *','Plan *']) not(register,term,'Registro breve');
// Solicitud inicial solo comercial.
for(const term of ['Celular *','Mi celular también tiene WhatsApp','Mi negocio atiende desde otro WhatsApp','Negocio, institución o proyecto *','¿Qué sistema necesitas? *','¿Qué quieres mejorar o resolver? *']) has(request,term,'Solicitud');
for(const term of ['CI / documento','Expedido','Dirección / zona','Repositorio','Hosting','Base de datos']) not(request,term,'Solicitud comercial');
// Marca producto primero; AGR queda solo como atribución.
has(brand,'branding.product_name','Marca dinámica');has(brand,'Tecnología desarrollada por','Atribución');has(branding,"product_name: 'VITI'",'Marca VITI');has(branding,"studio_name: 'AGR Studio'",'Atribución AGR');has(branding,"document.title = `${this.product_name} · Plataforma de sistemas`",'Título navegador');
not(landing,'AGR STUDIO · VITI','Landing producto primero');has(landing,'Tecnología desarrollada por AGR Studio','Landing atribución');has(plans,'Tecnología desarrollada por AGR Studio','Planes atribución');
// Demo no toca API y autofill no blanquea inputs.
has(demo,'MODO INVITADO','Demo');not(demo,'api.','Demo frontend-only');has(app,':-webkit-autofill','Autofill');has(app,'-webkit-text-fill-color','Autofill contraste');

const router=read('src/router/index.js');
has(router,"path:'/demo', component:() => import('../layouts/AuthLayout.vue')",'Demo dentro de QLayout');
has(request,"api.post('/mi/solicitud/enviar'",'Solicitud enviada con la cuenta del cliente');
has(register,'VITI la vinculará','Registro vinculado');
console.log('VITI phase 1 UX smoke: PASS');
