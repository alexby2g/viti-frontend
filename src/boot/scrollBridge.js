import { boot } from 'quasar/wrappers'

export default boot(() => {
  // Este puente existe únicamente para mouse/trackpad de escritorio.
  // En pantallas táctiles dejamos que el navegador gestione el gesto vertical
  // de forma nativa para no interferir con el scroll del teléfono.
  const desktopPointer = window.matchMedia?.('(hover: hover) and (pointer: fine)')
  if (!desktopPointer?.matches) return

  const selector = '.viti-table .q-table__middle, .sv-table .q-table__middle'

  const targetElement = (event) => event.target instanceof Element ? event.target : null

  const forwardWheelToPage = (event) => {
    if (event.defaultPrevented || event.ctrlKey || event.shiftKey) return
    if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return

    const tableScroller = targetElement(event)?.closest(selector)
    if (!tableScroller) return

    const maxTableY = tableScroller.scrollHeight - tableScroller.clientHeight
    if (maxTableY > 2) {
      const atTop = tableScroller.scrollTop <= 1
      const atBottom = tableScroller.scrollTop >= maxTableY - 1
      const leavesTable = (event.deltaY < 0 && atTop) || (event.deltaY > 0 && atBottom)
      if (!leavesTable) return
    }

    const page = document.scrollingElement
    if (!page || page.scrollHeight <= page.clientHeight + 1) return

    event.preventDefault()
    page.scrollTop += event.deltaY
  }

  const allowMiddleButtonPageAutoscroll = (event) => {
    if (event.button !== 1) return
    const tableScroller = targetElement(event)?.closest(selector)
    if (!tableScroller) return

    const maxTableY = tableScroller.scrollHeight - tableScroller.clientHeight
    if (maxTableY > 2) return

    const previousOverflow = tableScroller.style.overflow
    tableScroller.style.overflow = 'visible'
    window.setTimeout(() => {
      if (previousOverflow) tableScroller.style.overflow = previousOverflow
      else tableScroller.style.removeProperty('overflow')
    }, 0)
  }

  document.addEventListener('wheel', forwardWheelToPage, { passive: false })
  document.addEventListener('mousedown', allowMiddleButtonPageAutoscroll, true)
})
