// Browser-local editing. The original is never modified.
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
export async function renderTrim({source,start,end,maxHeight=720,silent=false,volume=1,maxBytes=262144000,signal,onProgress=()=>{}}){
  if(!canTrim())throw new Error('Usa Chrome, Edge o Brave de escritorio actualizado.')
  if(!source||!Number.isFinite(start)||!Number.isFinite(end)||start<0||end-start<.5||end-start>300)throw new Error('Selecciona un fragmento de 0,5 segundos a 5 minutos.')
  const video=document.createElement('video'),canvas=document.createElement('canvas')
  const url=URL.createObjectURL(source)
  video.preload='auto';video.playsInline=true;video.muted=silent
  let audio,stream,recorder,raf,interval,visibility,abort
  try{
    // Create audio context during the initiating click, before awaiting metadata.
    if(!silent){
      const Audio=window.AudioContext||window.webkitAudioContext
      if(!Audio)throw new Error('El navegador no permite procesar audio.')
      audio=new Audio()
      await audio.resume()
      const input=audio.createMediaElementSource(video),gain=audio.createGain(),dest=audio.createMediaStreamDestination()
      gain.gain.value=Math.max(0,Math.min(1,volume));input.connect(gain);gain.connect(dest)
      stream=dest.stream
    }
    await waitEvent(video,'loadeddata',()=>{video.src=url},signal)
    if(!Number.isFinite(video.duration)||end>video.duration+.02||!video.videoWidth)throw new Error('Duración del archivo no compatible.')
    if(Math.abs(video.currentTime-start)>.005)await waitEvent(video,'seeked',()=>{video.currentTime=start},signal)
    const scale=Math.min(1,maxHeight/video.videoHeight,1920/video.videoWidth)
    canvas.width=Math.max(2,Math.floor(video.videoWidth*scale/2)*2);canvas.height=Math.max(2,Math.floor(video.videoHeight*scale/2)*2)
    const ctx=canvas.getContext('2d',{alpha:false});ctx.drawImage(video,0,0,canvas.width,canvas.height)
    const visual=canvas.captureStream(30)
    if(stream)visual.getAudioTracks().forEach(t=>t.stop())
    const combined=new MediaStream([...visual.getVideoTracks(),...(stream?.getAudioTracks()||[])])
    stream=combined
    const mime=choices.find(t=>MediaRecorder.isTypeSupported(t))
    recorder=new MediaRecorder(combined,{mimeType:mime,videoBitsPerSecond:maxHeight===1080?4000000:2500000,audioBitsPerSecond:128000})
    const chunks=[];let bytes=0
    return await new Promise((resolve,reject)=>{
      let failure=null,finished=false,lastTime=start,lastAdvance=performance.now()
      const stop=(error=null)=>{
        if(finished)return
        finished=true;failure=error;video.pause();cancelAnimationFrame(raf);clearInterval(interval)
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
      const draw=()=>{if(finished)return;ctx.drawImage(video,0,0,canvas.width,canvas.height);raf=requestAnimationFrame(draw)}
      const tick=()=>{
        if(finished)return
        const now=performance.now()
        if(video.currentTime>lastTime+.01){lastTime=video.currentTime;lastAdvance=now}
        if(video.ended||video.currentTime>=end-.015){stop();return}
        if(now-lastAdvance>12000){stop(new Error('La reproducción se detuvo durante la exportación.'));return}
        onProgress(Math.max(0,Math.min(.99,(video.currentTime-start)/(end-start))))
      }
      if(signal?.aborted||document.hidden){reject(new Error('Edición cancelada o pestaña no visible.'));return}
      recorder.start(1000)
      draw();interval=setInterval(tick,25)
      video.play().catch(()=>stop(new Error('No se pudo iniciar la reproducción para exportar.')))
    })
  }finally{
    video.pause();cancelAnimationFrame(raf);clearInterval(interval)
    if(visibility)document.removeEventListener('visibilitychange',visibility)
    if(abort)signal?.removeEventListener('abort',abort)
    if(recorder&&recorder.state!=='inactive')recorder.stop()
    stream?.getTracks().forEach(t=>t.stop())
    if(audio)await audio.close().catch(()=>{})
    video.removeAttribute('src');video.load();URL.revokeObjectURL(url)
  }
}
