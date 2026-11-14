# Pazarella Family — Código fuente

Versión: 5fcebb1c990226ee61afd5c637d9b18a0afce3d6

Incluye la tienda React, carrito, confirmación de pedido con referencia copiable,
panel administrador, inventario con variantes y precios por talla, categorías,
pedidos, botón de WhatsApp, imágenes del diseño y migraciones de base de datos.

## Preparación

- Node.js 22.13 o superior.
- Instala las dependencias con el gestor pnpm indicado en package.json.
- Consulta README.md para desarrollo, compilación y ejecución del Worker local.
- El proyecto utiliza React/TypeScript, Vinext y Cloudflare Workers con D1 y R2.

## Configuración necesaria

Esta es una copia del código de la versión alojada. Para ejecutarla con todas
sus funciones fuera del alojamiento actual debes configurar los recursos D1/R2,
aplicar las migraciones y configurar la autenticación y las variables del servidor.
La identidad de ChatGPT que utiliza app/chatgpt-auth.ts depende del alojamiento;
fuera de este debe integrarse una autenticación equivalente, sin confiar en
cabeceras proporcionadas por visitantes.

El administrador requiere ADMIN_EMAIL, ADMIN_PASSWORD_SALT,
ADMIN_PASSWORD_HASH y ADMIN_SESSION_SECRET. Los secretos actuales no se incluyen.
Consulta lib/admin-auth.ts para el formato de las variables.

No incluye dependencias instaladas, archivos compilados, base de datos de
producción, pedidos de clientes ni imágenes subidas a R2. Los recursos del diseño
sí están incluidos en public/.
