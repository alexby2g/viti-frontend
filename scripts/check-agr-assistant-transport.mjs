import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const app = readFileSync(new URL('../src/App.vue', import.meta.url), 'utf8')
const assistant = readFileSync(new URL('../src/components/agr/Agr006FloatingAssistantV2.vue', import.meta.url), 'utf8')

assert.match(
  app,
  /import Agr006FloatingAssistant from '\.\/components\/agr\/Agr006FloatingAssistantV2\.vue'/,
  'La prueba debe verificar el componente AGR 006 que usa App.vue',
)

assert.match(
  assistant,
  /api\.post\('\/assistant\/messages',\s*\{\s*message:\s*value\s*\}/,
  'AGR 006 debe enviar los comandos mediante POST /assistant/messages',
)

assert.doesNotMatch(
  assistant,
  /api\.get\('\/dashboard',\s*\{\s*params:\s*\{\s*agr:/,
  'AGR 006 no debe incluir mensajes privados en parametros GET',
)

console.log('AGR 006: transporte POST verificado.')
