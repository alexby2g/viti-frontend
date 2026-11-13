import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const assistant = readFileSync(new URL('../src/components/agr/Agr006FloatingAssistantV2.vue', import.meta.url), 'utf8')

assert.match(assistant, /const localEnabled = ref\(false\)/, 'El puente local empieza apagado')
assert.match(assistant, /IRENET local: activado/, 'La interfaz debe identificar el puente local')
assert.match(assistant, /if \(localEnabled\.value && payload\?\.intent === 'unknown'\)/, 'Los comandos tradicionales siguen teniendo prioridad')
assert.match(assistant, /api\.post\('\/assistant\/local\/jobs'/, 'El frontend crea trabajos mediante Laravel')
assert.match(assistant, /api\.get\('\/assistant\/local\/jobs\/' \+ id/, 'El frontend consulta exclusivamente el resultado autorizado')
assert.match(assistant, /if \(aiEnabled\.value\) localEnabled\.value = false/, 'Los modos local y cloud son excluyentes')
assert.match(assistant, /if \(localEnabled\.value\) aiEnabled\.value = false/, 'Los modos local y cloud son excluyentes')
assert.doesNotMatch(assistant, /VITI_IRENET_BRIDGE_TOKEN|X-Irenet-Bridge-Token|IRENET_LOCAL_BRIDGE_TOKEN/, 'No se deben enviar secretos del agente al navegador')
assert.doesNotMatch(assistant, /localhost:11434|127\.0\.0\.1:11434/, 'La página web no se conecta directamente al PC')

console.log('AGR 006: modo IRENET local seguro verificado.')
