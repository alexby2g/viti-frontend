<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue'
import { useRouter } from 'vue-router'
import Agr006FloatingAssistant from './components/agr/Agr006FloatingAssistantV2.vue'

const router = useRouter()
const STORAGE_KEY = 'viti006.enabled'
const assistantEnabled = ref(localStorage.getItem(STORAGE_KEY) !== '0')

function setAssistantEnabled(value) {
  assistantEnabled.value = value
  localStorage.setItem(STORAGE_KEY, value ? '1' : '0')
  window.dispatchEvent(new CustomEvent('viti006-power', { detail: value }))
}

function onPowerEvent(event) {
  const value = Boolean(event?.detail)
  if (assistantEnabled.value !== value) assistantEnabled.value = value
}

function onShortcut(event) {
  if (event.ctrlKey && event.shiftKey && event.key === '0') {
    event.preventDefault()
    setAssistantEnabled(!assistantEnabled.value)
  }
}

function getSolutionHref(solutionTitle) {
  const params = new URLSearchParams()
  if (solutionTitle) params.set('solucion', solutionTitle)
  const query = params.toString()
  return `/viti/catalogo${query ? `?${query}` : ''}#soluciones`
}

function enhanceSolutionConceptLinks() {
  const links = document.querySelectorAll('.solution-link')
  links.forEach((element) => {
    const card = element.closest('.solution-card')
    const title = card?.querySelector('h3')?.textContent?.trim() || ''
    element.setAttribute('role', 'link')
    element.setAttribute('tabindex', '0')
    element.setAttribute('aria-label', `Ver concepto de ${title || 'la solución'}`)
    element.addEventListener('click', onSolutionConceptClick)
    element.addEventListener('keydown', onSolutionConceptKeydown)
    element.dataset.vitiConceptBound = '1'
  })
}

function onSolutionConceptClick(event) {
  const element = event.currentTarget
  const card = element.closest('.solution-card')
  const title = card?.querySelector('h3')?.textContent?.trim() || ''
  router.push(getSolutionHref(title))
}

function onSolutionConceptKeydown(event) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    onSolutionConceptClick(event)
  }
}

function bindSolutionObserver() {
  enhanceSolutionConceptLinks()
  if (typeof MutationObserver === 'undefined') return null
  const observer = new MutationObserver(() => {
    document.querySelectorAll('.solution-link:not([data-viti-concept-bound="1"])').forEach((element) => {
      const card = element.closest('.solution-card')
      const title = card?.querySelector('h3')?.textContent?.trim() || ''
      element.setAttribute('role', 'link')
      element.setAttribute('tabindex', '0')
      element.setAttribute('aria-label', `Ver concepto de ${title || 'la solución'}`)
      element.addEventListener('click', onSolutionConceptClick)
      element.addEventListener('keydown', onSolutionConceptKeydown)
      element.dataset.vitiConceptBound = '1'
    })
  })
  observer.observe(document.body, { childList: true, subtree: true })
  return observer
}

let solutionObserver = null

onMounted(() => {
  window.addEventListener('viti006-power', onPowerEvent)
  window.addEventListener('keydown', onShortcut)
  solutionObserver = bindSolutionObserver()
})

onBeforeUnmount(() => {
  window.removeEventListener('viti006-power', onPowerEvent)
  window.removeEventListener('keydown', onShortcut)
  solutionObserver?.disconnect()
  document.querySelectorAll('.solution-link[data-viti-concept-bound="1"]').forEach((element) => {
    element.removeEventListener('click', onSolutionConceptClick)
    element.removeEventListener('keydown', onSolutionConceptKeydown)
    delete element.dataset.vitiConceptBound
  })
})
</script>

<template>
  <router-view />

  <Agr006FloatingAssistant v-if="assistantEnabled" />

  <button
    v-if="assistantEnabled"
    class="viti006-power-off"
    type="button"
    title="Desactivar VITI 006"
    aria-label="Desactivar VITI 006"
    @click="setAssistantEnabled(false)"
  >
    006 <span>OFF</span>
  </button>

  <button
    v-else
    class="viti006-power-on"
    type="button"
    title="Activar VITI 006"
    aria-label="Activar VITI 006"
    @click="setAssistantEnabled(true)"
  >
    006
  </button>
</template>

<style>
.viti006-power-off,
.viti006-power-on{
  position:fixed;
  right:18px;
  bottom:18px;
  z-index:10001;
  border:1px solid rgba(101,220,255,.25);
  border-radius:999px;
  background:rgba(5,18,30,.86);
  color:#dff8ff;
  box-shadow:0 6px 24px rgba(0,0,0,.25),0 0 16px rgba(74,210,255,.08);
  backdrop-filter:blur(12px);
  -webkit-backdrop-filter:blur(12px);
  cursor:pointer;
  font:700 11px/1 Inter,system-ui,sans-serif;
  letter-spacing:.1em;
}
.viti006-power-off{padding:8px 11px}
.viti006-power-off span{margin-left:5px;color:#7f9eaa;font-size:9px}
.viti006-power-on{width:42px;height:42px;opacity:.84}
.viti006-power-off:hover,.viti006-power-on:hover{border-color:rgba(101,220,255,.55);box-shadow:0 6px 28px rgba(0,0,0,.3),0 0 20px rgba(74,210,255,.16)}
.solution-link{cursor:pointer}
.solution-link:focus-visible{outline:2px solid #0b7593;outline-offset:4px;border-radius:6px}
@media (max-width:640px){.viti006-power-off,.viti006-power-on{right:12px;bottom:12px}}
</style>
