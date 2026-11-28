import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
// Load the pure ESM helper even if the root package is CommonJS.
const projectSource=await readFile(new URL('../src/services/sensacionesProject.js',import.meta.url),'utf8')
const projectUrl='data:text/javascript;base64,'+Buffer.from(projectSource).toString('base64')
const {parseSrt,captionAt,titleAlpha,projectSettings,cleanLayers,layerTransform,animatedLayer,snapPosition,cleanEffects,effectActive,keyPixels}=await import(projectUrl)
let source=await readFile(new URL('../src/services/sensacionesComposition.js',import.meta.url),'utf8')
source=source.replace("'./sensacionesProject'",JSON.stringify(projectUrl))
const {outputSize,normalizeSegments,drawComposition,drawLayers,hitLayer,layerActive,secondaryTime}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'))
test('formats are bounded, even and preserve orientation',()=>{
  assert.deepEqual(outputSize(1920,1080,720,'wide'),[1280,720])
  assert.deepEqual(outputSize(1920,1080,720,'vertical'),[406,720])
  assert.deepEqual(outputSize(1920,1080,1080,'square'),[1080,1080])
  assert.deepEqual(outputSize(640,360,1080,'original'),[640,360])
})
test('sequence preserves selection order and allows reordered segments',()=>{
  const clips=[{start:4,end:6},{start:0,end:1}]
  assert.deepEqual(normalizeSegments(clips,8),clips)
})
test('rejects empty, invalid and oversized sequences',()=>{
  for(const bad of [[],[{start:0,end:.2}],[{start:-1,end:2}],[{start:0,end:9}],Array(13).fill({start:0,end:1})])assert.throws(()=>normalizeSegments(bad,8))
  assert.throws(()=>normalizeSegments([{start:0,end:301}],400))
})

test('SRT subtitles follow the output clock, not source order',()=>{
  const cues=parseSrt('1\n00:00:00,500 --> 00:00:02,000\nHola\n\n2\n00:00:02,000 --> 00:00:03,000\nAdiós')
  assert.equal(captionAt(cues,.49),'')
  assert.equal(captionAt(cues,.5),'Hola')
  assert.equal(captionAt(cues,2),'Adiós')
  assert.equal(captionAt(cues,3),'')
  assert.throws(()=>parseSrt('00:00:00,000 --> 00:00:02,000\na\n\n00:00:01,000 --> 00:00:03,000\nb'))
  assert.throws(()=>parseSrt('00:99:00,000 --> 00:99:01,000\na'))
})
test('title fades are bounded',()=>{
  assert.equal(titleAlpha('fade',0,2),0)
  assert.equal(titleAlpha('fade',1,2),1)
  assert.equal(titleAlpha('slide',2,2),0)
  assert.equal(titleAlpha('none',0,2),1)
})
test('portable projects accept only supported options and validated ranges',()=>{
  const p={format:'sensaciones-video-lab-v1',source:{name:'demo.mp4',size:1024,duration:6},settings:{selection:{start:0,end:4},clips:[{start:2,end:4}],speed:2,brightness:90,filter:'unknown',captions:''}}
  const s=projectSettings(p)
  assert.equal(s.speed,2);assert.equal(s.brightness,1.5);assert.equal(s.filter,'normal')
  assert.deepEqual(s.clips,[{start:2,end:4}])
  p.settings.clips=[{start:2,end:8}]
  assert.throws(()=>projectSettings(p))
})

test('monitor and export compositor applies live hue and other color settings',()=>{
  const calls=[]
  const ctx={canvas:{width:640,height:360},save(){},restore(){},fillRect(){},drawImage(){calls.push(this.filter)},filter:'none'}
  const video={videoWidth:640,videoHeight:360}
  drawComposition(ctx,video,{brightness:1.2,contrast:.9,saturation:1.4,hue:75,filter:'warm'})
  assert.match(calls[0],/brightness\(1.2\).*contrast\(0.9\).*saturate\(1.4\).*hue-rotate\(75deg\).*sepia/)
  drawComposition(ctx,video,{hue:999})
  assert.match(calls[1],/hue-rotate\(180deg\)/)
  drawComposition(ctx,video,{})
  assert.match(calls[2],/hue-rotate\(0deg\)/)
})
test('saved projects keep hue and old projects default to neutral hue',()=>{
  const p={format:'sensaciones-video-lab-v1',source:{name:'demo.mp4',size:1024,duration:6},settings:{selection:{start:0,end:4},clips:[],captions:''}}
  assert.equal(projectSettings(p).hue,0)
  p.settings.hue=-70
  assert.equal(projectSettings(p).hue,-70)
  p.settings.hue=999
  assert.equal(projectSettings(p).hue,180)
})

