import { reactive } from 'vue'

export function useFormErrors() {
  const errors = reactive({})

  function clear(field = null) {
    if (field) {
      delete errors[field]
      return
    }
    Object.keys(errors).forEach(key => delete errors[key])
  }

  function set(field, message) {
    if (!field || !message) return
    errors[field] = Array.isArray(message) ? String(message[0] || '') : String(message)
  }

  function setMany(values = {}) {
    clear()
    Object.entries(values || {}).forEach(([field, messages]) => {
      const message = Array.isArray(messages) ? messages[0] : messages
      if (message) set(field, message)
    })
  }

  function fromResponse(error, fallback = 'Revisa los campos marcados e inténtalo nuevamente.') {
    const bag = error?.response?.data?.errors
    if (bag && typeof bag === 'object') setMany(bag)
    const first = Object.values(errors)[0]
    return first || error?.response?.data?.message || error?.userMessage || fallback
  }

  function has(field) {
    return Boolean(errors[field])
  }

  function message(field) {
    return errors[field] || ''
  }

  function scrollToFirst() {
    const field = Object.keys(errors)[0]
    if (!field) return
    requestAnimationFrame(() => {
      const element = document.querySelector(`[data-error-field="${CSS.escape(field)}"]`)
      element?.scrollIntoView({ behavior:'smooth', block:'center' })
      const input = element?.querySelector('input, textarea')
      input?.focus?.()
    })
  }

  return { errors, clear, set, setMany, fromResponse, has, message, scrollToFirst }
}
