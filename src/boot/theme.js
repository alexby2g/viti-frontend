import { boot } from 'quasar/wrappers'
import { Dark } from 'quasar'

export default boot(() => {
  const saved = localStorage.getItem('viti-theme')
  Dark.set(saved ? saved === 'dark' : true)
})
