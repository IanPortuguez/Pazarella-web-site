# Prueba aislada en Cloudflare

Estos pasos no crean ni modifican recursos del alojamiento anterior. Usa una D1 y
un bucket nuevos; no reutilices recursos de otros clientes.

## 1. Autenticarse y crear recursos

Desde la raíz, con Wrangler instalado por pnpm:

```sh
npx --yes pnpm@11.25.0 exec wrangler login
npx --yes pnpm@11.25.0 exec wrangler whoami
npx --yes pnpm@11.25.0 exec wrangler d1 create pazarella-pruebas-db
npx --yes pnpm@11.25.0 exec wrangler r2 bucket create pazarella-pruebas-imagenes
```

Comprueba la cuenta en `whoami`. R2 requiere activación y puede facturar los excesos
de su cuota gratuita; no activa un tope de gasto este repositorio.

Copia el `database_id` devuelto en `wrangler.jsonc`, sustituyendo el UUID de ejemplo.
El ID de recurso no es una credencial; AUTH_PEPPER sí lo es y no se escribe allí.

## 2. Migraciones y secretos

```sh
npx --yes pnpm@11.25.0 run db:migrate:remote
npx --yes pnpm@11.25.0 exec wrangler secret put AUTH_PEPPER --config wrangler.jsonc
npx --yes pnpm@11.25.0 exec wrangler secret put SITE_ORIGIN --config wrangler.jsonc
```

Elige un AUTH_PEPPER aleatorio (al menos 32 caracteres) y consérvalo en tu gestor de
secretos. SITE_ORIGIN es el origen HTTPS exacto del Worker, sin ruta: consúltalo en
Cloudflare; no uses la URL anterior de ChatGPT. Puede ser un Worker inicialmente
sin configurar: la autenticación falla cerrada mientras SITE_ORIGIN no exista.

Crea el administrador con el procedimiento del README, con el mismo AUTH_PEPPER,
y ejecuta `admin:create --remote`. Los hashes se guardan en D1. No se sube admin/admin.

## 3. Compilar y desplegar

```sh
npx --yes pnpm@11.25.0 run deploy
```

La compilación genera `dist/server/wrangler.json` y los assets en `dist/client`.
El despliegue usa ese archivo generado, no un index.html aislado ni Cloudflare Pages
estático. Workers ejecuta las API y usa los bindings DB y BUCKET.

No necesitas dominio propio. Si cambia el origen, actualiza SITE_ORIGIN y vuelve
a iniciar sesión. La configuración no agrega CI/CD ni tokens de Cloudflare a GitHub.

Prueba: catálogo sin sesión; /admin con contraseña; foto y producto nuevos; pedido;
comprobación del total y estado; WhatsApp; salir e intentar reutilizar la cookie.

## 4. Retirar la prueba (solo cuando decidas terminar)

No ejecutes esto durante la creación. Las eliminaciones de datos son irreversibles.

1. Exporta la D1 si quieres conservar los datos; descarga las fotos que necesites.
2. Elimina el Worker `pazarella-pruebas` desde Workers & Pages, o con:
   `npx --yes pnpm@11.25.0 exec wrangler delete --name pazarella-pruebas`.
3. En R2 elimina todos los objetos de `pazarella-pruebas-imagenes`, incluidos
   uploads incompletos si existen. Después elimina el bucket.
4. Elimina exclusivamente `pazarella-pruebas-db` desde D1, verificando su ID.
5. Revoca tokens de despliegue exclusivos si creaste alguno y desconecta cualquier
   integración de despliegue que hayas agregado manualmente.
6. Revisa en Cloudflare que no queden el Worker, la D1 ni el bucket de esta prueba.

Borrar el Worker no borra D1/R2. Borrar recursos no elimina consumo facturado,
registros administrativos o copias ya exportadas. El repositorio permanece en GitHub.
