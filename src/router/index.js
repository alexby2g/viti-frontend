import { defineRouter } from '#q-app/wrappers'
import { createRouter, createWebHistory } from 'vue-router'
import routes from './routes'
import { useAuthStore } from '../stores/auth'

export default defineRouter(({ store }) => {
  const publicRoutes = [
    { path:'/viti', name:'viti-landing', component:() => import('../pages/VitiPlatformLandingPage.vue'), meta:{publicLanding:true} },
    { path:'/viti/planes', name:'viti-plans', component:() => import('../pages/VitiPlansPage.vue'), meta:{publicLanding:true} },
    { path:'/planes', redirect:'/viti/planes', meta:{publicLanding:true} },
    { path:'/presentacion', redirect:'/viti', meta:{publicLanding:true} },
  ]

  const router = createRouter({
    history:createWebHistory(),
    routes:[...publicRoutes, ...routes],
  })

  const clientHubRoutes = [
    { name:'client-portal', path:'/mi-cuenta', component:() => import('../pages/ClientHubPage.vue') },
    { name:'client-apps', path:'/mi-aplicaciones', component:() => import('../pages/ClientAppsPage.vue') },
    { name:'client-project', path:'/mi-proyecto', component:() => import('../pages/ClientProjectPage.vue') },
    { name:'client-messages', path:'/mi-buzon', component:() => import('../pages/ClientMessagesPage.vue') },
    { name:'client-billing', path:'/mi-pagos', component:() => import('../pages/ClientBillingPage.vue') },
  ]

  clientHubRoutes.forEach(({ name, path, component }) => {
    if (router.hasRoute(name)) router.removeRoute(name)
    router.addRoute({
      path,
      component:() => import('../layouts/ClientHubLayout.vue'),
      meta:{requiresAuth:true,clientOnly:true},
      children:[{ path:'', name, component, meta:{requiresAuth:true,clientOnly:true} }],
    })
  })

  router.beforeEach(async (to) => {
    if (to.meta.publicLanding || to.name === 'viti-landing' || to.name === 'viti-plans') return true

    const auth = useAuthStore(store)
    if (auth.setupRequired === null) await auth.checkSetup()
    if (auth.setupRequired && to.name !== 'setup') return { name:'setup' }
    if (!auth.setupRequired && to.name === 'setup') return auth.isAuthenticated ? { name:'dashboard' } : { name:'login' }

    if (to.meta.requiresAuth) {
      await auth.initialize()
      if (!auth.isAuthenticated) return { name:'login', query:{redirect:to.fullPath} }
      if (to.meta.adminOnly && !['superadmin','administrador'].includes(auth.user?.rol)) return { name:'dashboard' }
      if (to.meta.superAdminOnly && auth.user?.rol !== 'superadmin') return { name:'dashboard' }
      if (to.meta.clientOnly && auth.user?.rol !== 'cliente') return { name:'dashboard' }
    }

    return true
  })

  return router
})
