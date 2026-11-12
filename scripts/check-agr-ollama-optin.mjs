import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const assistant = readFileSync(new URL('../src/components/agr/Agr006FloatingAssistantV2.vue', import.meta.url), 'utf8')

assert.match(assistant, /const aiEnabled = ref\(false\)/, 'El modo IA debe iniciar apagado')
assert.match(assistant, /:aria-pressed="aiEnabled"/, 'El control debe comunicar su estado')
assert.match(assistant, /Las preguntas abiertas se enviarán a Ollama Cloud/, 'Debe existir aviso de privacidad')
assert.match(assistant, /if \(aiEnabled\.value && payload\?\.intent === 'unknown'\)/, 'Solo preguntas desconocidas usan IA')
assert.match(assistant, /api\.post\('\/assistant\/ollama'/, 'La IA debe usar el backend autorizado')
assert.match(assistant, /history: aiHistory\.value\.slice\(-6\)/, 'El historial debe estar limitado')
assert.doesNotMatch(assistant, /OLLAMA_API_KEY|Bearer /, 'No deben enviarse secretos desde el navegador')

console.log('AGR 006: modo Ollama opcional y sin credenciales en cliente verificado.')
