export type Agr006LocalAction =
  | { type: 'navigate'; to: string; label: string }
  | { type: 'browser_back'; label: string }
  | null

function normalize(value: string): string {
  return value
    .toLocaleLowerCase('es-BO')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[¡!¿?.,;:]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function hasAny(text: string, phrases: string[]): boolean {
  return phrases.some((phrase) => text.includes(phrase))
}

export function resolveAgr006LocalAction(input: string): Agr006LocalAction {
  const text = normalize(input)
  if (!text) return null

  if (hasAny(text, ['atras', 'vuelve atras', 'volver atras', 'regresa', 'volver'])) {
    return { type: 'browser_back', label: 'Volviendo atrás.' }
  }

  // Acciones seguras que abren directamente formularios existentes en VITI.
  if (hasAny(text, ['crear cliente', 'crear un cliente', 'registrar cliente', 'nuevo cliente', 'nuevo registro de cliente'])) {
    return { type: 'navigate', to: '/empresas?new=1', label: 'Abriendo el formulario para registrar un cliente.' }
  }
  if (hasAny(text, ['crear empresa', 'crear una empresa', 'registrar empresa', 'nueva empresa', 'nueva cuenta'])) {
    return { type: 'navigate', to: '/empresas?new=1', label: 'Abriendo el formulario para registrar una empresa.' }
  }
  if (hasAny(text, ['crear solicitud', 'crear una solicitud', 'nueva solicitud', 'registrar solicitud'])) {
    return { type: 'navigate', to: '/solicitud', label: 'Abriendo el formulario para crear una solicitud.' }
  }

  const openVerb = hasAny(text, [
    'abre', 'abrir', 'habre', 'habrir', 'entra', 'entrar', 'ir a',
    've a', 'vamos a', 'llevame', 'llevarme', 'quiero ver', 'quiero entrar',
    'muestrame', 'mostrar', 'ensename', 'accede a', 'acceder a',
    'navega a', 'navegar a', 'dirigeme', 'mandame', 'manda me',
  ])

  if (!openVerb) return null

  if (hasAny(text, ['cliente', 'clientes', 'registro de clientes', 'registros de clientes'])) {
    return { type: 'navigate', to: '/empresas', label: 'Abriendo clientes.' }
  }
  if (hasAny(text, ['empresa', 'empresas', 'negocio', 'negocios', 'cuenta', 'cuentas'])) {
    return { type: 'navigate', to: '/empresas', label: 'Abriendo empresas.' }
  }
  if (hasAny(text, ['solicitud', 'solicitudes', 'requerimiento', 'requerimientos'])) {
    return { type: 'navigate', to: '/solicitudes', label: 'Abriendo solicitudes.' }
  }
  if (hasAny(text, ['proyecto', 'proyectos'])) {
    return { type: 'navigate', to: '/proyectos', label: 'Abriendo proyectos.' }
  }
  if (hasAny(text, ['pago', 'pagos', 'cobro', 'cobros', 'suscripcion', 'suscripciones'])) {
    return { type: 'navigate', to: '/pagos', label: 'Abriendo pagos.' }
  }
  if (hasAny(text, ['soporte', 'soportes', 'mantenimiento', 'mantenimientos', 'incidencia', 'incidencias'])) {
    return { type: 'navigate', to: '/mantenimientos', label: 'Abriendo soporte y mantenimientos.' }
  }
  if (hasAny(text, ['usuario', 'usuarios', 'cuentas de usuario'])) {
    return { type: 'navigate', to: '/usuarios', label: 'Abriendo usuarios.' }
  }
  if (hasAny(text, ['auditoria', 'auditorias'])) {
    return { type: 'navigate', to: '/auditoria', label: 'Abriendo auditoría.' }
  }
  if (hasAny(text, ['planes', 'modulos', 'planes y modulos', 'planes y cobros'])) {
    return { type: 'navigate', to: '/planes', label: 'Abriendo planes y módulos.' }
  }
  if (hasAny(text, ['archivos', 'archivo', 'documentos', 'documentacion'])) {
    return { type: 'navigate', to: '/archivos', label: 'Abriendo archivos.' }
  }
  if (hasAny(text, ['control', 'monitoreo', 'supervision', 'watchdog'])) {
    return { type: 'navigate', to: '/control', label: 'Abriendo control y supervisión.' }
  }
  if (hasAny(text, ['guia', 'ayuda de viti', 'manual', 'como usar viti'])) {
    return { type: 'navigate', to: '/guia', label: 'Abriendo la guía de VITI.' }
  }
  if (hasAny(text, ['administracion', 'administración', 'configuracion', 'configuracion del sistema'])) {
    return { type: 'navigate', to: '/administracion', label: 'Abriendo administración.' }
  }
  if (hasAny(text, ['desarrollo', 'desarrollos', 'apps', 'aplicaciones'])) {
    return { type: 'navigate', to: '/desarrollo', label: 'Abriendo desarrollo y aplicaciones.' }
  }
  if (hasAny(text, ['atencion', 'atención', 'mesa de ayuda'])) {
    return { type: 'navigate', to: '/atencion', label: 'Abriendo atención.' }
  }
  if (hasAny(text, ['inicio', 'panel', 'dashboard', 'principal'])) {
    return { type: 'navigate', to: '/', label: 'Volviendo al inicio.' }
  }

  return null
}
