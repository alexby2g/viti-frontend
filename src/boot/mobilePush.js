import { boot } from 'quasar/wrappers'
import { api } from './axios'
import { registerNativePushDevice } from '../utils/mobile'

export default boot(() => {
  const register = () => registerNativePushDevice(api).catch(() => {})

  window.addEventListener('viti-push-token', register)
  window.addEventListener('online', register)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') register()
  })

  setTimeout(register, 1200)
})
