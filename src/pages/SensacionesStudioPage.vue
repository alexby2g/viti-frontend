<template>
  <main class="studio">
    <aside class="rail">
      <router-link to="/" class="brand"><img src="/sensaciones-logo.svg" alt="Sensaciones Audiovisuales"/><small>STUDIO · DIGITAL</small></router-link>
      <div class="nav-label">CREACIÓN</div>
      <button class="nav-active" @click="goSection('biblioteca')"><q-icon name="movie"/> Biblioteca multimedia</button>
      <button @click="goSection('publicar')"><q-icon name="cloud_upload"/> Nueva publicación</button>
      <router-link to="/sensaciones/studio/colecciones"><q-icon name="collections"/> Álbumes y proyectos</router-link>
      <router-link to="/sensaciones/studio/marca"><q-icon name="palette"/> Marca y servicios</router-link>
      <div class="nav-label">OTROS ESPACIOS</div>
      <router-link to="/panel" class="legacy-link"><q-icon name="inventory_2"/> <span>Gestión anterior · Viti<small>Clientes, sistemas y pagos</small></span><q-icon name="chevron_right"/></router-link>
      <div class="rail-bottom"><router-link to="/"><q-icon name="public"/> Ver sitio público</router-link><button @click="logout"><q-icon name="logout"/> Cerrar sesión</button></div>
    </aside>
    <div class="workspace">
      <header class="studio-header"><div><div class="eyebrow">ESTUDIO CREATIVO / ADMINISTRACIÓN</div><h1>Bienvenido a Studio.</h1><p>Organiza, revisa y publica tus producciones audiovisuales.</p></div><q-btn unelevated color="deep-orange" icon="add" label="Nueva publicación" no-caps @click="goSection('publicar')"/></header>
      <q-banner v-if="error" class="bg-negative text-white q-mb-md" rounded>{{error}}<template #action><q-btn flat label="Actualizar" @click="refresh"/></template></q-banner>
      <q-banner v-if="notice" class="bg-positive text-white q-mb-md" rounded>{{notice}}</q-banner>
      <q-banner v-if="overview&&!overview.ready" class="warning q-mb-md" rounded>El módulo audiovisual todavía no está habilitado. La gestión empresarial permanece disponible.</q-banner>
      <div class="stats" v-if="overview?.counts">
        <div v-for="stat in stats" :key="stat.key" class="stat"><q-icon :name="stat.icon" size="24px"/><strong>{{overview.counts[stat.key]}}</strong><span>{{stat.label}}</span></div>
      </div>
      <section id="publicar" class="section">
        <div class="section-title"><h2>Nueva publicación</h2><span>Se guarda como borrador</span></div>
        <p v-if="overview&&!overview.uploads_available">Carga deshabilitada: falta activar el almacenamiento persistente.</p>
        <q-form @submit="upload" class="form">
          <q-input dark outlined v-model="title" label="Título" maxlength="150" :rules="[v=>!!v?.trim()||'Escribe un título']"/>
          <q-input dark outlined v-model="description" label="Descripción" type="textarea" maxlength="2000"/>
          <q-file dark outlined v-model="file" :label="fileLabel" accept=".jpg,.jpeg,.png,.webp,.mp4,.webm" :max-file-size="overview?.max_video_bytes||3145728" @rejected="error='Archivo no admitido o demasiado grande.'"/>
          <q-btn color="deep-orange" type="submit" label="Guardar borrador" no-caps :loading="busy" :disable="!overview?.uploads_available||!file||!title.trim()"/>
        </q-form>
        <q-linear-progress v-if="busy" :value="progress" color="deep-orange" class="q-my-md"/>
      </section>
      <section id="biblioteca" class="section">
        <div class="section-title"><h2>Biblioteca multimedia</h2><q-btn flat color="deep-orange" icon="refresh" label="Actualizar" no-caps @click="refresh"/></div>
        <q-form class="filters" @submit="applyFilters">
          <q-input dark outlined dense v-model="search" label="Buscar título" maxlength="100" clearable/>
          <q-select dark outlined dense v-model="kind" :options="kinds" emit-value map-options label="Tipo"/>
          <q-select dark outlined dense v-model="status" :options="statuses" emit-value map-options label="Estado"/>
          <q-btn color="deep-orange" type="submit" label="Filtrar" no-caps :disable="!overview?.ready"/>
        </q-form>
        <q-spinner v-if="loading" color="deep-orange" size="36px"/>
        <p v-else-if="overview?.ready&&!items.length">No hay publicaciones que coincidan. Crea tu primer trabajo.</p>
        <div class="media-grid">
          <article v-for="item in items" :key="item.id" class="media">
            <button class="thumbnail" @click="openPreview(item)" :aria-label="'Ver '+item.title"><q-icon :name="item.kind==='video'?'play_circle':'image'" size="46px"/><span>Vista previa</span></button>
            <div class="media-copy"><span class="state" :class="{live:item.published}">{{item.published?'Publicado':'Borrador'}}</span><h3>{{item.title}}</h3><p>{{item.description||'Sin descripción'}}</p><div class="media-actions"><q-btn flat dense color="deep-orange" icon="edit" label="Editar" no-caps @click="openEdit(item)"/><q-btn outline dense color="deep-orange" :label="item.published?'Retirar':'Publicar'" no-caps :disable="busy" @click="publish(item)"/></div></div>
          </article>
        </div>
        <q-pagination v-if="last>1" v-model="page" :max="last" color="deep-orange" @update:model-value="load"/>
      </section>
      <q-dialog v-model="editing"><q-card dark class="dialog"><q-card-section><h2>Editar publicación</h2></q-card-section><q-form @submit="saveEdit"><q-card-section class="form"><q-input dark outlined v-model="editTitle" label="Título" maxlength="150" :rules="[v=>!!v?.trim()||'Escribe un título']"/><q-input dark outlined v-model="editDescription" label="Descripción" type="textarea" maxlength="2000"/></q-card-section><q-card-actions align="right"><q-btn flat label="Cancelar" v-close-popup/><q-btn color="deep-orange" label="Guardar" type="submit" :loading="busy"/></q-card-actions></q-form></q-card></q-dialog>
      <q-dialog :model-value="!!preview" @update:model-value="v=>{if(!v)preview=null}" maximized><div class="preview"><q-btn flat color="white" label="Cerrar" @click="preview=null"/><video v-if="preview?.kind==='video'" :src="mediaUrl(preview.url)" controls playsinline preload="metadata"/><img v-else-if="preview" :src="mediaUrl(preview.url)" :alt="preview.title"/><p v-if="preview">{{preview.title}}</p></div></q-dialog>
    </div>
  </main>
