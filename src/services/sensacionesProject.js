// Portable editing instructions, never media files or account credentials.
export const speedValues=[.5,.75,1,1.25,1.5,2]
const clamp=(value,min,max,fallback)=>typeof value==='number'&&Number.isFinite(value)?Math.min(max,Math.max(min,value)):fallback
const choice=(value,values,fallback)=>values.includes(value)?value:fallback
const cleanText=(value,max=180)=>typeof value==='string'?value.slice(0,max):''
function seconds(value){
  const m=/^(\d{1,2}):(\d{2}):(\d{2})[,.](\d{3})$/.exec(value)
  if(!m||+m[2]>59||+m[3]>59)throw new Error('Tiempo SRT inválido: '+value)
  return +m[1]*3600 + +m[2]*60 + +m[3] + +m[4]/1000
}
export function parseSrt(value){
  if(typeof value!=='string'||value.length>65536)throw new Error('Subtítulos demasiado grandes.')
  const raw=value.replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n').trim()
  if(!raw)return []
  const blocks=raw.split(/\n\s*\n/),cues=[]
  if(blocks.length>200)throw new Error('Máximo 200 subtítulos.')
  for(const block of blocks){
    const lines=block.split('\n')
    if(/^\d+$/.test(lines[0].trim()))lines.shift()
    const pair=/^(\S+)\s+-->\s+(\S+)$/.exec(lines.shift()?.trim()||'')
    if(!pair)throw new Error('Formato SRT inválido. Usa HH:MM:SS,mmm --> HH:MM:SS,mmm.')
    const start=seconds(pair[1]),end=seconds(pair[2]),text=lines.join(' ').replace(/<[^>]*>/g,'').trim()
    if(start<0||end<=start||end>300||!text||text.length>180)throw new Error('Cada subtítulo debe durar entre 0 y 5 minutos y contener hasta 180 caracteres.')
    cues.push({start,end,text})
  }
  cues.sort((a,b)=>a.start-b.start)
  for(let i=1;i<cues.length;i++)if(cues[i].start<cues[i-1].end)throw new Error('Los subtítulos no deben superponerse.')
  return cues
}
export function captionAt(cues,time){return cues?.find(c=>time>=c.start&&time<c.end)?.text||''}
export function titleAlpha(animation,time,duration){
  if(animation==='none')return 1
  const edge=Math.min(.65,duration/3)
  return edge>0?Math.max(0,Math.min(1,time/edge,(duration-time)/edge)):1
}
export function projectSettings(raw){
  if(!raw||raw.format!=='sensaciones-video-lab-v1'||!raw.source||!raw.settings||typeof raw.source.name!=='string'||!Number.isFinite(raw.source.size)||!Number.isFinite(raw.source.duration))throw new Error('Archivo de proyecto inválido.')
  const s=raw.settings,d=raw.source.duration
  if(d<=0||raw.source.size<=0||raw.source.size>262144000)throw new Error('Archivo de origen inválido.')
  const range=(r)=>{if(!r||!Number.isFinite(r.start)||!Number.isFinite(r.end)||r.start<0||r.end>d+.02||r.end-r.start<.5)throw new Error('Intervalo inválido.');return {start:r.start,end:Math.min(d,r.end)}}
  const selection=range(s.selection)
  if(!Array.isArray(s.clips)||s.clips.length>12)throw new Error('Secuencia inválida.')
  const clips=s.clips.map(range),speed=choice(s.speed,speedValues,1)
  const total=clips.length?clips.reduce((n,c)=>n+c.end-c.start,0):selection.end-selection.start
  if(clips.length&&total>300)throw new Error('Secuencia demasiado larga.')
  const captions=cleanText(s.captions,65536);parseSrt(captions)
  return {selection,clips,speed,captions,height:choice(s.height,[720,1080],720),silent:s.silent===true,volume:clamp(s.volume,0,1,1),transition:choice(s.transition,['cut','fade'],'cut'),formatMode:choice(s.formatMode,['original','wide','vertical','square'],'original'),fit:choice(s.fit,['contain','cover'],'contain'),filter:choice(s.filter,['normal','cinema','warm','mono','vivid'],'normal'),brightness:clamp(s.brightness,.5,1.5,1),contrast:clamp(s.contrast,.5,1.5,1),saturation:clamp(s.saturation,0,2,1),hue:clamp(s.hue,-180,180,0),overlayTitle:cleanText(s.overlayTitle),subtitle:cleanText(s.subtitle),titleAnimation:choice(s.titleAnimation,['none','fade','slide'],'none'),logoOpacity:clamp(s.logoOpacity,.1,1,.8),musicVolume:clamp(s.musicVolume,0,1,.25),titleX:clamp(s.titleX,0,1,.5),titleY:clamp(s.titleY,0,1,.16),titleSize:clamp(s.titleSize,.02,.3,.05),captionX:clamp(s.captionX,0,1,.5),captionY:clamp(s.captionY,0,1,.84),captionSize:clamp(s.captionSize,.02,.3,.04),layers:cleanLayers(s.layers),effects:cleanEffects(s.effects)}
}

