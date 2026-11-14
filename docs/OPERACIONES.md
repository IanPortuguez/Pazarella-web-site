# Pedidos, reservas y usuarios internos

## Compradores

No se crea una cuenta para el comprador. Puede consultar la colección, guardar su
carrito y enviar nombre, dirección, teléfono y método de pago. Solo las cuentas
internas con permisos pueden consultar pedidos, contactar al cliente y gestionarlos.

## Stock

`variants_json.quantity` representa unidades DISPONIBLES para nuevas compras.
`order_lines` conserva la cantidad apartada por cada talla/color/producto y su estado.
La tabla del panel muestra disponibles y reservadas por separado.

- Pedido nuevo: se reserva durante 24 horas y baja la disponibilidad inmediatamente.
- Pago realizado: las reservas pasan a vendidas. No se resta otra vez.
- Deshacer pago: vuelve a pendiente y reservado durante 24 horas; las unidades
  continúan apartadas, no se devuelven a la venta mientras siga pendiente.
- Cancelar pendiente: devuelve las unidades exactamente una vez.
- Vencer: cancela y libera unidades. Se ejecuta cada 15 minutos por cron y también
  antes de leer catálogo/pedidos o aceptar otro pedido. No se necesita que alguien
  mantenga la web abierta para que funcione el cron desplegado.
- Retirar pedido pendiente: lo cancela y libera su reserva.
- Retirar pedido pagado: conserva la venta y NO devuelve stock.
- Un pedido cancelado no se puede reabrir ni cobrar: se crea un pedido nuevo.

La cabecera del pedido y todas sus líneas se insertan en un D1 batch transaccional.
Los triggers verifican stock y precio en la misma transacción y abortan si algo
cambió. No se confía únicamente en un SELECT anterior. Un fallo no deja ni un pedido
parcial ni descuentos parciales. El versionado del inventario también aumenta al
reservar/liberar para detectar ediciones administrativas obsoletas.

No se pueden quitar productos o variantes vinculados a pedidos activos pendientes o
pagados; primero se resuelven/retiran los pedidos. El ajuste manual de cantidades en
inventario afecta las unidades disponibles, no elimina reservas existentes.

Los pedidos anteriores a 0005 quedan marcados `stock_managed=0`: no se les descuenta
retroactivamente stock porque podría haberse ajustado manualmente. El panel advierte
que deben revisarse. Para pruebas remotas se recomienda iniciar una D1 nueva.

## Reintentos e idempotencia

El navegador mantiene solo una clave aleatoria `pazarella-checkout-key` durante el
intento de compra. No contiene datos personales. Se envía como Idempotency-Key.

D1 guarda una clave única y el hash del contenido normalizado. La misma clave con
el mismo contenido devuelve la referencia original, incluso si la primera respuesta
se perdió o dos solicitudes llegaron simultáneamente. Una clave con distinto
contenido devuelve 409. Cada compra nueva intencional utiliza una clave diferente.
No se intenta adivinar duplicados solo por nombre/teléfono porque eso bloquearía
compras legítimas. La protección se aplica a reintentos de una misma solicitud.

El botón Eliminar pedido lo retira de la lista mediante `deleted_at`. Conserva
historial y la clave de idempotencia para que un reintento no recree la compra.
Esto es un archivo lógico, no un borrado físico de datos personales. Si se requiere
purga por privacidad, debe definirse un proceso de retención que conserve un tombstone
sin datos personales; no hay una promesa de borrado físico desde este botón.

## Principal y personal

Solo puede existir un usuario `owner`, protegido por índice único en D1.
En instalaciones anteriores, la migración convierte al primer usuario creado en
owner y a los demás en staff. Comprueba cuál será el primero antes de migrar una
base con cuentas existentes. En una base nueva usa `admin:create` una vez.

El owner abre Usuarios dentro del panel para crear cuentas staff y asignar:

- orders.read: ver pedidos, datos de entrega y contactar por WhatsApp.
- orders.manage: confirmar/deshacer pago, cancelar y retirar pedidos; incluye lectura.
- inventory.read: ver inventario y opciones.
- inventory.manage: crear/modificar/eliminar prendas y opciones; incluye lectura.

El servidor verifica los permisos en cada petición. Ocultar botones no es la
protección. Staff no puede crear usuarios, elevar su rol ni cambiar contraseñas.
Desactivar una cuenta o cambiar sus permisos revoca todas sus sesiones.

Solo el owner puede cambiar contraseñas (incluida la propia) en Usuarios. Se exige
su contraseña actual para reautenticarlo. Se genera sal/hash nuevo y se revocan todas
las sesiones del usuario afectado. Si cambia su propia contraseña, debe volver a
entrar. El formulario no es público y no se agrega recuperación por email ni
registro de clientes. La recuperación excepcional de un owner que olvidó su clave
requiere intervención autenticada en la cuenta de Cloudflare, fuera de esta web.

## Imágenes

La interfaz acepta JPG/PNG/WebP de hasta 15 MB, las dibuja sobre fondo blanco y las
reduce a 1024 px para enviar JPEG optimizado. La validación del cliente solo mejora
la experiencia; no es la barrera de seguridad.

El servidor limita bytes, formato y resolución; en Cloudflare usa IMAGES.info y
una transformación nativa para volver a generar JPEG antes de guardarlo en R2.
No se guarda el archivo original proporcionado por el visitante. Localmente el
fallback explícito usa jpeg-js, con decodificación estricta y límites de memoria y
resolución, y vuelve a codificar desde píxeles. No se usa este fallback pesado en
producción. Si IMAGES falla o falta, la foto se rechaza en vez de aceptarse sin validar.

Nombres aleatorios, Content-Type fijo y nosniff evitan servir contenido activo como
HTML/SVG. La autorización para subir fotos sigue siendo inventory.manage.
No se ofrece análisis antivirus o garantía absoluta de archivos inocuos. Es un
procesamiento de imágenes real, más sólido que aceptar únicamente los primeros bytes.

Cloudflare Images tiene cuotas propias; compruébalas en tu cuenta antes de publicar.
No se contrata ningún plan desde el código. La transformación remota nativa queda
pendiente de la prueba de despliegue; los tests locales verifican el fallback.
