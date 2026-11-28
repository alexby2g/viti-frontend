<template>
<q-card dark class="montage">
  <header><div class="brand"><small>SENSACIONES / VIDEO LAB 5.3</small><h2>Estudio de montaje</h2></div><div class="actions"><q-btn flat color="grey-3" icon="arrow_back" label="Volver al editor" no-caps :disable="busy" @click="close"/><q-btn flat icon="undo" label="Deshacer" no-caps :disable="busy||!past.length" @click="undo"/><q-btn flat icon="redo" label="Rehacer" no-caps :disable="busy||!future.length" @click="redo"/><q-btn color="deep-orange" icon="movie" label="Exportar montaje" no-caps :disable="busy||!clips.length||total>300" @click="exportMontage"/><q-btn flat round icon="close" aria-label="Volver al editor" :disable="busy" @click="close"/></div></header>
  <q-banner v-if="error" dense class="bg-negative text-white">{{error}}<template #action><q-btn flat round dense icon="close" @click="error=''"/></template></q-banner>
  <nav class="stage-nav"><span class="stage-active"><q-icon name="video_library"/> 01 · Montaje</span><button :disabled="busy||!selected" @click="editSelected"><q-icon name="tune"/> 02 · Editar clip</button><button :disabled="busy||!clips.length||total>300" @click="exportMontage"><q-icon name="movie"/> 03 · Exportar</button><span class="session-note"><q-icon name="check_circle"/> Sesión conservada al volver</span></nav>
  <div class="workspace">
    <aside>
      <div class="section-label">BIBLIOTECA</div><h3>Archivos multimedia</h3>
      <q-file dark outlined multiple :model-value="null" label="Importar MP4 / WebM" accept=".mp4,.webm" :max-file-size="262144000" :disable="busy||clips.length>=12" @update:model-value="importFiles" @rejected="error='Archivo no admitido o superior a 250 MiB.'"/>
      <q-btn v-if="initialFile&&!clips.some(c=>c.file===initialFile)" outline color="deep-orange" label="Añadir video del editor" no-caps :disable="busy||clips.length>=12" @click="importFiles([initialFile])"/>
      <p>Hasta 12 clips y 5 minutos de salida. Los archivos no se suben mientras editas.</p>
      <template v-if="selected">
        <div class="section-label">CLIP SELECCIONADO · {{selectedIndex+1}}</div><h3 class="clip-title">{{selected.file.name}}</h3><q-btn unelevated color="deep-orange" icon="tune" label="Editar clip con efectos" no-caps :disable="busy" @click="editSelected"/><p>Abre color, textos, stickers, audio y composición sin perder esta secuencia.</p>
        <q-range dark color="deep-orange" :model-value="{min:selected.start,max:selected.end}" :min="0" :max="selected.duration" :step=".01" :disable="busy" @change="commitRange"/>
        <q-input dark outlined type="number" label="Inicio (segundos)" :model-value="selected.start" :min="0" :max="selected.end-.5" step=".1" :disable="busy" @change="v=>trim('start',v)"/>
        <q-input dark outlined type="number" label="Final (segundos)" :model-value="selected.end" :min="selected.start+.5" :max="selected.duration" step=".1" :disable="busy" @change="v=>trim('end',v)"/>
        <div class="actions"><q-btn flat color="deep-orange" icon="content_cut" label="Dividir aquí" no-caps :disable="busy||clips.length>=12||clock-selected.start<.5||selected.end-clock<.5" @click="split"/><q-btn flat color="negative" icon="delete_outline" label="Quitar clip" no-caps :disable="busy" @click="remove"/></div>
      </template>
      <div class="section-label">AJUSTES DE SALIDA</div><h3>Formato y calidad</h3>
      <q-select dark outlined v-model="formatMode" :options="formats" emit-value map-options label="Formato" :disable="busy"/>
      <q-select dark outlined v-model="quality" :options="[{label:'HD 720p',value:720},{label:'Full HD 1080p',value:1080}]" emit-value map-options label="Resolución" :disable="busy"/>
      <q-select dark outlined v-model="transition" :options="[{label:'Corte directo',value:'cut'},{label:'Fundido a negro',value:'fade'}]" emit-value map-options label="Transición" :disable="busy"/>
      <q-toggle dark v-model="silent" label="Silenciar todos los clips" :disable="busy"/>
      <p>Edita cada clip individualmente o aplica efectos al montaje completo después de exportarlo.</p>
    </aside>
    <main>
      <div class="monitor-head"><div><strong>Monitor de montaje</strong><small v-if="selected">{{selectedIndex+1}} de {{clips.length}} · {{selected.file.name}}</small></div><q-btn flat dense color="deep-orange" icon="tune" label="Edición avanzada" no-caps :disable="busy||!selected" @click="editSelected"/></div>
      <div class="monitor"><video v-if="selected" :key="selected.id" ref="preview" :src="selected.url" playsinline controls preload="auto" @loadeddata="loaded" @timeupdate="timeUpdate" @ended="nextClip" @error="previewError"/><div v-else class="empty"><q-icon name="video_library" size="64px"/><p>Importa tus videos para comenzar</p></div></div>
      <div class="actions"><q-btn outline color="deep-orange" icon="play_arrow" label="Reproducir secuencia" no-caps :disable="busy||!clips.length" @click="playAll"/><q-btn flat icon="pause" label="Pausar" no-caps :disable="busy||!selected" @click="pause"/><span class="timecode">{{fmt(outputClock)}} / {{fmt(total)}}</span></div><q-slider v-if="total>0" dark :model-value="outputClock" :min="0" :max="total" :step=".01" color="deep-orange" :disable="busy" @update:model-value="seekMontage"/>
      <p class="note">Vista previa secuencial de los recortes originales. El formato y fundido se comprueban en el archivo exportado.</p>
    </main>
  </div>
  <section class="dock">
    <div class="dock-head"><strong><q-icon name="movie_filter"/> Línea de tiempo · {{clips.length}} clips</strong><span>{{fmt(total)}} / 5:00</span></div>
    <div class="timeline"><button v-for="(c,i) in clips" :key="c.id" :class="{active:selectedId===c.id}" :style="{flexGrow:c.end-c.start}" :draggable="!busy" :disabled="busy" @dragstart="dragStart($event,i)" @dragover.prevent @drop.prevent="drop($event,i)" @click="choose(c.id)"><span class="trim-handle left" title="Arrastrar inicio" @pointerdown.stop.prevent="beginResize($event,c,'start')" @pointermove.stop="resizePointer" @pointerup.stop="endResize" @pointercancel.stop="cancelResize" @click.stop @dragstart.prevent></span><span>{{i+1}} · {{c.file.name}}</span><small>{{fmt(c.end-c.start)}}</small><span class="trim-handle right" title="Arrastrar final" @pointerdown.stop.prevent="beginResize($event,c,'end')" @pointermove.stop="resizePointer" @pointerup.stop="endResize" @pointercancel.stop="cancelResize" @click.stop @dragstart.prevent></span></button></div>
    <div v-if="selected" class="actions"><q-btn flat dense icon="arrow_back" label="Mover antes" no-caps :disable="busy||selectedIndex===0" @click="reorder(selectedIndex,selectedIndex-1)"/><q-btn flat dense icon="arrow_forward" label="Mover después" no-caps :disable="busy||selectedIndex===clips.length-1" @click="reorder(selectedIndex,selectedIndex+1)"/><span class="note">Arrastra los bloques para reordenar. Arrastra los extremos de cada bloque para recortarlo.</span></div>
  </section>
  <div v-if="busy||result" class="result-tray">
    <template v-if="busy"><strong>{{stage}}</strong><q-linear-progress :value="progress" :indeterminate="stage==='Importando archivos'" color="deep-orange"/><div class="actions"><span>{{Math.round(progress*100)}}%</span><q-btn flat color="deep-orange" label="Cancelar" no-caps @click="cancel"/></div></template>
    <template v-if="result"><h3>Montaje generado</h3><video :src="resultUrl" controls playsinline/><p>{{(result.size/1048576).toFixed(2)}} MiB · Revisa video y audio.</p><div class="actions"><q-btn outline color="deep-orange" label="Descargar" no-caps @click="download"/><q-btn color="deep-orange" icon="tune" label="Editar montaje completo" no-caps @click="$emit('edit',result)"/><q-btn flat color="deep-orange" label="Usar como borrador" no-caps @click="$emit('result',result)"/><q-btn flat icon="close" aria-label="Cerrar resultado" @click="clearResult"/></div></template>
  </div>
