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

function findConversationMenu(root = document) {
  const icons = [...root.querySelectorAll('.chat-header .q-icon')]
  const icon = icons.find(element => element.textContent?.trim() === 'more_vert')
  return icon?.closest('.q-btn') || null
}

function openConversationActions(root) {
  const button = findConversationMenu(root || document)
  if (!button || button.hasAttribute('disabled') || button.getAttribute('aria-disabled') === 'true') return false
  button.click()
  return true
}

export default boot(() => {
  const style = document.createElement('style')
  style.dataset.vitiChatUx = 'true'
  style.textContent = `
    .messenger-card .message-actions{opacity:.72!important}
    @media (pointer:fine){.messenger-card .bubble:not(:hover) .message-actions{opacity:.48!important}}
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
    const target = event.target instanceof Element ? event.target : null
    if (!target) return

    const listItem = target.closest('.contacts-pane .q-item')
    if (listItem) {
      event.preventDefault()
      listItem.click()
      window.setTimeout(() => openConversationActions(document), 0)
      return
    }

    const card = target.closest('.messenger-card')
    if (!card) return
    if (target.closest('.bubble, .composer, button, a, input, textarea')) return

    if (openConversationActions(card)) event.preventDefault()
  }

  document.addEventListener('keydown', onKeydown, true)
  document.addEventListener('contextmenu', onContextMenu)
})
