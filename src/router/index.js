import { defineRouter } from '#q-app/wrappers'
import { createRouter, createWebHistory } from 'vue-router'
import routes from './routes'
import { useAuthStore } from '../stores/auth'

export default defineRouter(({ store }) => {
  const router = createRouter({ history: createWebHistory(), routes })
  router.beforeEach(async (to, from) => {
    const auth = useAuthStore(store)
    if (auth.setupRequired === null) await auth.checkSetup()
    if (auth.setupRequired && to.name !== 'setup') return { name: 'setup' }
    if (!auth.setupRequired && to.name === 'setup') return auth.isAuthenticated ? (auth.user?.rol==='cliente'?{name:'client-portal'}:{name:'dashboard'}) : { name: 'login' }
    if (to.meta.requiresAuth) {
      await auth.initialize()
      if (!auth.isAuthenticated) return { name: 'login', query: { redirect: to.fullPath } }
      if (to.meta.adminOnly && auth.user?.rol==='cliente') return {name:'client-portal'}
      if (to.meta.clientOnly && auth.user?.rol!=='cliente') return {name:'dashboard'}
    }

    const leavingDeliveredApp = Boolean(from.meta.appShell) && !to.meta.appShell && auth.isAuthenticated
    if (leavingDeliveredApp) {
      const explicit = sessionStorage.getItem('viti-app-explicit-exit') === '1'
      sessionStorage.removeItem('viti-app-explicit-exit')
      if (!explicit) return { path: from.fullPath, replace: true }
    }

    if (['login','client-register'].includes(to.name)) { await auth.initialize(); if (auth.isAuthenticated) return auth.user?.rol==='cliente'?{name:'client-portal'}:{name:'dashboard'} }
    return true
  })
  return router
})
