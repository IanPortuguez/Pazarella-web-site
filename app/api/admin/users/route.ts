import {NextRequest,NextResponse} from 'next/server';
import {env} from 'cloudflare:workers';
import {and,eq,ne,sql} from 'drizzle-orm';
import {getDb} from '@/db';
import {users,sessions} from '@/db/schema';
import {sessionUser,sameOrigin} from '@/lib/admin-auth';
import {validPermissions} from '@/lib/permissions';
import {passwordHash,constantTimeEqual,randomToken} from '@/lib/password';
import {rateLimit} from '@/lib/rate-limit';
const error=(message:string,status=400)=>NextResponse.json({error:message},{status});
const publicFields={id:users.id,username:users.username,email:users.email,role:users.role,active:users.active,permissionsJson:users.permissionsJson};
export async function GET(req:NextRequest){if((await sessionUser(req))?.role!=='owner')return error('Solo el administrador principal puede gestionar usuarios.',403);return NextResponse.json(await getDb().select(publicFields).from(users),{headers:{'Cache-Control':'no-store'}})}
export async function POST(req:NextRequest){
 if((await sessionUser(req))?.role!=='owner'||!sameOrigin(req))return error('No autorizado.',403);
 try{const d=await req.json() as {username:string;email:string;password:string;permissions:unknown};const permissions=validPermissions(d.permissions);
 if(typeof d.username!=='string'||!/^[a-z0-9_.-]{3,80}$/i.test(d.username)||typeof d.email!=='string'||!/^\S+@\S+\.\S+$/.test(d.email)||d.email.length>254||typeof d.password!=='string'||d.password.length<12||d.password.length>128||!permissions)return error('Revisa usuario, correo, permisos y contraseña (12–128 caracteres).');
 const salt=randomToken(),hash=await passwordHash(d.password,salt,env.AUTH_PEPPER!);
 await getDb().insert(users).values({id:crypto.randomUUID(),username:d.username.toLowerCase(),email:d.email.toLowerCase(),passwordSalt:salt,passwordHash:hash,role:'staff',permissionsJson:JSON.stringify(permissions),createdAt:new Date().toISOString()});
 return NextResponse.json({ok:true},{status:201});
 }catch{return error('No se pudo crear el usuario. Comprueba que usuario y correo no estén repetidos.',409)}
}
export async function PATCH(req:NextRequest){
 const owner=await sessionUser(req);if(owner?.role!=='owner'||!sameOrigin(req))return error('Solo el administrador principal puede hacer este cambio.',403);
 try{const d=await req.json() as {id:string;permissions?:unknown;active?:boolean;password?:string;ownerPassword?:string};if(typeof d.id!=='string')return error('Usuario inválido.');const db=getDb();const [target]=await db.select().from(users).where(eq(users.id,d.id));if(!target)return error('Usuario no encontrado.',404);
 if(d.password!==undefined){
  if(typeof d.password!=='string'||d.password.length<12||d.password.length>128||typeof d.ownerPassword!=='string'||d.ownerPassword.length>128)return error('Revisa la contraseña nueva y la contraseña del administrador.');
  if(!await rateLimit('password-reset',owner.id,5,15*60*1000))return error('Demasiados intentos. Intenta más tarde.',429);
  const [account]=await db.select().from(users).where(eq(users.id,owner.id));
  if(!constantTimeEqual(await passwordHash(d.ownerPassword,account.passwordSalt,env.AUTH_PEPPER!),account.passwordHash))return error('La contraseña del administrador no es correcta.',401);
  const salt=randomToken(),hash=await passwordHash(d.password,salt,env.AUTH_PEPPER!);
  await db.batch([db.update(users).set({passwordSalt:salt,passwordHash:hash}).where(eq(users.id,target.id)),db.delete(sessions).where(eq(sessions.userId,target.id))]);
  return NextResponse.json({ok:true,signOut:target.id===owner.id});
 }
 if(target.role==='owner')return error('El administrador principal no puede desactivarse ni perder sus permisos.');
 const permissions=validPermissions(d.permissions);if(!permissions||typeof d.active!=='boolean')return error('Permisos inválidos.');
 await db.batch([db.update(users).set({permissionsJson:JSON.stringify(permissions),active:d.active}).where(and(eq(users.id,target.id),ne(users.role,'owner'))),db.delete(sessions).where(eq(sessions.userId,target.id))]);
 return NextResponse.json({ok:true});
 }catch{return error('No se pudo actualizar el usuario.',400)}
}
