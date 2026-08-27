# Recuperación del Moldeador

La UI recuperada usa el contrato editor del backend actual: `GET /aplicaciones/{id}?editor=1` y `PUT /aplicaciones/{id}` con `editor=true`.

La pantalla es administrativa y queda protegida por el guard `adminOnly`. No cambia las rutas de las aplicaciones entregadas.
