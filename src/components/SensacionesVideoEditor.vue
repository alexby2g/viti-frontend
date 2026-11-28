<template>
  <q-card dark class="editor pro-workspace">
    <header class="editor-header">
      <div class="editor-brand"><div class="eyebrow">SENSACIONES / VIDEO LAB</div><h2>Editor de video</h2></div>
      <div class="head-actions"><span v-if="duration" class="head-time">{{format(totalDuration)}} de salida</span><q-btn flat color="grey-4" icon="save" label="Proyecto" no-caps :disable="!duration||working" @click="activeTool='project'"/><q-btn unelevated color="deep-orange" icon="movie" label="Exportar" no-caps :disable="working||!supported||!duration||totalDuration<.5||totalDuration>300" @click="generate"/><q-btn flat round icon="close" aria-label="Cerrar editor" :disable="working" @click="$emit('close')"/></div>
    </header>
    <nav class="tool-tabs" aria-label="Herramientas de edición"><button v-for="tool in tools" :key="tool.id" :class="{active:activeTool===tool.id}" :aria-pressed="activeTool===tool.id" @click="activeTool=tool.id"><q-icon :name="tool.icon" size="20px"/>{{tool.label}}</button><button :disabled="working" @click="openMontage"><q-icon name="video_library" size="20px"/>Montaje múltiple</button></nav>
    <q-banner v-if="error" dense class="bg-negative text-white editor-error">{{error}}<template #action><q-btn flat round dense icon="close" aria-label="Cerrar aviso" @click="error=''"/></template></q-banner>
    <div class="work-grid">
      <aside ref="inspector" class="inspector">
        <div v-show="activeTool==='media'" class="tool-panel"><h3>Archivos multimedia</h3>      <div v-if="item" class="source"><strong>{{item.title}}</strong><q-btn outline color="deep-orange" icon="download" label="Cargar video de la biblioteca" no-caps :disable="working" @click="loadRemote"/></div>
      <q-file dark outlined :model-value="localFile" label="Seleccionar video original (MP4 o WebM)" accept=".mp4,.webm" :max-file-size="262144000" :disable="working" @update:model-value="selectLocal" @rejected="error='Archivo no admitido o mayor de 250 MiB.'"/>
      <p v-if="item&&!source">Puedes utilizar la copia de la biblioteca o elegir el archivo original de tu computadora.</p>
<q-btn outline color="deep-orange" icon="video_library" label="Unir varios videos" no-caps :disable="working" @click="openMontage"/><p class="note">Selecciona un MP4 o WebM para empezar. Tus originales no se modificarán.</p></div>
        <div v-if="duration>0" v-show="activeTool==='trim'" class="tool-panel"><h3>Recortar y dividir</h3>        <div class="controls">
          <div><q-input dark outlined type="number" :model-value="start" label="Inicio (segundos)" :min="0" :max="duration" step=".1" :disable="working" @update:model-value="v=>setStart(Number(v))"/><q-btn flat color="deep-orange" label="Usar posición actual" no-caps :disable="working" @click="setStart(current)"/></div>
          <div><q-input dark outlined type="number" :model-value="end" label="Final (segundos)" :min="0" :max="duration" step=".1" :disable="working" @update:model-value="v=>setEnd(Number(v))"/><q-btn flat color="deep-orange" label="Usar posición actual" no-caps :disable="working" @click="setEnd(current)"/></div>
        </div>
<div class="options"><q-btn outline color="deep-orange" icon="play_arrow" label="Probar recorte" no-caps :disable="working||end-start<.5" @click="playSelection"/><q-btn flat label="Restablecer" no-caps :disable="working" @click="reset"/></div>        <section class="lab-panel">
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
</div>
        <div v-if="duration>0" v-show="activeTool==='color'" class="tool-panel">        <section class="lab-panel">
          <h3>Formato y color</h3>
          <div class="controls">
            <q-select dark outlined v-model="formatMode" :options="[{label:'Original',value:'original'},{label:'Horizontal 16:9',value:'wide'},{label:'Vertical 9:16 · Reels y Shorts',value:'vertical'},{label:'Cuadrado 1:1',value:'square'}]" emit-value map-options label="Formato" :disable="working"/>
            <q-select dark outlined v-model="fit" :options="[{label:'Encajar sin recortar',value:'contain'},{label:'Llenar · recorte centrado',value:'cover'}]" emit-value map-options label="Encuadre" :disable="working"/>
          </div>
          <q-select dark outlined v-model="filter" :options="[{label:'Natural',value:'normal'},{label:'Cinematográfico',value:'cinema'},{label:'Cálido',value:'warm'},{label:'Blanco y negro',value:'mono'},{label:'Vívido',value:'vivid'}]" emit-value map-options label="Filtro" :disable="working"/>
          <div v-for="control in colorControls" :key="control.label" class="volume"><span>{{control.label}}: {{Math.round(control.value.value*100)}}%</span><q-slider dark :model-value="control.value.value" @update:model-value="v=>control.value.value=v" :min="control.min" :max="control.max" :step=".05" color="deep-orange" :disable="working"/></div>
          <div class="volume"><span>Matiz: {{hue}}°</span><q-slider dark v-model="hue" :min="-180" :max="180" :step="1" color="deep-orange" :disable="working"/></div><q-btn flat color="deep-orange" label="Restablecer color" no-caps :disable="working" @click="resetColor"/>
        </section>
</div>
        <div v-if="duration>0" v-show="activeTool==='text'" class="tool-panel">        <section class="lab-panel">
          <h3>Textos y marca</h3>
          <q-input dark outlined v-model="overlayTitle" maxlength="180" label="Título sobre el video" :disable="working"/>
          <q-select dark outlined v-model="titleAnimation" :options="[{label:'Sin animación',value:'none'},{label:'Aparición y salida suave',value:'fade'},{label:'Desplazamiento y fundido',value:'slide'}]" emit-value map-options label="Animación del título" :disable="working"/>
          <q-input dark outlined v-model="subtitle" maxlength="180" label="Subtítulo fijo (si no hay SRT)" :disable="working"/>
          <div class="options"><q-btn outline color="deep-orange" label="Mover título" no-caps :disable="working||!overlayTitle" @click="selectAnchor('title')"/><q-btn outline color="deep-orange" label="Mover subtítulos" no-caps :disable="working||(!subtitle&&!captions)" @click="selectAnchor('caption')"/></div>
          <p class="note">Activa un elemento y arrástralo por el monitor, o ajusta su posición con los controles.</p>
          <div v-for="field in anchorFields" :key="field.key" class="volume"><span>{{field.label}}: {{Math.round(field.value.value*100)}}%</span><q-slider dark :model-value="field.value.value" @update:model-value="v=>field.value.value=v" :min="field.min" :max="field.max" :step=".01" color="deep-orange" :disable="working"/></div>
          <q-file dark outlined :model-value="null" label="Importar subtítulos SRT (hasta 64 KiB)" accept=".srt" :max-file-size="65536" :disable="working" @update:model-value="loadCaptions" @rejected="error='Archivo SRT demasiado grande.'"/>
          <q-input dark outlined v-model="captions" type="textarea" maxlength="65536" label="Subtítulos SRT · tiempo de salida" hint="00:00:01,000 --> 00:00:03,000, seguido del texto en la siguiente línea." :disable="working"/>
          <div class="options"><q-btn flat color="deep-orange" label="Añadir ejemplo SRT" no-caps :disable="working||!!captions" @click="captions=sampleSrt"/><q-btn flat color="deep-orange" label="Comprobar subtítulos" no-caps :disable="working" @click="checkCaptions"/></div>
          <p v-if="captionsChecked" class="caption-check">{{captionsChecked}}</p>
          <p class="note">Los tiempos se refieren al video final, después del montaje y la velocidad. Los subtítulos se incrustan en la imagen.</p>
          <q-file dark outlined v-model="logoFile" label="Logotipo PNG, JPG o WebP (hasta 1 MiB)" accept=".png,.jpg,.jpeg,.webp" :max-file-size="1048576" clearable :disable="working" @rejected="error='El logotipo debe ser una imagen de hasta 1 MiB.'"/>
          <div v-if="logoFile" class="volume"><span>Opacidad: {{Math.round(logoOpacity*100)}}%</span><q-slider dark v-model="logoOpacity" :min=".1" :max="1" :step=".05" color="deep-orange" :disable="working"/></div>
        </section>
