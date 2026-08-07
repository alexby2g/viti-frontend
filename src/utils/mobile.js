export function nativePushToken() {
  try {
    return String(window.Android?.getPushToken?.() || '').trim()
  } catch {
    return ''
  }
}

export function nativeDeviceName() {
  try {
    return String(window.Android?.getDeviceName?.() || 'Android').trim()
  } catch {
    return 'Android'
  }
}

export async function registerNativePushDevice(api) {
  const token = nativePushToken()
  if (!token) return false

  try {
    await api.post('/push/dispositivo', {
      token,
      plataforma: 'android',
      dispositivo: nativeDeviceName(),
    })
    return true
  } catch {
    return false
  }
}

export async function unregisterNativePushDevice(api) {
  const token = nativePushToken()
  if (!token) return false

  try {
    await api.delete('/push/dispositivo', { data: { token } })
    return true
  } catch {
    return false
  }
}
