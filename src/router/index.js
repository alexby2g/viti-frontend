import { defineRouter } from '#q-app/wrappers'
import { createRouter, createWebHistory } from 'vue-router'
import routes from './routes'
import { useAuthStore } from '../stores/auth'
import { useTenantStore } from '../stores/tenant'

export default defineRouter(({ store }) => {
  const publicRoutes = [
    { path:'/viti', name:'viti-landing', component:() => import('../pages/VitiLandingPage.vue'), meta:{publicLanding:true} },
    { path:'/viti/planes', name:'viti-plans', component:() => import('../pages/VitiPlansPage.vue'), meta:{publicLanding:true} },
    { path:'/planes', redirect:'/viti/planes', meta:{publicLanding:true} },
    { path:'/presentacion', redirect:'/viti', meta:{publicLanding:true} },
    { path:'/demo', component:() => import('../layouts/AuthLayout.vue'), meta:{publicLanding:true}, children:[{ path:'', name:'viti-demo', component:() => import('../pages/GuestDemoPage.vue'), meta:{publicLanding:true} }] },
  ]
  const router = createRouter({
    history: createWebHistory(),
    routes:[...publicRoutes, ...routes],
    scrollBehavior(to, from, savedPosition) {
      if (to.hash) return { el:to.hash, behavior:'smooth' }
      const alwaysTop = to.meta.publicLanding || ['public-application','client-register','login','viti-demo'].includes(to.name)
      if (alwaysTop) return { top:0, left:0 }
      return savedPosition || { top:0, left:0 }
    },
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

  const redirectAlias = (to, targetBase, fallback='inicio') => {
    const raw = to.params.pathMatch
    const tail = Array.isArray(raw) ? raw.join('/') : String(raw || fallback)
    return { path:`${targetBase}/${tail || fallback}`, query:to.query, hash:to.hash }
  }

  router.addRoute({ path:'/apps/aires/:pathMatch(.*)*', redirect:to => redirectAlias(to, '/apps/electrofrio') })
  router.addRoute({ path:'/mi-apps/aires/:pathMatch(.*)*', redirect:to => redirectAlias(to, '/mi-apps/electrofrio') })
  router.addRoute({ path:'/portal/aires/:pathMatch(.*)*', redirect:to => redirectAlias(to, '/portal/electrofrio') })
  router.addRoute({ path:'/aires/acceso', redirect:'/electrofrio/acceso' })

  router.addRoute({
    path:'/monitor',
    name:'monitor',
    component:() => import('../pages/MonitorPage.vue'),
    meta:{requiresAuth:true,adminOnly:true},
  })

  const homeFor = (user) => {
    if (user?.rol === 'cliente_negocio') return { name:'electro-customer-home' }
    if (user?.rol === 'cliente') return { name:'client-portal' }
    if (user?.rol === 'soporte') return { name:'support-internal-home' }
    return { name:'dashboard' }
  }

  router.beforeEach(async (to, from) => {
    if (to.meta.publicLanding || to.name === 'viti-landing' || to.name === 'viti-plans') return true

    if (to.name === 'public-request') return true

    const auth = useAuthStore(store)
    if (auth.setupRequired === null) await auth.checkSetup()

    // Un visitante sin sesión que entra a la raíz ve primero la presentación de VITI.
    if (to.path === '/' && !auth.setupRequired) {
      await auth.initialize()
      if (!auth.isAuthenticated) return { name:'viti-landing' }
    }
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

      if (auth.user?.rol === 'cliente') {
        const tenant = useTenantStore(store)
        if (!tenant.loaded) {
          try { await tenant.load() } catch { /* la pantalla mostrará su error de disponibilidad */ }
        }
      }

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
      const googleOnboarding = to.name === 'client-register' && to.query.google === 'created' && auth.user?.rol === 'cliente' && !auth.user?.cliente_id
      if (googleOnboarding) return true
      if (auth.isAuthenticated) return homeFor(auth.user)
    }
    return true
  })
  return router
})