</div>
        <div v-if="duration>0" v-show="activeTool==='layers'" class="tool-panel">
          <h3>Capas libres</h3><p class="note">Selecciona una capa y arrástrala sobre el video. Los tiempos corresponden al montaje final.</p>
          <div class="options"><q-btn outline color="deep-orange" icon="title" label="Texto libre" no-caps :disable="working||layers.length>=12" @click="addTextLayer('Tu texto')"/><q-btn outline color="deep-orange" icon="emoji_emotions" label="★" :disable="working||layers.length>=12" @click="addTextLayer('★')"/><q-btn outline color="deep-orange" label="♥" :disable="working||layers.length>=12" @click="addTextLayer('♥')"/></div>
          <q-file dark outlined :model-value="null" label="Sticker, PNG, JPG o WebP (1 MiB)" accept=".png,.jpg,.jpeg,.webp" :max-file-size="1048576" :disable="working||layers.length>=12||imageCount>=8" @update:model-value="addImageLayer" @rejected="error='Imagen no admitida o superior a 1 MiB.'"/>
          <q-expansion-item dense expand-separator icon="collections" label="Recursos gráficos" class="resource-panel"><div class="resource-grid"><button v-for="resource in resources" :key="resource.id" :disabled="working||layers.length>=12||imageCount>=8" @click="addResource(resource.id)"><q-icon :name="resource.icon" size="28px"/><span>{{resource.label}}</span></button></div></q-expansion-item>
          <q-toggle dark v-model="snapEnabled" label="Ajustar a guías" :disable="working"/>
          <div class="layer-list"><button v-for="(layer,i) in [...layers].reverse()" :key="layer.id" :disabled="working" :class="{chosen:selectedLayerId===layer.id}" @click="selectLayer(layer.id)"><q-icon :name="layer.type==='image'?'image':'title'"/><span>{{layer.name}}</span><small>{{layers.length-i}}</small></button></div>
          <template v-if="selectedLayer">
            <q-input dark outlined v-model="selectedLayer.name" maxlength="80" label="Nombre de capa" :disable="working"/>
            <template v-if="selectedLayer.type==='text'"><q-input dark outlined type="textarea" v-model="selectedLayer.text" maxlength="180" label="Texto" :disable="working"/><q-select dark outlined v-model="selectedLayer.font" :options="['sans-serif','serif','monospace']" label="Fuente" :disable="working"/><label class="color-pick">Color <input type="color" v-model="selectedLayer.color" :disabled="working"/></label><q-toggle dark v-model="selectedLayer.bold" label="Negrita" :disable="working"/><q-toggle dark v-model="selectedLayer.background" label="Fondo oscuro" :disable="working"/><q-toggle dark v-model="selectedLayer.outline" label="Contorno" :disable="working"/></template>
            <div class="motion-panel"><h4>Animación</h4>
            <q-select dark outlined v-model="selectedLayer.enter" :options="motionOptions" emit-value map-options label="Entrada" :disable="working"/>
            <q-select dark outlined v-model="selectedLayer.exit" :options="motionOptions" emit-value map-options label="Salida" :disable="working"/>
            <div class="volume"><span>Duración: {{(selectedLayer.animationSeconds||.5).toFixed(1)}} s</span><q-slider dark :model-value="selectedLayer.animationSeconds||.5" @update:model-value="v=>selectedLayer.animationSeconds=v" :min=".1" :max="3" :step=".1" color="deep-orange" :disable="working"/></div>
            <h4>Fotogramas clave</h4><p class="note">Mueve el cursor al tiempo deseado, añade un fotograma y cambia sus propiedades. El movimiento entre puntos se calcula automáticamente.</p>
            <q-btn outline color="deep-orange" icon="add" label="Añadir fotograma aquí" no-caps :disable="working||!canAddKey" @click="addKeyframe"/>
            <p class="note">Tiempo del montaje: {{format(outputClock)}}</p>
            <div class="key-list" v-if="selectedLayer.keyframes?.length"><button v-for="(key,i) in selectedLayer.keyframes" :key="key.time" :class="{chosen:activeKeyTime===key.time}" :disabled="working" @click="selectKeyframe(key.time)">◆ {{format(key.time)}} <small>{{i+1}}</small></button></div>
            <q-btn v-if="activeKeyTime!==null" flat color="negative" icon="delete_outline" label="Quitar fotograma" no-caps :disable="working" @click="removeKeyframe"/>
            <p v-if="selectedLayer.keyframes?.length" class="note">Selecciona un fotograma para editarlo. Arrastrar sobre el monitor crea o modifica uno en el tiempo actual.</p>
          </div>
          <div v-for="field in layerFields" :key="field.key" class="volume"><span>{{field.label}}: {{Math.round(transformTarget[field.key]*field.display)}}{{field.unit}}</span><q-slider dark :model-value="transformTarget[field.key]" @update:model-value="v=>setTransform(field.key,v)" :min="field.min" :max="field.max" :step="field.step" color="deep-orange" :disable="working||!canEditTransform"/></div>
            <div class="controls"><q-input dark outlined type="number" :model-value="selectedLayer.start" label="Inicio (s)" :min="0" :max="300" step=".1" :disable="working" @update:model-value="v=>setLayerTime('start',v)"/><q-input dark outlined type="number" :model-value="selectedLayer.end" label="Final (s)" :min="0" :max="300" step=".1" :disable="working" @update:model-value="v=>setLayerTime('end',v)"/></div>
            <q-btn flat color="deep-orange" icon="visibility" label="Ver capa en su tiempo" no-caps :disable="working||selectedLayer.start>=totalDuration" @click="seekLayer(selectedLayer)"/><p v-if="selectedLayer.end>totalDuration+.02" class="note">La capa se recorta automáticamente al final del montaje.</p>
            <div class="options"><q-btn flat dense color="deep-orange" icon="arrow_upward" label="Adelante" no-caps :disable="working" @click="moveLayer(1)"/><q-btn flat dense color="deep-orange" icon="arrow_downward" label="Atrás" no-caps :disable="working" @click="moveLayer(-1)"/><q-btn flat dense color="deep-orange" icon="content_copy" label="Duplicar" no-caps :disable="working||layers.length>=12||(selectedLayer.type==='image'&&imageCount>=8)" @click="duplicateLayer"/><q-btn flat dense color="negative" icon="delete_outline" label="Quitar capa" no-caps :disable="working" @click="removeLayer"/></div>
          </template>
        </div>
        <div v-if="duration>0" v-show="activeTool==='effects'" class="tool-panel">
          <h3>Composición de video</h3><q-btn-toggle dense unelevated no-caps color="grey-9" toggle-color="deep-orange" v-model="movingEffect" :options="[{label:'Mover video 2',value:'pip'},{label:'Mover desenfoque',value:'blur'}]" :disable="working"/><p class="note">Elige el elemento y arrástralo en el monitor.</p>
          <section class="lab-panel"><h3>Video sobre video (PiP)</h3>
            <q-file dark outlined :model-value="secondaryFile" label="Segundo video MP4 / WebM" accept=".mp4,.webm" :max-file-size="262144000" clearable :disable="working" @update:model-value="loadSecondary" @rejected="error='Segundo video no admitido o mayor de 250 MiB.'"/>
            <p v-if="secondaryName&&!secondaryReady" class="note">Archivo requerido o cargando: {{secondaryName}}.</p>
            <p v-if="secondaryReady" class="note">Duración: {{format(secondaryDuration)}}. Pista visual sin audio, a velocidad normal.</p>
            <q-toggle dark v-model="effects.pip.enabled" label="Mostrar segundo video" :disable="working"/>
            <template v-if="effects.pip.enabled">
              <div v-for="field in pipFields" :key="field.key" class="volume"><span>{{field.label}}: {{Math.round(effects.pip[field.key]*100)}}%</span><q-slider dark v-model="effects.pip[field.key]" :min="field.min" :max="field.max" :step="field.step" color="deep-orange" :disable="working"/></div>
              <q-select dark outlined v-model="effects.pip.mask" :options="maskOptions" emit-value map-options label="Máscara" :disable="working"/>
              <q-select dark outlined v-model="effects.pip.key" :options="keyOptions" emit-value map-options label="Chroma Key" :disable="working"/>
              <template v-if="effects.pip.key!=='none'">
                <div class="volume"><span>Umbral: {{Math.round(effects.pip.threshold*100)}}%</span><q-slider dark v-model="effects.pip.threshold" :min="0" :max="1" :step=".01" color="deep-orange" :disable="working"/></div>
                <div class="volume"><span>Suavidad: {{Math.round(effects.pip.softness*100)}}%</span><q-slider dark v-model="effects.pip.softness" :min=".02" :max=".5" :step=".01" color="deep-orange" :disable="working"/></div>
                <p class="note">Elimina el fondo verde o azul del segundo video para revelar el principal. El procesamiento del recorte de color usa hasta 640 px para reducir carga.</p>
              </template>
              <div class="controls"><q-input dark outlined type="number" label="Inicio (s)" :model-value="effects.pip.start" :disable="working" @update:model-value="v=>effectTime('pip','start',v)"/><q-input dark outlined type="number" label="Final (s)" :model-value="effects.pip.end" :disable="working" @update:model-value="v=>effectTime('pip','end',v)"/></div>
              <q-btn flat color="deep-orange" icon="visibility" label="Ir al inicio de la pista" no-caps :disable="working||effects.pip.start>=totalDuration" @click="seekOutput(effects.pip.start+.03)"/>
              <p class="note">Se reproduce desde el comienzo del segundo archivo y desaparece al terminar su duración o al alcanzar el final definido.</p>
            </template>
          </section>
          <section class="lab-panel"><h3>Desenfoque localizado</h3><q-toggle dark v-model="effects.blur.enabled" label="Activar zona de desenfoque" :disable="working"/>
            <template v-if="effects.blur.enabled">
              <q-select dark outlined v-model="effects.blur.mask" :options="maskOptions" emit-value map-options label="Forma de la zona" :disable="working"/>
              <div v-for="field in blurFields" :key="field.key" class="volume"><span>{{field.label}}: {{Math.round(effects.blur[field.key]*100)}}%</span><q-slider dark v-model="effects.blur[field.key]" :min="field.min" :max="field.max" :step="field.step" color="deep-orange" :disable="working"/></div>
              <div class="volume"><span>Intensidad: {{effects.blur.strength}}</span><q-slider dark v-model="effects.blur.strength" :min="2" :max="40" :step="1" color="deep-orange" :disable="working"/></div>
              <div class="controls"><q-input dark outlined type="number" label="Inicio (s)" :model-value="effects.blur.start" :disable="working" @update:model-value="v=>effectTime('blur','start',v)"/><q-input dark outlined type="number" label="Final (s)" :model-value="effects.blur.end" :disable="working" @update:model-value="v=>effectTime('blur','end',v)"/></div>
              <p class="note">Zona fija sobre el video principal, sin seguimiento automático. Revisa el resultado si necesitas ocultar información sensible.</p>
            </template>
          </section>
          <q-btn flat color="deep-orange" label="Restablecer composición" no-caps :disable="working" @click="resetEffects"/>
        </div>
        <div v-if="duration>0" v-show="activeTool==='audio'" class="tool-panel"><h3>Audio original</h3><q-toggle dark v-model="silent" label="Silenciar audio original" :disable="working"/>        <div v-if="!silent" class="volume"><span>Volumen de salida: {{Math.round(volume*100)}}%</span><q-slider dark v-model="volume" :min="0" :max="1" :step=".05" color="deep-orange" :disable="working"/></div>
        <section class="lab-panel">
          <h3>Música de fondo</h3>
          <q-file dark outlined v-model="musicFile" label="Audio propio MP3, WAV, M4A, OGG o WebM (hasta 20 MiB)" accept=".mp3,.wav,.m4a,.ogg,.webm,.aac" :max-file-size="20971520" clearable :disable="working" @rejected="error='Archivo de audio no admitido o demasiado grande.'"/>
          <div v-if="musicFile" class="volume"><span>Volumen de música: {{Math.round(musicVolume*100)}}%</span><q-slider dark v-model="musicVolume" :min="0" :max="1" :step=".05" color="deep-orange" :disable="working"/></div>
          <p class="note">Usa música propia o con licencia. Si es más corta, se repetirá durante la edición. El control Silenciar audio original silencia el sonido original, no la música.</p>
        </section>
