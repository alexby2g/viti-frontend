// Mapeo transitorio de Peluquería sobre las claves canónicas actuales de VITI.
// No crea nuevas claves: `ordenes` representa la capacidad visible "Servicios"
// y `historial` incluye actualmente historial + reportes.
export const PELUQUERIA_MENU_ITEMS = Object.freeze([
  { module:'inicio', label:'Inicio', icon:'dashboard', to:'/mi-apps/peluqueria/inicio' },
  { module:'agenda', label:'Agenda', icon:'event', to:'/mi-apps/peluqueria/agenda' },
  { module:'clientes', label:'Clientes', icon:'groups', to:'/mi-apps/peluqueria/clientes' },
  { module:'ordenes', label:'Servicios', icon:'content_cut', to:'/mi-apps/peluqueria/servicios' },
  { module:'inventario', label:'Productos', icon:'inventory_2', to:'/mi-apps/peluqueria/productos' },
  { module:'tecnicos', label:'Personal', icon:'badge', to:'/mi-apps/peluqueria/personal' },
  { module:'ordenes', label:'Atenciones', icon:'point_of_sale', to:'/mi-apps/peluqueria/atenciones' },
  { module:'pagos', label:'Caja', icon:'payments', to:'/mi-apps/peluqueria/caja' },
  { module:'historial', label:'Historial', icon:'history', to:'/mi-apps/peluqueria/historial' },
  { module:'historial', label:'Reportes', icon:'analytics', to:'/mi-apps/peluqueria/reportes' },
])

export const PELUQUERIA_SUPPORTED_MODULES = Object.freeze([
  'inicio','agenda','ordenes','clientes','tecnicos','inventario','pagos','historial',
])

export function peluqueriaModuleForPath(path) {
  return PELUQUERIA_MENU_ITEMS.find(item => item.to === path)?.module || null
}

export function filterPeluqueriaMenu(hasModule) {
  return PELUQUERIA_MENU_ITEMS.filter(item => hasModule(item.module))
}
