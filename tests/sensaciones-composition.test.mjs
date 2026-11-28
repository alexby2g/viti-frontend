import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
// Load the pure ESM helper even if the root package is CommonJS.
const projectSource=await readFile(new URL('../src/services/sensacionesProject.js',import.meta.url),'utf8')
const projectUrl='data:text/javascript;base64,'+Buffer.from(projectSource).toString('base64')
const {parseSrt,captionAt,titleAlpha,projectSettings}=await import(projectUrl)
let source=await readFile(new URL('../src/services/sensacionesComposition.js',import.meta.url),'utf8')
source=source.replace("'./sensacionesProject'",JSON.stringify(projectUrl))
const {outputSize,normalizeSegments,drawComposition}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'))
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
