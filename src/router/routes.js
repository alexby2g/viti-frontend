const AuthLayout = () => import('../layouts/AuthLayout.vue')
const MainLayout = () => import('../layouts/MainLayout.vue')

export default [
  { path: '/configuracion-inicial', component: AuthLayout, children: [{ path: '', name: 'setup', component: () => import('../pages/SetupPage.vue') }] },
  { path: '/registro', component: AuthLayout, children: [{ path: '', name: 'client-register', component: () => import('../pages/ClientRegisterPage.vue') }] },
  { path: '/registro-cliente/:token', component: AuthLayout, children: [{ path: '', name: 'client-onboarding', component: () => import('../pages/ClientOnboardingPage.vue') }] },
  { path: '/acceso', component: AuthLayout, children: [{ path: '', name: 'viti-access', component: () => import('../pages/VitiAccessPage.vue') }] },
  { path: '/solicitud', component: AuthLayout, children: [{ path: '', name: 'public-application', component: () => import('../pages/PublicSolicitudStartPage.vue') }] },
  { path: '/solicitar/:token', component: AuthLayout, children: [{ path: '', name: 'public-request', component: () => import('../pages/PublicSolicitudPage.vue') }] },
  { path: '/login', component: AuthLayout, children: [{ path: '', name: 'login', component: () => import('../pages/LoginPage.vue') }] },
  {
    path: '/',
    component: MainLayout,
    meta: { requiresAuth: true },
    children: [
      { path: '', name: 'dashboard', component: () => import('../pages/DashboardPage.vue'), meta:{adminOnly:true} },
      { path: 'monitor', name: 'monitor', component: () => import('../pages/MonitorPage.vue'), meta:{adminOnly:true} },
      { path: 'mi-negocio', name: 'client-business', component: () => import('../pages/ClientBusinessPage.vue'), meta:{clientOnly:true} },
      { path: 'catalogo-viti', name: 'client-catalog', component: () => import('../pages/ClientCatalogPage.vue'), meta:{clientOnly:true} },
      { path: 'empresas', name: 'empresas', component: () => import('../pages/ClientesPage.vue'), meta:{adminOnly:true} },
      { path: 'clientes', redirect: '/empresas' },
      { path: 'solicitudes', name: 'solicitudes', component: () => import('../pages/SolicitudesPage.vue'), meta:{adminOnly:true} },
      { path: 'solicitudes/:id', name: 'solicitud-detalle', component: () => import('../pages/SolicitudDetallePage.vue'), meta:{adminOnly:true} },
      { path: 'proyectos', name: 'proyectos', component: () => import('../pages/ProyectosPage.vue'), meta:{adminOnly:true} },
      { path: 'proyectos/:id', name: 'proyecto-detalle', component: () => import('../pages/ProyectoDetallePage.vue'), meta:{adminOnly:true} },
      { path: 'pagos', name: 'billing', component: () => import('../pages/BillingPage.vue'), meta:{adminOnly:true,superAdminOnly:true} },
      { path: 'mantenimientos', name: 'mantenimientos', component: () => import('../pages/MantenimientosPage.vue'), meta:{adminOnly:true} },
      { path: 'archivos', name: 'archivos', component: () => import('../pages/ArchivosPage.vue'), meta:{adminOnly:true} },
      { path: 'reportes', name: 'reportes', component: () => import('../pages/ReportesPage.vue'), meta:{adminOnly:true} },
      { path: 'buzon', name: 'buzon', component: () => import('../pages/BuzonPage.vue'), meta:{adminOnly:true,superAdminOnly:true} },
      { path: 'auditoria', name: 'auditoria', component: () => import('../pages/AuditoriaPage.vue'), meta:{adminOnly:true,superAdminOnly:true} },
      { path: 'usuarios', name: 'usuarios', component: () => import('../pages/UsuariosPage.vue'), meta:{adminOnly:true,superAdminOnly:true} },
      { path: 'almacenamiento', name: 'almacenamiento', component: () => import('../pages/StoragePage.vue'), meta:{adminOnly:true,superAdminOnly:true} },
      { path: 'guia-viti', name: 'viti-guide', component: () => import('../pages/VitiGuidePage.vue') },
    ],
  },
  { path: '/:catchAll(.*)*', redirect: '/' },
]