export const layerLimit=12
export const imageLayerLimit=8
export const projectFileLimit=12*1024*1024
export function cleanLayers(input){
  if(input==null)return []
  if(!Array.isArray(input)||input.length>layerLimit)throw new Error('Máximo 12 capas.')
  const ids=new Set();let images=0
  return input.map(l=>{
    if(!l||typeof l.id!=='string'||!/^[-a-zA-Z0-9]{1,80}$/.test(l.id)||ids.has(l.id)||!['text','image'].includes(l.type))throw new Error('Capa inválida.')
    ids.add(l.id)
    const start=clamp(l.start,0,300,0),end=clamp(l.end,0,300,300)
    if(end<=start)throw new Error('El final de una capa debe ser posterior al inicio.')
    const result={id:l.id,type:l.type,name:cleanText(l.name,80)||'Capa',x:clamp(l.x,0,1,.5),y:clamp(l.y,0,1,.5),size:clamp(l.size,.02,1,l.type==='image'?.25:.07),rotation:clamp(l.rotation,-180,180,0),opacity:clamp(l.opacity,0,1,1),start,end}
    result.enter=choice(l.enter,['none','fade','slide','zoom'],'none')
    result.exit=choice(l.exit,['none','fade','slide','zoom'],'none')
    result.animationSeconds=clamp(l.animationSeconds,.1,3,.5)
    result.keyframes=cleanKeyframes(l.keyframes,result)
    if(l.type==='image'){
      if(++images>imageLayerLimit||typeof l.data!=='string'||l.data.length>1398200||!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(l.data))throw new Error('Imagen de capa inválida o demasiado grande.')
      result.data=l.data
    }else{
      result.text=cleanText(l.text)
      result.color=typeof l.color==='string'&&/^#[0-9a-fA-F]{6}$/.test(l.color)?l.color:'#ffffff'
      result.font=choice(l.font,['sans-serif','serif','monospace'],'sans-serif')
      result.background=l.background===true
      result.bold=l.bold!==false
      result.outline=l.outline===true
    }
    return result
  })
}

