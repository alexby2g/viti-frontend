# VITI Core Architecture

## Principle
VITI is the platform that receives requests, manages clients and projects, tracks delivery and subscriptions, and stores links to delivered systems. It is not the repository for the business code of each delivered application.

## Separation

- VITI frontend: platform UX, authentication, requests, client workspace, projects, billing, administration and application links.
- Delivered application: its own frontend, backend, database, branding, domain and mobile build.
- VITI stores only the metadata needed to register and operate the relationship with the delivered application.

## Lifecycle

Solicitud -> propuesta -> construcción externa -> registro de empresa -> propietario -> instancia -> suscripción -> entrega -> mantenimiento.

## Access

Application access can be evaluated automatically from subscription state and can also be overridden manually by the VITI administrator. Manual override is operational control; subscription state is billing control.

## Do not reintroduce application code into VITI

New products such as FitFamily, ElectroFrío or Peluquería must be developed in independent repositories and deployments. VITI should expose their URL, status, subscription and delivery metadata instead of embedding their screens and business logic.
