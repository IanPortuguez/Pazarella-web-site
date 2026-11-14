import {NextRequest,NextResponse} from 'next/server';
import {env} from 'cloudflare:workers';
import {getDb} from '@/db';
import {inventoryProducts} from '@/db/schema';
import {sameOrigin} from '@/lib/admin-auth';
import {rateLimit} from '@/lib/rate-limit';
import {releaseExpiredReservations} from '@/lib/order-stock';
import {tokenHash} from '@/lib/password';
import {eq} from 'drizzle-orm';
import type {Variant} from '@/lib/catalog';
const error=(message:string,status=400)=>NextResponse.json({error:message},{status});
export async function POST(req:NextRequest){
 if(!sameOrigin(req))return error('Solicitud no autorizada.',403);
 const db=env.DB;if(!db)return error('Servicio no disponible.',503);
 const requestKey=req.headers.get('idempotency-key');
 if(!requestKey||! /^[0-9a-f-]{36}$/i.test(requestKey))return error('Falta una referencia válida de solicitud.');
 try{
  if(Number(req.headers.get('content-length')||0)>16000)return error('Solicitud demasiado grande.',413);
  const data=await req.json() as {name:string;address:string;phone:string;method:string;items:unknown};
  if(!data||typeof data.name!=='string'||!data.name.trim()||data.name.length>120||typeof data.address!=='string'||!data.address.trim()||data.address.length>300||typeof data.phone!=='string'||!data.phone.trim()||data.phone.length>40||!['sinpe','transferencia'].includes(data.method)||!Array.isArray(data.items)||!data.items.length||data.items.length>30)return error('Revisa los datos del pedido.');
  const input=data.items as {id:number;color:string;size:string;qty:number}[];
  const seen=new Set<string>();for(const i of input){if(!i||!Number.isSafeInteger(i.id)||typeof i.color!=='string'||i.color.length>30||typeof i.size!=='string'||i.size.length>20||!Number.isSafeInteger(i.qty)||i.qty<1||i.qty>100000)return error('Revisa las prendas.');const key=JSON.stringify([i.id,i.color,i.size]);if(seen.has(key))return error('Hay prendas repetidas.');seen.add(key)}
  const canonical={name:data.name.trim(),address:data.address.trim(),phone:data.phone.trim(),method:data.method,items:input.map(i=>({id:i.id,color:i.color,size:i.size,qty:i.qty})).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)))};
  const requestHash=await tokenHash(JSON.stringify(canonical));
  const replay=async()=>{const old=await db.prepare('SELECT id,request_hash,deleted_at,status FROM orders WHERE request_key=?').bind(requestKey).first<{id:string;request_hash:string;deleted_at:string|null;status:string}>();if(!old)return null;if(old.request_hash!==requestHash)return error('Esta solicitud ya fue utilizada con otros datos. Cierra el pago y vuelve a intentarlo.',409);if(old.status==='cancelled')return error('Este pedido ya fue cancelado o venció. No se ha creado otro pedido.',409);if(old.deleted_at)return error('El pedido de esta solicitud ya fue retirado. No se ha creado otro pedido.',409);return NextResponse.json({id:old.id,replayed:true})};
  const previous=await replay();if(previous)return previous;
  if(!await rateLimit('orders',req.headers.get('cf-connecting-ip')||'local',20,60*60*1000))return error('Demasiados pedidos. Intenta más tarde.',429);
  await releaseExpiredReservations();
  const items=[];let total=0;
  for(const i of canonical.items){const [p]=await getDb().select().from(inventoryProducts).where(eq(inventoryProducts.id,i.id));const v=p?(JSON.parse(p.variantsJson) as Variant[]).find(v=>v.color===i.color&&v.size===i.size):null;if(!p||!v||v.quantity<i.qty)return error('Una prenda ya no tiene suficientes unidades. Actualiza el carrito.',409);const price=v.price??p.price;items.push({...i,name:p.name,price});total+=price*i.qty}
  const id=crypto.randomUUID(),now=Date.now();
  try{await db.batch([
   db.prepare("INSERT INTO orders(id,created_at,customer_name,address,phone,payment_method,status,items_json,subtotal,request_key,request_hash,expires_at,stock_managed) VALUES(?,?,?,?,?,?,'pending',?,?,?,?,?,1)").bind(id,new Date(now).toISOString(),canonical.name,canonical.address,canonical.phone,canonical.method,JSON.stringify(items),total,requestKey,requestHash,now+24*60*60*1000),
   ...items.map(i=>db.prepare('INSERT INTO order_lines(id,order_id,product_id,color,size,quantity,unit_price) VALUES(?,?,?,?,?,?,?)').bind(crypto.randomUUID(),id,i.id,i.color,i.size,i.qty,i.price))
  ])}catch{const duplicate=await replay();if(duplicate)return duplicate;return error('El inventario o precio cambió. Actualiza el carrito; no se ha creado un pedido parcial.',409)}
  return NextResponse.json({id},{status:201});
 }catch{return error('No se pudo registrar el pedido. Revisa los datos e inténtalo nuevamente.')}
}
