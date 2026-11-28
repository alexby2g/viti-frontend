import {captionAt,titleAlpha} from './sensacionesProject'
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
export function drawComposition(ctx,video,options={},logo=null,fade=0,time=0,duration=0){
  const w=ctx.canvas.width,h=ctx.canvas.height
  ctx.save()
  ctx.fillStyle='#000';ctx.fillRect(0,0,w,h)
  const vw=video.videoWidth,vh=video.videoHeight
  if(vw&&vh){
    const scale=options.fit==='cover'?Math.max(w/vw,h/vh):Math.min(w/vw,h/vh)
    const dw=vw*scale,dh=vh*scale
    ctx.filter='brightness('+bound(options.brightness,0.5,1.5,1)+') contrast('+bound(options.contrast,.5,1.5,1)+') saturate('+bound(options.saturation,0,2,1)+') hue-rotate('+bound(options.hue,-180,180,0)+'deg)'+(presets[options.filter]||'')
    ctx.drawImage(video,(w-dw)/2,(h-dh)/2,dw,dh)
    ctx.filter='none'
  }
  const base=Math.min(w,h)
  function textLine(value,y,size,x=w/2){
    if(!value?.trim())return
    ctx.font='600 '+Math.round(base*size)+'px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle'
    const words=value.trim().slice(0,180).split(/\s+/),lines=[];let line=''
    for(const word of words){const candidate=line?line+' '+word:word;if(line&&ctx.measureText(candidate).width>w*.86){lines.push(line);line=word}else line=candidate}
    if(line)lines.push(line)
    const visible=lines.slice(0,3);if(lines.length>3)visible[2]+='…'
    visible.forEach((str,i)=>{const ty=y+(i-(visible.length-1)/2)*base*size*1.3;const tw=Math.min(w*.9,ctx.measureText(str).width+base*.06)
      ctx.fillStyle='#000b';ctx.fillRect(x-tw/2,ty-base*size*.7,tw,base*size*1.4)
      ctx.fillStyle='#fff';ctx.fillText(str,x,ty,w*.86)
    })
  }
  ctx.save()
  const alpha=titleAlpha(options.titleAnimation||'none',time,duration)
  ctx.globalAlpha=alpha
  textLine(options.title,h*bound(options.titleY,0,1,.16)+(options.titleAnimation==='slide'?(1-alpha)*h*.10:0),bound(options.titleSize,.02,.3,.05),w*bound(options.titleX,0,1,.5))
  ctx.restore()
  textLine(options.cues?.length?captionAt(options.cues,time):options.subtitle,h*bound(options.captionY,0,1,.84),bound(options.captionSize,.02,.3,.04),w*bound(options.captionX,0,1,.5))
  if(logo){const scale=Math.min(w*.20/logo.width,h*.14/logo.height);const lw=logo.width*scale,lh=logo.height*scale;ctx.globalAlpha=bound(options.logoOpacity,0.1,1,.8);ctx.drawImage(logo,w-lw-base*.035,base*.035,lw,lh);ctx.globalAlpha=1}
  drawLayers(ctx,options.layers,options.layerImages,time)
  if(fade>0){ctx.fillStyle='rgba(0,0,0,'+bound(fade,0,1,0)+')';ctx.fillRect(0,0,w,h)}
  ctx.restore()
}

export function layerActive(layer,time){return time>=layer.start&&time<layer.end}
export function layerBox(ctx,layer,image){
  const w=ctx.canvas.width,h=ctx.canvas.height,base=Math.min(w,h)
  if(layer.type==='image'){
    if(!image?.width||!image?.height)return null
    const factor=base*layer.size/Math.max(image.width,image.height)
    return {width:image.width*factor,height:image.height*factor}
  }
  ctx.save();ctx.font=(layer.bold?'700 ':'400 ')+Math.max(1,base*layer.size)+'px '+layer.font
  const lines=(layer.text||'').split('\n').slice(0,8),lineHeight=base*layer.size*1.25
  const width=Math.min(w*.95,Math.max(1,...lines.map(t=>ctx.measureText(t).width)))+base*.025
  ctx.restore()
  return {width,height:lineHeight*lines.length+base*.025,lines,lineHeight}
}
export function hitLayer(ctx,layers,images,time,x,y){
  for(const layer of [...(layers||[])].reverse()){
    if(!layerActive(layer,time)||layer.opacity===0)continue
    const box=layerBox(ctx,layer,images?.get(layer.id));if(!box)continue
    const dx=x-layer.x*ctx.canvas.width,dy=y-layer.y*ctx.canvas.height,a=layer.rotation*Math.PI/180
    const localX=dx*Math.cos(a)+dy*Math.sin(a),localY=-dx*Math.sin(a)+dy*Math.cos(a)
    if(Math.abs(localX)<=box.width/2+4&&Math.abs(localY)<=box.height/2+4)return layer.id
  }
  return null
}
export function drawLayers(ctx,layers=[],images,time){
  for(const layer of layers||[]){
    if(!layerActive(layer,time)||layer.opacity<=0)continue
    const image=images?.get(layer.id),box=layerBox(ctx,layer,image)
    if(!box)continue
    const base=Math.min(ctx.canvas.width,ctx.canvas.height)
    ctx.save();ctx.translate(layer.x*ctx.canvas.width,layer.y*ctx.canvas.height);ctx.rotate(layer.rotation*Math.PI/180);ctx.globalAlpha=layer.opacity
    if(layer.type==='image')ctx.drawImage(image,-box.width/2,-box.height/2,box.width,box.height)
    else {
      if(layer.background){ctx.fillStyle='#000b';ctx.fillRect(-box.width/2,-box.height/2,box.width,box.height)}
      ctx.font=(layer.bold?'700 ':'400 ')+Math.max(1,base*layer.size)+'px '+layer.font
      ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=layer.color
      box.lines.forEach((line,i)=>{const y=(i-(box.lines.length-1)/2)*box.lineHeight
        if(layer.outline){ctx.strokeStyle='#000';ctx.lineJoin='round';ctx.lineWidth=Math.max(1,base*layer.size*.12);ctx.strokeText(line,0,y,ctx.canvas.width*.95)}
        ctx.fillText(line,0,y,ctx.canvas.width*.95)
      })
    }
    ctx.restore()
  }
}
export function drawLayerSelection(ctx,layer,image){
  const box=layerBox(ctx,layer,image);if(!box)return
  ctx.save();ctx.translate(layer.x*ctx.canvas.width,layer.y*ctx.canvas.height);ctx.rotate(layer.rotation*Math.PI/180)
  ctx.strokeStyle='#ff985c';ctx.lineWidth=2;ctx.setLineDash([5,3]);ctx.strokeRect(-box.width/2-4,-box.height/2-4,box.width+8,box.height+8);ctx.restore()
}
