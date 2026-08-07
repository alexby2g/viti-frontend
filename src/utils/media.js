const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'
const backendRoot = apiBase.replace(/\/api\/v1\/?$/, '')
const mediaBase = (import.meta.env.VITE_MEDIA_URL || `${backendRoot}/storage`).replace(/\/$/, '')

export function mediaUrl(path) {
  if (!path) return ''
  if (/^https?:\/\//i.test(path)) return path
  return `${mediaBase}/${String(path).replace(/^\//, '')}`
}
