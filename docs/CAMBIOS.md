# Adaptación del alojamiento a Cloudflare propio

## Cambios y motivo

- `wrangler.jsonc`: configuración explícita del Worker de prueba, binding DB y BUCKET,
  carpeta de migraciones. No contiene tokens, contraseñas, cuenta Cloudflare ni origen privado.
  El UUID es un marcador que debe reemplazarse; no se ha creado un recurso remoto.
- `vite.config.ts`: usa Wrangler como única configuración de recursos. Se eliminan
  inyección de identidad simulada y plugins del alojamiento de ChatGPT. Desarrollo
  restringido a loopback por defecto.
- `worker/index.ts`: entrada directa de Vinext; deja de aceptar capacidades del
  alojamiento anterior. Añade headers de seguridad y no-cache a respuestas admin.
- `.openai/hosting.json` y `app/chatgpt-auth.ts`: eliminados de esta rama porque ya no
  son el alojamiento ni la identidad utilizados. No se ha borrado el sitio publicado.
- `db/schema.ts` y migración 0004: nuevas tablas users, sessions y auth_rate_limits.
  Las migraciones 0000–0003 y las tablas comerciales se conservan intactas.
- `lib/password.ts`: PBKDF2-SHA256 (100.000 iteraciones), sal individual y HMAC previo
  con pepper secreto del servidor. Tokens aleatorios de 256 bits, almacenados por hash.
  Esta elección usa WebCrypto de Workers y evita añadir una dependencia nativa.
- `lib/admin-auth.ts`: consulta sesiones y usuarios activos en D1; comprueba permisos de cada sección o rol owner;
  comprueba Origin con SITE_ORIGIN. Ya no confía en headers oai-authenticated-*.
- `app/api/admin/session/route.ts`: login real contra D1, error genérico para usuario
  inexistente/contraseña errónea, cookie HttpOnly/SameSite Strict y Secure en HTTPS,
  revocación persistente al salir. Tokens expiran a las 8 horas; usuario desactivado
  pierde acceso. La contraseña nunca retorna al cliente ni se guarda en localStorage.
- `lib/rate-limit.ts`: límites persistentes en D1 por origen de solicitudes; las claves
  no almacenan IP en claro. Login limitado por IP y usuario; pedidos por IP. Las
  cabeceras de IP son fiables solo detrás de Cloudflare; localhost usa un grupo local.
- `scripts/create-admin.mjs`: alta explícita desde terminal autenticada con Wrangler;
  no hay registro público, credencial predeterminada o endpoint de bootstrap abierto. El alta por terminal crea solo al principal; un índice único impide un segundo owner.
  Exige contraseña de 12–128 caracteres. Los hashes y sal van a D1, pepper a secretos.
- APIs de catálogo, categorías y fotos: lectura pública de información comercial,
  necesaria para compradores anónimos. Escritura/eliminación siguen exigiendo sesión
  admin y mismo origen. Las fotos se guardan en bucket privado y se sirven por API.
- API de pedidos: elimina dependencia de identidad ChatGPT para comprar; conserva
  validación servidor de cliente, variantes, cantidades y cálculo de precio desde D1.
  Añade límite de solicitudes. La creación solo devuelve referencia, no datos personales.
- `lib/cart-storage.ts` y `app/page.tsx`: se conserva únicamente el carrito de navegador
  con id/talla/color/cantidad, sin precio ni información de contacto. Se valida tamaño,
  tipos, cantidades y duplicados; errores de almacenamiento no rompen la página.
  Formularios no enviados y filtros continúan en memoria React, sin persistencia.
- `db/index.ts`: mensaje de configuración actualizado. `cloudflare-env.d.ts`: declara
  variables de servidor. Ninguna lleva prefijo VITE_ ni se exporta por una API.
- `package.json`: comandos explícitos para desarrollo, migraciones, alta de admin,
  build, deploy y tests. No se actualizan versiones ni se agregan dependencias.
- `tsconfig.json`: permite extensiones .ts para los tests con Node.
- README y guías: configuración real, despliegue, baja, decisiones y límites.

## Qué no se cambió

La estética, campos de checkout, precios por talla, selección de colores, edición y
eliminación de inventario, gestión de categorías, estados de pedidos, referencia
copiable y botón de WhatsApp se conservan. Los datos de negocio siguen en D1/R2;
no se exportan a archivos JSON locales ni se introducen catálogos de ejemplo.

Los enlaces de Instagram, Facebook, TikTok y wa.me son públicos por definición y
permanecen en la interfaz. Un ID de recurso no es un secreto. No se han añadido
API keys de terceros: si se integran pagos, sus claves privadas deben ir a secretos
del servidor y usarse solo en las API, nunca devolverse a React. La clave pública
que un proveedor requiera mostrar sería una excepción explícita, no una clave privada.

Los archivos antiguos de la plantilla en scripts/ y lib/connector-* que no están
importados por la aplicación se conservan para evitar una limpieza ajena al alcance;
no participan ya en autenticación ni despliegue.

## Límites pendientes y autocrítica

- No se ha desplegado ni probado contra la cuenta Cloudflare del dueño; faltan ID D1,
  activar R2, secretos, alta del administrador y prueba remota.
- No hay cuentas de compradores ni recuperación pública de contraseña: por diseño, solo el owner puede restablecer contraseñas dentro del panel, revalidando su contraseña. No hay MFA.
- PBKDF2 + pepper no sustituye MFA o un proveedor de identidad si aumenta el riesgo.
- La subida remota usa el binding IMAGES. Las pruebas locales verifican el decodificador JPEG de desarrollo; el servicio nativo debe comprobarse en la cuenta de Cloudflare.
- El limitador en D1 añade lecturas/escrituras; conviene vigilar las cuotas.
- No se puede prometer costo cero sin vigilar cuotas y configuración del plan.

## Segunda fase: reservas, idempotencia y personal interno

Detalle completo en docs/OPERACIONES.md. Se añaden la migración 0005 (incluidos triggers
SQLite), líneas de reserva, clave/hash de solicitud, vencimiento y retirada lógica de
pedidos, rol único owner, cuentas staff y permisos explícitos. Se incorporan el panel
Usuarios, el endpoint protegido de usuarios, cambio de contraseña con reautenticación
del principal y revocación de sesiones. La tabla de inventario distingue disponibles
y reservadas. Las fotos ahora se optimizan en el navegador y se reprocesan en servidor.

Las reservas son atómicas con la creación del pedido usando D1 batch y triggers que
aborten ante insuficiencia de stock o cambio de precio. La clave de idempotencia tiene
índice único y se conserva al retirar el pedido; no se acepta un cuerpo diferente con
la misma clave. No se elimina el historial de venta al retirar un pedido pagado.

La dependencia nueva jpeg-js se usa para validar/reprocesar JPEG en el entorno local;
producción usa Cloudflare Images para no consumir CPU de Worker con codificación JS.
Los tests de API ahora crean una D1/R2 temporal aislada y no modifican la D1 local de
trabajo. Se prueban concurrencia, reintentos simultáneos, liberación por cancelación y
vencimiento, permisos, restablecimiento de contraseña y revocación de la sesión afectada.
