<template>
  <q-card dark class="editor">
    <q-card-section class="editor-header">
      <div><div class="eyebrow">SENSACIONES / VIDEO LAB</div><h2>Editor de video</h2><p>Recorta, monta y personaliza tu producción. Crea una nueva versión. El original permanece intacto.</p></div>
      <q-btn flat round icon="close" aria-label="Cerrar editor" :disable="working" @click="$emit('close')"/>
    </q-card-section>
    <q-card-section class="editor-content">
      <q-banner v-if="error" class="bg-negative text-white" rounded>{{error}}</q-banner>
      <div v-if="item" class="source"><strong>{{item.title}}</strong><q-btn outline color="deep-orange" icon="download" label="Cargar video de la biblioteca" no-caps :disable="working" @click="loadRemote"/></div>
      <q-file dark outlined :model-value="localFile" label="Seleccionar video original (MP4 o WebM)" accept=".mp4,.webm" :max-file-size="262144000" :disable="working" @update:model-value="selectLocal" @rejected="error='Archivo no admitido o mayor de 250 MiB.'"/>
      <p v-if="item&&!source">Puedes utilizar la copia de la biblioteca o elegir el archivo original de tu computadora.</p>
      <video v-if="url" ref="preview" :src="url" controls playsinline preload="metadata" @loadedmetadata="metadata" @timeupdate="updateTime" @error="error='No se pudo abrir el video. Prueba otro archivo.'"/>
      <template v-if="duration>0">
        <div class="timeline-head"><strong>Fragmento seleccionado</strong><span>{{format(end-start)}} de {{format(duration)}}</span></div>
        <div class="timeline"><div class="selected" :style="{left:(start/duration*100)+'%',width:((end-start)/duration*100)+'%'}"/><div class="cursor" :style="{left:(current/duration*100)+'%'}"/></div>
        <q-range dark color="deep-orange" :model-value="{min:start,max:end}" :min="0" :max="duration" :step=".1" :disable="working" @update:model-value="changeRange"/>
        <div class="controls">
          <div><q-input dark outlined type="number" :model-value="start" label="Inicio (segundos)" :min="0" :max="duration" step=".1" :disable="working" @update:model-value="v=>setStart(Number(v))"/><q-btn flat color="deep-orange" label="Usar posición actual" no-caps :disable="working" @click="setStart(current)"/></div>
          <div><q-input dark outlined type="number" :model-value="end" label="Final (segundos)" :min="0" :max="duration" step=".1" :disable="working" @update:model-value="v=>setEnd(Number(v))"/><q-btn flat color="deep-orange" label="Usar posición actual" no-caps :disable="working" @click="setEnd(current)"/></div>
        </div>
        <div class="options"><q-btn outline color="deep-orange" icon="play_arrow" label="Previsualizar recorte" no-caps :disable="working||end-start<.5" @click="playSelection"/><q-btn flat label="Restablecer" no-caps :disable="working" @click="reset"/><q-select dark outlined v-model="height" :options="[{label:'HD · hasta 720p',value:720},{label:'Full HD · hasta 1080p',value:1080}]" emit-value map-options label="Resolución de salida" :disable="working"/><q-toggle dark v-model="silent" label="Quitar audio" :disable="working"/></div>
        <div v-if="!silent" class="volume"><span>Volumen de salida: {{Math.round(volume*100)}}%</span><q-slider dark v-model="volume" :min="0" :max="1" :step=".05" color="deep-orange" :disable="working"/></div>
        <section class="lab-panel">
          <div class="timeline-head"><h3>Montaje de fragmentos</h3><span>{{format(totalDuration)}} de salida</span></div>
          <p>Selecciona zonas del mismo video y añádelas en el orden deseado. Si no añades ninguna, se exportará el recorte actual.</p>
          <div class="options">
            <q-btn outline color="deep-orange" icon="add" label="Añadir selección" no-caps :disable="working||clips.length>=12||end-start<.5||queuedDuration+end-start>300" @click="addClip"/>
            <q-btn outline color="deep-orange" icon="call_split" label="Dividir en posición actual" no-caps :disable="working||current-start<.5||end-current<.5||clips.length>10||queuedDuration+end-start>300" @click="splitClip"/>
            <q-btn flat label="Vaciar secuencia" no-caps :disable="working||!clips.length" @click="clips=[]"/>
          </div>
          <div v-for="(clip,i) in clips" :key="i" class="clip-row">
            <strong>{{i+1}}. {{format(clip.start)}} – {{format(clip.end)}}</strong><span>{{format(clip.end-clip.start)}}</span>
            <q-btn flat round dense icon="arrow_upward" aria-label="Mover arriba" :disable="working||i===0" @click="moveClip(i,-1)"/>
            <q-btn flat round dense icon="arrow_downward" aria-label="Mover abajo" :disable="working||i===clips.length-1" @click="moveClip(i,1)"/>
            <q-btn flat round dense icon="delete_outline" aria-label="Quitar fragmento" :disable="working" @click="removeClip(i)"/>
          </div>
          <q-select dark outlined v-model="transition" :options="[{label:'Corte directo',value:'cut'},{label:'Fundido a negro entre fragmentos',value:'fade'}]" emit-value map-options label="Transición" :disable="working"/>
        </section>
        <section class="lab-panel">
          <h3>Formato y color</h3>
          <div class="controls">
            <q-select dark outlined v-model="formatMode" :options="[{label:'Original',value:'original'},{label:'Horizontal 16:9',value:'wide'},{label:'Vertical 9:16 · Reels y Shorts',value:'vertical'},{label:'Cuadrado 1:1',value:'square'}]" emit-value map-options label="Formato" :disable="working"/>
            <q-select dark outlined v-model="fit" :options="[{label:'Encajar sin recortar',value:'contain'},{label:'Llenar · recorte centrado',value:'cover'}]" emit-value map-options label="Encuadre" :disable="working"/>
          </div>
          <q-select dark outlined v-model="filter" :options="[{label:'Natural',value:'normal'},{label:'Cinematográfico',value:'cinema'},{label:'Cálido',value:'warm'},{label:'Blanco y negro',value:'mono'},{label:'Vívido',value:'vivid'}]" emit-value map-options label="Filtro" :disable="working"/>
          <div v-for="control in colorControls" :key="control.label" class="volume"><span>{{control.label}}: {{Math.round(control.value.value*100)}}%</span><q-slider dark :model-value="control.value.value" @update:model-value="v=>control.value.value=v" :min="control.min" :max="control.max" :step=".05" color="deep-orange" :disable="working"/></div>
          <q-btn flat color="deep-orange" label="Restablecer color" no-caps :disable="working" @click="resetColor"/>
        </section>
        <section class="lab-panel">
          <h3>Textos y marca</h3>
          <q-input dark outlined v-model="overlayTitle" maxlength="180" label="Título sobre el video" :disable="working"/>
          <q-input dark outlined v-model="subtitle" maxlength="180" label="Subtítulo fijo (visible durante toda la edición)" :disable="working"/>
          <q-file dark outlined v-model="logoFile" label="Logotipo PNG, JPG o WebP (hasta 1 MiB)" accept=".png,.jpg,.jpeg,.webp" :max-file-size="1048576" clearable :disable="working" @rejected="error='El logotipo debe ser una imagen de hasta 1 MiB.'"/>
          <div v-if="logoFile" class="volume"><span>Opacidad: {{Math.round(logoOpacity*100)}}%</span><q-slider dark v-model="logoOpacity" :min=".1" :max="1" :step=".05" color="deep-orange" :disable="working"/></div>
        </section>
        <section class="lab-panel">
          <h3>Música de fondo</h3>
          <q-file dark outlined v-model="musicFile" label="Audio propio MP3, WAV, M4A, OGG o WebM (hasta 20 MiB)" accept=".mp3,.wav,.m4a,.ogg,.webm,.aac" :max-file-size="20971520" clearable :disable="working" @rejected="error='Archivo de audio no admitido o demasiado grande.'"/>
          <div v-if="musicFile" class="volume"><span>Volumen de música: {{Math.round(musicVolume*100)}}%</span><q-slider dark v-model="musicVolume" :min="0" :max="1" :step=".05" color="deep-orange" :disable="working"/></div>
          <p class="note">Usa música propia o con licencia. Si es más corta, se repetirá durante la edición. El control Quitar audio silencia el sonido original, no la música.</p>
        </section>
        <p class="note">La vista previa de recorte reproduce el original; los efectos, montaje y audio mezclado se comprueban en el resultado exportado.</p>
        <p class="note">Exportación local en tiempo real, hasta 5 minutos en total. Mantén esta pestaña visible. El video se vuelve a codificar y el corte es aproximado, no a nivel de fotograma.</p>
        <q-btn unelevated color="deep-orange" icon="content_cut" label="Generar video editado" no-caps :disable="working||!supported||totalDuration<.5||totalDuration>300" @click="generate"/>
        <p v-if="!supported">Este navegador no ofrece la codificación necesaria. Usa Chrome, Edge o Brave de escritorio actualizado.</p>
      </template>
      <div v-if="working" class="progress"><q-linear-progress :value="progress" color="deep-orange" :indeterminate="stage==='Descargando original'"/><div class="progress-label"><span>{{stage}} · {{Math.round(progress*100)}}%</span><q-btn flat color="deep-orange" label="Cancelar" no-caps @click="cancel"/></div></div>
      <div v-if="result" class="result"><h3>Resultado de la edición</h3><video :src="resultUrl" controls playsinline preload="metadata"/><p>{{result.type}} · {{(result.size/1048576).toFixed(2)}} MiB. Revisa la reproducción y el audio antes de guardar.</p><div class="options"><q-btn outline color="deep-orange" icon="download" label="Descargar copia" no-caps :disable="working" @click="download"/><q-btn unelevated color="deep-orange" icon="save" label="Usar como nuevo borrador" no-caps :disable="working" @click="useResult"/></div><p class="note">El resultado se enviará al formulario de nueva publicación. No se subirá hasta que pulses Guardar borrador.</p></div>
    </q-card-section>
  </q-card>
