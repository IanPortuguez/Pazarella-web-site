import {env} from 'cloudflare:workers';
import type {NextRequest} from 'next/server';
import {and,eq,gt,lt} from 'drizzle-orm';
import {getDb} from '@/db';
import {sessions,users} from '@/db/schema';
import {randomToken,tokenHash} from './password';
export const SESSION_COOKIE = 'paz_admin';
export const SESSION_SECONDS = 8 * 60 * 60;
export function sameOrigin(req: NextRequest) {
  try {
    const expected = new URL(env.SITE_ORIGIN || '').origin;
    return req.headers.get('origin') === expected && new URL(req.url).origin === expected;
  } catch {return false;}
}
export function secureCookie() {
  return !env.SITE_ORIGIN?.startsWith('http://localhost:') && !env.SITE_ORIGIN?.startsWith('http://127.0.0.1:');
}
export async function sessionUser(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token || !/^[0-9a-f]{64}$/.test(token)) return null;
  const [row] = await getDb().select({id:users.id,username:users.username,role:users.role})
    .from(sessions).innerJoin(users,eq(sessions.userId,users.id))
    .where(and(eq(sessions.tokenHash,await tokenHash(token)),gt(sessions.expiresAt,Date.now()),eq(users.active,true)));
  return row ?? null;
}
export async function authorized(req: NextRequest) {
  return (await sessionUser(req))?.role === 'admin';
}
export async function createSession(userId: string) {
  const token = randomToken();
  const db = getDb();
  await db.delete(sessions).where(lt(sessions.expiresAt,Date.now()));
  await db.insert(sessions).values({tokenHash:await tokenHash(token),userId,expiresAt:Date.now()+SESSION_SECONDS*1000});
  return token;
}
export async function revokeSession(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (token && /^[0-9a-f]{64}$/.test(token)) await getDb().delete(sessions).where(eq(sessions.tokenHash,await tokenHash(token)));
}
