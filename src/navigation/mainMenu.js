export function buildMainMenu({
  isClient,
  isSuperAdmin,
  hasClientProfile,
  isManager,
  unreadCount = 0,
  productName = 'VITI',
}) {
  const guideLabel = `Guía ${productName}`

  if (isClient) {
    const items = []
    if (hasClientProfile) items.push({ label: 'Mi espacio', icon: 'home', to: '/mi-cuenta' })
    items.push({ label: 'Mi aplicación', icon: 'apps', to: '/mi-aplicaciones' })
    if (isManager || hasClientProfile) items.push({ label: 'Mi proyecto', icon: 'account_tree', to: '/mi-proyecto' })
    if (hasClientProfile) items.push({ label: 'Atención al cliente', icon: 'support_agent', to: '/mi-buzon', badge: unreadCount })
    if (hasClientProfile) items.push({ label: 'Nueva solicitud', icon: 'add_circle', action: 'request' })
    return items
  }

  const operational = [
    { label: 'Inicio', icon: 'dashboard', to: '/' },
    { label: 'Empresas', icon: 'business', to: '/empresas' },
    { label: 'Desarrollo', icon: 'terminal', children: [
      { label: 'Solicitudes', icon: 'fact_check', to: '/solicitudes' },
      { label: 'Proyectos', icon: 'account_tree', to: '/proyectos' },
      { label: 'Aplicaciones', icon: 'apps', to: '/aplicaciones' },
    ] },
    { label: 'Atención', icon: 'forum', children: [
      { label: 'Mensajes de empresas', icon: 'mark_chat_unread', to: '/buzon', badge: unreadCount },
      { label: 'Casos de soporte', icon: 'build_circle', to: '/mantenimientos' },
    ] },
    { label: 'Control', icon: 'analytics', children: [
      { label: 'Centro de actividad', icon: 'notifications_active', to: '/actividad', badge: unreadCount },
      { label: 'Centro de monitoreo', icon: 'monitor_heart', to: '/monitor' },
      { label: 'Reportes', icon: 'picture_as_pdf', to: '/reportes' },
    ] },
    { label: 'Archivos', icon: 'folder', children: [{ label: 'Archivos de empresas', icon: 'folder_shared', to: '/archivos' }] },
    { label: guideLabel, icon: 'help_center', to: '/guia-viti' },
  ]

  if (isSuperAdmin) {
    const development = operational.find(item => item.label === 'Desarrollo')
    if (development) development.children.push({ label: 'AppHub', icon: 'hub', to: '/apphub' })

    operational.splice(1, 0, {
      label: 'Planes y cobros',
      icon: 'hub',
      children: [
        { label: 'Planes y módulos', icon: 'cloud_circle', to: '/saas' },
        { label: `Pagos ${productName}`, icon: 'payments', to: '/pagos' },
      ],
    })
    operational.push({
      label: 'Administración',
      icon: 'admin_panel_settings',
      children: [
        { label: 'Usuarios', icon: 'manage_accounts', to: '/usuarios' },
        { label: 'Solicitudes de acceso', icon: 'person_add_alt_1', to: '/accesos' },
        { label: 'Auditoría', icon: 'history', to: '/auditoria' },
        { label: 'Marca y apariencia', icon: 'palette', action: 'branding' },
        { label: 'Almacenamiento', icon: 'cloud_queue', to: '/almacenamiento' },
      ],
    })
  }

  return operational
}
