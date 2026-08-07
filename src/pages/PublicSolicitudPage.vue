<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useQuasar } from 'quasar'
import { api, initCsrf } from '../boot/axios'
import AppBrand from '../components/AppBrand.vue'

const route=useRoute(),$q=useQuasar(),item=ref(null),loading=ref(true),saving=ref(false),sent=ref(false),step=ref(1),advanced=ref(false)
const answers=reactive({}), otherAnswers=reactive({}), declaration=reactive({aceptada:false,nombre:'',fecha:new Date().toISOString().slice(0,10)})
const essential=new Set([1,2,3,4,5,7,8,9,12,13,17,18,19,20,22,27,28,29,31,32,36,39,40,41,43,44,48,50,51,52,55,57,58,60,61,63,65,67,68,70])
const groups=[
 {id:1,label:'Tu negocio',sections:[1,2]},
 {id:2,label:'Personas',sections:[3]},
 {id:3,label:'Flujo y funciones',sections:[4,5]},
 {id:4,label:'Reportes y pagos',sections:[6,7]},
 {id:5,label:'Integraciones',sections:[8,9]},
 {id:6,label:'Diseño y seguridad',sections:[10,11]},
 {id:7,label:'Crecimiento y cierre',sections:[12,13,14]},
]
const sections=computed(()=>item.value?.cuestionario?.secciones||[])
const currentSections=computed(()=>sections.value.filter(s=>groups.find(g=>g.id===step.value)?.sections.includes(s.numero)))
const visible=(q)=>advanced.value||q.obligatoria||essential.has(q.numero)
const answered=computed(()=>Object.values(answers).filter(v=>Array.isArray(v)?v.length:String(v??'').trim()).length)
const totalVisible=computed(()=>sections.value.flatMap(s=>s.preguntas||[]).filter(visible).length)
const progress=computed(()=>totalVisible.value?Math.min(answered.value/totalVisible.value,1):0)
function errorMessage(e,fallback){const bag=e?.response?.data?.errors;if(bag)return Object.values(bag).flat()[0];return e?.response?.data?.message||fallback}
async function load(){loading.value=true;try{item.value=(await api.get(`/publico/solicitudes/${route.params.token}`)).data.data;for(const section of sections.value)for(const q of section.preguntas||[])answers[q.id]=q.tipo==='seleccion_multiple'?[]:'';for(const r of item.value.respuestas||[]){
 const raw=r.respuesta_json??r.respuesta_texto??''
 if(Array.isArray(raw)){
  const custom=raw.find(x=>typeof x==='string'&&x.startsWith('Otro: '))
  answers[r.pregunta_id]=custom?[...raw.filter(x=>x!==custom),'Otro']:raw
  otherAnswers[r.pregunta_id]=custom?custom.slice(6):''
 }else if(typeof raw==='string'&&raw.startsWith('Otro: ')){
  answers[r.pregunta_id]='Otro';otherAnswers[r.pregunta_id]=raw.slice(6)
 }else answers[r.pregunta_id]=raw
}Object.assign(declaration,{aceptada:Boolean(item.value.declaracion_aceptada),nombre:item.value.declaracion_nombre||item.value.cliente?.nombre||'',fecha:item.value.declaracion_fecha||new Date().toISOString().slice(0,10)});sent.value=['en_revision','aprobada','convertida','cerrada'].includes(item.value.estado)}catch(e){$q.notify({type:'negative',message:errorMessage(e,'El enlace no está disponible.')})}finally{loading.value=false}}
function hasOther(q){return (q.opciones||[]).includes('Otro')}
function selectedOther(q){const v=answers[q.id];return Array.isArray(v)?v.includes('Otro'):v==='Otro'}
function normalizedValue(id,value){const custom=String(otherAnswers[id]||'').trim();if(Array.isArray(value))return value.map(x=>x==='Otro'&&custom?`Otro: ${custom}`:x);return value==='Otro'&&custom?`Otro: ${custom}`:value}
function payload(){return{respuestas:Object.entries(answers).map(([pregunta_id,valor])=>({pregunta_id:Number(pregunta_id),valor:normalizedValue(pregunta_id,valor)})),declaracion_aceptada:declaration.aceptada,declaracion_nombre:declaration.nombre,declaracion_fecha:declaration.fecha}}
async function save(quiet=false){saving.value=true;try{await initCsrf();await api.put(`/publico/solicitudes/${route.params.token}`,payload());if(!quiet)$q.notify({type:'positive',message:'Tus respuestas fueron guardadas.'});return true}catch(e){$q.notify({type:'negative',message:errorMessage(e,'No se pudo guardar el formulario.')});return false}finally{saving.value=false}}
async function next(){if(await save(true))step.value=Math.min(7,step.value+1)}
async function submit(){saving.value=true;try{await initCsrf();await api.put(`/publico/solicitudes/${route.params.token}`,payload());await api.post(`/publico/solicitudes/${route.params.token}/enviar`);sent.value=true;$q.notify({type:'positive',message:'Solicitud enviada correctamente. Nuestro equipo la revisará.'})}catch(e){$q.notify({type:'negative',message:errorMessage(e,'Revisa las preguntas obligatorias.')})}finally{saving.value=false}}
onMounted(load)
</script>
<template><q-page class="public-page"><q-inner-loading :showing="loading"/><div v-if="item" class="public-shell"><div class="row items-center justify-between q-mb-lg"><AppBrand/><q-badge outline color="primary">{{item.codigo}}</q-badge></div>
<q-banner v-if="sent" rounded class="bg-green-1 text-green-9 q-mb-lg"><template #avatar><q-icon name="check_circle"/></template>Tu información fue enviada. Nuestro equipo la revisará y se comunicará contigo por teléfono o WhatsApp.</q-banner>
<div class="section-label">Levantamiento de requerimientos</div><h1 class="page-title">Cuéntanos cómo trabajas</h1><div class="page-subtitle">{{item.cliente?.nombre}} · {{item.empresa?.nombre_comercial||'Tu empresa se creará con la información del formulario'}}</div>
<q-card flat class="viti-card q-mt-lg"><q-card-section><div class="row items-center justify-between q-gutter-md"><div><div class="text-weight-bold">Avance del formulario</div><div class="text-caption text-grey-6">Respondidas {{answered}} de {{totalVisible}} preguntas principales.</div></div><q-toggle v-model="advanced" label="Ver preguntas detalladas" color="primary" :disable="sent"/></div><q-linear-progress rounded size="10px" :value="progress" color="primary" class="q-mt-md"/></q-card-section></q-card>
<q-stepper v-model="step" flat animated color="primary" class="viti-card q-mt-lg" header-nav>
<q-step v-for="g in groups" :key="g.id" :name="g.id" :title="g.label" :done="step>g.id">
<div v-for="section in currentSections" :key="section.id" class="q-mb-xl"><div class="section-label">Sección {{section.numero}}</div><div class="text-h6 text-weight-bold q-mb-lg">{{section.titulo}}</div><div v-for="q in (section.preguntas||[]).filter(visible)" :key="q.id" class="q-mb-xl"><div class="text-weight-medium q-mb-sm"><span class="text-primary">{{q.numero}}.</span> {{q.pregunta}} <span v-if="q.obligatoria" class="text-negative">*</span></div><div v-if="q.ayuda" class="text-caption text-grey-6 q-mb-sm">{{q.ayuda}}</div><q-input v-if="['texto','numero'].includes(q.tipo)" v-model="answers[q.id]" outlined :type="q.tipo==='numero'?'number':'textarea'" autogrow :disable="sent"/>
<div v-else-if="q.tipo==='seleccion_unica'">
 <q-option-group v-model="answers[q.id]" :options="(q.opciones||[]).map(x=>({label:x,value:x}))" type="radio" color="primary" :disable="sent"/>
 <q-input v-if="hasOther(q)&&selectedOther(q)" v-model="otherAnswers[q.id]" outlined dense class="q-mt-sm" label="Especifica otra opción" :disable="sent"/>
