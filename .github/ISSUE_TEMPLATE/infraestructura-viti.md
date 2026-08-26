---
name: Infraestructura VITI
about: Incidencias de CI, runners, Vercel y runtime
---

## Incidencia

Describir el problema de infraestructura.

## Evidencia

- GitHub Actions: jobs que terminan con `failure` y `steps: []` antes de ejecutar checkout.
- Vercel: el conector disponible puede devolver 403 al listar deployments/runtime.
- Vercel reporta builds `success` para `main` en los commits recientes.

## Objetivo

Restablecer CI ejecutable y observabilidad de deployments/runtime para frontend y backend.

## Criterios de cierre

- Los jobs ejecutan steps reales (checkout, install, lint/build/tests).
- CI verde en un push/PR nuevo.
- Vercel producción y previews consultables con logs/runtime.
- Health checks del backend y frontend verificables.
