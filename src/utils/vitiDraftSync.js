const PREFIX = 'viti-public-draft:'

function keyFor(token) {
  return `${PREFIX}${token}`
}

function read(token) {
  try {
    return JSON.parse(localStorage.getItem(keyFor(token)) || 'null')
  } catch {
    return null
  }
}

function write(token, snapshot) {
  try {
    localStorage.setItem(keyFor(token), JSON.stringify({
      ...snapshot,
      saved_at: new Date().toISOString(),
    }))
    return true
  } catch {
    return false
  }
}

function remove(token) {
  try { localStorage.removeItem(keyFor(token)) } catch {}
}

export function installVitiDraftSync(axiosInstance) {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return
  if (axiosInstance.__vitiDraftSyncInstalled) return
  axiosInstance.__vitiDraftSyncInstalled = true

  axiosInstance.interceptors.request.use(config => {
    const match = String(config?.url || '').match(/^\/publico\/solicitudes\/([^/]+)$/)
    if (!match || String(config?.method || '').toLowerCase() !== 'put' || !config.data) return config

    const token = decodeURIComponent(match[1])
    config.__vitiDraftToken = token
    config.__vitiDraftPayload = typeof config.data === 'string'
      ? config.data
      : JSON.stringify(config.data)

    const current = read(token)
    let payload = null
    try { payload = JSON.parse(config.__vitiDraftPayload) } catch {}

    if (payload && !payload.base_revision && current?.server_revision != null) {
      payload.base_revision = Number(current.server_revision)
      config.data = payload
    }

    return config
  })

  axiosInstance.interceptors.response.use(
    response => {
      const token = response?.config?.__vitiDraftToken
      if (!token) return response

      let payload = null
      try {
        payload = typeof response.config.__vitiDraftPayload === 'string'
          ? JSON.parse(response.config.__vitiDraftPayload)
          : response.config.__vitiDraftPayload
      } catch {}

      const revision = Number(
        response?.data?.data?.draft_revision
        ?? response?.data?.data?.draft?.revision
        ?? response?.data?.draft_revision
        ?? response?.headers?.['x-viti-draft-revision']
      )

      write(token, {
        payload,
        server_revision: Number.isFinite(revision) ? revision : (payload?.base_revision ?? 0),
        dirty: false,
      })
      return response
    },
    error => {
      const token = error?.config?.__vitiDraftToken
      if (!token) return Promise.reject(error)

      if (Number(error?.response?.status) === 409) {
        const current = read(token) || {}
        write(token, {
          ...current,
          server_revision: Number(error.response?.data?.current_revision ?? current.server_revision ?? 0),
          dirty: true,
          conflict: true,
        })
      } else if (!error?.response) {
        const current = read(token) || {}
        let payload = current.payload
        try { payload = JSON.parse(error?.config?.__vitiDraftPayload || '') } catch {}
        write(token, { ...current, payload, dirty: true, offline: true })
      }

      return Promise.reject(error)
    },
  )
}

export function getVitiDraft(token) { return read(token) }
export function saveVitiDraft(token, snapshot) { return write(token, { ...snapshot, dirty: true }) }
export function clearVitiDraft(token) { remove(token) }
