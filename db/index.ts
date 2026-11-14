import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

export function getDb() {
  if (!env.DB) {
    throw new Error(
      "Falta el binding DB de Cloudflare D1. Configúralo en wrangler.jsonc y aplica las migraciones."
    );
  }

  return drizzle(env.DB, { schema });
}
