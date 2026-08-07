import { boot } from 'quasar/wrappers'
import { Dark } from 'quasar'
export default boot(() => { Dark.set(localStorage.getItem('viti-theme') === 'dark') })
