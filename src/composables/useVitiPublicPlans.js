import { computed, ref } from 'vue'
import { api } from '../boot/axios'

export const publicPlanFallback = [
  { codigo:'basico-1800', nombre:'VITI Inicial', descripcion:'Para un primer sistema con alcance claro, pocos usuarios y módulos esenciales. Ideal para digitalizar un proceso principal.', precio_proyecto:1800, precio_mensual:89, precio_anual:890, dias_prueba:14, max_usuarios:3, max_aplicaciones:1, modulos:['inicio','agenda','ordenes','clientes','equipos','tecnicos','historial','buzon'] },
  { codigo:'profesional-1950', nombre:'VITI Profesional', descripcion:'Para sistemas con más procesos, roles, pagos, reportes o integraciones, con entrega web o APK según el alcance.', precio_proyecto:2400, precio_mensual:129, precio_anual:1290, dias_prueba:14, max_usuarios:6, max_aplicaciones:1, modulos:['inicio','agenda','ordenes','clientes','equipos','tecnicos','pagos','garantias','historial','buzon'] },
  { codigo:'empresa-2500', nombre:'VITI Empresa', descripcion:'Para operaciones con mayor volumen, más usuarios, varios módulos o múltiples sistemas administrados desde VITI.', precio_proyecto:3200, precio_mensual:189, precio_anual:1890, dias_prueba:14, max_usuarios:15, max_aplicaciones:3, modulos:['inicio','agenda','ordenes','clientes','equipos','tecnicos','inventario','pagos','garantias','historial','buzon'] },
  { codigo:'personalizado', nombre:'Cotización personalizada', descripcion:'Para APK específicas, integraciones, varias sucursales, módulos especiales o proyectos con alcance técnico a medida.', precio_proyecto:null, precio_mensual:null, precio_anual:null, dias_prueba:14, max_usuarios:null, max_aplicaciones:null, modulos:[] },
]
export const publicModuleLabels = { inicio:'Panel principal', agenda:'Agenda', ordenes:'Órdenes de servicio', clientes:'Clientes', equipos:'Equipos', tecnicos:'Técnicos', inventario:'Inventario', pagos:'Pagos', garantias:'Garantías', historial:'Historial', buzon:'Buzón y soporte' }
export function useVitiPublicPlans() {
  const loading=ref(true), online=ref(false), plans=ref([]), billingMode=ref('mensual')
  const currentPlans=computed(()=>plans.value.length?plans.value:publicPlanFallback)
  const annualSaving=plan=>plan.precio_mensual==null||plan.precio_anual==null?0:Math.max(0,Number(plan.precio_mensual)*12-Number(plan.precio_anual))
  const money=value=>value==null?'Cotizar':`${Number(value).toFixed(0)} Bs`
  const modules=plan=>Array.isArray(plan.modulos)?plan.modulos:[]
  const accessTo=plan=>({path:'/solicitud',query:{plan:plan.codigo}})
  const load=async()=>{loading.value=true;try{const response=await api.get('/publico/planes');plans.value=response.data?.data||[];online.value=plans.value.length>0}catch{plans.value=[];online.value=false}finally{loading.value=false}}
  return {loading,online,plans,billingMode,currentPlans,annualSaving,money,modules,accessTo,load}
}
