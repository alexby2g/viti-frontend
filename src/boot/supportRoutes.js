import { boot } from 'quasar/wrappers'
import InternalSupportLayout from '../layouts/InternalSupportLayout.vue'

export default boot(({ router }) => {
  router.addRoute({
    path:'/soporte',
    component:InternalSupportLayout,
    meta:{requiresAuth:true,supportOnly:true},
    children:[
      {path:'',name:'support-internal-home',component:()=>import('../pages/InternalSupportDashboardPage.vue'),meta:{requiresAuth:true,supportOnly:true}},
      {path:'buzon',name:'support-internal-inbox',component:()=>import('../pages/InternalSupportInboxPage.vue'),meta:{requiresAuth:true,supportOnly:true}},
    ],
  })
})
