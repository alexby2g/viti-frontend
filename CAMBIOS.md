# VITI - Selector visual de colores

## Archivo incluido
- `src/components/BrandingSettingsDialog.vue`

## Cambios
- Se elimina la necesidad de escribir códigos HEX manualmente.
- Cada zona de VITI tiene su propio selector visual de color.
- Se explican claramente las áreas que modifica cada color:
  - acciones principales;
  - estados positivos;
  - acentos y llamadas;
  - fondo principal;
  - menú lateral.
- Se agrega control `Vivo → Suave` por zona para reducir intensidad sin conocer códigos.
- Se agregan paletas rápidas: VITI original, Azul nocturno, Cian tech e Índigo premium.
- La vista previa muestra simultáneamente menú, fondo, tarjetas, acciones y acentos.
- Se conserva el botón para restaurar los valores originales de VITI.
- Se mantiene la API y el modelo actual de branding, por lo que no requiere cambios de backend.
