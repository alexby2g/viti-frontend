/*
 * VITI · Protección de sistemas entregados.
 *
 * Uso (en el <head> del sistema del cliente):
 *   <script src="https://<dominio-de-viti>/viti-guard.js" defer></script>
 *
 * Al cargar, consulta a VITI el estado del dominio actual. Si el sistema está bloqueado por
 * falta de pago, suspendido manualmente o en mantenimiento, cubre la pantalla con el aviso.
 * Si VITI no responde o el dominio no está registrado, el sistema sigue funcionando.
 *
 * Atributos opcionales del <script>:
 *   data-api="https://api.ejemplo.com/api/v1"  Base de la API de VITI (por defecto, <origen del script>/api/v1).
 *   data-dominio="app.cliente.com"             Dominio a consultar (por defecto, location.hostname).
 *   data-intervalo="300"                       Segundos entre verificaciones (mínimo 60).
 */
(function () {
  'use strict'
  if (window.__vitiGuard) return
  window.__vitiGuard = true

  var script = document.currentScript || (function () {
    var list = document.getElementsByTagName('script')
    for (var i = list.length - 1; i >= 0; i--) if (/viti-guard\.js/.test(list[i].src)) return list[i]
    return null
  })()
  var data = (script && script.dataset) || {}
  var origin = ''
  try { origin = new URL(script.src).origin } catch (e) { origin = window.location.origin }
  var apiBase = String(data.api || origin + '/api/v1').replace(/\/+$/, '')
  var domain = String(data.dominio || window.location.hostname || '').toLowerCase()
  var every = Math.max(60, parseInt(data.intervalo || '300', 10) || 300) * 1000
  var host = null
  var bannerClosed = false
  var timer = null

  var icons = {
    mantenimiento: '\uD83D\uDEE0\uFE0F',
    bloqueado_pago: '\uD83D\uDD12',
    bloqueado_manual: '\u26D4',
    pausado: '\u23F8\uFE0F',
    retirado: '\uD83D\uDCE6',
    no_entregado: '\u23F3'
  }

  function formatDate(value) {
    if (!value) return ''
    var d = new Date(value)
    if (isNaN(d.getTime())) return ''
    try { return d.toLocaleString('es-BO', { dateStyle: 'medium', timeStyle: 'short' }) } catch (e) { return d.toLocaleString() }
  }

  function el(tag, attrs, text) {
    var node = document.createElement(tag)
    if (attrs) for (var key in attrs) node.setAttribute(key, attrs[key])
    if (text) node.textContent = text
    return node
  }

  function ensureHost() {
    if (host && document.body.contains(host)) return host
    host = el('div', { id: 'viti-guard', 'data-viti': 'guard' })
    host.style.cssText = 'all:initial;position:fixed;inset:0;z-index:2147483647;pointer-events:none'
    document.body.appendChild(host)
    return host
  }

  function clear() {
    if (host && host.parentNode) host.parentNode.removeChild(host)
    host = null
    document.documentElement.style.removeProperty('overflow')
  }

  var styles = ':host{all:initial}' +
    '.wrap{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;padding:18px;background:rgba(6,17,31,.94);backdrop-filter:blur(6px);font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;pointer-events:auto}' +
    '.card{width:min(520px,100%);padding:36px 28px;border-radius:24px;text-align:center;color:#edf4fb;background:linear-gradient(180deg,#0d2036,#09192b);border:1px solid rgba(92,130,165,.35);box-shadow:0 30px 80px rgba(0,0,0,.35)}' +
    '.icon{font-size:44px;line-height:1;margin-bottom:14px}' +
    '.kicker{font-size:11px;font-weight:800;letter-spacing:.16em;color:#f28b30;text-transform:uppercase}' +
    'h1{font-size:26px;line-height:1.2;margin:10px 0 6px;color:#f7fbff}' +
    '.system{font-weight:700;color:#9cc4f5;margin:0 0 8px}' +
    'p{color:#adbdcc;font-size:15px;line-height:1.6;margin:0}' +
    '.until{display:inline-block;margin-top:14px;padding:7px 13px;border-radius:999px;background:rgba(116,173,246,.12);color:#c9dcf3;font-size:13px}' +
    'button{margin-top:22px;padding:11px 20px;border:0;border-radius:12px;background:#1f6fd1;color:#fff;font-weight:700;font-size:14px;cursor:pointer}' +
    '.foot{margin-top:18px;font-size:11px;color:#61788e}' +
    '.banner{position:fixed;left:12px;right:12px;bottom:12px;display:flex;gap:12px;align-items:center;justify-content:space-between;padding:12px 16px;border-radius:14px;background:#fff7ec;color:#5b3a12;border:1px solid #f5c68c;font:14px/1.45 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.18);pointer-events:auto}' +
    '.banner button{margin:0;padding:6px 12px;background:#f28b30;font-size:13px}'

  function mount(build) {
    var container = ensureHost()
    var root = container.shadowRoot || container.attachShadow({ mode: 'open' })
    while (root.firstChild) root.removeChild(root.firstChild)
    root.appendChild(el('style', null, styles))
    root.appendChild(build())
  }

  function showBlock(info) {
    document.documentElement.style.setProperty('overflow', 'hidden', 'important')
    mount(function () {
      var wrap = el('div', { class: 'wrap', role: 'alertdialog', 'aria-modal': 'true' })
      var card = el('div', { class: 'card' })
      card.appendChild(el('div', { class: 'icon', 'aria-hidden': 'true' }, icons[info.estado] || '\u26A0\uFE0F'))
      card.appendChild(el('div', { class: 'kicker' }, info.estado === 'mantenimiento' ? 'Mantenimiento' : 'Servicio no disponible'))
      card.appendChild(el('h1', null, info.titulo || 'Sistema no disponible'))
      if (info.sistema) card.appendChild(el('div', { class: 'system' }, info.sistema))
      card.appendChild(el('p', null, info.mensaje || 'Vuelve a intentarlo m\u00E1s tarde.'))
      var until = formatDate(info.hasta)
      if (until) card.appendChild(el('div', { class: 'until' }, 'Disponible nuevamente desde ' + until))
      var retry = el('button', { type: 'button' }, 'Volver a intentar')
      retry.addEventListener('click', function () { check() })
      card.appendChild(retry)
      card.appendChild(el('div', { class: 'foot' }, 'Sistema administrado por VITI'))
      wrap.appendChild(card)
      return wrap
    })
  }

  function showNotice(text) {
    if (bannerClosed || !text) return clear()
    document.documentElement.style.removeProperty('overflow')
    mount(function () {
      var banner = el('div', { class: 'banner', role: 'status' })
      banner.appendChild(el('span', null, text))
      var close = el('button', { type: 'button' }, 'Entendido')
      close.addEventListener('click', function () { bannerClosed = true; clear() })
      banner.appendChild(close)
      return banner
    })
  }

  function apply(info) {
    if (!info || info.gestionado === false) return clear()
    if (info.permitido === false) return showBlock(info)
    if (info.aviso) return showNotice(info.aviso)
    clear()
  }

  function check() {
    if (!domain || !window.fetch) return
    var controller = window.AbortController ? new AbortController() : null
    var timeout = setTimeout(function () { if (controller) controller.abort() }, 8000)
    var wasBlocked = !!(host && host.shadowRoot && host.shadowRoot.querySelector('.wrap'))
    fetch(apiBase + '/publico/acceso?dominio=' + encodeURIComponent(domain), {
      method: 'GET', credentials: 'omit', cache: 'no-store', mode: 'cors',
      headers: { Accept: 'application/json' },
      signal: controller ? controller.signal : undefined
    }).then(function (response) {
      if (response.status === 404) return { gestionado: false }
      if (!response.ok) return null
      return response.json()
    }).then(function (info) {
      if (info === null) return
      // Si el sistema vuelve a estar disponible, recargamos para que arranque limpio.
      if (wasBlocked && info && info.permitido !== false) { clear(); window.location.reload(); return }
      apply(info)
    }).catch(function () { /* VITI no respondi\u00F3: no se interrumpe el sistema */ })
      .then(function () { clearTimeout(timeout) })
  }

  function schedule() {
    if (timer) clearInterval(timer)
    timer = setInterval(check, every)
  }

  function start() { check(); schedule() }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start)
  else start()
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') check() })
})()
