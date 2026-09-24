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
    const items = []
    if (hasClientProfile) items.push({ label: 'Mi espacio', icon: 'home', to: '/mi-cuenta' })
    if (hasBusiness) items.push({ label: 'Mis sistemas', icon: 'grid_view', to: '/mi-aplicaciones' })
    if (hasBusiness && (isManager || hasClientProfile)) items.push({ label: 'Mi proyecto', icon: 'account_tree', to: '/mi-proyecto' })
    if (hasClientProfile) items.push({ label: 'Atención', icon: 'forum', to: '/mi-buzon', badge: unreadCount })
    if (hasClientProfile) items.push({ label: 'Nueva solicitud', icon: 'add_circle', action: 'request' })
    return items
  }

  const items = [
    { label: 'Centro VITI', icon: 'space_dashboard', to: '/' },
    { label: 'Solicitudes', icon: 'fact_check', to: '/solicitudes' },
    { label: 'Proyectos', icon: 'account_tree', to: '/proyectos' },
    { label: 'Empresas', icon: 'business', to: '/empresas' },
    { label: 'Sistemas', icon: 'grid_view', to: '/aplicaciones' },
    { label: 'Dominios y acceso', icon: 'dns', to: '/accesos' },
    { label: 'Atención', icon: 'forum', children: [
      { label: 'Mensajes', icon: 'mark_chat_unread', to: '/buzon', badge: unreadCount },
      { label: 'Soporte', icon: 'support_agent', to: '/mantenimientos' },
    ] },
  ]

  if (isSuperAdmin) {
    items.splice(6, 0, {
      label: 'Planes y cobros',
      icon: 'sell',
      children: [
        { label: 'Planes y precios', icon: 'sell', to: '/saas' },
        { label: `Pagos ${productName}`, icon: 'receipt_long', to: '/pagos' },
      ],
    })
    items.push({
      label: 'Administración',
      icon: 'admin_panel_settings',
      children: [
        { label: 'Usuarios', icon: 'manage_accounts', to: '/usuarios' },
        { label: 'Formularios VITI', icon: 'dynamic_form', to: '/formularios-viti' },
        { label: 'Archivos', icon: 'folder_shared', to: '/archivos' },
        { label: 'Reportes', icon: 'analytics', to: '/reportes' },
        { label: 'Auditoría', icon: 'history', to: '/auditoria' },
        { label: 'Salud del sistema', icon: 'health_and_safety', to: '/almacenamiento' },
        { label: 'Marca y apariencia', icon: 'palette', action: 'branding' },
      ],
    })
  }

  return items
}
