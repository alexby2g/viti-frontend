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
    if (hasClientProfile) items.push({ label: 'Mi cuenta', icon: 'account_circle', to: '/mi-cuenta' })
    items.push(
      { label: 'Mi negocio', icon: 'storefront', to: '/mi-negocio' },
      { label: 'Aplicaciones', icon: 'apps', children: [{ label: 'Instaladas', icon: 'grid_view', to: '/mi-aplicaciones' }] },
    )
    if (isManager) {
      items.push({
        label: 'Mi proyecto',
        icon: 'account_tree',
        children: [
          { label: 'Avances y archivos', icon: 'timeline', to: '/mi-proyecto' },
          { label: 'Pagos', icon: 'payments', to: '/mi-pagos' },
        ],
      })
    }
    if (hasClientProfile && isManager) items.push({ label: 'Nueva solicitud', icon: 'assignment_add', action: 'request' })
    if (hasClientProfile) items.push({ label: 'Mi buzón', icon: 'forum', to: '/mi-buzon', badge: unreadCount })
    items.push({ label: guideLabel, icon: 'help_center', to: '/guia-viti' })
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
    { label: 'Archivos', icon: 'folder', children: [{ label: 'Archivos de empresas', icon: 'folder_shared', to: '/archivos' }] },
    { label: 'Control', icon: 'analytics', children: [{ label: 'Reportes', icon: 'picture_as_pdf', to: '/reportes' }] },
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
    const files = operational.find(item => item.label === 'Archivos')
    if (files) files.children.push({ label: 'Salud del sistema', icon: 'health_and_safety', to: '/almacenamiento' })
    operational.push({
      label: 'Administración',
      icon: 'admin_panel_settings',
      children: [
        { label: 'Usuarios', icon: 'manage_accounts', to: '/usuarios' },
        { label: 'Auditoría', icon: 'history', to: '/auditoria' },
        { label: 'Marca y apariencia', icon: 'palette', action: 'branding' },
      ],
    })
  }

  return operational
}
