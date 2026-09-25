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
    if (hasClientProfile) items.push({ label: 'Inicio', icon: 'home', to: '/mi-cuenta' })
    if (hasBusiness) items.push({ label: 'Mis sistemas', icon: 'open_in_new', to: '/mi-aplicaciones' })
    if (hasBusiness && (isManager || hasClientProfile)) items.push({ label: 'Mi trabajo', icon: 'account_tree', to: '/mi-proyecto' })
    if (hasClientProfile) items.push({ label: 'Atención', icon: 'support_agent', to: '/mi-buzon', badge: unreadCount })
    if (hasClientProfile) items.push({ label: 'Nueva solicitud', icon: 'add_circle', action: 'request' })
    return items
  }

  const items = [
    { type: 'section', label: 'Operación' },
    { label: 'Inicio', icon: 'space_dashboard', to: '/' },
    { label: 'Solicitudes', icon: 'inbox', to: '/solicitudes' },
    { label: 'Trabajos', icon: 'account_tree', to: '/trabajos' },
    { label: 'Clientes', icon: 'groups', to: '/clientes' },
    { label: 'Sistemas', icon: 'language', to: '/sistemas' },
    { type: 'section', label: 'Gestión' },
    { label: 'Pagos', icon: 'payments', to: '/pagos', superAdminOnly: true },
    { label: 'Soporte', icon: 'support_agent', to: '/soporte', badge: unreadCount },
  ]

  const filtered = items.filter(item => !item.superAdminOnly || isSuperAdmin)

  if (isSuperAdmin) {
    filtered.push(
      { type: 'section', label: 'Administración' },
      {
        label: 'Administración',
        icon: 'admin_panel_settings',
        children: [
          { label: 'Planes y precios', icon: 'sell', to: '/saas' },
          { label: `Cobros ${productName}`, icon: 'receipt_long', to: '/pagos' },
          { label: 'Usuarios', icon: 'manage_accounts', to: '/usuarios' },
          { label: 'Formularios VITI', icon: 'dynamic_form', to: '/formularios-viti' },
          { label: 'Archivos', icon: 'folder_shared', to: '/archivos' },
          { label: 'Reportes', icon: 'analytics', to: '/reportes' },
          { label: 'Auditoría', icon: 'history', to: '/auditoria' },
          { label: 'Salud del sistema', icon: 'health_and_safety', to: '/almacenamiento' },
          { label: 'Marca y apariencia', icon: 'palette', action: 'branding' },
        ],
      },
    )
  }

  return filtered
}
