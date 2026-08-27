const PREFIX = 'viti-draft:v1:'

function getDefaultStorage() {
  if (typeof localStorage === 'undefined') return null
  return localStorage
}

function normalizeRevision(value) {
  const revision = Number(value || 0)
  return Number.isFinite(revision) && revision >= 0 ? revision : 0
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
      server_revision: normalizeRevision(payload?.server_revision),
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
    return normalizeRevision(draft.server_revision) !== normalizeRevision(serverRevision)
  }

  function status(serverRevision = null, online = true) {
    const draft = read()
    if (!online) return draft?.dirty ? 'offline-pending' : 'offline'
    if (!draft) return 'empty'
    if (draft.dirty && serverRevision != null && hasConflict(serverRevision)) return 'conflict'
    return draft.dirty ? 'pending' : 'synced'
  }

  function markSynced(serverRevision, payload = {}) {
    return write({ ...payload, server_revision: normalizeRevision(serverRevision), dirty: false })
  }

  function markDirty(serverRevision, payload = {}) {
    return write({ ...payload, server_revision: normalizeRevision(serverRevision), dirty: true })
  }

  function recoverServer(serverRevision, payload = {}) {
    return markSynced(serverRevision, payload)
  }

  return { key, read, write, clear, hasConflict, status, markSynced, markDirty, recoverServer }
}

export default createDraftSync
