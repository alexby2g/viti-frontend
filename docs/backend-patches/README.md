# Parche del backend (viti-backend)

`0001-control-de-acceso-y-solicitud-con-sesion.patch` contiene los cambios del backend que necesita esta versión del frontend.
Está pensado para aplicarse sobre `main` de `alexby2g/viti-backend` (commit `0ff0d7f`).

```bash
cd viti-backend
git am /ruta/a/viti-frontend/docs/backend-patches/0001-control-de-acceso-y-solicitud-con-sesion.patch
php artisan migrate --force
```

## Qué agrega

| Área | Endpoint | Uso |
|---|---|---|
| Solicitud del cliente | `POST /api/v1/mi/solicitud/enviar` | Exige sesión de cliente, plan, suscripción mensual/anual y forma de pago. El envío anónimo (`/publico/solicitud/enviar`) responde 401. |
| Panel admin | `GET /api/v1/accesos` | Lista los sistemas con su estado de acceso y dominios. |
| Dominios | `POST/PUT/DELETE /api/v1/aplicaciones/{id}/dominios[/{dominio}]` | Un dominio solo puede pertenecer a un sistema. Al guardar la URL de un sistema, su dominio se registra solo. |
| Mantenimiento | `PUT /api/v1/aplicaciones/{id}/mantenimiento` | `{activo, mensaje, hasta}`. Si hay hora de fin, se retira solo. |
| Bloqueo manual | `PUT /api/v1/aplicaciones/{id}/bloqueo` | `{activo, motivo}`. |
| Bloqueo por pago | `PUT /api/v1/aplicaciones/{id}/politica-acceso` | `{control_pago}`. Si está activo, el sistema se bloquea al vencer la suscripción y terminar los días de gracia del plan. |
| Consulta pública | `GET /api/v1/publico/acceso?dominio=` | La usa `viti-guard.js`. CORS abierto y sin datos de la empresa. |

Las rutas de sistemas entregados que pasan por el control de suscripción responden:
`402` (pago pendiente), `423` (bloqueo manual) o `503` (mantenimiento), con `bloqueo{estado, mensaje, hasta}`.

## Proteger un sistema entregado que está en otro dominio

1. En **Dominios y acceso** (`/accesos`), registra el dominio del sistema.
2. Pega en el `<head>` del sistema del cliente la línea que muestra el botón **Código de protección**:

```html
<script src="https://<dominio-de-viti>/viti-guard.js" defer></script>
```

Si VITI no responde o el dominio no está registrado, el sistema sigue funcionando con normalidad.
