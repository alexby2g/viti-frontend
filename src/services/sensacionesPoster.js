// Captura local: no descarga ni envía el video para generar una portada.
export async function capturePoster(file) {
  const url=URL.createObjectURL(file)
  const video=document.createElement('video')
  video.preload='auto';video.muted=true;video.playsInline=true
  function wait(event,action){
    return new Promise((resolve,reject)=>{
      const done=(error)=>{clearTimeout(timer);video.removeEventListener(event,ok);video.removeEventListener('error',bad);error?reject(error):resolve()}
      const ok=()=>done(),bad=()=>done(new Error('No se pudo decodificar el video.'))
      const timer=setTimeout(()=>done(new Error('No se pudo capturar un fotograma.')),12000)
      video.addEventListener(event,ok,{once:true});video.addEventListener('error',bad,{once:true})
      action?.()
    })
  }
  try {
    await wait('loadeddata',()=>{video.src=url})
    const target=Number.isFinite(video.duration)?Math.min(video.duration*.15,2):0
    if(target>.01)await wait('seeked',()=>{video.currentTime=target})
    if(!video.videoWidth||!video.videoHeight)throw new Error('Video sin fotograma disponible.')
    const ratio=Math.min(1,1280/video.videoWidth,720/video.videoHeight)
    const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(video.videoWidth*ratio));canvas.height=Math.max(1,Math.round(video.videoHeight*ratio))
    canvas.getContext('2d').drawImage(video,0,0,canvas.width,canvas.height)
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.82))
    if(!blob||blob.size>1048576)throw new Error('No se pudo preparar la portada.')
    return new File([blob],'portada.jpg',{type:'image/jpeg'})
  }finally{video.removeAttribute('src');video.load();URL.revokeObjectURL(url)}
}
