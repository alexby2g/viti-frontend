import AuthLayout from '../layouts/AuthLayout.vue'
import MainLayout from '../layouts/MainLayout.vue'
import PeluqueriaClientLayout from '../layouts/PeluqueriaClientLayout.vue'

const hairPage = () => import('../pages/ClientPeluqueriaWorkspacePage.vue')

export default [
  { path: '/configuracion-inicial', component: AuthLayout, children: [{ path: '', name: 'setup', component: () => import('../pages/SetupPage.vue') }] },
  { path: '/registro', component: AuthLayout, children: [{ path: '', name: 'client-register', component: () => import('../pages/ClientRegisterPage.vue') }] },
  { path: '/registro-cliente/:token', component: AuthLayout, children: [{ path: '', name: 'client-onboarding', component: () => import('../pages/ClientOnboardingPage.vue') }] },
  { path: '/solicitud', component: AuthLayout, children: [{ path: '', name: 'public-request-start', component: () => import('../pages/PublicSolicitudStartPage.vue') }] },
  { path: '/solicitar/:token', component: AuthLayout, children: [{ path: '', name: 'public-request', component: () => import('../pages/PublicSolicitudPage.vue') }] },
  { path: '/login', component: AuthLayout, children: [{ path: '', name: 'login', component: () => import('../pages/LoginPage.vue') }] },
  {
    path: '/mi-apps/peluqueria', component: PeluqueriaClientLayout, meta: { requiresAuth:true, clientOnly:true, appShell:'peluqueria' }, children: [
      { path:'', redirect:'/mi-apps/peluqueria/inicio' },
      { path:'inicio', name:'hair-client-home', component:hairPage, meta:{requiresAuth:true,clientOnly:true,appShell:'peluqueria',hairSection:'inicio'} },
      { path:'agenda', name:'hair-client-agenda', component:hairPage, meta:{requiresAuth:true,clientOnly:true,appShell:'peluqueria',hairSection:'agenda'} },
      { path:'clientes', name:'hair-client-clients', component:hairPage, meta:{requiresAuth:true,clientOnly:true,appShell:'peluqueria',hairSection:'clientes'} },
      { path:'servicios', name:'hair-client-services', component:()=>import('../pages/ClientPeluqueriaCatalogPage.vue'), meta:{requiresAuth:true,clientOnly:true,appShell:'peluqueria'} },
      { path:'productos', name:'hair-client-products', component:()=>import('../pages/ClientPeluqueriaProductsPage.vue'), meta:{requiresAuth:true,clientOnly:true,appShell:'peluqueria'} },
      { path:'personal', name:'hair-client-staff', component:hairPage, meta:{requiresAuth:true,clientOnly:true,appShell:'peluqueria',hairSection:'personal'} },
      { path:'atenciones', name:'hair-client-care', component:hairPage, meta:{requiresAuth:true,clientOnly:true,appShell:'peluqueria',hairSection:'atenciones'} },
      { path:'caja', name:'hair-client-cash', component:hairPage, meta:{requiresAuth:true,clientOnly:true,appShell:'peluqueria',hairSection:'caja'} },
      { path:'historial', name:'hair-client-history', component:hairPage, meta:{requiresAuth:true,clientOnly:true,appShell:'peluqueria',hairSection:'historial'} },
      { path:'reportes', name:'hair-client-reports', component:()=>import('../pages/ClientPeluqueriaReportsPage.vue'), meta:{requiresAuth:true,clientOnly:true,appShell:'peluqueria'} },
    ],
  },
  { path:'/mi-aplicaciones/peluqueria', redirect:'/mi-apps/peluqueria/inicio' },
  {
    path: '/', component: MainLayout, meta: { requiresAuth: true }, children: [
      { path: '', name: 'dashboard', component: () => import('../pages/DashboardPage.vue'), meta:{adminOnly:true} },
      { path: 'mi-cuenta', name: 'client-portal', component: () => import('../pages/ClientPortalPage.vue'), meta:{clientOnly:true} },
      { path: 'mi-aplicaciones', name: 'client-apps', component: () => import('../pages/ClientAppsPage.vue'), meta:{clientOnly:true} },
      { path: 'mi-pagos', name: 'client-billing', component: () => import('../pages/ClientBillingPage.vue'), meta:{clientOnly:true} },
      { path: 'mi-proyecto', name: 'client-project', component: () => import('../pages/ClientProjectPage.vue'), meta:{clientOnly:true} },
      { path: 'mi-buzon', name: 'client-messages', component: () => import('../pages/ClientMessagesPage.vue'), meta:{clientOnly:true} },
      { path: 'clientes', name: 'clientes', component: () => import('../pages/ClientesPage.vue'), meta:{adminOnly:true} },
      { path: 'empresas', redirect: '/clientes' },
      { path: 'solicitudes', name: 'solicitudes', component: () => import('../pages/SolicitudesPage.vue'), meta:{adminOnly:true} },
      { path: 'solicitudes/:id', name: 'solicitud-detalle', component: () => import('../pages/SolicitudDetallePage.vue'), meta:{adminOnly:true} },
      { path: 'proyectos', name: 'proyectos', component: () => import('../pages/ProyectosPage.vue'), meta:{adminOnly:true} },
      { path: 'proyectos/:id', name: 'proyecto-detalle', component: () => import('../pages/ProyectoDetallePage.vue'), meta:{adminOnly:true} },
      { path: 'aplicaciones', name: 'aplicaciones', component: () => import('../pages/AplicacionesPage.vue'), meta:{adminOnly:true} },
      { path: 'apps/peluqueria', name: 'app-peluqueria', component: () => import('../pages/PeluqueriaPage.vue'), meta:{adminOnly:true} },
      { path: 'pagos', name: 'billing', component: () => import('../pages/BillingPage.vue'), meta:{adminOnly:true} },
      { path: 'mantenimientos', name: 'mantenimientos', component: () => import('../pages/MantenimientosPage.vue'), meta:{adminOnly:true} },
      { path: 'archivos', name: 'archivos', component: () => import('../pages/ArchivosPage.vue'), meta:{adminOnly:true} },
      { path: 'reportes', name: 'reportes', component: () => import('../pages/ReportesPage.vue'), meta:{adminOnly:true} },
      { path: 'buzon', name: 'buzon', component: () => import('../pages/BuzonPage.vue'), meta:{adminOnly:true} },
      { path: 'auditoria', name: 'auditoria', component: () => import('../pages/AuditoriaPage.vue'), meta:{adminOnly:true} },
      { path: 'almacenamiento', name: 'almacenamiento', component: () => import('../pages/StoragePage.vue'), meta:{adminOnly:true} },
    ],
  },
  { path: '/:catchAll(.*)*', redirect: '/' },
]
