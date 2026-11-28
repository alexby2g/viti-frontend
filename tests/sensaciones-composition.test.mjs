import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
// Load the pure ESM helper even if the root package is CommonJS.
const source=await readFile(new URL('../src/services/sensacionesComposition.js',import.meta.url),'utf8')
const {outputSize,normalizeSegments}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'))
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