export const transformKeys=['x','y','size','rotation','opacity']
export function cleanKeyframes(input,base){
  if(input==null)return []
  if(!Array.isArray(input)||input.length>24)throw new Error('Máximo 24 fotogramas clave por capa.')
  const seen=new Set()
  return input.map(k=>{
    if(!k||typeof k.time!=='number'||!Number.isFinite(k.time)||k.time<0||k.time>300)throw new Error('Tiempo de fotograma clave inválido.')
    const time=Math.round(k.time*1000)/1000
    if(seen.has(time))throw new Error('Fotogramas clave duplicados.')
    seen.add(time)
    return {time,x:clamp(k.x,0,1,base.x),y:clamp(k.y,0,1,base.y),size:clamp(k.size,.02,1,base.size),rotation:clamp(k.rotation,-180,180,base.rotation),opacity:clamp(k.opacity,0,1,base.opacity)}
  }).sort((a,b)=>a.time-b.time)
}
export function layerTransform(layer,time){
  const keys=layer.keyframes||[]
  if(!keys.length)return Object.fromEntries(transformKeys.map(k=>[k,layer[k]]))
  if(time<=keys[0].time)return Object.fromEntries(transformKeys.map(k=>[k,keys[0][k]]))
  if(time>=keys[keys.length-1].time)return Object.fromEntries(transformKeys.map(k=>[k,keys[keys.length-1][k]]))
  const i=keys.findIndex(k=>k.time>=time),a=keys[i-1],b=keys[i],t=(time-a.time)/(b.time-a.time)
  return Object.fromEntries(transformKeys.map(k=>[k,a[k]+(b[k]-a[k])*t]))
}
export function animatedLayer(layer,time){
  const pose={...layer,...layerTransform(layer,time)}
  const edge=Math.min(layer.animationSeconds||.5,(layer.end-layer.start)/2)
  if(edge<=0)return pose
  const apply=(mode,f)=>{
    const t=Math.min(1,Math.max(0,f)),e=t*t*(3-2*t)
    if(mode==='fade')pose.opacity*=e
    if(mode==='slide'){pose.x-=(1-e)*.22;pose.opacity*=e}
    if(mode==='zoom'){pose.size*=.15+.85*e;pose.opacity*=e}
  }
  apply(layer.enter,(time-layer.start)/edge);apply(layer.exit,(layer.end-time)/edge)
  return pose
}
export function snapPosition(value,enabled=true){
  if(!enabled)return {value,guide:null}
  const targets=[.05,.5,.95],target=targets.find(t=>Math.abs(value-t)<=.015)
  return target===undefined?{value,guide:null}:{value:target,guide:target}
}

export function cleanEffects(raw={}){
  const p=raw?.pip||{},b=raw?.blur||{}
  return {pip:{enabled:p.enabled===true,x:clamp(p.x,0,1,.78),y:clamp(p.y,0,1,.25),size:clamp(p.size,.1,1,.35),opacity:clamp(p.opacity,0,1,1),start:clamp(p.start,0,300,0),end:clamp(p.end,0,300,300),mask:choice(p.mask,['rectangle','circle'],'rectangle'),key:choice(p.key,['none','green','blue'],'none'),threshold:clamp(p.threshold,0,1,.3),softness:clamp(p.softness,.02,.5,.15)},blur:{enabled:b.enabled===true,x:clamp(b.x,0,1,.5),y:clamp(b.y,0,1,.5),width:clamp(b.width,.05,1,.25),height:clamp(b.height,.05,1,.25),strength:clamp(b.strength,2,40,15),mask:choice(b.mask,['rectangle','circle'],'rectangle'),start:clamp(b.start,0,300,0),end:clamp(b.end,0,300,300)}}
}
export function effectActive(effect,time){return !!effect?.enabled&&time>=effect.start&&time<effect.end}
export function keyPixels(data,key,threshold=.3,softness=.15){
  if(key!=='green'&&key!=='blue')return data
  for(let i=0;i<data.length;i+=4){
    const r=data[i],g=data[i+1],b=data[i+2],dominant=key==='green'?g:b,other=key==='green'?b:g
    const score=(dominant-Math.max(r,other))/255
    const alpha=1-Math.max(0,Math.min(1,(score-threshold)/Math.max(.02,softness)))
    data[i+3]=Math.round(data[i+3]*alpha)
    if(alpha<1){if(key==='green')data[i+1]=Math.round(g*alpha+Math.max(r,b)*(1-alpha));else data[i+2]=Math.round(b*alpha+Math.max(r,g)*(1-alpha))}
  }
  return data
}
