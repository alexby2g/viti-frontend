import { defineRouter } from '#q-app/wrappers'
import { createRouter, createWebHistory } from 'vue-router'
import routes from './routes'
import { useAuthStore } from '../stores/auth'

export default defineRouter(({ store }) => {
  const router = createRouter({ history: createWebHistory(), routes })

  const homeFor = (user) => {
    if (user?.rol === 'cliente_negocio') return { name:'electro-customer-home' }
    if (user?.rol === 'cliente') return { name:'client-portal' }
    if (user?.rol === 'soporte') return { name:'support-internal-home' }
    return { name:'dashboard' }
  }

  router.beforeEach(async (to, from) => {
    const auth = useAuthStore(store)
    if (auth.setupRequired === null) await auth.checkSetup()
    if (auth.setupRequired && to.name !== 'setup') return { name:'setup' }
    if (!auth.setupRequired && to.name === 'setup') return auth.isAuthenticated ? homeFor(auth.user) : { name:'login' }

    if (to.meta.requiresAuth) {
      await auth.initialize()
      if (!auth.isAuthenticated) return { name:to.meta.electroCustomerOnly ? 'electro-customer-login' : 'login', query:{ redirect:to.fullPath } }

      if (to.meta.supportOnly && auth.user?.rol !== 'soporte') return homeFor(auth.user)
      if (to.meta.adminOnly && !['superadmin','administrador'].includes(auth.user?.rol)) return homeFor(auth.user)
      if (to.meta.superAdminOnly && auth.user?.rol !== 'superadmin') return homeFor(auth.user)
      if (to.meta.clientOnly && auth.user?.rol !== 'cliente') return homeFor(auth.user)
      if (to.meta.electroCustomerOnly && auth.user?.rol !== 'cliente_negocio') return homeFor(auth.user)

      // Cada tipo de cuenta permanece dentro de su propio espacio autenticado.
      if (auth.user?.rol === 'soporte' && !to.meta.supportOnly) return { name:'support-internal-home' }
      if (!to.meta.electroCustomerOnly && auth.user?.rol === 'cliente_negocio') return { name:'electro-customer-home' }
    }

    const leavingDeliveredApp = Boolean(from.meta.appShell) && !to.meta.appShell && auth.isAuthenticated
    if (leavingDeliveredApp) {
      const explicit = sessionStorage.getItem('viti-app-explicit-exit') === '1'
      sessionStorage.removeItem('viti-app-explicit-exit')
      if (!explicit) return { path:from.fullPath, replace:true }
    }

    if (['login','client-register','electro-customer-login'].includes(to.name)) {
      await auth.initialize()
      if (auth.isAuthenticated) return homeFor(auth.user)
    }
    return true
  })
  return router
})
