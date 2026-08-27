const PREFIX = 'viti-draft:v1:'

function getDefaultStorage() {
  if (typeof localStorage === 'undefined') return null
  return localStorage
}

export function draftStorageKey(token) {
  const value = String(token || '').trim()
  if (!value) throw new Error('El token de la solicitud es obligatorio.')
  return `${PREFIX}${value}`
}

export function createDraftSync(token, storage = getDefaultStorage()) {
  const key = draftStorageKey(token)

  function read() {
    if (!storage) return null
    try {
      const raw = storage.getItem(key)
      if (!raw) return null
      const parsed = JSON.parse(raw)
      if (!parsed || typeof parsed !== 'object') return null
      return parsed
    } catch {
      return null
    }
  }

  function write(payload) {
    if (!storage) return false
    const draft = {
      ...payload,
      server_revision: Number(payload?.server_revision || 0),
      saved_at: payload?.saved_at || new Date().toISOString(),
      dirty: payload?.dirty !== false,
    }
    try {
      storage.setItem(key, JSON.stringify(draft))
      return true
    } catch {
      return false
    }
  }

  function clear() {
    if (!storage) return
    try { storage.removeItem(key) } catch { /* almacenamiento restringido */ }
  }

  function hasConflict(serverRevision) {
    const draft = read()
    if (!draft?.dirty) return false
    return Number(draft.server_revision || 0) !== Number(serverRevision || 0)
  }

  function markSynced(serverRevision, payload = {}) {
    return write({ ...payload, server_revision: Number(serverRevision || 0), dirty: false })
  }

  function markDirty(serverRevision, payload = {}) {
    return write({ ...payload, server_revision: Number(serverRevision || 0), dirty: true })
  }

  return { key, read, write, clear, hasConflict, markSynced, markDirty }
}

export default createDraftSync