test('free layers preserve normalized coordinates and reject unsafe images',()=>{
  const l={id:'layer-1',type:'text',name:'Title',text:'Sensaciones',x:.8,y:.2,size:.07,rotation:30,opacity:.5,start:1,end:3,color:'#ff681e',font:'serif'}
  const [clean]=cleanLayers([l])
  assert.equal(clean.x,.8);assert.equal(clean.y,.2);assert.equal(clean.rotation,30);assert.equal(clean.color,'#ff681e')
  assert.throws(()=>cleanLayers([l,l]))
  assert.throws(()=>cleanLayers([{...l,type:'image',data:'https://example.com/sticker.png'}]))
  assert.throws(()=>cleanLayers([{...l,type:'image',data:'data:image/svg+xml;base64,AAAA'}]))
  assert.throws(()=>cleanLayers([{...l,end:0}]))
  assert.equal(layerActive(clean,1),true);assert.equal(layerActive(clean,3),false)
})
test('rotated layer hit test selects topmost visible object',()=>{
  const ctx={canvas:{width:800,height:400}}
  const layers=cleanLayers([0,1].map(i=>({id:'layer-'+i,type:'image',data:'data:image/png;base64,AAAA',x:.7,y:.3,size:.5,rotation:90,opacity:1,start:i,end:3})))
  const image={width:200,height:100},images=new Map(layers.map(l=>[l.id,image]))
  assert.equal(hitLayer(ctx,layers,images,.5,560,120),'layer-0')
  assert.equal(hitLayer(ctx,layers,images,1.5,560,120),'layer-1')
  assert.equal(hitLayer(ctx,layers,images,1.5,560,210),'layer-1')
  assert.equal(hitLayer(ctx,layers,images,1.5,650,120),null)
  assert.equal(hitLayer(ctx,layers,images,3,560,120),null)
})
test('image layers are composited at the requested time and geometry',()=>{
  const calls=[]
  const ctx={canvas:{width:800,height:400},save(){},restore(){},translate(...v){calls.push(['translate',...v])},rotate(v){calls.push(['rotate',v])},drawImage(...v){calls.push(['image',...v])}}
  const layer=cleanLayers([{id:'img',type:'image',data:'data:image/png;base64,AAAA',x:.7,y:.3,size:.5,rotation:90,opacity:.5,start:1,end:3}])[0]
  const image={width:200,height:100},images=new Map([['img',image]])
  drawLayers(ctx,[layer],images,0);assert.equal(calls.length,0)
  drawLayers(ctx,[layer],images,2)
  assert.deepEqual(calls,[['translate',560,120],['rotate',Math.PI/2],['image',image,-100,-50,200,100]])
  assert.equal(ctx.globalAlpha,.5)
})
test('old projects default to original title and caption positions',()=>{
  const p={format:'sensaciones-video-lab-v1',source:{name:'demo.mp4',size:1024,duration:6},settings:{selection:{start:0,end:4},clips:[],captions:''}}
  const s=projectSettings(p)
  assert.deepEqual(s.layers,[]);assert.equal(s.titleY,.16);assert.equal(s.captionY,.84)
  p.settings.captionY=.4;p.settings.titleX=.75
  assert.equal(projectSettings(p).captionY,.4);assert.equal(projectSettings(p).titleX,.75)
})

test('keyframes interpolate position, scale, rotation and opacity',()=>{
  const [layer]=cleanLayers([{id:'moving',type:'text',text:'Hola',start:0,end:4,keyframes:[{time:0,x:.1,y:.2,size:.1,rotation:0,opacity:1},{time:4,x:.9,y:.6,size:.3,rotation:90,opacity:0}]}])
  const mid=layerTransform(layer,2)
  assert.equal(mid.x,.5);assert.ok(Math.abs(mid.y-.4)<1e-9);assert.equal(mid.size,.2);assert.equal(mid.rotation,45);assert.equal(mid.opacity,.5)
  assert.equal(layerTransform(layer,5).x,.9)
})
test('entrance and exit animation respect time and preserve old layers',()=>{
  const [layer]=cleanLayers([{id:'a',type:'text',start:1,end:5,opacity:1,size:.2,enter:'fade',exit:'zoom',animationSeconds:1}])
  assert.equal(animatedLayer(layer,1).opacity,0)
  assert.equal(animatedLayer(layer,2).opacity,1)
  assert.ok(Math.abs(animatedLayer(layer,4.5).size-.115)<1e-9)
  const [old]=cleanLayers([{id:'old',type:'text',start:0,end:2,x:.8}])
  assert.equal(animatedLayer(old,1).x,.8);assert.equal(old.enter,'none')
})
test('keyframes reject duplicates and invalid times',()=>{
  const l={id:'a',type:'text',start:0,end:4}
  assert.throws(()=>cleanLayers([{...l,keyframes:[{time:1},{time:1}]}]))
  assert.throws(()=>cleanLayers([{...l,keyframes:[{time:301}]}]))
  assert.deepEqual(snapPosition(.493),{value:.5,guide:.5})
  assert.deepEqual(snapPosition(.493,false),{value:.493,guide:null})
})

test('composition settings remain bounded and old projects keep effects disabled',()=>{
  const base=cleanEffects()
  assert.equal(base.pip.enabled,false);assert.equal(base.blur.enabled,false)
  const e=cleanEffects({pip:{enabled:true,x:2,y:-2,key:'green',start:2,end:5,mask:'circle'},blur:{enabled:true,strength:100}})
  assert.equal(e.pip.x,1);assert.equal(e.pip.y,0);assert.equal(e.pip.mask,'circle');assert.equal(e.blur.strength,40)
  assert.equal(effectActive(e.pip,1),false);assert.equal(effectActive(e.pip,2),true);assert.equal(effectActive(e.pip,5),false)
  assert.equal(secondaryTime({duration:2},e.pip,3),1);assert.equal(secondaryTime({duration:2},e.pip,4),null)
})
test('chroma removes the dominant key color while preserving neutral and opposite colors',()=>{
  const input=new Uint8ClampedArray([0,255,0,255,255,0,0,255,128,128,128,255,0,0,255,128])
  keyPixels(input,'green',.3,.15)
  assert.equal(input[3],0);assert.equal(input[7],255);assert.equal(input[11],255);assert.equal(input[15],128)
  keyPixels(input,'blue',.3,.15);assert.equal(input[15],0)
})
test('chroma edge softness preserves partially transparent pixels',()=>{
  const pixels=new Uint8ClampedArray([0,96,0,255])
  keyPixels(pixels,'green',.3,.15)
  assert.ok(pixels[3]>0&&pixels[3]<255);assert.ok(pixels[1]<96)
})