</div>
<div v-else>
 <q-option-group v-model="answers[q.id]" :options="(q.opciones||[]).map(x=>({label:x,value:x}))" type="checkbox" color="primary" :disable="sent"/>
 <q-input v-if="hasOther(q)&&selectedOther(q)" v-model="otherAnswers[q.id]" outlined dense class="q-mt-sm" label="Especifica otra opción o sugerencia" :disable="sent"/>
</div></div></div>
</q-step>
<template #navigation><q-stepper-navigation v-if="!sent"><q-btn v-if="step<7" color="primary" unelevated label="Guardar y continuar" no-caps :loading="saving" @click="next"/><q-btn v-if="step>1" flat color="primary" label="Anterior" no-caps class="q-ml-sm" @click="step--"/><q-btn outline color="primary" label="Guardar borrador" no-caps class="q-ml-sm" :loading="saving" @click="save(false)"/></q-stepper-navigation></template>
</q-stepper>
<q-card flat class="viti-card q-mt-lg" v-if="step===7"><q-card-section><div class="section-label">Declaración final</div><p>Confirmo que las respuestas proporcionadas representan de manera general la idea y las necesidades iniciales del sistema solicitado.</p><div class="row q-col-gutter-md"><div class="col-12 col-sm-6"><q-input v-model="declaration.nombre" outlined label="Nombre del cliente" :disable="sent"/></div><div class="col-12 col-sm-3"><q-input v-model="declaration.fecha" outlined type="date" stack-label label="Fecha" :disable="sent"/></div><div class="col-12 col-sm-3 flex items-center"><q-checkbox v-model="declaration.aceptada" label="Acepto" :disable="sent"/></div></div></q-card-section></q-card>
<div v-if="!sent&&step===7" class="row justify-end q-gutter-sm q-my-xl"><q-btn outline color="primary" label="Guardar borrador" no-caps :loading="saving" @click="save(false)"/><q-btn color="primary" unelevated label="Enviar para revisión" no-caps :loading="saving" @click="submit"/></div></div></q-page></template>
<style scoped>.public-page{min-height:100vh;background:var(--viti-bg);padding:32px 16px}.public-shell{max-width:1000px;margin:auto}.body--dark .public-page{background:#06162b}</style>
