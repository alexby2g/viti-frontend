import { boot } from 'quasar/wrappers'

export default boot(({ router }) => {
  router.addRoute({
    path:'/guia-viti',
    name:'viti-guide',
    component:()=>import('../pages/VitiGuidePage.vue'),
    meta:{requiresAuth:true},
  })

  let button = null

  function ensureButton() {
    if (button || typeof document === 'undefined') return
    button = document.createElement('button')
    button.type = 'button'
    button.id = 'viti-guide-button'
    button.setAttribute('aria-label','Abrir guía VITI')
    button.setAttribute('title','Guía VITI')
    button.innerHTML = '<span class="material-icons" aria-hidden="true">help_outline</span><span class="viti-guide-label">Guía</span>'
    button.addEventListener('click', () => router.push('/guia-viti'))
    document.body.appendChild(button)

    const style = document.createElement('style')
    style.id = 'viti-guide-button-style'
    style.textContent = `
      #viti-guide-button{position:fixed;right:18px;bottom:18px;z-index:3900;display:flex;align-items:center;gap:7px;border:1px solid rgba(139,92,246,.42);border-radius:999px;background:rgba(16,16,20,.94);color:#f8fafc;padding:10px 14px;min-height:44px;font:600 13px/1 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.28);backdrop-filter:blur(12px);cursor:pointer;transition:transform .16s ease,border-color .16s ease,opacity .16s ease}
      #viti-guide-button:hover{transform:translateY(-2px);border-color:rgba(59,130,246,.68)}
      #viti-guide-button .material-icons{font-size:20px;background:linear-gradient(135deg,#3b82f6,#8b5cf6);-webkit-background-clip:text;background-clip:text;color:transparent}
      #viti-guide-button[hidden]{display:none!important}
      @media(max-width:600px){#viti-guide-button{right:14px;bottom:max(14px,env(safe-area-inset-bottom));width:46px;height:46px;padding:0;justify-content:center}.viti-guide-label{display:none}}
    `
    document.head.appendChild(style)
  }

  function syncButton(to) {
    ensureButton()
    if (!button) return
    const authenticated = to.matched.some(record => record.meta?.requiresAuth)
    const appShell = to.matched.some(record => record.meta?.appShell)
    const supportOnly = to.matched.some(record => record.meta?.supportOnly)
    const chat = ['/buzon','/mi-buzon'].some(path => to.path === path) || to.path.includes('/buzon') || to.path.includes('/mensajes')
    button.hidden = !authenticated || appShell || supportOnly || chat || to.path === '/guia-viti'
  }

  router.afterEach(to => syncButton(to))
  if (router.currentRoute.value) syncButton(router.currentRoute.value)
})
