import { boot } from 'quasar/wrappers'

export default boot(() => {
  if (!('serviceWorker' in navigator)) return

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  }, { once: true })
})