<p class="note">La mezcla de música se comprueba en el archivo exportado.</p></div>
        <div v-if="duration>0" v-show="activeTool==='project'" class="tool-panel">        <section class="lab-panel">
          <h3>Velocidad y proyecto</h3>
          <q-select dark outlined v-model="speed" :options="speedOptions" emit-value map-options label="Velocidad de todo el montaje" :disable="working"/>
          <p>Duración estimada de salida: {{format(totalDuration)}}. La velocidad también afecta al audio original.</p>
          <div class="options"><q-btn outline color="deep-orange" icon="save" label="Guardar proyecto JSON" no-caps :disable="working" @click="saveProject"/><q-file dark outlined :model-value="null" label="Abrir proyecto JSON" accept=".json" :max-file-size="projectFileLimit" :disable="working" @update:model-value="openProject" @rejected="error='Proyecto inválido o demasiado grande.'"/></div>
          <p class="note">El proyecto conserva los ajustes y las imágenes de capas, no el video ni el audio. Para abrirlo, selecciona primero el mismo video. Vuelve a adjuntar la música y el logotipo si los utilizaste.</p>
        </section>
<section class="lab-panel"><h3>Exportación</h3><q-select dark outlined v-model="height" :options="[{label:'HD · hasta 720p',value:720},{label:'Full HD · hasta 1080p',value:1080}]" emit-value map-options label="Resolución de salida" :disable="working"/><p class="note">Hasta cinco minutos. La exportación recodifica el video en tiempo real; mantén la pestaña visible. El original permanece intacto.</p><p v-if="!supported">Usa Chrome, Edge o Brave de escritorio actualizado.</p></section></div>
        <p v-if="!duration&&activeTool!=='media'" class="note">Carga primero un video desde Archivos.</p>
      </aside>
      <section class="monitor">
        <div class="monitor-head"><strong>Monitor de edición</strong><q-btn-toggle dense unelevated no-caps color="grey-9" toggle-color="deep-orange" v-model="showOriginal" :options="[{label:'Original',value:true},{label:'Editado',value:false}]"/></div>
        <div class="monitor-stage">
          <video v-if="url" ref="preview" :src="url" class="source-video" playsinline preload="auto" @loadedmetadata="metadata" @loadeddata="renderMonitor" @seeked="renderMonitor" @timeupdate="updateTime" @play="playing=true" @pause="playing=false" @ended="playing=false" @error="error='No se pudo abrir el video. Prueba otro archivo.'"/>
          <canvas v-show="duration>0" ref="monitorCanvas" :class="{draggable:!showOriginal&&!working&&(activeTool==='layers'||activeTool==='effects'||!!anchorMode)}" aria-label="Vista previa del video editado" @pointerdown="pointerDown" @pointermove="pointerMove" @pointerup="pointerEnd" @pointercancel="pointerEnd" @lostpointercapture="pointerEnd"/>
          <div v-if="!duration" class="empty-monitor"><q-icon name="movie_creation" size="64px"/><p>Importa un video para comenzar</p><q-btn outline color="deep-orange" label="Elegir archivo" no-caps @click="activeTool='media'"/></div>
        </div>
        <div v-if="duration" class="monitor-controls"><q-btn flat round :icon="playing?'pause':'play_arrow'" :aria-label="playing?'Pausar':'Reproducir'" :disable="working" @click="togglePlayback"/><span>{{format(current)}} / {{format(duration)}}</span><q-slider dark :model-value="current" :min="0" :max="duration" :step=".01" color="deep-orange" :disable="working" @update:model-value="seekSource"/><q-btn flat round icon="fullscreen" aria-label="Ampliar monitor" @click="fullscreenMonitor"/></div>
        <div class="monitor-footer"><span>{{showOriginal?'Original sin efectos':'Vista previa visual en directo'}}</span><span v-if="duration">{{formatMode==='original'?'Original':formatMode==='wide'?'16:9':formatMode==='vertical'?'9:16':'1:1'}} · {{height}}p</span></div>
        <p v-if="duration" class="note monitor-note">El monitor muestra el fragmento actual con los efectos. El montaje completo y la música mezclada se comprueban al exportar.</p>
      </section>
    </div>
    <section v-if="duration>0" class="timeline-dock">
      <div class="dock-top"><strong>Línea de tiempo</strong><div class="options"><q-btn flat dense color="deep-orange" icon="content_cut" label="Recorte" no-caps @click="activeTool='trim'"/><q-btn flat dense icon="add" label="Añadir selección" no-caps :disable="working||clips.length>=12||end-start<.5||queuedDuration+end-start>300" @click="addClip"/><q-btn flat dense icon="call_split" label="Dividir" no-caps :disable="working||current-start<.5||end-current<.5||clips.length>10||queuedDuration+end-start>300" @click="splitClip"/></div></div>
      <div class="dock-scroll">        <div class="timeline-head"><strong>Fragmento seleccionado</strong><span>{{format(end-start)}} de {{format(duration)}}</span></div>
        <div class="timeline" @click="seekTimeline"><div class="selected" :style="{left:(start/duration*100)+'%',width:((end-start)/duration*100)+'%'}"/><div class="cursor" :style="{left:(current/duration*100)+'%'}"/></div>
        <q-range dark color="deep-orange" :model-value="{min:start,max:end}" :min="0" :max="duration" :step=".1" :disable="working" @update:model-value="changeRange"/>
          <div class="track-board" v-if="totalDuration>0">
            <div class="timeline-head"><strong>Vista de pistas</strong><span>{{format(totalDuration)}}</span></div>
            <div class="track"><span>Video</span><div class="track-lane video-lane"><button v-for="(block,i) in trackClips" :key="i" type="button" class="track-video" :style="{flex:block.length}" :title="'Ir al fragmento '+(i+1)+' · '+format(block.length)" :disabled="working" @click="jumpClip(i)">{{i+1}}</button></div></div>
            <div class="track"><span>Audio original</span><div class="track-lane"><div v-if="!silent" class="track-audio" :style="{width:'100%'}">Audio · {{Math.round(volume*100)}}%</div></div></div>
            <div class="track"><span>Música</span><div class="track-lane"><div v-if="musicFile" class="track-music" :style="{width:'100%'}">Música · {{Math.round(musicVolume*100)}}%</div></div></div>
            <div class="track"><span>Textos</span><div class="track-lane"><div v-if="overlayTitle||logoFile" class="track-text" :style="{width:'100%'}">{{overlayTitle?'Título':''}}{{overlayTitle&&logoFile?' + ':''}}{{logoFile?'Marca':''}}</div></div></div>
            <div v-for="(layer,i) in layers" :key="layer.id" class="track"><span :title="layer.name">Capa {{i+1}}</span><div class="track-lane"><button v-if="layer.start<totalDuration" class="track-overlay" :class="{selected:selectedLayerId===layer.id}" :style="{left:(layer.start/totalDuration*100)+'%',width:((Math.min(layer.end,totalDuration)-layer.start)/totalDuration*100)+'%'}" :title="layer.name" :disabled="working" @click="selectLayer(layer.id);seekLayer(layer)">{{layer.name}}</button><span v-for="key in (layer.keyframes||[]).filter(k=>k.time<=totalDuration)" :key="key.time" class="track-key" :style="{left:(key.time/totalDuration*100)+'%'}" :title="'Fotograma '+format(key.time)">◆</span></div></div>
            <div v-if="effects.pip.enabled" class="track"><span>Video 2</span><div class="track-lane"><button v-if="effects.pip.start<totalDuration" class="track-overlay" :style="{left:(effects.pip.start/totalDuration*100)+'%',width:(Math.max(0,Math.min(effects.pip.end,effects.pip.start+(secondaryDuration||300),totalDuration)-effects.pip.start)/totalDuration*100)+'%',background:'#496693'}" :disabled="working" @click="activeTool='effects';seekOutput(effects.pip.start+.03)">{{secondaryName||'Video superpuesto'}}</button></div></div>
            <div v-if="effects.blur.enabled" class="track"><span>Desenfoque</span><div class="track-lane"><button v-if="effects.blur.start<totalDuration" class="track-overlay" :style="{left:(effects.blur.start/totalDuration*100)+'%',width:(Math.max(0,Math.min(effects.blur.end,totalDuration)-effects.blur.start)/totalDuration*100)+'%',background:'#575a68'}" :disabled="working" @click="activeTool='effects';seekOutput(effects.blur.start+.03)">Zona</button></div></div>
            <div class="track"><span>Subtítulos</span><div class="track-lane caption-lane"><div v-for="(cue,i) in trackCues" :key="i" class="track-caption" :style="{left:(cue.start/totalDuration*100)+'%',width:((cue.end-cue.start)/totalDuration*100)+'%'}" :title="cue.text">{{i+1}}</div><div v-if="!captions&&subtitle" class="track-caption" style="width:100%">Fijo</div></div></div>
            <p class="note">Representación de las pistas de salida. Edita sus ajustes en los controles correspondientes.</p>
          </div>