</q-card>
</template>
<script setup>
import {ref,computed,onBeforeUnmount,onMounted,nextTick,watch} from 'vue'
import {normalizeMontage,moveMontage,resizeMontageClip} from '../services/sensacionesProject'
import {renderTrim} from '../services/sensacionesTrim'
const props=defineProps({initialFile:Object,active:{type:Boolean,default:true},maxBytes:{type:Number,default:262144000}})
const emit=defineEmits(['close','edit','edit-clip','result','session'])
const clips=ref([]),selectedId=ref(null),preview=ref(null),clock=ref(0),busy=ref(false),progress=ref(0),error=ref(''),stage=ref(''),past=ref([]),future=ref([]),result=ref(null),resultUrl=ref('')
const quality=ref(720),formatMode=ref('wide'),transition=ref('cut'),silent=ref(false)
const formats=[{label:'Horizontal 16:9',value:'wide'},{label:'Vertical 9:16',value:'vertical'},{label:'Cuadrado 1:1',value:'square'},{label:'Original del primer clip',value:'original'}]
const selectedIndex=computed(()=>clips.value.findIndex(c=>c.id===selectedId.value))
const selected=computed(()=>clips.value[selectedIndex.value])
const total=computed(()=>clips.value.reduce((n,c)=>n+c.end-c.start,0))
const outputClock=computed(()=>clips.value.slice(0,Math.max(0,selectedIndex.value)).reduce((n,c)=>n+c.end-c.start,0)+(selected.value?Math.max(0,Math.min(selected.value.end,clock.value)-selected.value.start):0))
const urls=new Set()
let playingSequence=false,playOnLoad=false,controller=null,dragIndex=null,disposed=false,resizing=null,switching=false,pendingSeek=null
function fmt(n){const t=Math.round(Math.max(0,n)*10)/10;return Math.floor(t/60)+':'+(t%60).toFixed(1).padStart(4,'0')}
function clearResult(){if(resultUrl.value)URL.revokeObjectURL(resultUrl.value);resultUrl.value='';result.value=null}
function snapshot(){return clips.value.map(c=>({...c}))}
function restore(list){pause();clips.value=list;selectedId.value=list.some(c=>c.id===selectedId.value)?selectedId.value:list[0]?.id||null;clearResult();nextTick(()=>seekSelected())}
function commit(list){past.value=[...past.value.slice(-19),snapshot()];future.value=[];restore(list)}
function undo(){if(busy.value||!past.value.length)return;future.value=[snapshot(),...future.value.slice(0,19)];const list=past.value.at(-1);past.value=past.value.slice(0,-1);restore(list)}
function redo(){if(busy.value||!future.value.length)return;past.value=[...past.value.slice(-19),snapshot()];const list=future.value[0];future.value=future.value.slice(1);restore(list)}
function pause(){playingSequence=false;playOnLoad=false;switching=false;preview.value?.pause()}
function choose(id){if(busy.value)return;pause();pendingSeek=null;selectedId.value=id;nextTick(()=>seekSelected())}
function seekSelected(){const v=preview.value,c=selected.value;if(v&&c&&v.readyState>=2){const target=pendingSeek===null?c.start:Math.max(c.start,Math.min(c.end,pendingSeek));pendingSeek=null;v.currentTime=target;clock.value=target}}
function seekMontage(time){if(busy.value||!Number.isFinite(time))return;pause();let t=Math.max(0,Math.min(total.value,time));for(let i=0;i<clips.value.length;i++){const c=clips.value[i],len=c.end-c.start;if(t<len||i===clips.value.length-1){pendingSeek=c.start+Math.min(len,t);clock.value=pendingSeek;selectedId.value=c.id;nextTick(seekSelected);return}t-=len}}
function loaded(event){if(event.target!==preview.value||!selected.value)return;switching=false;seekSelected();if(playOnLoad){playOnLoad=false;preview.value.play().catch(()=>{pause();error.value='No se pudo reproducir el clip.'})}}
function previewError(event){if(event.target===preview.value){pause();error.value='El navegador no pudo reproducir el clip.'}}
function timeUpdate(event){if(switching||event.target!==preview.value||!selected.value)return;clock.value=event.target.currentTime;if(clock.value>=selected.value.end-.025){if(playingSequence)nextClip();else if(!event.target.paused){event.target.pause();event.target.currentTime=selected.value.end}}}
function nextClip(){if(!playingSequence||switching)return;const next=clips.value[selectedIndex.value+1];if(!next){pause();return}switching=true;preview.value?.pause();playOnLoad=true;selectedId.value=next.id}
async function playAll(){if(busy.value||!clips.value.length)return;pause();playingSequence=true;const first=clips.value[0];if(selectedId.value!==first.id){switching=true;playOnLoad=true;selectedId.value=first.id;return}seekSelected();try{await preview.value.play()}catch{pause();error.value='No se pudo iniciar la secuencia.'}}
function probe(file,signal){return new Promise((resolve,reject)=>{
  const v=document.createElement('video'),url=URL.createObjectURL(file);v.preload='metadata';let done=false
  const finish=(e)=>{if(done)return;done=true;clearTimeout(timer);signal.removeEventListener('abort',abort);const duration=v.duration,w=v.videoWidth;v.removeAttribute('src');v.load();URL.revokeObjectURL(url);if(e||!Number.isFinite(duration)||duration<.5||!w)reject(e||new Error('Video inválido o demasiado corto: '+file.name));else resolve(duration)}
  const abort=()=>finish(new Error('Importación cancelada.'));const timer=setTimeout(()=>finish(new Error('No se pudo leer: '+file.name)),15000);signal.addEventListener('abort',abort,{once:true});v.onloadedmetadata=()=>finish();v.onerror=()=>finish(new Error('Video incompatible: '+file.name));if(signal.aborted)abort();else v.src=url
})}
async function importFiles(files){if(!files||busy.value)return;const list=Array.from(Array.isArray(files)?files:[files]);if(!list.length)return;if(list.length+clips.value.length>12){error.value='Máximo 12 clips.';return}
  if(list.some(f=>!f||f.size>262144000||!['video/mp4','video/webm'].includes(f.type))){error.value='Selecciona archivos MP4 o WebM de hasta 250 MiB.';return}
  pause();busy.value=true;stage.value='Importando archivos';progress.value=0;error.value='';controller=new AbortController();const added=[]
  try{for(const file of list){const duration=await probe(file,controller.signal);if(disposed||controller.signal.aborted)throw new Error('Importación cancelada.');const url=URL.createObjectURL(file);urls.add(url);added.push({id:crypto.randomUUID(),file,url,duration,start:0,end:Math.min(duration,300)});progress.value=added.length/list.length}
    commit([...clips.value,...added]);if(added.length)chooseAfterImport(added[0].id)
  }catch(e){for(const c of added){URL.revokeObjectURL(c.url);urls.delete(c.url)}if(!disposed)error.value=e.message}
  finally{busy.value=false;controller=null}
}
function chooseAfterImport(id){selectedId.value=id;nextTick(()=>seekSelected())}
function trim(key,value){if(!selected.value||busy.value||value===''||value===null)return;const c=resizeMontageClip(selected.value,key,Number(value));if(c.start===selected.value.start&&c.end===selected.value.end)return;commit(clips.value.map(x=>x.id===c.id?c:x))}
function commitRange(r){if(!selected.value||busy.value||!r||r.max-r.min<.5)return;const c={...selected.value,start:r.min,end:r.max};commit(clips.value.map(x=>x.id===c.id?c:x))}
function split(){const c=selected.value;if(busy.value||!c||clips.value.length>=12||clock.value-c.start<.5||c.end-clock.value<.5)return;const next=[...clips.value];next.splice(selectedIndex.value,1,{...c,end:clock.value},{...c,id:crypto.randomUUID(),start:clock.value});commit(next)}
function remove(){if(busy.value||!selected.value)return;commit(clips.value.filter(c=>c.id!==selectedId.value))}
function reorder(from,to){if(busy.value||from===to)return;const next=moveMontage(clips.value,from,to);if(next!==clips.value)commit(next)}
function dragStart(e,i){if(resizing){e.preventDefault();return}dragIndex=i;e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',String(i))}
function beginResize(e,c,key){if(busy.value||e.button!==0)return;pause();selectedId.value=c.id;const width=e.currentTarget.parentElement.getBoundingClientRect().width;resizing={pointer:e.pointerId,id:c.id,key,x:e.clientX,original:{...c},secondsPerPixel:(c.end-c.start)/Math.max(1,width),before:snapshot()};e.currentTarget.setPointerCapture(e.pointerId)}
function resizePointer(e){if(!resizing||e.pointerId!==resizing.pointer)return;const r=resizing,v=r.original[r.key]+(e.clientX-r.x)*r.secondsPerPixel,c=resizeMontageClip(r.original,r.key,v);clips.value=clips.value.map(x=>x.id===r.id?c:x);clearResult()}
function endResize(e){if(!resizing||e.pointerId!==resizing.pointer)return;const r=resizing;resizing=null;const c=clips.value.find(x=>x.id===r.id);if(c&&(c.start!==r.original.start||c.end!==r.original.end)){past.value=[...past.value.slice(-19),r.before];future.value=[]}nextTick(seekSelected)}
function cancelResize(e){if(!resizing||e.pointerId!==resizing.pointer)return;const r=resizing;resizing=null;restore(r.before)}
function drop(e,to){if(dragIndex!==null)reorder(dragIndex,to);dragIndex=null}
async function exportMontage(){if(busy.value)return;pause();clearResult();error.value='';busy.value=true;stage.value='Exportando montaje';progress.value=0;controller=new AbortController()
  try{const montage=normalizeMontage(clips.value);const file=await renderTrim({montage,options:{format:formatMode.value,fit:'contain',transition:transition.value},maxHeight:quality.value,silent:silent.value,maxBytes:props.maxBytes,signal:controller.signal,onProgress:v=>progress.value=v});if(!disposed){result.value=file;resultUrl.value=URL.createObjectURL(file)}}
  catch(e){if(!disposed)error.value=e.message||'No se pudo exportar el montaje.'}
  finally{busy.value=false;controller=null}
}
function cancel(){controller?.abort()}
function download(){const a=document.createElement('a');a.href=resultUrl.value;a.download='sensaciones-montaje.'+(result.value.type==='video/mp4'?'mp4':'webm');a.click()}
function close(){if(busy.value)return;pause();emit('close')}
function editSelected(){if(busy.value||!selected.value)return;pause();emit('edit-clip',{id:selected.value.id,file:selected.value.file,start:selected.value.start,end:selected.value.end})}
async function replaceClip(id,file){if(busy.value||!clips.value.some(c=>c.id===id))throw new Error('El clip ya no está disponible en el montaje.');pause();busy.value=true;stage.value='Preparando clip editado';controller=new AbortController();let objectUrl='';try{const duration=await probe(file,controller.signal);if(disposed||controller.signal.aborted)throw new Error('Operación cancelada.');objectUrl=URL.createObjectURL(file);urls.add(objectUrl);commit(clips.value.map(c=>c.id===id?{...c,file,url:objectUrl,duration,start:0,end:duration}:c));selectedId.value=id;error.value='';return true}catch(e){if(objectUrl){URL.revokeObjectURL(objectUrl);urls.delete(objectUrl)}throw e}finally{busy.value=false;controller=null}}
defineExpose({replaceClip,hasClip:id=>clips.value.some(c=>c.id===id)})
function keyboard(e){if(!props.active||resizing||busy.value||e.target?.closest('input,textarea,[contenteditable]')||!(e.ctrlKey||e.metaKey))return;if(e.key.toLowerCase()==='z'){e.preventDefault();e.shiftKey?redo():undo()}else if(e.key.toLowerCase()==='y'){e.preventDefault();redo()}}
watch([quality,formatMode,transition,silent],clearResult)
watch(()=>props.active,value=>{if(!value)pause()})
watch(clips,value=>emit('session',value.length),{deep:false})
onMounted(()=>window.addEventListener('keydown',keyboard))
onBeforeUnmount(()=>{disposed=true;cancel();pause();window.removeEventListener('keydown',keyboard);for(const url of urls)URL.revokeObjectURL(url);clearResult()})
</script>
<style scoped>
.montage{height:100dvh!important;width:100vw!important;max-width:100vw!important;display:flex;flex-direction:column;background:#111116;overflow:hidden!important;border-radius:0!important}.montage header{display:flex;align-items:center;justify-content:space-between;padding:12px 18px;background:#1b1b21;gap:12px;flex-wrap:wrap}.montage small{color:#ff9b68;font-size:10px;letter-spacing:1px}.montage h2{font-size:21px;margin:3px 0}.montage h3{font-size:15px;margin:6px 0;overflow-wrap:anywhere;color:#ffae86}.actions{display:flex;align-items:center;flex-wrap:wrap;gap:8px}.workspace{min-height:0;flex:1;display:grid;grid-template-columns:minmax(240px,320px) minmax(0,1fr);overflow:hidden}.workspace aside{overflow:auto;padding:15px;background:#202027;display:flex;flex-direction:column;gap:12px;border-right:1px solid #ffffff17}.workspace p,.note{font-size:12px;color:#bdbdc7;margin:4px 0}.workspace main{min-height:0;min-width:0;display:flex;flex-direction:column;padding:15px;gap:12px}.monitor{flex:1;min-height:0;background:#050506;display:grid;place-items:center;border-radius:8px;overflow:hidden}.monitor video{display:block;width:100%;height:100%;min-height:0;object-fit:contain}.empty{color:#ff985c;text-align:center}.dock{background:#1b1b21;border-top:1px solid #ffffff20;padding:12px;flex-shrink:0}.dock-head{display:flex;justify-content:space-between;gap:10px;margin-bottom:10px}.timeline{display:flex;gap:4px;overflow:auto;min-height:58px}.timeline button{min-width:90px;flex-basis:0;padding:8px;text-align:left;background:#854126;color:white;border:1px solid #a75a36;border-radius:5px;cursor:grab;display:flex;flex-direction:column;overflow:hidden;justify-content:center}.timeline button.active{background:#ba4b22;border:2px solid #ffbd95}.timeline button span{max-width:100%;white-space:nowrap;text-overflow:ellipsis;overflow:hidden}.timeline button small{color:#fff}.result-tray{position:absolute;right:20px;top:85px;z-index:5;width:min(460px,calc(100% - 40px));max-height:70vh;overflow:auto;background:#24242c;padding:16px;border-radius:10px;border:1px solid #ffffff20;display:grid;gap:10px}.result-tray video{width:100%;max-height:35vh}@media(max-width:760px){.workspace{grid-template-columns:1fr;grid-template-rows:minmax(100px,1fr) minmax(100px,.8fr)}.workspace main{grid-row:1;padding:6px}.workspace aside{grid-row:2}.montage header{padding:8px}.montage h2{font-size:17px}.dock{padding:8px}.timeline{min-height:45px}}
.timeline button{position:relative;padding-left:15px;padding-right:15px}.trim-handle{position:absolute;top:0;bottom:0;width:10px;background:#ff9b68;cursor:ew-resize;touch-action:none;z-index:1}.trim-handle.left{left:0}.trim-handle.right{right:0}.trim-handle:hover{background:#ffd2b5}
.montage{position:absolute!important;inset:0;z-index:20;height:100%!important;width:100%!important;max-width:100%!important}.stage-nav{display:flex;align-items:center;gap:8px;background:#16161c;border-bottom:1px solid #ffffff13;padding:9px 18px;overflow:auto;flex-shrink:0}.stage-nav button,.stage-active{display:flex;align-items:center;gap:7px;white-space:nowrap;border:1px solid #ffffff16;border-radius:7px;padding:8px 13px;font-size:12px;color:#d6d6df;background:#22222a}.stage-nav button{cursor:pointer}.stage-nav button:disabled{opacity:.4;cursor:default}.stage-active{color:#ffae86;border-color:#ff681e66;background:#ff681e18}.session-note{margin-left:auto;color:#95b7a7;font-size:11px;white-space:nowrap}.section-label{font-size:10px;letter-spacing:1.4px;color:#9696a3;margin-top:9px;font-weight:700}.clip-title{font-size:14px!important;line-height:1.5!important;margin:0!important}.monitor-head{display:flex;justify-content:space-between;align-items:center;gap:8px;min-width:0}.monitor-head>div{display:grid;gap:4px;min-width:0}.monitor-head small{letter-spacing:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.timecode{margin-left:auto;font-variant-numeric:tabular-nums;font-size:13px;color:#ffbd95}.workspace aside{scrollbar-color:#50505a #202027}.workspace main{background:#111116}.dock{padding:13px 18px}.timeline{min-height:76px}.timeline button{background:linear-gradient(135deg,#8d482e,#573023)}.timeline button.active{background:linear-gradient(135deg,#c85a2d,#873a21)}.result-tray{top:115px}.brand small{letter-spacing:1.7px}.monitor-head strong{font-size:13px}@media(max-width:760px){.session-note{display:none}.stage-nav{padding:6px 8px}.stage-nav button,.stage-active{padding:6px 8px;font-size:11px}.timeline{min-height:52px}.monitor-head small{display:none}}
</style>
