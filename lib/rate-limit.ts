import {env} from 'cloudflare:workers';
import {sql} from 'drizzle-orm';
import {getDb} from '@/db';
import {authRateLimits} from '@/db/schema';
import {tokenHash} from './password';
// CF-Connecting-IP is supplied by Cloudflare in production. Keys are hashes; no raw IP is stored.
export async function rateLimit(scope:string,subject:string,maximum:number,windowMs:number) {
  const key=await tokenHash(`${env.AUTH_PEPPER}:${scope}:${subject}`),now=Date.now();
  const db=getDb();
  await db.delete(authRateLimits).where(sql`${authRateLimits.expiresAt}<${now}`);
  const [row]=await db.insert(authRateLimits).values({key,count:1,expiresAt:now+windowMs})
    .onConflictDoUpdate({target:authRateLimits.key,set:{count:sql`${authRateLimits.count}+1`}}).returning({count:authRateLimits.count});
  return row.count<=maximum;
}
