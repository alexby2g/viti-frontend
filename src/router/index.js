import { defineRouter } from '#q-app/wrappers'
import { createRouter, createWebHistory } from 'vue-router'
import routes from './routes'
import { useAuthStore } from '../stores/auth'
import { useTenantStore } from '../stores/tenant'
import MainLayout from '../layouts/MainLayout.vue'

export default defineRouter(({ store }) => {
  const publicRoutes = [
    { path:'/viti', name:'viti-landing', component:() => import('../pages/VitiLandingPage.vue'), meta:{publicLanding:true} },
    { path:'/viti/planes', name:'viti-plans', component:() => import('../pages/VitiPlansPage.vue'), meta:{publicLanding:true} },
    { path:'/viti/acceso', name:'viti-access', component:() => import('../pages/VitiAccessPage.vue'), meta:{publicLanding:true} },
    { path:'/planes', redirect:'/viti/planes', meta:{publicLanding:true} },
    { path:'/acceso', redirect:'/viti/acceso', meta:{publicLanding:true} },
    { path:'/presentacion', redirect:'/viti', meta:{publicLanding:true} },
  ]

  const adminAccessRoute = {
    path:'/accesos',
    component:MainLayout,
    meta:{ requiresAuth:true, adminOnly:true },
    children:[
      { path:'', name:'viti-access-requests', component:() => import('../pages/AccesosVitiPage.vue'), meta:{ requiresAuth:true, adminOnly:true } },
    ],
  }

  const router = createRouter({ history: createWebHistory(), routes:[...publicRoutes, adminAccessRoute, ...routes] })

  const redirectAlias = (to, targetBase, fallback='inicio') => {
    const raw = to.params.pathMatch
    const tail = Array.isArray(raw) ? raw.join('/') : String(raw || fallback)
    return { path:`${targetBase}/${tail || fallback}`, query:to.query, hash:to.hash }
  }

  // URLs comerciales limpias. Las rutas técnicas `electrofrio` siguen siendo las canónicas
  // por compatibilidad con clientes existentes, Flutter y enlaces ya emitidos.
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
    // La presentación, los planes y el primer acceso deben abrir incluso si el API está dormido,
    // en mantenimiento o todavía no fue configurado. Son páginas públicas de producto.
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

      // Para cuentas cliente resolvemos la empresa activa antes de montar la página.
      // Así cualquier petición del componente ya lleva X-VITI-Empresa y el backend
      // nunca tiene que adivinar entre dos negocios del mismo usuario.
      if (auth.user?.rol === 'cliente') {
        const tenant = useTenantStore(store)
        if (!tenant.loaded) {
          try { await tenant.load() } catch { /* la pantalla mostrará su error de disponibilidad */ }
        }
      }

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
