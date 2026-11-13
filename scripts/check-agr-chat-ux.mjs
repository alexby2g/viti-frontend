import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { parseAgrMarkdown } from '../src/utils/agrMarkdown.mjs'

const panel = readFileSync(new URL('../src/components/agr/Agr006FloatingAssistantV2.vue', import.meta.url), 'utf8')
const reader = readFileSync(new URL('../src/components/agr/AgrMessageContent.vue', import.meta.url), 'utf8')
const requests = readFileSync(new URL('../src/pages/SolicitudesPage.vue', import.meta.url), 'utf8')

const blocks = parseAgrMarkdown('# Plan\n\n1. **Ventas**\n2. Inventario\n\n- Facturación\n\n### Código\n\n' + String.fromCharCode(96).repeat(3) + '\nconsole.log("hola")\n' + String.fromCharCode(96).repeat(3))
assert.equal(blocks[0].type, 'heading')
assert.equal(blocks[1].type, 'list')
assert.equal(blocks[1].ordered, true)
assert.equal(blocks[1].items[0][0].kind, 'strong')
assert.equal(blocks[2].ordered, false)
assert.equal(blocks[4].type, 'code')

const malicious = parseAgrMarkdown('<img src=x onerror=alert(1)>')
assert.equal(malicious[0].spans[0].text, '<img src=x onerror=alert(1)>')
assert.doesNotMatch(reader, /v-html|innerHTML|DOMParser|eval\(/, 'Las respuestas nunca deben tratarse como HTML')
assert.match(reader, /\{\{\s*part\.text\s*\}\}/, 'Los mensajes deben escapar texto mediante Vue')
assert.match(panel, /:content="item\.text"/, 'El chat usa el renderizador seguro')
assert.match(panel, /aria-label="Ampliar chat de AGR 006"|'Ampliar chat de AGR 006'/, 'El chat debe poder ampliarse')
assert.match(panel, /attempt < 110/, 'El frontend espera análisis largos de IRENET local')
assert.match(panel, /api\.post\('\/assistant\/local\/analyze-request'/, 'El análisis debe ejecutarse por API segura')
assert.match(panel, /window\.addEventListener\('viti:analyze-request'/, 'Las tarjetas deben abrir el análisis en el chat')
assert.match(requests, /Analizar con IRENET local \(solo lectura\)/, 'Botón de análisis explícito')
assert.doesNotMatch(requests, /api\.(post|put|delete)\('\/solicitudes/, 'Analizar no modifica solicitudes')
console.log('Chat legible y análisis seguro de solicitudes: comprobados.')