</template>
<script setup>
import {ref,computed,onMounted} from 'vue'
import {useRouter} from 'vue-router'
import {useAuthStore} from '../stores/auth'
import axios from 'axios'
import {api,initCsrf} from '../boot/axios'
import {mediaUrl} from '../services/sensacionesMedia'
const router=useRouter(),auth=useAuthStore()
const overview=ref(null),title=ref(''),description=ref(''),file=ref(null),items=ref([]),error=ref(''),notice=ref(''),busy=ref(false),loading=ref(false),page=ref(1),last=ref(1),progress=ref(0)
const search=ref(''),kind=ref(''),status=ref(''),editing=ref(false),editId=ref(null),editTitle=ref(''),editDescription=ref(''),preview=ref(null)
const kinds=[{label:'Todos',value:''},{label:'Fotografías',value:'photo'},{label:'Videos',value:'video'}]
const statuses=[{label:'Todos',value:''},{label:'Publicados',value:'published'},{label:'Borradores',value:'draft'}]
const stats=[{key:'photos',label:'Fotografías',icon:'image'},{key:'videos',label:'Videos',icon:'movie'},{key:'published',label:'Publicados',icon:'public'},{key:'drafts',label:'Borradores',icon:'edit_note'},{key:'albums',label:'Álbumes',icon:'collections'},{key:'projects',label:'Proyectos',icon:'folder'},{key:'comparisons',label:'Comparaciones',icon:'compare'}]
const fileLabel=computed(()=>overview.value?.direct_uploads?'Foto (15 MiB) o video (250 MiB)':'Foto o video (3 MiB)')
function goSection(id){document.getElementById(id)?.scrollIntoView({behavior:'smooth'})}
async function logout(){await auth.logout();await router.replace('/')}
function fail(e){error.value=e.response?.data?.message||'No se pudo completar la operación.'}
async function loadOverview(){overview.value=(await api.get('/sensaciones/studio/overview')).data}
async function load(){if(!overview.value?.ready)return;loading.value=true;try{const {data}=await api.get('/sensaciones/studio/media',{params:{page:page.value,q:search.value||undefined,kind:kind.value||undefined,status:status.value||undefined}});items.value=data.data;last.value=data.last_page}catch(e){fail(e)}finally{loading.value=false}}
async function refresh(){error.value='';try{await loadOverview();await load()}catch(e){fail(e)}}
async function applyFilters(){page.value=1;await load()}
async function upload(){
  if(!file.value||busy.value||!overview.value?.uploads_available)return
  busy.value=true;error.value='';notice.value='';progress.value=0
  try {
    const selected=file.value
    const max=selected.type.startsWith('image/')?overview.value.max_photo_bytes:overview.value.max_video_bytes
    if(selected.size>max)throw new Error('El archivo supera el límite permitido.')
    await initCsrf()
    if(selected.size>3145728){
      const {data}=await api.post('/sensaciones/studio/uploads',{title:title.value,description:description.value,mime:selected.type,bytes:selected.size})
      await axios.put(data.url,selected,{headers:data.headers,withCredentials:false,withXSRFToken:false,timeout:0,onUploadProgress:e=>{progress.value=e.total?e.loaded/e.total:0}})
      await api.post('/sensaciones/studio/uploads/'+data.id+'/finish')
    }else{
      const form=new FormData();form.append('title',title.value);form.append('description',description.value);form.append('file',selected)
      await api.post('/sensaciones/studio/media',form,{onUploadProgress:e=>{progress.value=e.total?e.loaded/e.total:0}})
    }
    title.value='';description.value='';file.value=null;page.value=1;notice.value='Borrador guardado.';await refresh()
  }catch(e){error.value=e.response?.data?.message||e.message||'No se pudo cargar.'}finally{busy.value=false}
}
async function publish(item){if(busy.value)return;busy.value=true;error.value='';notice.value='';try{await initCsrf();await api.patch('/sensaciones/studio/media/'+item.id,{published:!item.published});notice.value=item.published?'Publicación retirada.':'Publicación visible.';await refresh()}catch(e){fail(e)}finally{busy.value=false}}
function openEdit(item){editId.value=item.id;editTitle.value=item.title;editDescription.value=item.description||'';editing.value=true}
async function saveEdit(){if(busy.value)return;busy.value=true;error.value='';try{await initCsrf();await api.patch('/sensaciones/studio/media/'+editId.value+'/metadata',{title:editTitle.value,description:editDescription.value});editing.value=false;notice.value='Cambios guardados.';await refresh()}catch(e){fail(e)}finally{busy.value=false}}
function openPreview(item){preview.value=item}
onMounted(refresh)
</script>
<style scoped>
.studio{min-height:100vh;background:#101014;color:#f5f5f5;display:grid;grid-template-columns:245px minmax(0,1fr);font-family:system-ui,sans-serif}.rail{position:sticky;top:0;height:100vh;overflow-y:auto;padding:25px 16px;background:#18181d;border-right:1px solid #ffffff13;display:flex;flex-direction:column;gap:7px}.brand{display:flex!important;align-items:center;gap:10px;font-weight:900;letter-spacing:.06em;font-size:14px;margin-bottom:20px}.brand img{width:38px}.brand small{display:block;font-size:9px;color:#ff9b6a;letter-spacing:.16em}.rail a,.rail button{display:flex;align-items:center;gap:10px;background:none;border:0;text-align:left;text-decoration:none;color:#dedde0;padding:11px 10px;border-radius:8px;font:inherit;cursor:pointer}.rail a:hover,.rail button:hover,.rail .nav-active{background:#ff681e1c;color:#ff9b6a}.nav-label{font-size:10px;font-weight:800;letter-spacing:.15em;color:#999;margin:20px 10px 4px}.rail-bottom{margin-top:auto;padding-top:20px}.workspace{padding:clamp(18px,4vw,48px);min-width:0}.studio-header{display:flex;justify-content:space-between;gap:20px;align-items:center;flex-wrap:wrap;margin-bottom:28px}.eyebrow{font-size:11px;color:#ff9b6a;letter-spacing:.18em;font-weight:800}.studio h1{font-size:clamp(30px,5vw,52px);line-height:1.1;margin:10px 0}.studio h2{font-size:22px;line-height:1.3;margin:0}.studio p{color:#b8b8bd;overflow-wrap:anywhere}.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(115px,1fr));gap:10px;margin:24px 0}.stat{padding:16px;background:#1d1d23;border:1px solid #ffffff12;border-radius:12px;display:grid;gap:8px}.stat .q-icon{color:#ff8d52}.stat strong{font-size:30px;line-height:1}.stat span{font-size:12px;color:#b8b8bd}.section{padding:22px;margin:24px 0;background:#19191f;border:1px solid #ffffff12;border-radius:14px;scroll-margin-top:16px}.section-title{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:20px;flex-wrap:wrap}.section-title>span{font-size:12px;color:#ff9b6a}.form{display:grid;gap:14px;max-width:700px}.filters{display:grid;grid-template-columns:2fr 1fr 1fr auto;gap:10px;margin-bottom:20px}.media-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,230px),1fr));gap:12px}.media{border:1px solid #ffffff14;border-radius:11px;overflow:hidden;background:#24242b}.thumbnail{aspect-ratio:16/8;width:100%;border:0;color:#ffad83;background:radial-gradient(ellipse,#64351f,#101014 75%);display:grid;place-content:center;gap:8px;cursor:pointer}.thumbnail span{font-size:12px}.media-copy{padding:14px}.state{font-size:11px;background:#554020;padding:4px 8px;border-radius:5px;color:#ffe1a5}.state.live{background:#164d39;color:#b1f4d3}.media h3{font-size:17px;line-height:1.3;margin:12px 0 8px;overflow-wrap:anywhere}.media-copy p{font-size:13px;white-space:pre-wrap}.media-actions{display:flex;justify-content:space-between;gap:6px}.warning{background:#382b20;color:#ffe1a5}.dialog{width:min(95vw,550px);background:#222229}.preview{background:#08080a;color:#fff;display:flex;align-items:center;justify-content:center;flex-direction:column;padding:16px}.preview img,.preview video{max-width:100%;max-height:80vh;object-fit:contain}@media(max-width:850px){.studio{grid-template-columns:1fr}.rail{position:relative;height:auto;display:flex;flex-direction:row;flex-wrap:wrap;align-items:center;padding:12px}.brand{width:100%;margin:0}.rail-bottom{display:flex;margin:0;padding:0}.nav-label{display:none}.rail a,.rail button{font-size:12px}.filters{grid-template-columns:1fr 1fr}.section{padding:16px}}@media(max-width:480px){.filters{grid-template-columns:1fr}}
.rail .legacy-link{border:1px solid #ffffff20;margin-top:4px;align-items:center}.legacy-link span{flex:1}.legacy-link small{display:block;font-size:10px;color:#aaa;margin-top:4px}
.rail .brand{display:grid!important;gap:6px}.rail .brand img{width:100%;max-width:205px;height:auto}.rail .brand small{letter-spacing:.16em}
</style>
