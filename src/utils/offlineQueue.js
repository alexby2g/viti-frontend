const KEY = 'viti-client-offline-queue-v1'

function readQueue() {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeQueue(items) {
  localStorage.setItem(KEY, JSON.stringify(items))
  window.dispatchEvent(new CustomEvent('viti-offline-queue-changed', { detail: { count: items.length } }))
}

export function pendingOfflineCount() {
  return readQueue().length
}

export function queueClientAction(action) {
  const items = readQueue()
  items.push({ id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, created_at: new Date().toISOString(), ...action })
  writeQueue(items)
  return items.length
}

export async function flushClientQueue(api) {
  const items = readQueue()
  if (!items.length || !navigator.onLine) return { sent: 0, pending: items.length }

  const pending = []
  let sent = 0

  for (const item of items) {
    try {
      if (item.type === 'start-message') {
        await api.post(item.base || '/mi/buzon', item.payload)
      } else if (item.type === 'reply-message') {
        await api.post(`${item.base || '/mi/buzon'}/${item.conversation_id}/mensajes`, { mensaje: item.mensaje, client_request_id:item.client_request_id })
      } else {
        continue
      }
      sent += 1
    } catch (error) {
      pending.push(item)
      if (!error?.response) {
        const index = items.indexOf(item)
        pending.push(...items.slice(index + 1))
        break
      }
    }
  }

  writeQueue(pending)
  return { sent, pending: pending.length }
}
