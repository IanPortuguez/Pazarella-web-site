import {NextRequest,NextResponse} from 'next/server';
import {env} from 'cloudflare:workers';
import {eq} from 'drizzle-orm';
import {getDb} from '@/db';
import {users} from '@/db/schema';
import {authorized,createSession,revokeSession,sameOrigin,secureCookie,SESSION_COOKIE,SESSION_SECONDS} from '@/lib/admin-auth';
import {constantTimeEqual,passwordHash,PASSWORD_ITERATIONS} from '@/lib/password';
import {rateLimit} from '@/lib/rate-limit';
const response=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'no-store'}});
export async function GET(req:NextRequest){return response({authenticated:await authorized(req)})}
export async function POST(req:NextRequest){
  if(!sameOrigin(req))return response({error:'Acceso no autorizado.'},403);
  if(!env.AUTH_PEPPER)return response({error:'El acceso administrador no está configurado.'},503);
  try{
    if(Number(req.headers.get('content-length')||0)>4096)return response({error:'Solicitud demasiado grande.'},413);
    const body=await req.json() as {username?:unknown;password?:unknown};
    if(typeof body?.username!=='string'||typeof body.password!=='string'||body.username.length>80||body.password.length>128)return response({error:'Usuario o contraseña incorrectos.'},401);
    const username=body.username.trim().toLowerCase();
    const ip=req.headers.get('cf-connecting-ip')||'local';
    const ipAllowed=await rateLimit('login-ip',ip,20,15*60*1000);
    const userAllowed=await rateLimit('login-user',username,10,15*60*1000);
    if(!ipAllowed||!userAllowed)return response({error:'Demasiados intentos. Intenta de nuevo en 15 minutos.'},429);
    const [user]=await getDb().select().from(users).where(eq(users.username,username));
    // Run the hash even for unknown users to reduce account enumeration by timing.
    const derived=await passwordHash(body.password,user?.passwordSalt??'unknown-user-salt',env.AUTH_PEPPER,user?.passwordIterations??PASSWORD_ITERATIONS);
    if(!user||!user.active||user.role!=='admin'||!constantTimeEqual(derived,user.passwordHash))return response({error:'Usuario o contraseña incorrectos.'},401);
    await revokeSession(req);
    const result=response({ok:true});
    result.cookies.set(SESSION_COOKIE,await createSession(user.id),{httpOnly:true,secure:secureCookie(),sameSite:'strict',path:'/',maxAge:SESSION_SECONDS});
    return result;
  }catch{return response({error:'No se pudo iniciar sesión.'},503)}
}
export async function DELETE(req:NextRequest){
  if(!sameOrigin(req))return response({error:'Acceso no autorizado.'},403);
  await revokeSession(req);
  const result=response({ok:true});result.cookies.set(SESSION_COOKIE,'',{httpOnly:true,secure:secureCookie(),sameSite:'strict',path:'/',maxAge:0});return result;
}
