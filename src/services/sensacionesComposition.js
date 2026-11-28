// Shared canvas compositor. All inputs are local files; no remote fonts or assets.
export function outputSize(width,height,quality,format){
  const limit=quality===1080?1080:720
  if(format==='vertical')return [Math.round(limit*9/16/2)*2,limit]
  if(format==='square')return [limit,limit]
  if(format==='wide')return [Math.round(limit*16/9/2)*2,limit]
  const scale=Math.min(1,limit/height,1920/width)
  return [Math.max(2,Math.floor(width*scale/2)*2),Math.max(2,Math.floor(height*scale/2)*2)]
}
export function normalizeSegments(segments,duration){
  if(!Array.isArray(segments)||!segments.length||segments.length>12||!Number.isFinite(duration))throw new Error('Selecciona entre 1 y 12 fragmentos.')
  const result=segments.map(({start,end})=>{
    if(!Number.isFinite(start)||!Number.isFinite(end)||start<0||end>duration+.02||end-start<.5)throw new Error('Fragmento inválido. Revisa sus límites.')
    return {start,end:Math.min(duration,end)}
  })
  if(result.reduce((sum,s)=>sum+s.end-s.start,0)>300)throw new Error('La secuencia completa no puede superar 5 minutos.')
  return result
}
const bound=(n,min,max,fallback)=>Number.isFinite(Number(n))?Math.max(min,Math.min(max,Number(n))):fallback
const presets={normal:'',cinema:' contrast(1.12) saturate(0.82)',warm:' sepia(0.22) saturate(1.15)',mono:' grayscale(1)',vivid:' saturate(1.35) contrast(1.05)'}
export function drawComposition(ctx,video,options={},logo=null,fade=0){
  const w=ctx.canvas.width,h=ctx.canvas.height
  ctx.save()
  ctx.fillStyle='#000';ctx.fillRect(0,0,w,h)
  const vw=video.videoWidth,vh=video.videoHeight
  if(vw&&vh){
    const scale=options.fit==='cover'?Math.max(w/vw,h/vh):Math.min(w/vw,h/vh)
    const dw=vw*scale,dh=vh*scale
    ctx.filter='brightness('+bound(options.brightness,0.5,1.5,1)+') contrast('+bound(options.contrast,.5,1.5,1)+') saturate('+bound(options.saturation,0,2,1)+')'+(presets[options.filter]||'')
    ctx.drawImage(video,(w-dw)/2,(h-dh)/2,dw,dh)
    ctx.filter='none'
  }
  const base=Math.min(w,h)
  function textLine(value,y,size){
    if(!value?.trim())return
    ctx.font='600 '+Math.round(base*size)+'px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle'
    const words=value.trim().slice(0,180).split(/\s+/),lines=[];let line=''
    for(const word of words){const candidate=line?line+' '+word:word;if(line&&ctx.measureText(candidate).width>w*.86){lines.push(line);line=word}else line=candidate}
    if(line)lines.push(line)
    const visible=lines.slice(0,3);if(lines.length>3)visible[2]+='…'
    visible.forEach((str,i)=>{const ty=y+(i-(visible.length-1)/2)*base*size*1.3;const tw=Math.min(w*.9,ctx.measureText(str).width+base*.06)
      ctx.fillStyle='#000b';ctx.fillRect((w-tw)/2,ty-base*size*.7,tw,base*size*1.4)
      ctx.fillStyle='#fff';ctx.fillText(str,w/2,ty,w*.86)
    })
  }
  textLine(options.title,h*.16,.05);textLine(options.subtitle,h*.84,.04)
  if(logo){const scale=Math.min(w*.20/logo.width,h*.14/logo.height);const lw=logo.width*scale,lh=logo.height*scale;ctx.globalAlpha=bound(options.logoOpacity,0.1,1,.8);ctx.drawImage(logo,w-lw-base*.035,base*.035,lw,lh);ctx.globalAlpha=1}
  if(fade>0){ctx.fillStyle='rgba(0,0,0,'+bound(fade,0,1,0)+')';ctx.fillRect(0,0,w,h)}
  ctx.restore()
}
