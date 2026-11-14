import {NextRequest,NextResponse} from 'next/server';
import {env} from 'cloudflare:workers';
import {authorized,sameOrigin} from '@/lib/admin-auth';
import {getDb} from '@/db';
import {orders} from '@/db/schema';
import {desc,isNull} from 'drizzle-orm';
import {releaseExpiredReservations} from '@/lib/order-stock';
const error=(message:string,status=400)=>NextResponse.json({error:message},{status});
export async function GET(req:NextRequest){
 if(!await authorized(req,'orders.read'))return error('No autorizado.',403);
 await releaseExpiredReservations();
 return NextResponse.json(await getDb().select().from(orders).where(isNull(orders.deletedAt)).orderBy(desc(orders.createdAt)).limit(100),{headers:{'Cache-Control':'no-store'}});
}
export async function PATCH(req:NextRequest){
 if(!await authorized(req,'orders.manage')||!sameOrigin(req))return error('No autorizado.',403);
 try{await releaseExpiredReservations();const d=await req.json() as {id:string;status:string};if(!/^[0-9a-f-]{36}$/i.test(d.id)||!['pending','paid','cancelled'].includes(d.status))return error('Datos inválidos.');
 const result=await env.DB!.prepare("UPDATE orders SET status=?,expires_at=CASE WHEN ?='pending' THEN ? ELSE expires_at END WHERE id=? AND deleted_at IS NULL AND status!='cancelled' RETURNING id").bind(d.status,d.status,Date.now()+24*60*60*1000,d.id).first();return result?NextResponse.json({ok:true}):error('El pedido ya fue cancelado, venció o no existe.',409)
 }catch{return error('No se pudo actualizar el pedido.',409)}
}
export async function DELETE(req:NextRequest){
 if(!await authorized(req,'orders.manage')||!sameOrigin(req))return error('No autorizado.',403);
 try{const d=await req.json() as {id:string};if(!/^[0-9a-f-]{36}$/i.test(d.id))return error('Pedido inválido.');
 // Keep an idempotency tombstone and sale history. Pending reservations are released atomically.
 const result=await env.DB!.prepare("UPDATE orders SET status=CASE WHEN status='pending' THEN 'cancelled' ELSE status END,deleted_at=? WHERE id=? AND deleted_at IS NULL RETURNING id").bind(new Date().toISOString(),d.id).first();return result?NextResponse.json({ok:true}):error('Pedido no encontrado.',404)
 }catch{return error('No se pudo retirar el pedido.',409)}
}
