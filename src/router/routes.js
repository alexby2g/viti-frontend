import AuthLayout from '../layouts/AuthLayout.vue'
import MainLayout from '../layouts/MainLayout.vue'
import PeluqueriaClientLayout from '../layouts/PeluqueriaClientLayout.vue'
import PeluqueriaAdminLayout from '../layouts/PeluqueriaAdminLayout.vue'
import ElectrofrioLayout from '../layouts/ElectrofrioLayout.vue'
import ElectrofrioCustomerLayout from '../layouts/ElectrofrioCustomerLayout.vue'
import SoporteVitalLayout from '../layouts/SoporteVitalLayout.vue'

const hairPage = () => import('../pages/ClientPeluqueriaWorkspacePage.vue')
const electroPage = () => import('../pages/ElectrofrioWorkspacePage.vue')
const supportPage = () => import('../pages/SoporteVitalWorkspacePage.vue')

function supportChildren(client=false) {
  const base=client?'/mi-apps/servicio-tecnico':'/apps/servicio-tecnico'
  const authMeta=client?{requiresAuth:true,clientOnly:true,appShell:'servicio-tecnico'}:{requiresAuth:true,adminOnly:true,appShell:'servicio-tecnico'}
  const prefix=client?'support-client':'support'
  return [
    {path:'',redirect:`${base}/inicio`},
    {path:'inicio',name:`${prefix}-home`,component:supportPage,meta:{...authMeta,supportSection:'inicio'}},
    {path:'clientes',name:`${prefix}-clients`,component:supportPage,meta:{...authMeta,supportSection:'clientes'}},
    {path:'equipos',name:`${prefix}-equipment`,component:supportPage,meta:{...authMeta,supportSection:'equipos'}},
    {path:'tecnicos',name:`${prefix}-technicians`,component:supportPage,meta:{...authMeta,supportSection:'tecnicos'}},
    {path:'ordenes',name:`${prefix}-orders`,component:supportPage,meta:{...authMeta,supportSection:'ordenes'}},
    {path:'agenda',name:`${prefix}-agenda`,component:supportPage,meta:{...authMeta,supportSection:'agenda'}},
    {path:'pagos',name:`${prefix}-payments`,component:supportPage,meta:{...authMeta,supportSection:'pagos'}},
    {path:'garantias',name:`${prefix}-warranties`,component:supportPage,meta:{...authMeta,supportSection:'garantias'}},
    {path:'historial',name:`${prefix}-history`,component:supportPage,meta:{...authMeta,supportSection:'historial'}},
  ]
}