</div>
    </section>
    <div v-if="working||result" class="export-tray">      <div v-if="working" class="progress"><q-linear-progress :value="progress" color="deep-orange" :indeterminate="stage==='Descargando original'"/><div class="progress-label"><span>{{stage}} · {{Math.round(progress*100)}}%</span><q-btn flat color="deep-orange" label="Cancelar" no-caps @click="cancel"/></div></div>
      <div v-if="result" class="result"><div class="timeline-head"><h3>Resultado de la edición</h3><q-btn flat round dense icon="close" aria-label="Cerrar resultado" @click="clearResult"/></div><video :src="resultUrl" controls playsinline preload="metadata"/><p>{{result.type}} · {{(result.size/1048576).toFixed(2)}} MiB. Revisa la reproducción y el audio antes de guardar.</p><div class="options"><q-btn outline color="deep-orange" icon="download" label="Descargar copia" no-caps :disable="working" @click="download"/><q-btn unelevated color="deep-orange" icon="save" label="Usar como nuevo borrador" no-caps :disable="working" @click="useResult"/></div><p class="note">El resultado se enviará al formulario de nueva publicación. No se subirá hasta que pulses Guardar borrador.</p></div>
</div>
    <q-dialog v-model="montageOpen" maximized persistent><SensacionesMontage v-if="montageOpen" :initial-file="source" :max-bytes="maxBytes" @close="montageOpen=false" @edit="editMontage" @result="saveMontageResult"/></q-dialog>
  </q-card>
