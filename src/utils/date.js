function asDate(value) {
  if (!value) return null
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value
  const text = String(value)
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    const [y, m, d] = text.split('-').map(Number)
    return new Date(y, m - 1, d)
  }
  const date = new Date(text)
  return Number.isNaN(date.getTime()) ? null : date
}

export function formatDate(value, fallback = 'Sin definir') {
  const date = asDate(value)
  if (!date) return fallback
  return new Intl.DateTimeFormat('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date)
}

export function formatDateTime(value, fallback = 'Sin registro') {
  const date = asDate(value)
  if (!date) return fallback
  return new Intl.DateTimeFormat('es-BO', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(date).replace(',', ' ·')
}

export function todayInput() {
  const now = new Date()
  const offset = now.getTimezoneOffset() * 60000
  return new Date(now.getTime() - offset).toISOString().slice(0, 10)
}
