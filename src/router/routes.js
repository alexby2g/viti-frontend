import AuthLayout from '../layouts/AuthLayout.vue'
import MainLayout from '../layouts/MainLayout.vue'

export default [
  { path: '/configuracion-inicial', component: AuthLayout, children: [{ path: '', name: 'setup', component: () => import('../pages/SetupPage.vue') }] },
  { path: '/registro', component: AuthLayout, children: [{ path: '', name: 'client-register', component: () => import('../pages/ClientRegisterPage.vue') }] },
  { path: '/solicitar/:token', component: AuthLayout, children: [{ path: '', name: 'public-request', component: () => import('../pages/PublicSolicitudPage.vue') }] },
  { path: '/login', component: AuthLayout, children: [{ path: '', name: 'login', component: () => import('../pages/LoginPage.vue') }] },
  {
    path: '/', component: MainLayout, meta: { requiresAuth: true }, children: [
      { path: '', name: 'dashboard', component: () => import('../pages/DashboardPage.vue'), meta:{adminOnly:true} },
      { path: 'mi-cuenta', name: 'client-portal', component: () => import('../pages/ClientPortalPage.vue'), meta:{clientOnly:true} },
      { path: 'mi-proyecto', name: 'client-project', component: () => import('../pages/ClientProjectPage.vue'), meta:{clientOnly:true} },
      { path: 'mi-buzon', name: 'client-messages', component: () => import('../pages/ClientMessagesPage.vue'), meta:{clientOnly:true} },
      { path: 'clientes', name: 'clientes', component: () => import('../pages/ClientesPage.vue'), meta:{adminOnly:true} },
      { path: 'empresas', redirect: '/clientes' },
      { path: 'solicitudes', name: 'solicitudes', component: () => import('../pages/SolicitudesPage.vue'), meta:{adminOnly:true} },
      { path: 'solicitudes/:id', name: 'solicitud-detalle', component: () => import('../pages/SolicitudDetallePage.vue'), meta:{adminOnly:true} },
      { path: 'proyectos', name: 'proyectos', component: () => import('../pages/ProyectosPage.vue'), meta:{adminOnly:true} },
      { path: 'proyectos/:id', name: 'proyecto-detalle', component: () => import('../pages/ProyectoDetallePage.vue'), meta:{adminOnly:true} },
      { path: 'aplicaciones', name: 'aplicaciones', component: () => import('../pages/AplicacionesPage.vue'), meta:{adminOnly:true} },
      { path: 'mantenimientos', name: 'mantenimientos', component: () => import('../pages/MantenimientosPage.vue'), meta:{adminOnly:true} },
      { path: 'archivos', name: 'archivos', component: () => import('../pages/ArchivosPage.vue'), meta:{adminOnly:true} },
      { path: 'reportes', name: 'reportes', component: () => import('../pages/ReportesPage.vue'), meta:{adminOnly:true} },
      { path: 'buzon', name: 'buzon', component: () => import('../pages/BuzonPage.vue'), meta:{adminOnly:true} },
      { path: 'auditoria', name: 'auditoria', component: () => import('../pages/AuditoriaPage.vue'), meta:{adminOnly:true} },
    ],
  },
  { path: '/:catchAll(.*)*', redirect: '/' },
]