</template>
<script setup>
import {ref,computed,onMounted,onBeforeUnmount,watch,nextTick} from 'vue'
import SensacionesMontage from './SensacionesMontage.vue'
import {drawComposition,outputSize,hitLayer,drawLayerSelection,layerActive,syncSecondary} from '../services/sensacionesComposition'
import {mediaUrl} from '../services/sensacionesMedia'
import {canTrim,renderTrim} from '../services/sensacionesTrim'
import {speedValues,parseSrt,projectSettings,cleanLayers,projectFileLimit,layerTransform,animatedLayer,snapPosition,cleanEffects} from '../services/sensacionesProject'
const props=defineProps({item:Object,initialFile:Object,maxBytes:{type:Number,default:262144000}})
const emit=defineEmits(['close','result'])
const supported=canTrim(),montageOpen=ref(false)
function openMontage(){if(working.value)return;stopSelection();secondaryNode?.pause();montageOpen.value=true}
function editMontage(file){if(!file||working.value)return;if(source.value&&!window.confirm('¿Usar el montaje generado como nuevo video de origen? Se reemplazarán el origen y los recortes actuales; los demás ajustes se conservarán.'))return;montageOpen.value=false;selectLocal(file)}
function saveMontageResult(file){if(!file||working.value)return;emit('result',file)}
const localFile=ref(null),source=ref(null),url=ref(''),preview=ref(null),duration=ref(0),start=ref(0),end=ref(0),current=ref(0),height=ref(720),silent=ref(false),volume=ref(1)
const working=ref(false),progress=ref(0),stage=ref(''),error=ref(''),result=ref(null),resultUrl=ref('')
const inspector=ref(null),activeTool=ref('media'),showOriginal=ref(false),monitorCanvas=ref(null),playing=ref(false),hue=ref(0)
const tools=[{id:'media',label:'Archivos',icon:'folder_open'},{id:'trim',label:'Recortar',icon:'content_cut'},{id:'color',label:'Color y formato',icon:'palette'},{id:'text',label:'Textos y marca',icon:'title'},{id:'layers',label:'Stickers y capas',icon:'layers'},{id:'effects',label:'Composición',icon:'auto_fix_high'},{id:'audio',label:'Audio',icon:'graphic_eq'},{id:'project',label:'Proyecto',icon:'settings'}]
const clips=ref([]),transition=ref('cut'),formatMode=ref('original'),fit=ref('contain'),filter=ref('normal'),brightness=ref(1),contrast=ref(1),saturation=ref(1)
const overlayTitle=ref(''),subtitle=ref(''),logoFile=ref(null),logoOpacity=ref(.8),musicFile=ref(null),musicVolume=ref(.25)
const movingEffect=ref('pip'),effects=ref(cleanEffects()),secondaryFile=ref(null),secondaryReady=ref(false),secondaryDuration=ref(0),secondaryName=ref('')
let secondaryNode=null,secondaryUrl='',secondaryRevision=0
const maskOptions=[{label:'Rectangular',value:'rectangle'},{label:'Circular / ovalada',value:'circle'}]
const keyOptions=[{label:'Sin recorte de color',value:'none'},{label:'Eliminar verde',value:'green'},{label:'Eliminar azul',value:'blue'}]
const pipFields=[{key:'x',label:'Posición horizontal',min:0,max:1,step:.01},{key:'y',label:'Posición vertical',min:0,max:1,step:.01},{key:'size',label:'Tamaño',min:.1,max:1,step:.01},{key:'opacity',label:'Opacidad',min:0,max:1,step:.01}]
const blurFields=[{key:'x',label:'Posición horizontal',min:0,max:1,step:.01},{key:'y',label:'Posición vertical',min:0,max:1,step:.01},{key:'width',label:'Ancho',min:.05,max:1,step:.01},{key:'height',label:'Alto',min:.05,max:1,step:.01}]
function releaseSecondary(){
  ++secondaryRevision
  if(secondaryNode){secondaryNode.pause();secondaryNode.removeAttribute('src');secondaryNode.load();secondaryNode=null}
  if(secondaryUrl)URL.revokeObjectURL(secondaryUrl)
  secondaryUrl='';secondaryReady.value=false;secondaryDuration.value=0;secondaryFile.value=null
}
function loadSecondary(file){
  if(working.value)return
  if(!file){releaseSecondary();effects.value.pip.enabled=false;secondaryName.value='';clearResult();renderMonitor();return}
  if(file.size>262144000||!['video/mp4','video/webm'].includes(file.type)){error.value='Selecciona un video MP4 o WebM de hasta 250 MiB.';return}
  if(secondaryName.value&&secondaryName.value!==file.name&&!window.confirm('¿Sustituir el segundo video? Se conservarán los ajustes de la pista.'))return
  releaseSecondary()
  const rev=secondaryRevision,v=document.createElement('video');secondaryNode=v
  secondaryUrl=URL.createObjectURL(file);secondaryFile.value=file;secondaryName.value=file.name
  v.preload='auto';v.muted=true;v.playsInline=true
  v.addEventListener('loadeddata',()=>{
    if(disposed||rev!==secondaryRevision)return
    if(!Number.isFinite(v.duration)||!v.videoWidth){error.value='No se pudo abrir el segundo video.';return}
    secondaryReady.value=true;secondaryDuration.value=v.duration;effects.value.pip.enabled=true
    if(effects.value.pip.end===300)effects.value.pip.end=Math.min(300,Math.max(effects.value.pip.start+.01,Math.min(totalDuration.value,effects.value.pip.start+v.duration)))
    renderMonitor()
  })
  v.addEventListener('seeked',()=>{if(!disposed&&rev===secondaryRevision)renderMonitor()})
  v.addEventListener('error',()=>{if(!disposed&&rev===secondaryRevision){secondaryReady.value=false;error.value='El navegador no pudo decodificar el segundo video.'}})
  v.src=secondaryUrl
}
function effectTime(type,key,value){
  if(value===''||value===null)return
  const n=Number(value),e=effects.value[type];if(!Number.isFinite(n))return
  e[key]=key==='start'?Math.max(0,Math.min(e.end-.01,n)):Math.min(300,Math.max(e.start+.01,n))
}
function resetEffects(){releaseSecondary();secondaryName.value='';effects.value=cleanEffects()}
const layers=ref([]),selectedLayerId=ref(null),anchorMode=ref(null)
const activeKeyTime=ref(null),outputClock=ref(0),snapEnabled=ref(true),guides=ref({x:null,y:null})
const layerImages=new Map()
const selectedLayer=computed(()=>layers.value.find(l=>l.id===selectedLayerId.value))
const motionOptions=[{label:'Sin animación',value:'none'},{label:'Fundido',value:'fade'},{label:'Deslizar',value:'slide'},{label:'Zoom',value:'zoom'}]
const resources=[{id:'arrow',label:'Flecha',icon:'arrow_forward'},{id:'circle',label:'Círculo',icon:'radio_button_unchecked'},{id:'frame',label:'Marco',icon:'crop_free'},{id:'brand',label:'Sensaciones',icon:'movie_creation'},{id:'spark',label:'Destello',icon:'auto_awesome'},{id:'label',label:'Rótulo',icon:'label'}]
const transformTarget=computed(()=>{const l=selectedLayer.value;if(!l)return {};return l.keyframes?.find(k=>k.time===activeKeyTime.value)||layerTransform(l,outputClock.value)})
const canEditTransform=computed(()=>!!selectedLayer.value&&(!selectedLayer.value.keyframes?.length||activeKeyTime.value!==null))
const canAddKey=computed(()=>{const l=selectedLayer.value;return !!l&&outputClock.value>=l.start&&outputClock.value<l.end&&outputClock.value<300&&((l.keyframes?.length||0)<24||l.keyframes?.some(k=>k.time===keyTime(outputClock.value)))})
function keyTime(t){return Math.round(Math.max(0,Math.min(300,t))*1000)/1000}
function seekOutput(t){
  const sequence=clips.value.length?clips.value:[{start:start.value,end:end.value}]
  let remaining=Math.max(0,Math.min(totalDuration.value,t))*speed.value
  for(let i=0;i<sequence.length;i++){const clip=sequence[i],len=clip.end-clip.start
    if(remaining<len||i===sequence.length-1){stopSelection();seekSource(clip.start+Math.min(len,remaining));clipHint=i;return}
    remaining-=len
  }
}
function ensureKey(l,t){
  if(!l.keyframes)l.keyframes=[]
  const time=keyTime(t),existing=l.keyframes.find(k=>k.time===time)
  if(existing){activeKeyTime.value=time;return existing}
  if(l.keyframes.length>=24){error.value='Máximo 24 fotogramas clave por capa.';return null}
  const pose=layerTransform(l,time)
  if(!l.keyframes.length&&time>keyTime(l.start)+.001)l.keyframes.push({time:keyTime(l.start),...pose})
  if(l.keyframes.length>=24)return null
  l.keyframes.push({time,...pose});l.keyframes.sort((a,b)=>a.time-b.time);activeKeyTime.value=time
  return l.keyframes.find(k=>k.time===time)
}
function addKeyframe(){if(!working.value&&canAddKey.value)ensureKey(selectedLayer.value,outputClock.value)}
function selectKeyframe(time){if(working.value)return;activeKeyTime.value=time;seekOutput(time)}
function removeKeyframe(){
  const l=selectedLayer.value;if(working.value||!l||activeKeyTime.value===null)return
  const pose=layerTransform(l,activeKeyTime.value)
  l.keyframes=l.keyframes.filter(k=>k.time!==activeKeyTime.value);if(!l.keyframes.length)Object.assign(l,pose)
  activeKeyTime.value=null
}
function setTransform(key,value){
  const l=selectedLayer.value;if(working.value||!l||!Number.isFinite(value))return
  const target=l.keyframes?.length?l.keyframes.find(k=>k.time===activeKeyTime.value):l
  if(target){target[key]=value;if(target!==l)seekOutput(target.time)}
}
async function addResource(id){
  if(working.value||layers.value.length>=12||imageCount.value>=8)return
  const c=document.createElement('canvas');c.width=512;c.height=512;const ctx=c.getContext('2d')
  ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle='#ff681e';ctx.fillStyle='#ff681e';ctx.lineWidth=25
  if(id==='arrow'){ctx.beginPath();ctx.moveTo(75,256);ctx.lineTo(426,256);ctx.lineTo(300,130);ctx.moveTo(426,256);ctx.lineTo(300,382);ctx.stroke()}
  else if(id==='circle'){ctx.beginPath();ctx.arc(256,256,188,0,Math.PI*2);ctx.stroke()}
  else if(id==='frame'){for(const [x,y,sx,sy] of [[55,55,1,1],[457,55,-1,1],[55,457,1,-1],[457,457,-1,-1]]){ctx.beginPath();ctx.moveTo(x+sx*120,y);ctx.lineTo(x,y);ctx.lineTo(x,y+sy*120);ctx.stroke()}}
  else if(id==='spark'){ctx.beginPath();ctx.moveTo(256,25);ctx.quadraticCurveTo(273,232,487,256);ctx.quadraticCurveTo(273,276,256,487);ctx.quadraticCurveTo(236,276,25,256);ctx.quadraticCurveTo(236,232,256,25);ctx.fill()}
  else if(id==='brand'){ctx.fillRect(52,180,408,150);ctx.fillStyle='#111116';ctx.font='bold 44px sans-serif';ctx.textAlign='center';ctx.fillText('SENSACIONES',256,245,370);ctx.font='24px sans-serif';ctx.fillText('AUDIOVISUALES',256,287,370)}
  else if(id==='label'){ctx.fillRect(55,210,402,92);ctx.fillStyle='#111116';ctx.fillRect(69,225,374,62)}
  else return
  const blob=await new Promise(resolve=>c.toBlob(resolve,'image/png'));if(blob)await addImageLayer(new File([blob],id+'.png',{type:'image/png'}))
}
const imageCount=computed(()=>layers.value.filter(l=>l.type==='image').length)
const titleX=ref(.5),titleY=ref(.16),titleSize=ref(.05),captionX=ref(.5),captionY=ref(.84),captionSize=ref(.04)
const anchorFields=[{label:'Título X',value:titleX,min:0,max:1},{label:'Título Y',value:titleY,min:0,max:1},{label:'Tamaño título',value:titleSize,min:.02,max:.3},{label:'Subtítulos X',value:captionX,min:0,max:1},{label:'Subtítulos Y',value:captionY,min:0,max:1},{label:'Tamaño subtítulos',value:captionSize,min:.02,max:.3}]
const layerFields=[{key:'x',label:'Posición X',min:0,max:1,step:.01,display:100,unit:'%'},{key:'y',label:'Posición Y',min:0,max:1,step:.01,display:100,unit:'%'},{key:'size',label:'Tamaño',min:.02,max:1,step:.01,display:100,unit:'%'},{key:'rotation',label:'Rotación',min:-180,max:180,step:1,display:1,unit:'°'},{key:'opacity',label:'Opacidad',min:0,max:1,step:.01,display:100,unit:'%'}]
const layerId=()=>crypto.randomUUID()
function selectLayer(id){if(selectedLayerId.value!==id)activeKeyTime.value=null;selectedLayerId.value=id;anchorMode.value=null;activeTool.value='layers';showOriginal.value=false;renderMonitor()}
function seekLayer(layer){if(!layer||layer.start>=totalDuration.value)return;seekOutput(Math.min(layer.start+.05,(layer.start+Math.min(layer.end,totalDuration.value))/2))}
function selectAnchor(mode){anchorMode.value=mode;selectedLayerId.value=null;showOriginal.value=false;renderMonitor()}
function baseLayer(type,name){return {id:layerId(),type,name,x:.5,y:.5,size:type==='image'?.25:.08,rotation:0,opacity:1,start:0,end:Math.max(.01,Math.min(300,totalDuration.value)),enter:'none',exit:'none',animationSeconds:.5,keyframes:[]}}
function addTextLayer(text){if(working.value||layers.value.length>=12)return;const layer={...baseLayer('text','Texto libre'),text,color:'#ffffff',font:'sans-serif',background:false,bold:true,outline:true};layers.value.push(layer);selectLayer(layer.id)}
function imageData(file){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(new Error('No se pudo leer la imagen.'));reader.readAsDataURL(file)})}
async function decodeLayer(data){
  const [header,payload]=data.split(','),type=header.slice(5,-7)
  const bytes=Uint8Array.from(atob(payload),c=>c.charCodeAt(0))
  const bitmap=await createImageBitmap(new Blob([bytes],{type}))
  if(!bitmap.width||!bitmap.height||bitmap.width*bitmap.height>4000000){bitmap.close();throw new Error('Imagen de capa demasiado grande: máximo 4 megapíxeles.')}
  return bitmap
}
async function addImageLayer(file){
  if(!file||working.value||layers.value.length>=12||imageCount.value>=8)return
  working.value=true;stage.value='Preparando imagen';progress.value=0
  let bitmap
  try{
    if(file.size>1048576||!['image/png','image/jpeg','image/webp'].includes(file.type))throw new Error('Selecciona PNG, JPG o WebP de hasta 1 MiB.')
    const layer=cleanLayers([{...baseLayer('image',file.name.slice(0,80)),data:await imageData(file)}])[0]
    bitmap=await decodeLayer(layer.data)
    if(disposed){bitmap.close();return}
    layerImages.set(layer.id,bitmap);layers.value.push(layer);selectLayer(layer.id);error.value=''
  }catch(e){error.value=e.message||'No se pudo abrir la imagen.'}
  finally{working.value=false}
}
function moveLayer(delta){if(working.value)return;const i=layers.value.findIndex(l=>l.id===selectedLayerId.value),j=i+delta;if(i<0||j<0||j>=layers.value.length)return;const next=[...layers.value];[next[i],next[j]]=[next[j],next[i]];layers.value=next}
function removeLayer(){if(working.value||!selectedLayer.value)return;const id=selectedLayerId.value,bitmap=layerImages.get(id);layers.value=layers.value.filter(l=>l.id!==id);layerImages.delete(id);if(bitmap&&![...layerImages.values()].includes(bitmap))bitmap.close();selectedLayerId.value=null;activeKeyTime.value=null}
function duplicateLayer(){if(working.value||!selectedLayer.value||layers.value.length>=12||(selectedLayer.value.type==='image'&&imageCount.value>=8))return;const layer={...selectedLayer.value,keyframes:(selectedLayer.value.keyframes||[]).map(k=>({...k,x:Math.min(1,k.x+.04),y:Math.min(1,k.y+.04)})),id:layerId(),name:(selectedLayer.value.name+' copia').slice(0,80),x:Math.min(1,selectedLayer.value.x+.04),y:Math.min(1,selectedLayer.value.y+.04)};if(layer.type==='image')layerImages.set(layer.id,layerImages.get(selectedLayerId.value));layers.value.push(layer);selectLayer(layer.id)}
function setLayerTime(key,value){if(value===''||value===null||!selectedLayer.value)return;const n=Number(value);if(!Number.isFinite(n))return;const l=selectedLayer.value;l[key]=key==='start'?Math.max(0,Math.min(l.end-.01,n)):Math.min(300,Math.max(l.start+.01,n))}
function clearLayers(){for(const bitmap of new Set(layerImages.values()))bitmap?.close();layerImages.clear();layers.value=[];selectedLayerId.value=null;activeKeyTime.value=null;anchorMode.value=null}
function layerOptions(){return {titleX:titleX.value,titleY:titleY.value,titleSize:titleSize.value,captionX:captionX.value,captionY:captionY.value,captionSize:captionSize.value,layers:layers.value,layerImages,effects:effects.value,secondaryVideo:secondaryReady.value?secondaryNode:null}}
const colorControls=[{label:'Brillo',value:brightness,min:.5,max:1.5},{label:'Contraste',value:contrast,min:.5,max:1.5},{label:'Saturación',value:saturation,min:0,max:2}]
const queuedDuration=computed(()=>clips.value.reduce((sum,clip)=>sum+clip.end-clip.start,0))
const speed=ref(1),titleAnimation=ref('none'),captions=ref('')
const speedOptions=speedValues.map(value=>({label:value+'×',value}))
const sampleSrt='1\n00:00:00,000 --> 00:00:01,000\nMi primer subtítulo'
const totalDuration=computed(()=>(clips.value.length?queuedDuration.value:end.value-start.value)/speed.value)
async function loadCaptions(file){if(!file)return;try{const raw=await file.text();parseSrt(raw);captions.value=raw;error.value=''}catch(e){error.value=e.message}}
const captionsChecked=ref('')
function checkCaptions(){const cues=parseCues();captionsChecked.value=cues?cues.length+' subtítulos válidos.':'';if(cues)error.value=''}
function parseCues(){try{const cues=parseSrt(captions.value);if(cues.some(c=>c.end>totalDuration.value+.02))throw new Error('Hay subtítulos fuera de la duración final.');return cues}catch(e){error.value=e.message;return null}}
const trackClips=computed(()=>(clips.value.length?clips.value:[{start:start.value,end:end.value}]).map(c=>({length:(c.end-c.start)/speed.value})))
const trackCues=computed(()=>{try{return parseSrt(captions.value).filter(c=>c.end<=totalDuration.value+.02)}catch{return []}})
watch([captions,totalDuration],()=>{captionsChecked.value=''})
const projectRefs={speed,captions,height,silent,volume,transition,formatMode,fit,filter,brightness,contrast,saturation,hue,overlayTitle,subtitle,titleAnimation,logoOpacity,musicVolume,titleX,titleY,titleSize,captionX,captionY,captionSize}
function saveProject(){
  try{
    const settings={selection:{start:start.value,end:end.value},clips:clips.value,layers:layers.value,effects:effects.value,...Object.fromEntries(Object.entries(projectRefs).map(([k,v])=>[k,v.value]))}
    const project={format:'sensaciones-video-lab-v1',source:{name:source.value.name,size:source.value.size,duration:duration.value},settings,attachments:{music:musicFile.value?.name||null,logo:logoFile.value?.name||null,secondary:secondaryName.value||null}}
    projectSettings(project)
    const objectUrl=URL.createObjectURL(new Blob([JSON.stringify(project,null,2)],{type:'application/json'})),a=document.createElement('a')
    a.href=objectUrl;a.download='sensaciones-proyecto.json';a.click();setTimeout(()=>URL.revokeObjectURL(objectUrl),1000);error.value=''
  }catch(e){error.value=e.message||'No se pudo guardar el proyecto.'}
}
async function openProject(file){
  if(!file||working.value)return
  working.value=true;stage.value='Abriendo proyecto';progress.value=0
  const restored=new Map();let adopted=false
  try{
    if(file.size>projectFileLimit)throw new Error('Proyecto demasiado grande.')
    const raw=JSON.parse(await file.text()),s=projectSettings(raw)
    if(!source.value||raw.source.name!==source.value.name||raw.source.size!==source.value.size||Math.abs(raw.source.duration-duration.value)>.1)throw new Error('Selecciona el mismo archivo original antes de abrir este proyecto.')
    if(!window.confirm('¿Restaurar los ajustes del proyecto? Se sustituirán los ajustes actuales y deberás volver a seleccionar el audio, el logotipo y el segundo video.'))return
    for(const layer of s.layers)if(layer.type==='image')restored.set(layer.id,await decodeLayer(layer.data))
    if(disposed)return
    clearLayers();for(const [id,bitmap] of restored)layerImages.set(id,bitmap);layers.value=s.layers;adopted=true
    stopSelection();start.value=Math.min(duration.value,s.selection.start);end.value=Math.min(duration.value,s.selection.end);clips.value=s.clips.map(c=>({start:c.start,end:Math.min(duration.value,c.end)}))
    for(const [k,v] of Object.entries(projectRefs))v.value=s[k]
    musicFile.value=null;logoFile.value=null;releaseSecondary();effects.value=s.effects;secondaryName.value=typeof raw.attachments?.secondary==='string'?raw.attachments.secondary.slice(0,255):'';clearResult()
    if(preview.value)preview.value.currentTime=start.value
    error.value='';if(raw.attachments?.music||raw.attachments?.logo||raw.attachments?.secondary||s.effects.pip.enabled)error.value='Proyecto restaurado. Vuelve a adjuntar los archivos de música, logotipo y segundo video que utilizaste.'
  }catch(e){error.value=e.message||'No se pudo abrir el proyecto.'}
  finally{if(!adopted)for(const bitmap of restored.values())bitmap.close();working.value=false}
}
function addClip(){if(clips.value.length<12&&end.value-start.value>=.5&&queuedDuration.value+end.value-start.value<=300)clips.value=[...clips.value,{start:start.value,end:end.value}]}
function splitClip(){if(clips.value.length<=10&&current.value-start.value>=.5&&end.value-current.value>=.5&&queuedDuration.value+end.value-start.value<=300)clips.value=[...clips.value,{start:start.value,end:current.value},{start:current.value,end:end.value}]}
function moveClip(i,delta){const next=[...clips.value];if(i+delta<0||i+delta>=next.length)return;[next[i],next[i+delta]]=[next[i+delta],next[i]];clips.value=next}
function removeClip(i){clips.value=clips.value.filter((_,j)=>j!==i)}
function resetColor(){brightness.value=1;contrast.value=1;saturation.value=1;hue.value=0;filter.value='normal'}
let controller=null,selectionPlaying=false
function clearResult(){if(resultUrl.value)URL.revokeObjectURL(resultUrl.value);resultUrl.value='';result.value=null}
function setSource(file){selectionPlaying=false;preview.value?.pause();if(url.value)URL.revokeObjectURL(url.value);clearResult();source.value=file;clips.value=[];duration.value=0;start.value=0;end.value=0;current.value=0;playing.value=false;url.value=file?URL.createObjectURL(file):''}
function selectLocal(file){error.value='';localFile.value=file;setSource(file)}
function metadata(){const d=preview.value?.duration;if(!Number.isFinite(d)||d<=0){error.value='No se pudo determinar la duración del video. Prueba el archivo original.';return}duration.value=d;start.value=0;end.value=d;current.value=0;activeTool.value='trim';nextTick(()=>{syncAudio();renderMonitor()})}
function format(n){const s=Math.round(Math.max(0,n)*10)/10;return Math.floor(s/60)+':'+(s%60).toFixed(1).padStart(4,'0')}
function stopSelection(){selectionPlaying=false;preview.value?.pause()}
function setStart(n){if(!Number.isFinite(n))return;stopSelection();start.value=Math.min(Math.max(0,n),Math.max(0,end.value-.5));if(preview.value)preview.value.currentTime=start.value;clearResult()}
function setEnd(n){if(!Number.isFinite(n))return;stopSelection();end.value=Math.min(duration.value,Math.max(start.value+.5,n));if(preview.value)preview.value.currentTime=end.value;clearResult()}
function changeRange(r){stopSelection();if(r.max-r.min<.5)return;const movedStart=Math.abs(r.min-start.value)>.001;start.value=r.min;end.value=r.max;if(preview.value)preview.value.currentTime=movedStart?r.min:r.max;clearResult()}
function reset(){stopSelection();start.value=0;end.value=duration.value;if(preview.value)preview.value.currentTime=0;clearResult()}
function updateTime(){if(!preview.value)return;current.value=preview.value.currentTime;if(selectionPlaying&&current.value>=end.value){stopSelection();preview.value.currentTime=end.value}}
async function playSelection(){if(!preview.value)return;preview.value.currentTime=start.value;preview.value.playbackRate=speed.value;selectionPlaying=true;try{await preview.value.play()}catch{selectionPlaying=false;error.value='No se pudo reproducir la selección.'}}
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
  if(effects.value.pip.enabled&&!secondaryReady.value){error.value='Selecciona un segundo video válido antes de exportar.';activeTool.value='effects';return}
  secondaryNode?.pause()
  if(working.value||!source.value)return
  const cues=parseCues();if(!cues)return
  stopSelection();clearResult();error.value='';working.value=true;progress.value=0;stage.value='Exportando edición';controller=new AbortController()
  try{const output=await renderTrim({source:source.value,start:start.value,end:end.value,segments:clips.value.length?clips.value:undefined,speed:speed.value,options:{...layerOptions(),effects:cleanEffects(effects.value),secondaryVideo:null,layers:cleanLayers(layers.value),cues,titleAnimation:titleAnimation.value,format:formatMode.value,fit:fit.value,filter:filter.value,brightness:brightness.value,contrast:contrast.value,saturation:saturation.value,hue:hue.value,title:overlayTitle.value,subtitle:subtitle.value,logoOpacity:logoOpacity.value,transition:transition.value},secondaryFile:effects.value.pip.enabled?secondaryFile.value:null,logoFile:logoFile.value,musicFile:musicFile.value,musicVolume:musicVolume.value,maxHeight:height.value,silent:silent.value,volume:volume.value,maxBytes:props.maxBytes,signal:controller.signal,onProgress:v=>progress.value=v});result.value=output;resultUrl.value=URL.createObjectURL(output)}
  catch(e){error.value=e.message||'No se pudo exportar el video.'}
  finally{working.value=false;controller=null}
}
function download(){if(!result.value)return;const a=document.createElement('a');a.href=resultUrl.value;a.download=result.value.name;a.click()}
function useResult(){if(result.value)emit('result',result.value)}
onMounted(()=>{if(props.initialFile)selectLocal(props.initialFile)})
watch([speed,titleAnimation,captions,height,silent,volume,clips,transition,formatMode,fit,filter,brightness,contrast,saturation,hue,overlayTitle,subtitle,logoFile,logoOpacity,musicFile,musicVolume],clearResult)
let monitorTime=0,clipHint=null,drag=null,monitorFrame=0,monitorLogo=null,logoRevision=0,disposed=false
function syncAudio(){const v=preview.value;if(v){v.muted=silent.value;v.volume=volume.value;v.playbackRate=speed.value;v.preservesPitch=true}}
function seekSource(value){if(!preview.value||!Number.isFinite(value))return;clipHint=null;selectionPlaying=false;preview.value.currentTime=Math.max(0,Math.min(duration.value,value));current.value=preview.value.currentTime}
async function togglePlayback(){const v=preview.value;if(!v)return;if(!v.paused){stopSelection();return}selectionPlaying=false;syncAudio();try{await v.play()}catch{error.value='No se pudo iniciar la reproducción.'}}
function seekTimeline(event){if(working.value)return;const rect=event.currentTarget.getBoundingClientRect();seekSource((event.clientX-rect.left)/rect.width*duration.value)}
function jumpClip(index){const clip=(clips.value.length?clips.value:[{start:start.value,end:end.value}])[index];if(clip){stopSelection();seekSource(clip.start);clipHint=index}}
watch(activeTool,()=>nextTick(()=>{if(inspector.value)inspector.value.scrollTop=0}))
function fullscreenMonitor(){const node=monitorCanvas.value?.parentElement;if(node?.requestFullscreen)node.requestFullscreen().catch(()=>{error.value='No se pudo ampliar el monitor.'})}
function renderMonitor(){
  const v=preview.value,c=monitorCanvas.value
  if(!v||!c||v.readyState<2||!v.videoWidth||!v.videoHeight)return
  const [ow,oh]=outputSize(v.videoWidth,v.videoHeight,height.value,showOriginal.value?'original':formatMode.value)
  const scale=Math.min(1,960/Math.max(ow,oh)),w=Math.max(2,Math.round(ow*scale)),h=Math.max(2,Math.round(oh*scale))
  if(c.width!==w||c.height!==h){c.width=w;c.height=h}
  const ctx=c.getContext('2d',{alpha:false});if(!ctx)return
  if(showOriginal.value){secondaryNode?.pause();drawComposition(ctx,v,{fit:'contain'});return}
  const sequence=clips.value.length?clips.value:[{start:start.value,end:end.value}]
  let offset=0,at=Math.max(0,(v.currentTime-start.value)/speed.value),fade=0
  const hinted=clipHint!==null&&sequence[clipHint]&&v.currentTime>=sequence[clipHint].start&&v.currentTime<=sequence[clipHint].end?clipHint:null
  for(const [index,clip] of sequence.entries()){
    if((hinted===null||hinted===index)&&v.currentTime>=clip.start&&v.currentTime<=clip.end){
      const delta=v.currentTime-clip.start,length=clip.end-clip.start,edge=Math.min(.5,length/3)
      at=(offset+delta)/speed.value
      if(transition.value==='fade'&&edge>0)fade=1-Math.max(0,Math.min(1,delta/edge,(clip.end-v.currentTime)/edge))
      break
    }
    offset+=clip.end-clip.start
  }
  monitorTime=Math.min(totalDuration.value,at);outputClock.value=monitorTime
  syncSecondary(secondaryNode,effects.value.pip,monitorTime,playing.value&&!working.value,()=>{error.value='No se pudo reproducir el segundo video.'})
  drawComposition(ctx,v,{...layerOptions(),fit:fit.value,filter:filter.value,brightness:brightness.value,contrast:contrast.value,saturation:saturation.value,hue:hue.value,title:overlayTitle.value,subtitle:subtitle.value,cues:trackCues.value,titleAnimation:titleAnimation.value,logoOpacity:logoOpacity.value},monitorLogo,fade,monitorTime,totalDuration.value)
  if(!working.value&&activeTool.value==='layers'&&selectedLayer.value&&layerActive(selectedLayer.value,monitorTime))drawLayerSelection(ctx,animatedLayer(selectedLayer.value,monitorTime),layerImages.get(selectedLayerId.value))
  if(activeTool.value==='effects'&&!working.value){const e=effects.value[movingEffect.value];if(e.enabled){ctx.save();ctx.strokeStyle='#ff985c';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(e.x*w-10,e.y*h);ctx.lineTo(e.x*w+10,e.y*h);ctx.moveTo(e.x*w,e.y*h-10);ctx.lineTo(e.x*w,e.y*h+10);ctx.stroke();ctx.restore()}}
  if(drag&&snapEnabled.value&&!working.value){ctx.save();ctx.strokeStyle='#40d6e6';ctx.lineWidth=1.5;ctx.setLineDash([5,4]);ctx.beginPath();if(guides.value.x!==null){ctx.moveTo(guides.value.x*w,0);ctx.lineTo(guides.value.x*w,h)}if(guides.value.y!==null){ctx.moveTo(0,guides.value.y*h);ctx.lineTo(w,guides.value.y*h)}ctx.stroke();ctx.restore()}
  if(!working.value&&activeTool.value==='text'&&anchorMode.value){const x=(anchorMode.value==='title'?titleX.value:captionX.value)*w,y=(anchorMode.value==='title'?titleY.value:captionY.value)*h;ctx.save();ctx.strokeStyle='#ff985c';ctx.lineWidth=2;ctx.strokeRect(x-12,y-12,24,24);ctx.restore()}
}
function pointerPosition(event){const rect=monitorCanvas.value.getBoundingClientRect();return {x:Math.min(1,Math.max(0,(event.clientX-rect.left)/rect.width)),y:Math.min(1,Math.max(0,(event.clientY-rect.top)/rect.height))}}
function pointerDown(event){
  if(working.value||showOriginal.value||event.button!==0)return
  const canvas=monitorCanvas.value,p=pointerPosition(event)
  if(activeTool.value==='text'&&anchorMode.value){drag={pointer:event.pointerId,anchor:anchorMode.value,dx:0,dy:0};stopSelection();canvas.setPointerCapture(event.pointerId);pointerMove(event);return}
  if(activeTool.value==='effects'){const type=movingEffect.value,e=effects.value[type];if(!e.enabled)return;stopSelection();drag={pointer:event.pointerId,effect:type,dx:p.x-e.x,dy:p.y-e.y};canvas.setPointerCapture(event.pointerId);return}
  if(activeTool.value!=='layers')return
  const id=hitLayer(canvas.getContext('2d'),layers.value,layerImages,monitorTime,p.x*canvas.width,p.y*canvas.height)
  if(!id){selectedLayerId.value=null;renderMonitor();return}
  selectLayer(id);stopSelection();const l=selectedLayer.value,pose=layerTransform(l,monitorTime);const target=l.keyframes?.length?ensureKey(l,monitorTime):l;if(!target)return;drag={pointer:event.pointerId,id,dx:p.x-pose.x,dy:p.y-pose.y,keyTime:target===l?null:target.time};canvas.setPointerCapture(event.pointerId)
}
function pointerMove(event){
  if(!drag||drag.pointer!==event.pointerId||working.value)return
  const p=pointerPosition(event),sx=snapPosition(Math.max(0,Math.min(1,p.x-drag.dx)),snapEnabled.value),sy=snapPosition(Math.max(0,Math.min(1,p.y-drag.dy)),snapEnabled.value),x=sx.value,y=sy.value;guides.value={x:sx.guide,y:sy.guide}
  if(drag.effect){const e=effects.value[drag.effect];e.x=x;e.y=y}
  else if(drag.anchor){if(drag.anchor==='title'){titleX.value=x;titleY.value=y}else{captionX.value=x;captionY.value=y}}
  else{const l=layers.value.find(l=>l.id===drag.id);if(l){const target=drag.keyTime===null?l:l.keyframes?.find(k=>k.time===drag.keyTime);if(target){target.x=x;target.y=y}}}
  renderMonitor()
}
function pointerEnd(event){if(drag?.pointer===event.pointerId){drag=null;guides.value={x:null,y:null};renderMonitor()}}
watch([layers,titleX,titleY,titleSize,captionX,captionY,captionSize],()=>{clearResult();nextTick(renderMonitor)},{deep:true})
watch([selectedLayerId,activeTool,anchorMode,working,activeKeyTime],()=>nextTick(renderMonitor))
watch(movingEffect,()=>nextTick(renderMonitor))
watch(effects,()=>{clearResult();nextTick(renderMonitor)},{deep:true})
watch(playing,value=>{if(!value){secondaryNode?.pause();nextTick(renderMonitor)}})
function monitorLoop(){if(disposed)return;if(playing.value)renderMonitor();monitorFrame=requestAnimationFrame(monitorLoop)}
watch([showOriginal,height,formatMode,fit,filter,brightness,contrast,saturation,hue,overlayTitle,subtitle,trackCues,titleAnimation,logoOpacity,transition,speed,clips,start,end],()=>nextTick(renderMonitor))
watch([speed,silent,volume],syncAudio)
watch(logoFile,async file=>{const id=++logoRevision;monitorLogo?.close();monitorLogo=null;if(file){try{const bitmap=await createImageBitmap(file);if(disposed||id!==logoRevision){bitmap.close();return}if(bitmap.width*bitmap.height>16000000){bitmap.close();error.value='Logotipo demasiado grande.';return}monitorLogo=bitmap}catch{error.value='No se pudo abrir el logotipo.'}}renderMonitor()})
onMounted(()=>{monitorFrame=requestAnimationFrame(monitorLoop)})
onBeforeUnmount(()=>{disposed=true;++logoRevision;cancelAnimationFrame(monitorFrame);monitorLogo?.close();releaseSecondary();clearLayers();cancel();stopSelection();if(url.value)URL.revokeObjectURL(url.value);clearResult()})
</script>
<style scoped>
.editor{width:min(100%,980px);max-width:980px!important;background:#16161c;color:#fff;border:1px solid #ffffff20}.editor-header{display:flex;justify-content:space-between;align-items:start;gap:12px;padding:24px}.eyebrow{color:#ff9b6a;font-size:11px;font-weight:800;letter-spacing:.18em}.editor h2{font-size:30px;line-height:1.1;margin:10px 0}.editor h3{font-size:20px;line-height:1.2}.editor p{color:#bab9c0;line-height:1.6;margin:8px 0}.editor-content{display:grid;gap:14px;padding:0 24px 24px}.editor video{display:block;width:100%;max-height:52vh;background:black;border-radius:10px}.source,.timeline-head,.progress-label{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}.timeline{position:relative;height:32px;border:1px solid #45434b;background:repeating-linear-gradient(90deg,#292930 0 19px,#3a3940 19px 20px);border-radius:6px;overflow:hidden}.selected{position:absolute;top:0;bottom:0;background:#ff681e55;border:2px solid #ff681e}.cursor{position:absolute;top:0;bottom:0;width:2px;background:#fff}.controls{display:grid;grid-template-columns:1fr 1fr;gap:12px}.options{display:flex;gap:10px;align-items:center;flex-wrap:wrap}.options .q-select{min-width:200px;flex:1}.volume{display:flex;align-items:center;gap:16px}.volume .q-slider{flex:1}.note{font-size:12px}.result{background:#222229;padding:16px;border-radius:12px;display:grid;gap:12px}.progress{display:grid;gap:6px}@media(max-width:600px){.editor-header,.editor-content{padding:16px}.controls{grid-template-columns:1fr}.volume{flex-direction:column;align-items:stretch}}
.lab-panel{background:#202027;padding:18px;border:1px solid #ffffff16;border-radius:12px;display:grid;gap:12px}.lab-panel h3{margin:0;color:#ffb38b}.clip-row{display:flex;align-items:center;gap:8px;background:#292931;padding:9px;border-radius:8px;flex-wrap:wrap}.clip-row strong{flex:1}.clip-row span{font-size:12px;color:#aaa}
.track-board{display:grid;gap:8px;border:1px solid #ffffff15;border-radius:10px;background:#121217;padding:12px}.track{display:grid;grid-template-columns:105px minmax(0,1fr);gap:8px;align-items:center}.track>span{font-size:11px;color:#c4c4cb}.track-lane{position:relative;height:25px;background:#2a2a30;border-radius:4px;overflow:hidden}.video-lane{display:flex;gap:2px}.track-video,.track-audio,.track-music,.track-text,.track-caption{min-width:0;display:grid;place-items:center;overflow:hidden;white-space:nowrap;color:white;font-size:10px;border-radius:3px;height:100%}.track-video{background:#a74621}.track-audio{background:#296b60}.track-music{background:#435c95}.track-text{background:#7b4c8e}.track-caption{position:absolute;background:#8b6826}.caption-check{color:#8be8b8!important}

.pro-workspace{width:100vw!important;max-width:100vw!important;height:100dvh!important;max-height:100dvh!important;border:0;border-radius:0!important;display:flex;flex-direction:column;overflow:hidden!important;background:#101014}.pro-workspace .editor-header{padding:10px 20px;align-items:center;background:#19191f;border-bottom:1px solid #ffffff12;flex-shrink:0}.editor-brand h2{font-size:21px;margin:3px 0}.head-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.head-time{font-size:12px;color:#aaa}.tool-tabs{flex-shrink:0;display:flex;gap:4px;padding:7px 12px;border-bottom:1px solid #ffffff12;background:#19191f;overflow-x:auto}.tool-tabs button{background:transparent;color:#babac2;border:0;padding:9px 13px;border-radius:7px;display:flex;align-items:center;gap:7px;white-space:nowrap;cursor:pointer;font:inherit;font-size:13px}.tool-tabs button.active{background:#ff681e23;color:#ffac80}.editor-error{flex-shrink:0}.work-grid{flex:1;min-height:0;display:grid;grid-template-columns:minmax(270px,320px) minmax(0,1fr);overflow:hidden}.inspector{min-height:0;overflow-y:auto;background:#1b1b21;border-right:1px solid #ffffff16;padding:14px;scrollbar-color:#555 #1b1b21}.tool-panel{display:grid;gap:12px}.tool-panel>h3{margin:0 0 4px;color:#ffb38b}.inspector .lab-panel{padding:0;border:0;background:none;gap:12px}.inspector .controls{grid-template-columns:1fr}.inspector .volume{flex-direction:column;align-items:stretch;gap:0}.inspector .options{gap:6px}.inspector .options .q-btn{font-size:12px}.monitor{min-width:0;min-height:0;display:flex;flex-direction:column;padding:12px 18px;gap:7px;overflow:hidden}.monitor-head,.monitor-footer,.dock-top{display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap}.monitor-footer{color:#aaa;font-size:11px}.monitor-stage{position:relative;min-height:0;flex:1;display:flex;align-items:center;justify-content:center;background:#050506;border:1px solid #ffffff12;border-radius:8px;overflow:hidden}.monitor-stage canvas{display:block;max-width:100%;max-height:100%;width:auto;height:auto;object-fit:contain}.monitor-stage:fullscreen{background:#000}.pro-workspace .source-video{position:absolute;width:1px;height:1px;opacity:0;pointer-events:none;max-height:none}.empty-monitor{text-align:center;color:#ff985c}.monitor-controls{display:flex;align-items:center;gap:10px;font-size:12px}.monitor-controls .q-slider{flex:1;min-width:0}.monitor-note{font-size:11px;margin:0!important}.timeline-dock{flex-shrink:0;max-height:34vh;display:flex;flex-direction:column;min-height:0;border-top:1px solid #ffffff20;background:#19191f;padding:8px 16px}.dock-scroll{overflow:auto;min-height:0;padding:4px 0;scrollbar-color:#555 #19191f}.timeline-dock .track-board{margin-top:3px;padding:7px;gap:4px}.timeline-dock .track-lane{height:20px}.timeline-dock .timeline{height:19px}.timeline-dock .track-board .note{display:none}.timeline-dock .timeline-head{font-size:12px}.export-tray{position:absolute;z-index:5;right:16px;top:105px;width:min(480px,calc(100% - 32px));max-height:70vh;overflow:auto;background:#23232a;border:1px solid #ffffff25;border-radius:12px;padding:14px;box-shadow:0 12px 40px #0008}.export-tray video{max-height:34vh}.export-tray .result{padding:0}.export-tray h3{margin:0}.head-actions .q-btn{font-size:12px}@media(max-width:760px){.pro-workspace .editor-header{padding:8px}.head-time{display:none}.editor-brand h2{font-size:16px}.head-actions{gap:3px}.head-actions .q-btn{font-size:11px}.work-grid{grid-template-columns:1fr;grid-template-rows:minmax(140px,1fr) minmax(110px,.8fr)}.monitor{grid-row:1;padding:6px 10px}.inspector{grid-row:2;border-right:0;border-top:1px solid #ffffff16;padding:10px}.timeline-dock{max-height:27vh;padding:6px 10px}.monitor-note{display:none}.tool-tabs button{padding:7px 9px;font-size:11px}.dock-top .q-btn{font-size:10px}}
.timeline-dock .timeline{cursor:pointer}.track-video{border:0;cursor:pointer}.track-video:hover{background:#d3612e}.track-video:focus-visible,.tool-tabs button:focus-visible{outline:2px solid #ffb38b;outline-offset:-2px}
.track-overlay{position:absolute;height:100%;background:#8453a0;color:white;border:0;border-radius:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;cursor:pointer;font-size:10px}.track-overlay.selected{outline:2px solid #ff985c;outline-offset:-2px}.layer-list{display:grid;gap:5px}.layer-list button{display:flex;gap:8px;align-items:center;padding:10px;border:1px solid #ffffff16;border-radius:6px;background:#25252c;color:#eee;cursor:pointer;text-align:left}.layer-list button span{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.layer-list button.chosen{border-color:#ff681e;background:#ff681e20}.color-pick{display:flex;align-items:center;justify-content:space-between;color:#ddd}.monitor-stage canvas.draggable{touch-action:none;cursor:move}
.motion-panel{display:grid;gap:9px;background:#24242b;border-radius:8px;padding:10px}.motion-panel h4{font-size:13px;color:#ffb38b;margin:0;font-weight:700}.resource-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:5px;padding:8px 0}.resource-grid button,.key-list button{border:1px solid #ffffff20;background:#292930;color:#ff9b68;border-radius:6px;padding:8px;cursor:pointer}.resource-grid button{display:grid;justify-items:center;gap:5px;font-size:10px}.resource-grid button:disabled,.key-list button:disabled{opacity:.4;cursor:default}.key-list{display:grid;gap:4px;max-height:170px;overflow:auto}.key-list button{display:flex;justify-content:space-between}.key-list button.chosen{border-color:#ff681e;background:#ff681e22}
.track-key{position:absolute;top:50%;transform:translate(-50%,-50%);color:#ffd59b;font-size:10px;pointer-events:none;text-shadow:0 1px 2px #000}
</style>
