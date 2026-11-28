// Browser-local editing. The original is never modified.
import {outputSize,normalizeSegments,drawComposition,syncSecondary,secondaryTime} from './sensacionesComposition'
import {speedValues,normalizeMontage} from './sensacionesProject'
const choices=['video/mp4;codecs=avc1.42001f,mp4a.40.2','video/mp4','video/webm;codecs=vp8,opus','video/webm']
export function canTrim(){
  return typeof MediaRecorder!=='undefined' && !!HTMLCanvasElement.prototype.captureStream && choices.some(t=>MediaRecorder.isTypeSupported(t))
}
function waitEvent(node,event,action,signal){
  return new Promise((resolve,reject)=>{
    const cleanup=()=>{clearTimeout(timer);node.removeEventListener(event,ok);node.removeEventListener('error',bad);signal?.removeEventListener('abort',abort)}
    const finish=e=>{cleanup();e?reject(e):resolve()}
    const ok=()=>finish(),bad=()=>finish(new Error('El navegador no puede decodificar este video.')),abort=()=>finish(new Error('Edición cancelada.'))
    const timer=setTimeout(()=>finish(new Error('No se pudo preparar el video.')),20000)
    if(signal?.aborted){abort();return}
    node.addEventListener(event,ok,{once:true});node.addEventListener('error',bad,{once:true});signal?.addEventListener('abort',abort,{once:true})
    try{action()}catch(e){finish(e)}
  })
}
export async function renderTrim({source,start,end,segments,montage=null,speed=1,options={},secondaryFile=null,musicFile=null,musicVolume=.25,logoFile=null,maxHeight=720,silent=false,volume=1,maxBytes=262144000,signal,onProgress=()=>{}}){
  if(!canTrim())throw new Error('Usa Chrome, Edge o Brave de escritorio actualizado.')
  const assembly=montage?normalizeMontage(montage):null
  if(assembly)source=assembly[0].file
  if(!source)throw new Error('Selecciona un archivo de video.')
  if(!speedValues.includes(speed))throw new Error('Velocidad no compatible.')
  const video=document.createElement('video'),canvas=document.createElement('canvas')
  let url=URL.createObjectURL(source),activeSource=source
  video.preload='auto';video.playsInline=true;video.muted=silent&&!musicFile
  let audio,stream,recorder,raf,interval,visibility,abort,logo,music,musicUrl,secondary,secondaryUrl
  try{
    // Create audio context during the initiating click, before awaiting metadata.
    if(!silent||musicFile){
      const Audio=window.AudioContext||window.webkitAudioContext
      if(!Audio)throw new Error('El navegador no permite procesar audio.')
      audio=new Audio()
      await audio.resume()
      const input=audio.createMediaElementSource(video),gain=audio.createGain(),dest=audio.createMediaStreamDestination()
      gain.gain.value=silent?0:Math.max(0,Math.min(1,volume));input.connect(gain);gain.connect(dest)
      if(musicFile){
        music=document.createElement('audio');music.loop=true;music.preload='auto';musicUrl=URL.createObjectURL(musicFile)
        const track=audio.createMediaElementSource(music),mix=audio.createGain();mix.gain.value=Math.max(0,Math.min(1,musicVolume));track.connect(mix);mix.connect(dest)
      }
      stream=dest.stream
    }
    await waitEvent(video,'loadeddata',()=>{video.src=url},signal)
    if(!video.videoWidth)throw new Error('Video no compatible.')
    const clips=assembly||normalizeSegments(segments||[{start,end}],video.duration),total=clips.reduce((sum,c)=>sum+c.end-c.start,0)
    const seek=async time=>{if(Math.abs(video.currentTime-time)>.005)await waitEvent(video,'seeked',()=>{video.currentTime=time},signal)}
    const outputDuration=total/speed
    if(outputDuration>300||outputDuration<.5)throw new Error('La duración final debe estar entre 0,5 segundos y 5 minutos.')
    if(options.cues?.some(c=>c.end>outputDuration+.02))throw new Error('Hay subtítulos fuera de la duración final.')
    video.playbackRate=speed;video.preservesPitch=true
    async function loadClip(clip){
      if(clip.file&&clip.file!==activeSource){
        const previous=url;url=URL.createObjectURL(clip.file);activeSource=clip.file
        try{await waitEvent(video,'loadeddata',()=>{video.src=url;video.load()},signal)}finally{URL.revokeObjectURL(previous)}
        video.playbackRate=speed;video.preservesPitch=true
      }
      if(!video.videoWidth||!Number.isFinite(video.duration)||clip.end>video.duration+.02)throw new Error('La duración real de un clip no coincide con el recorte.')
      await seek(clip.start)
    }
    await loadClip(clips[0])
    if(options.effects?.pip?.enabled){
      if(!secondaryFile)throw new Error('Adjunta el segundo video antes de exportar.')
      secondary=document.createElement('video');secondary.muted=true;secondary.playsInline=true;secondary.preload='auto';secondaryUrl=URL.createObjectURL(secondaryFile)
      await waitEvent(secondary,'loadeddata',()=>{secondary.src=secondaryUrl},signal)
      if(!secondary.videoWidth||!Number.isFinite(secondary.duration))throw new Error('Segundo video no compatible.')
      options={...options,secondaryVideo:secondary}
    }
    if(logoFile){logo=await createImageBitmap(logoFile);if(!logo.width||!logo.height||logo.width*logo.height>16000000)throw new Error('Logotipo demasiado grande.')}
    if(music)await waitEvent(music,'loadeddata',()=>{music.src=musicUrl},signal)
    ;[canvas.width,canvas.height]=outputSize(video.videoWidth,video.videoHeight,maxHeight,options.format)
    const ctx=canvas.getContext('2d',{alpha:false});drawComposition(ctx,video,options,logo,options.transition==='fade'?1:0,0,outputDuration)
    const visual=canvas.captureStream(30)
    if(stream)visual.getAudioTracks().forEach(t=>t.stop())
    const combined=new MediaStream([...visual.getVideoTracks(),...(stream?.getAudioTracks()||[])])
    stream=combined
    const mime=choices.find(t=>MediaRecorder.isTypeSupported(t))
    recorder=new MediaRecorder(combined,{mimeType:mime,videoBitsPerSecond:maxHeight===1080?4000000:2500000,audioBitsPerSecond:128000})
    const chunks=[];let bytes=0
    return await new Promise((resolve,reject)=>{
      let failure=null,finished=false,index=0,elapsed=0,seeking=false,lastTime=clips[0].start,lastAdvance=performance.now()
      const stop=(error=null)=>{
        if(finished)return
        finished=true;failure=error;video.pause();music?.pause();secondary?.pause();cancelAnimationFrame(raf);clearInterval(interval)
        if(recorder.state!=='inactive')recorder.stop();else reject(error||new Error('No se pudo exportar.'))
      }
      abort=()=>stop(new Error('Edición cancelada.'))
      visibility=()=>{if(document.hidden)stop(new Error('Mantén el editor visible durante la exportación.'))}
      signal?.addEventListener('abort',abort,{once:true});document.addEventListener('visibilitychange',visibility)
      recorder.ondataavailable=e=>{if(e.data.size){bytes+=e.data.size;if(bytes>maxBytes){stop(new Error('El resultado supera el límite de carga. Reduce duración o resolución.'));return}chunks.push(e.data)}}
      recorder.onerror=()=>stop(new Error('El navegador no pudo codificar el video.'))
      recorder.onstop=()=>{
        if(failure)return reject(failure)
        if(bytes>maxBytes||!chunks.length)return reject(new Error('El resultado excede el límite o está vacío.'))
        const type=recorder.mimeType.startsWith('video/mp4')?'video/mp4':'video/webm'
        onProgress(1);resolve(new File(chunks,'sensaciones-edicion.'+(type==='video/mp4'?'mp4':'webm'),{type}))
      }
      const draw=()=>{if(finished)return
        if(!seeking){const clip=clips[index],length=clip.end-clip.start,edge=Math.min(.5,length/3),fade=options.transition==='fade'?1-Math.max(0,Math.min(1,(video.currentTime-clip.start)/edge,(clip.end-video.currentTime)/edge)):0
          const time=(elapsed+Math.max(0,video.currentTime-clip.start))/speed
          try{syncSecondary(secondary,options.effects?.pip,time,true,()=>stop(new Error('No se pudo reproducir el segundo video.')));drawComposition(ctx,video,options,logo,fade,time,outputDuration)}catch(e){stop(e);return}}
        raf=requestAnimationFrame(draw)
      }
      async function advance(){
        seeking=true;video.pause();music?.pause();secondary?.pause()
        try{
          await waitEvent(recorder,'pause',()=>recorder.pause(),signal)
          elapsed+=clips[index].end-clips[index].start;index++
          await loadClip(clips[index])
          if(finished)return
          const target=secondaryTime(secondary,options.effects?.pip,elapsed/speed)
          if(target!==null&&Math.abs(secondary.currentTime-target)>.025)await waitEvent(secondary,'seeked',()=>{secondary.currentTime=target},signal)
          lastTime=video.currentTime;lastAdvance=performance.now()
          drawComposition(ctx,video,options,logo,options.transition==='fade'?1:0,elapsed/speed,outputDuration)
          await waitEvent(recorder,'resume',()=>recorder.resume(),signal)
          if(finished)return
          await video.play();if(music)await music.play()
          seeking=false
        }catch(e){stop(e)}
      }
      const tick=()=>{
        if(finished||seeking)return
        const clip=clips[index],now=performance.now()
        if(video.currentTime>lastTime+.01){lastTime=video.currentTime;lastAdvance=now}
        if(video.ended||video.currentTime>=clip.end-.015){if(index===clips.length-1)stop();else void advance();return}
        if(now-lastAdvance>12000){stop(new Error('La reproducción se detuvo durante la exportación.'));return}
        onProgress(Math.max(0,Math.min(.99,(elapsed+Math.max(0,video.currentTime-clip.start))/total)))
      }
      if(signal?.aborted||document.hidden){reject(new Error('Edición cancelada o pestaña no visible.'));return}
      recorder.start(1000)
      draw();interval=setInterval(tick,25)
      Promise.all([video.play(),music?.play()]).catch(()=>stop(new Error('No se pudo iniciar la reproducción o la música.')))
    })
  }finally{
    video.pause();music?.pause();if(secondary){secondary.pause();secondary.removeAttribute('src');secondary.load()}if(secondaryUrl)URL.revokeObjectURL(secondaryUrl);logo?.close();if(musicUrl)URL.revokeObjectURL(musicUrl);cancelAnimationFrame(raf);clearInterval(interval)
    if(visibility)document.removeEventListener('visibilitychange',visibility)
    if(abort)signal?.removeEventListener('abort',abort)
    if(recorder&&recorder.state!=='inactive')recorder.stop()
    stream?.getTracks().forEach(t=>t.stop())
    if(audio)await audio.close().catch(()=>{})
    video.removeAttribute('src');video.load();URL.revokeObjectURL(url)
  }
}