</template>
<script setup>
import {ref,computed,onMounted,onBeforeUnmount,watch} from 'vue'
import {mediaUrl} from '../services/sensacionesMedia'
import {canTrim,renderTrim} from '../services/sensacionesTrim'
const props=defineProps({item:Object,initialFile:Object,maxBytes:{type:Number,default:262144000}})
const emit=defineEmits(['close','result'])
const supported=canTrim()
const localFile=ref(null),source=ref(null),url=ref(''),preview=ref(null),duration=ref(0),start=ref(0),end=ref(0),current=ref(0),height=ref(720),silent=ref(false),volume=ref(1)
const working=ref(false),progress=ref(0),stage=ref(''),error=ref(''),result=ref(null),resultUrl=ref('')
const clips=ref([]),transition=ref('cut'),formatMode=ref('original'),fit=ref('contain'),filter=ref('normal'),brightness=ref(1),contrast=ref(1),saturation=ref(1)
const overlayTitle=ref(''),subtitle=ref(''),logoFile=ref(null),logoOpacity=ref(.8),musicFile=ref(null),musicVolume=ref(.25)
const colorControls=[{label:'Brillo',value:brightness,min:.5,max:1.5},{label:'Contraste',value:contrast,min:.5,max:1.5},{label:'Saturación',value:saturation,min:0,max:2}]
const queuedDuration=computed(()=>clips.value.reduce((sum,clip)=>sum+clip.end-clip.start,0))
const totalDuration=computed(()=>clips.value.length?queuedDuration.value:end.value-start.value)
function addClip(){if(clips.value.length<12&&end.value-start.value>=.5&&queuedDuration.value+end.value-start.value<=300)clips.value=[...clips.value,{start:start.value,end:end.value}]}
function splitClip(){if(clips.value.length<=10&&current.value-start.value>=.5&&end.value-current.value>=.5&&queuedDuration.value+end.value-start.value<=300)clips.value=[...clips.value,{start:start.value,end:current.value},{start:current.value,end:end.value}]}
function moveClip(i,delta){const next=[...clips.value];if(i+delta<0||i+delta>=next.length)return;[next[i],next[i+delta]]=[next[i+delta],next[i]];clips.value=next}
function removeClip(i){clips.value=clips.value.filter((_,j)=>j!==i)}
function resetColor(){brightness.value=1;contrast.value=1;saturation.value=1;filter.value='normal'}
let controller=null,selectionPlaying=false
function clearResult(){if(resultUrl.value)URL.revokeObjectURL(resultUrl.value);resultUrl.value='';result.value=null}
function setSource(file){selectionPlaying=false;preview.value?.pause();if(url.value)URL.revokeObjectURL(url.value);clearResult();source.value=file;clips.value=[];duration.value=0;start.value=0;end.value=0;current.value=0;url.value=file?URL.createObjectURL(file):''}
function selectLocal(file){error.value='';localFile.value=file;setSource(file)}
function metadata(){const d=preview.value?.duration;if(!Number.isFinite(d)||d<=0){error.value='No se pudo determinar la duración del video. Prueba el archivo original.';return}duration.value=d;start.value=0;end.value=d;current.value=0}
function format(n){const s=Math.max(0,n);return Math.floor(s/60)+':'+(s%60).toFixed(1).padStart(4,'0')}
function stopSelection(){selectionPlaying=false;preview.value?.pause()}
function setStart(n){if(!Number.isFinite(n))return;stopSelection();start.value=Math.min(Math.max(0,n),Math.max(0,end.value-.5));if(preview.value)preview.value.currentTime=start.value;clearResult()}
function setEnd(n){if(!Number.isFinite(n))return;stopSelection();end.value=Math.min(duration.value,Math.max(start.value+.5,n));if(preview.value)preview.value.currentTime=end.value;clearResult()}
function changeRange(r){stopSelection();if(r.max-r.min<.5)return;start.value=r.min;end.value=r.max;clearResult()}
function reset(){stopSelection();start.value=0;end.value=duration.value;if(preview.value)preview.value.currentTime=0;clearResult()}
function updateTime(){if(!preview.value)return;current.value=preview.value.currentTime;if(selectionPlaying&&current.value>=end.value){stopSelection();preview.value.currentTime=end.value}}
async function playSelection(){if(!preview.value)return;preview.value.currentTime=start.value;selectionPlaying=true;try{await preview.value.play()}catch{selectionPlaying=false;error.value='No se pudo reproducir la selección.'}}
function cancel(){controller?.abort()}
async function loadRemote(){
  if(working.value)return
  working.value=true;progress.value=0;stage.value='Descargando original';error.value='';controller=new AbortController()
  let reader
  try{
    const path=mediaUrl(props.item?.url)
    if(!path)throw new Error('Archivo no disponible.')
    const response=await fetch(path,{credentials:'same-origin',signal:controller.signal,cache:'no-store'})
    if(!response.ok)throw new Error('No se pudo leer el archivo de la biblioteca.')
    const type=(response.headers.get('Content-Type')||'').split(';')[0]
    if(!['video/mp4','video/webm','application/octet-stream'].includes(type))throw new Error('El archivo recibido no es un video compatible.')
    const total=Number(response.headers.get('Content-Length'))||0
    if(total>262144000||!response.body)throw new Error('El archivo excede el límite del editor.')
    reader=response.body.getReader();let bytes=0;const chunks=[]
    while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.length;if(bytes>262144000)throw new Error('El archivo excede 250 MiB.');chunks.push(value);if(total)progress.value=Math.min(1,bytes/total)}
    if(!bytes)throw new Error('El archivo está vacío.')
    const mime=type==='video/webm'?'video/webm':type==='video/mp4'?'video/mp4':(props.item?.mime==='video/webm'?'video/webm':'video/mp4')
    const file=new File(chunks,'original.'+(mime==='video/webm'?'webm':'mp4'),{type:mime})
    localFile.value=null;setSource(file)
  }catch(e){error.value=controller.signal.aborted?'Descarga cancelada.':(e instanceof TypeError?'El navegador no pudo leer R2 (CORS). Selecciona el archivo original de tu equipo.':e.message)}
  finally{if(reader)await reader.cancel().catch(()=>{});working.value=false;controller=null}
}
async function generate(){
  if(working.value||!source.value)return
  stopSelection();clearResult();error.value='';working.value=true;progress.value=0;stage.value='Exportando recorte';controller=new AbortController()
  try{const output=await renderTrim({source:source.value,start:start.value,end:end.value,segments:clips.value.length?clips.value:undefined,options:{format:formatMode.value,fit:fit.value,filter:filter.value,brightness:brightness.value,contrast:contrast.value,saturation:saturation.value,title:overlayTitle.value,subtitle:subtitle.value,logoOpacity:logoOpacity.value,transition:transition.value},logoFile:logoFile.value,musicFile:musicFile.value,musicVolume:musicVolume.value,maxHeight:height.value,silent:silent.value,volume:volume.value,maxBytes:props.maxBytes,signal:controller.signal,onProgress:v=>progress.value=v});result.value=output;resultUrl.value=URL.createObjectURL(output)}
  catch(e){error.value=e.message||'No se pudo exportar el video.'}
  finally{working.value=false;controller=null}
}
function download(){if(!result.value)return;const a=document.createElement('a');a.href=resultUrl.value;a.download=result.value.name;a.click()}
function useResult(){if(result.value)emit('result',result.value)}
onMounted(()=>{if(props.initialFile)selectLocal(props.initialFile)})
watch([height,silent,volume,clips,transition,formatMode,fit,filter,brightness,contrast,saturation,overlayTitle,subtitle,logoFile,logoOpacity,musicFile,musicVolume],clearResult)
onBeforeUnmount(()=>{cancel();stopSelection();if(url.value)URL.revokeObjectURL(url.value);clearResult()})
</script>
<style scoped>
.editor{width:min(100%,980px);max-width:980px!important;background:#16161c;color:#fff;border:1px solid #ffffff20}.editor-header{display:flex;justify-content:space-between;align-items:start;gap:12px;padding:24px}.eyebrow{color:#ff9b6a;font-size:11px;font-weight:800;letter-spacing:.18em}.editor h2{font-size:30px;line-height:1.1;margin:10px 0}.editor h3{font-size:20px;line-height:1.2}.editor p{color:#bab9c0;line-height:1.6;margin:8px 0}.editor-content{display:grid;gap:14px;padding:0 24px 24px}.editor video{display:block;width:100%;max-height:52vh;background:black;border-radius:10px}.source,.timeline-head,.progress-label{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}.timeline{position:relative;height:32px;border:1px solid #45434b;background:repeating-linear-gradient(90deg,#292930 0 19px,#3a3940 19px 20px);border-radius:6px;overflow:hidden}.selected{position:absolute;top:0;bottom:0;background:#ff681e55;border:2px solid #ff681e}.cursor{position:absolute;top:0;bottom:0;width:2px;background:#fff}.controls{display:grid;grid-template-columns:1fr 1fr;gap:12px}.options{display:flex;gap:10px;align-items:center;flex-wrap:wrap}.options .q-select{min-width:200px;flex:1}.volume{display:flex;align-items:center;gap:16px}.volume .q-slider{flex:1}.note{font-size:12px}.result{background:#222229;padding:16px;border-radius:12px;display:grid;gap:12px}.progress{display:grid;gap:6px}@media(max-width:600px){.editor-header,.editor-content{padding:16px}.controls{grid-template-columns:1fr}.volume{flex-direction:column;align-items:stretch}}
.lab-panel{background:#202027;padding:18px;border:1px solid #ffffff16;border-radius:12px;display:grid;gap:12px}.lab-panel h3{margin:0;color:#ffb38b}.clip-row{display:flex;align-items:center;gap:8px;background:#292931;padding:9px;border-radius:8px;flex-wrap:wrap}.clip-row strong{flex:1}.clip-row span{font-size:12px;color:#aaa}
</style>
