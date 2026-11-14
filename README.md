# Pazarella Family

Tienda React/TypeScript con Vinext, Cloudflare Workers, D1 y R2.
La rama `cloudflare-pruebas` funciona sin la autenticación del alojamiento de ChatGPT.

## Dónde viven los datos

| Información | Ubicación y autoridad |
| --- | --- |
| Productos, tallas, colores, categorías, precios y existencias | D1, mediante las API del servidor |
| Pedidos, datos de entrega y estado de pago | D1; solo el administrador puede consultarlos |
| Fotografías cargadas | R2 privado; GET público de imágenes de catálogo mediante el Worker |
| Usuarios y hashes de contraseña | D1; no hay contraseña predeterminada ni registro público |
| Sesiones | D1 guarda el hash del token; cookie HttpOnly en navegador |
| Carrito antes de comprar | localStorage solo con id/color/talla/cantidad; validado, sin precios ni datos personales |
| Selecciones y formularios sin enviar | Estado de React en memoria |
| AUTH_PEPPER y SITE_ORIGIN | Configuración del servidor; nunca se envían al cliente |
| Logos, iconos y foto general del diseño | Archivos públicos versionados en public/ |

El carrito local es una comodidad, no una base de datos ni una reserva de existencias.
El total del pedido siempre se calcula de nuevo en el servidor a partir de D1.

## Preparación

Requiere Node >=22.13 y pnpm indicado en package.json:

```sh
npx --yes pnpm@11.25.0 install --frozen-lockfile
```

Crea `.dev.vars` en la raíz (está excluido de Git). Usa tu propia clave aleatoria, de al menos 32 caracteres:

```text
SITE_ORIGIN="http://localhost:5173"
AUTH_PEPPER="REEMPLAZAR_POR_UN_SECRETO_ALEATORIO"
```

Puedes generar el secreto con `openssl rand -hex 32`. No lo compartas ni lo subas a GitHub.
AUTH_PEPPER debe ser el mismo al crear el usuario y al ejecutar el servidor. Cambiarlo
invalida la comprobación de las contraseñas existentes; hay que restablecerlas.

Para una base local nueva:

```sh
npx --yes pnpm@11.25.0 run db:migrate:local
```

Si ya aplicaste manualmente las migraciones anteriores con `d1 execute`, no repitas
todas con `migrations apply`: tu base anterior no tiene el historial de Wrangler.
Haz copia de esa base y concilia su historial antes, o usa una base de desarrollo nueva.
La adaptación remota está prevista para una D1 nueva e independiente.

## Crear el administrador

Solo existe un administrador principal. No existe admin/admin ni una cuenta que se cree al visitar la web. El comando siguiente crea al principal una sola vez; las demás cuentas se crean desde Usuarios en el panel con permisos explícitos. Ejecuta en Bash:

```sh
export ADMIN_USERNAME="admin"
export ADMIN_EMAIL="TU_CORREO"
read -rs -p 'Contraseña nueva (mínimo 12 caracteres): ' ADMIN_PASSWORD; echo
export ADMIN_PASSWORD
read -rs -p 'AUTH_PEPPER configurado en el servidor: ' AUTH_PEPPER; echo
export AUTH_PEPPER
npx --yes pnpm@11.25.0 run admin:create
unset ADMIN_PASSWORD AUTH_PEPPER
```

Para la base remota agrega `--remote` al comando `admin:create`.
El script crea un archivo SQL temporal privado y lo elimina al terminar; no imprime
ni guarda la contraseña en texto plano. Una cuenta existente no se sobrescribe.
No guardes estas variables de alta como variables públicas o VITE_.

## Desarrollo

```sh
npx --yes pnpm@11.25.0 run dev
```

Abre http://localhost:5173 y /admin para el panel. Usa siempre el mismo host
que SITE_ORIGIN. No hace falta Sign in with ChatGPT. Localmente D1/R2 son emulados;
el despliegue usa exclusivamente los recursos de tu cuenta de Cloudflare.

## Pruebas y compilación

```sh
npx --yes pnpm@11.25.0 run test
npx --yes pnpm@11.25.0 exec tsc --noEmit
npx --yes pnpm@11.25.0 run build
```

`npx --yes pnpm@11.25.0 run test:api` inicia el servidor y verifica el flujo API contra un servidor local en 127.0.0.1:5174,
con SITE_ORIGIN igual en `.dev.vars`. Requiere `.dev.vars`; aplica las migraciones y crea cuentas de prueba en un estado temporal aislado, que se elimina al terminar. Nunca permite un destino remoto. La prueba agrega/elimina una
prenda y pedido de prueba, comprueba precios y revocación de sesión.

## Desplegar y retirar

Consulta [docs/CLOUDFLARE.md](docs/CLOUDFLARE.md).
Consulta [docs/CAMBIOS.md](docs/CAMBIOS.md) para decisiones, límites y lista de cambios.

## Pedidos, usuarios y fotos

Consulta [docs/OPERACIONES.md](docs/OPERACIONES.md) para reserva de 24 horas,
idempotencia persistente, permisos internos, cambio de contraseña y proceso de imágenes.
El carrito y la clave de reintento son las únicas persistencias de navegador; nunca
guardan datos de contacto, contraseñas, precios ni sesiones. No hay cuentas de clientes.
