import { boot } from 'quasar/wrappers'
import { useBrandingStore } from '../stores/branding'

export default boot(({ store }) => {
  const branding = useBrandingStore(store)
  branding.apply()
  branding.load().catch(() => {})
})
