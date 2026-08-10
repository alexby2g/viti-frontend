import { boot } from 'quasar/wrappers'

function isPlainEnter(event) {
  return event.key === 'Enter' && !event.shiftKey && !event.ctrlKey && !event.altKey && !event.metaKey && !event.isComposing
}

function composerFor(target) {
  return target instanceof Element ? target.closest('.composer') : null
}

function findSendButton(composer) {
  return composer?.querySelector('.send-action') || null
}

let forwardingContextMenu = false

function dispatchContextMenu(card, sourceEvent) {
  if (!card) return false

  forwardingContextMenu = true
  try {
    const forwarded = new MouseEvent('contextmenu', {
      bubbles: true,
      cancelable: true,
      view: window,
      button: 2,
      buttons: 2,
      clientX: sourceEvent?.clientX || Math.round(window.innerWidth / 2),
      clientY: sourceEvent?.clientY || Math.round(window.innerHeight / 2),
      screenX: sourceEvent?.screenX || 0,
      screenY: sourceEvent?.screenY || 0,
    })
    card.dispatchEvent(forwarded)
    return forwarded.defaultPrevented
  } finally {
    forwardingContextMenu = false
  }
}

export default boot(() => {
  const style = document.createElement('style')
  style.dataset.vitiChatUx = 'true'
  style.textContent = `
    .messenger-card .message-actions{opacity:.92!important}
    .messenger-card .bubble:hover .message-actions,.messenger-card .message-actions:focus{opacity:1!important}
  `
  document.head.appendChild(style)

  const onKeydown = event => {
    if (!isPlainEnter(event)) return
    const composer = composerFor(event.target)
    if (!composer) return

    const sendButton = findSendButton(composer)
    if (!sendButton || sendButton.hasAttribute('disabled') || sendButton.getAttribute('aria-disabled') === 'true') return

    event.preventDefault()
    event.stopPropagation()
    sendButton.click()
  }

  const onContextMenu = event => {
    if (forwardingContextMenu) return

    const target = event.target instanceof Element ? event.target : null
    if (!target) return

    const listItem = target.closest('.contacts-pane .q-item')
    if (listItem) {
      event.preventDefault()
      event.stopPropagation()
      listItem.click()
      window.setTimeout(() => {
        const card = document.querySelector('.messenger-card')
        if (card) dispatchContextMenu(card, event)
      }, 60)
      return
    }

    const card = target.closest('.messenger-card')
    if (!card || target === card) return

    // QMenu con context-menu escucha al contenedor padre. Si el clic derecho
    // ocurre sobre una burbuja, texto, imagen o compositor, reenviamos el evento
    // al propio contenedor para que el menú aparezca siempre en el punto pulsado.
    event.preventDefault()
    event.stopPropagation()
    dispatchContextMenu(card, event)
  }

  document.addEventListener('keydown', onKeydown, true)
  document.addEventListener('contextmenu', onContextMenu, true)
})
