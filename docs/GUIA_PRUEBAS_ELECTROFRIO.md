# Guía de pruebas de Electrofrío en VITI

## 1. Propietario o administrador del negocio

1. Ingresa a VITI con una cuenta vinculada a un negocio que tenga Electrofrío activo.
2. Abre **Aplicaciones → Instaladas → Electrofrío**.
3. Confirma que el menú del Plan Básico muestre Inicio, Agenda, Órdenes, Clientes y equipos, Técnicos, Historial y Mensajes.
4. Crea un cliente y su equipo desde la misma sección.
5. Crea una orden, asígnale fecha, equipo y técnico; edita el diagnóstico y finaliza el servicio.
6. Busca el registro desde el buscador de la sección y exporta el historial a CSV.

Resultado esperado: los datos pertenecen únicamente al negocio activo y no aparecen Inventario, Pagos ni Garantías en el Plan Básico.

## 2. Cuentas y permisos del equipo

1. Vuelve a VITI y abre **Mi negocio → Equipo del negocio**.
2. Agrega una persona con nombre, usuario, CI, contraseña confirmada y rol Empleado.
3. Selecciona solo Agenda y Órdenes.
4. Ingresa con esa cuenta.

Resultado esperado: la cuenta solo ve los módulos permitidos; aunque intente abrir manualmente una URL de Clientes, la API responde sin autorización.

Para técnicos, abre **Electrofrío → Técnicos** y vincula el registro operativo con la cuenta personal correspondiente.

## 3. Portal de un cliente final

1. En **Clientes y equipos**, usa el botón de acceso del cliente.
2. Define usuario, CI o teléfono y una contraseña de al menos ocho caracteres con letras y números.
3. Cierra sesión y abre `/electrofrio/acceso`.
4. Ingresa con el usuario, CI o teléfono configurado.
5. Revisa equipos y órdenes, y envía un mensaje.
6. Vuelve con la cuenta del negocio a **Mensajes Electrofrío** y responde.

Resultado esperado: el cliente final solo ve sus equipos, órdenes y conversación con ese negocio. El chat no aparece en el buzón general de soporte VITI.

## 4. Revocación y conservación del historial

1. Desde la cuenta del negocio, revoca el acceso del cliente.
2. Intenta volver a abrir el portal con su sesión anterior.

Resultado esperado: el portal queda bloqueado, pero la conversación, las órdenes y el historial se conservan.

## 5. Multiempresa y administración VITI

1. Con una cuenta administrativa VITI, abre Electrofrío desde dos empresas distintas.
2. Comprueba el nombre del negocio y crea registros diferentes en cada una.
3. Alterna entre empresas desde Aplicaciones.

Resultado esperado: cada selección usa su identificador de empresa; no existe una empresa Electrofrío fija en el código ni se mezclan registros.

## 6. Móvil y calidad técnica

- Repite Agenda, Clientes, Mensajes y el portal final con un ancho de 390 px.
- Comprueba menús, tarjetas, diálogos, teclado y botones principales.
- Ejecuta `npm run lint` y `npm run build` en el frontend.
- Ejecuta `php artisan test` en el backend.

La integración continua ejecuta automáticamente lint, compilación, migraciones y pruebas de aislamiento, permisos y chat en cada pull request.
