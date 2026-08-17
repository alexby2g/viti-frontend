import { defineRouter } from '#q-app/wrappers'
import { createRouter, createWebHistory } from 'vue-router'
import routes from './routes'
import { useAuthStore } from '../stores/auth'
import { useTenantStore } from '../stores/tenant'

const AuthLayout = () => import('../layouts/AuthLayout.vue')
const MainLayout = () => import('../layouts/MainLayout.vue')

export default defineRouter(({ store }) => {
  const publicRoutes = [
    {
      path:'/viti',
      component:AuthLayout,
      children:[{ path:'', name:'viti-landing', component:() => import('../pages/VitiLandingPage.vue'), meta:{publicLanding:true} }],
      meta:{publicLanding:true},
    },
    {
      path:'/viti/planes',
      component:AuthLayout,
      children:[{ path:'', name:'viti-plans', component:() => import('../pages/VitiPlansPage.vue'), meta:{publicLanding:true} }],
      meta:{publicLanding:true},
    },
    {
      path:'/viti/acceso',
      component:AuthLayout,
      children:[{ path:'', name:'viti-access', component:() => import('../pages/VitiAccessPage.vue'), meta:{publicLanding:true} }],
      meta:{publicLanding:true},
    },
    { path:'/planes', redirect:'/viti/planes', meta:{publicLanding:true} },
    { path:'/acceso', redirect:'/viti/acceso', meta:{publicLanding:true} },
    { path:'/presentacion', redirect:'/viti', meta:{publicLanding:true} },
  ]

  const adminAccessRoute = {
    path:'/accesos',
    component:MainLayout,
    meta:{ requiresAuth:true, superAdminOnly:true },
    children:[
      { path:'', name:'viti-access-requests', component:() => import('../pages/AccesosVitiPage.vue'), meta:{ requiresAuth:true, superAdminOnly:true } },
    ],
  }

  const router = createRouter({ history: createWebHistory(), routes:[...publicRoutes, adminAccessRoute, ...routes] })

  const redirectAlias = (to, targetBase, fallback='inicio') => {
    const raw = to.params.pathMatch
    const tail = Array.isArray(raw) ? raw.join('/') : String(raw || fallback)
    return { path:`${targetBase}/${tail || fallback}`, query:to.query, hash:to.hash }
  }

  router.addRoute({
    path:'/mi-plan',
    component:MainLayout,
    meta:{ requiresAuth:true, clientOnly:true },
    children:[{
      path:'',
      name:'client-plan',
      component:() => import('../pages/ClientPlanPage.vue'),
      meta:{ requiresAuth:true, clientOnly:true },
    }],
  })

  router.addRoute({ path:'/apps/aires/:pathMatch(.*)*', redirect:to => redirectAlias(to, '/apps/electrofrio') })
  router.addRoute({ path:'/mi-apps/aires/:pathMatch(.*)*', redirect:to => redirectAlias(to, '/mi-apps/electrofrio') })
  router.addRoute({ path:'/portal/aires/:pathMatch(.*)*', redirect:to => redirectAlias(to, '/portal/electrofrio') })
  router.addRoute({ path:'/aires/acceso', redirect:'/electrofrio/acceso' })

  const homeFor = (user) => {
    if (user?.rol === 'cliente_negocio') return { name:'electro-customer-home' }
    if (user?.rol === 'cliente') return { name:'client-portal' }
    if (user?.rol === 'soporte') return { name:'support-internal-home' }
    return { name:'dashboard' }
  }

  router.beforeEach(async (to, from) => {
    if (to.meta.publicLanding || ['viti-landing','viti-plans','viti-access'].includes(to.name)) return true

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
      if (auth.isAuthenticated) return homeFor(auth.user)
    }
    return true
  })
  return router
})
