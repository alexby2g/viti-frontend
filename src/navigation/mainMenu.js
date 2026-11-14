// Un único acceso por tarea cotidiana. Las herramientas secundarias
// siguen disponibles y las rutas existentes no se eliminan.
export function buildMainMenu({
  isClient,
  isSuperAdmin,
  hasClientProfile,
  hasBusiness,
  isManager,
  unreadCount = 0,
  productName = 'VITI',
}) {
  if (isClient) {
    const items = [{ type: 'section', label: 'Mi espacio' }]
    if (hasClientProfile) items.push({ label: 'Inicio y solicitudes', icon: 'home', to: '/mi-cuenta' })
    if (hasBusiness && (isManager || hasClientProfile)) {
      items.push({ label: 'Mi proyecto', icon: 'account_tree', to: '/mi-proyecto' })
      items.push({ label: 'Pagos y comprobantes', icon: 'receipt_long', to: '/mi-pagos' })
    }
    if (hasBusiness) items.push({ label: 'Mis sistemas', icon: 'open_in_new', to: '/mi-aplicaciones' })
    if (hasClientProfile) {
      items.push({ label: 'Mensajes', icon: 'support_agent', to: '/mi-buzon', badge: unreadCount })
      items.push({ label: 'Solicitar otro proyecto', icon: 'add_circle', action: 'request' })
    }
    return items
  }

  const items = [
    { type: 'section', label: 'Centro de trabajo' },
    { label: 'Inicio', icon: 'space_dashboard', to: '/' },
    { label: 'Solicitudes', icon: 'inbox', to: '/solicitudes' },
    ...(isSuperAdmin ? [{ label: 'Pagos', icon: 'receipt_long', to: '/pagos' }] : []),
    { label: 'Trabajos', icon: 'account_tree', to: '/trabajos' },
    { label: 'Sistemas', icon: 'language', to: '/sistemas' },
    { label: 'Soporte', icon: 'support_agent', to: '/soporte', badge: unreadCount },
    { type: 'section', label: 'Herramientas' },
    {
      label: 'Más herramientas',
      icon: 'tune',
      children: [
        { label: 'Clientes y negocios', icon: 'groups', to: '/clientes' },
        { label: 'Archivos y entregables', icon: 'folder_shared', to: '/archivos' },
        { label: 'Reportes', icon: 'analytics', to: '/reportes' },
      ],
    },
  ]

  if (isSuperAdmin) {
    items.push(
      {
        label: 'Configuración avanzada',
        icon: 'admin_panel_settings',
        children: [
          { label: 'Planes y precios', icon: 'sell', to: '/saas' },
          { label: 'Usuarios', icon: 'manage_accounts', to: '/usuarios' },
          { label: 'Formulario de apoyo', icon: 'dynamic_form', to: '/formularios-viti' },
          { label: 'Auditoría', icon: 'history', to: '/auditoria' },
          { label: 'Salud del sistema', icon: 'health_and_safety', to: '/almacenamiento' },
          { label: 'Marca y apariencia', icon: 'palette', action: 'branding' },
        ],
      },
    )
  }

  return items
}