export default [
  { path: '/configuracion-inicial', component: AuthLayout, children: [{ path: '', name: 'setup', component: () => import('../pages/SetupPage.vue') }] },
  { path: '/registro', component: AuthLayout, children: [{ path: '', name: 'client-register', component: () => import('../pages/ClientRegisterPage.vue') }] },
  { path: '/registro-cliente/:token', component: AuthLayout, children: [{ path: '', name: 'client-onboarding', component: () => import('../pages/ClientOnboardingPage.vue') }] },
  { path: '/solicitud', component: AuthLayout, children: [{ path: '', name: 'public-request-start', component: () => import('../pages/PublicSolicitudStartPage.vue') }] },
  { path: '/solicitar/:token', component: AuthLayout, children: [{ path: '', name: 'public-request', component: () => import('../pages/PublicSolicitudPage.vue') }] },
  { path: '/login', component: AuthLayout, children: [{ path: '', name: 'login', component: () => import('../pages/LoginPage.vue') }] },
  { path:'/electrofrio/acceso',component:AuthLayout,children:[{path:'',name:'electro-customer-login',component:()=>import('../pages/ElectrofrioCustomerLoginPage.vue')}]},
  { path:'/portal/electrofrio',component:ElectrofrioCustomerLayout,meta:{requiresAuth:true,electroCustomerOnly:true},children:[
    {path:'',redirect:'/portal/electrofrio/inicio'},
    {path:'inicio',name:'electro-customer-home',component:()=>import('../pages/ElectrofrioCustomerHomePage.vue'),meta:{requiresAuth:true,electroCustomerOnly:true}},
    {path:'mensajes',name:'electro-customer-messages',component:()=>import('../pages/ClientMessagesPage.vue'),meta:{requiresAuth:true,electroCustomerOnly:true,chatContext:'electrofrio',customerPortal:true}},
  ]},
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
  { path:'/apps/peluqueria', component:PeluqueriaAdminLayout, meta:{requiresAuth:true,adminOnly:true,appShell:'peluqueria-admin'}, children:[{path:'',name:'app-peluqueria',component:()=>import('../pages/PeluqueriaPage.vue'),meta:{requiresAuth:true,adminOnly:true,appShell:'peluqueria-admin'}}] },
  {
    path:'/mi-apps/electrofrio', component:ElectrofrioLayout, meta:{requiresAuth:true,clientOnly:true,appShell:'electrofrio'}, children:[
      {path:'',redirect:'/mi-apps/electrofrio/inicio'},
      {path:'inicio',name:'electro-client-home',component:electroPage,meta:{requiresAuth:true,clientOnly:true,appShell:'electrofrio',electroSection:'inicio'}},
      {path:'agenda',name:'electro-client-agenda',component:electroPage,meta:{requiresAuth:true,clientOnly:true,appShell:'electrofrio',electroSection:'agenda'}},
      {path:'ordenes',name:'electro-client-orders',component:electroPage,meta:{requiresAuth:true,clientOnly:true,appShell:'electrofrio',electroSection:'ordenes'}},
      {path:'clientes',name:'electro-client-clients',component:electroPage,meta:{requiresAuth:true,clientOnly:true,appShell:'electrofrio',electroSection:'clientes'}},
      {path:'equipos',redirect:'/mi-apps/electrofrio/clientes'},
      {path:'tecnicos',name:'electro-client-technicians',component:electroPage,meta:{requiresAuth:true,clientOnly:true,appShell:'electrofrio',electroSection:'tecnicos'}},
      {path:'inventario',name:'electro-client-inventory',component:electroPage,meta:{requiresAuth:true,clientOnly:true,appShell:'electrofrio',electroSection:'inventario'}},
      {path:'pagos',name:'electro-client-payments',component:electroPage,meta:{requiresAuth:true,clientOnly:true,appShell:'electrofrio',electroSection:'pagos'}},
      {path:'garantias',name:'electro-client-warranties',component:electroPage,meta:{requiresAuth:true,clientOnly:true,appShell:'electrofrio',electroSection:'garantias'}},
      {path:'historial',name:'electro-client-history',component:electroPage,meta:{requiresAuth:true,clientOnly:true,appShell:'electrofrio',electroSection:'historial'}},
      {path:'buzon',name:'electro-client-inbox',component:()=>import('../pages/BuzonPage.vue'),meta:{requiresAuth:true,clientOnly:true,appShell:'electrofrio',chatContext:'electrofrio'}},
    ],
  },
  { path:'/mi-aplicaciones/electrofrio', redirect:'/mi-apps/electrofrio/inicio' },
  {
    path:'/apps/electrofrio', component:ElectrofrioLayout, meta:{requiresAuth:true,adminOnly:true,appShell:'electrofrio'}, children:[
      {path:'',redirect:'/apps/electrofrio/inicio'},
      {path:'inicio',name:'electro-home',component:electroPage,meta:{requiresAuth:true,adminOnly:true,appShell:'electrofrio',electroSection:'inicio'}},
      {path:'agenda',name:'electro-agenda',component:electroPage,meta:{requiresAuth:true,adminOnly:true,appShell:'electrofrio',electroSection:'agenda'}},
      {path:'ordenes',name:'electro-orders',component:electroPage,meta:{requiresAuth:true,adminOnly:true,appShell:'electrofrio',electroSection:'ordenes'}},
      {path:'clientes',name:'electro-clients',component:electroPage,meta:{requiresAuth:true,adminOnly:true,appShell:'electrofrio',electroSection:'clientes'}},
      {path:'equipos',redirect:'/apps/electrofrio/clientes'},
      {path:'tecnicos',name:'electro-technicians',component:electroPage,meta:{requiresAuth:true,adminOnly:true,appShell:'electrofrio',electroSection:'tecnicos'}},
      {path:'inventario',name:'electro-inventory',component:electroPage,meta:{requiresAuth:true,adminOnly:true,appShell:'electrofrio',electroSection:'inventario'}},
      {path:'pagos',name:'electro-payments',component:electroPage,meta:{requiresAuth:true,adminOnly:true,appShell:'electrofrio',electroSection:'pagos'}},
      {path:'garantias',name:'electro-warranties',component:electroPage,meta:{requiresAuth:true,adminOnly:true,appShell:'electrofrio',electroSection:'garantias'}},
      {path:'historial',name:'electro-history',component:electroPage,meta:{requiresAuth:true,adminOnly:true,appShell:'electrofrio',electroSection:'historial'}},
      {path:'buzon',name:'electro-inbox',component:()=>import('../pages/BuzonPage.vue'),meta:{requiresAuth:true,adminOnly:true,appShell:'electrofrio',chatContext:'electrofrio'}},
    ],
  },
  { path:'/mi-apps/servicio-tecnico', component:SoporteVitalLayout, meta:{requiresAuth:true,clientOnly:true,appShell:'servicio-tecnico'}, children:supportChildren(true) },
  { path:'/mi-aplicaciones/servicio-tecnico', redirect:'/mi-apps/servicio-tecnico/inicio' },
  { path:'/apps/servicio-tecnico', component:SoporteVitalLayout, meta:{requiresAuth:true,adminOnly:true,appShell:'servicio-tecnico'}, children:supportChildren(false) },
  {
    path: '/', component: MainLayout, meta: { requiresAuth: true }, children: [
      { path: '', name: 'dashboard', component: () => import('../pages/DashboardPage.vue'), meta:{adminOnly:true} },
      { path: 'mi-cuenta', name: 'client-portal', component: () => import('../pages/ClientPortalPage.vue'), meta:{clientOnly:true} },
      { path: 'mi-negocio', name: 'client-business', component: () => import('../pages/ClientBusinessPage.vue'), meta:{clientOnly:true} },
      { path: 'catalogo-viti', name: 'client-catalog', component: () => import('../pages/ClientCatalogPage.vue'), meta:{clientOnly:true} },
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
      { path: 'apps/externa/:id', name: 'external-app', component: () => import('../pages/ExternalAppPage.vue') },
      { path: 'saas', name: 'saas', component: () => import('../pages/SaasPage.vue'), meta:{adminOnly:true,superAdminOnly:true} },
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
