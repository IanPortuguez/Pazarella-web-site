import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import { orders, inventoryProducts } from '@/db/schema';
import {sameOrigin} from '@/lib/admin-auth';
import {rateLimit} from '@/lib/rate-limit';
import { eq } from 'drizzle-orm';
import type { Variant } from '@/lib/catalog';

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({error:'Solicitud no autorizada.'},{status:403});
  try {
    if(Number(req.headers.get('content-length')||0)>16000)return NextResponse.json({error:'Solicitud demasiado grande.'},{status:413});
    if(!await rateLimit('orders',req.headers.get('cf-connecting-ip')||'local',20,60*60*1000))return NextResponse.json({error:'Demasiados pedidos. Intenta más tarde.'},{status:429});
    const raw = await req.json();
    if (!raw || typeof raw !== 'object') throw new Error('invalid request');
    const data = raw as {name?:string;address?:string;phone?:string;method?:string;items?:unknown};
    const name = typeof data.name === 'string' ? data.name.trim() : '';
    const address = typeof data.address === 'string' ? data.address.trim() : '';
    const phone = typeof data.phone === 'string' ? data.phone.trim() : '';
    if (!name || name.length > 120 || !address || address.length > 300 || !phone || phone.length > 40 || !data.method || !['sinpe','transferencia'].includes(data.method) || !Array.isArray(data.items) || data.items.length < 1 || data.items.length > 30) return NextResponse.json({error:'Revisa los datos del pedido.'},{status:400});
    let total=0; const seen = new Set<string>();
    const items = [];
    for(const rawItem of data.items) {
      if (!rawItem || typeof rawItem !== 'object') throw new Error('invalid item');
      const item=rawItem as {id:number;color:string;size:string;qty:number};
      if(!Number.isSafeInteger(item.id))throw new Error('invalid item');
      const [p]=await getDb().select().from(inventoryProducts).where(eq(inventoryProducts.id,item.id));const key=JSON.stringify([item.id,item.color,item.size]);
      const variants=p ? JSON.parse(p.variantsJson) as Variant[] : [];const variant=variants.find(v=>v.color===item.color&&v.size===item.size);
      if(!p || !variant || !Number.isInteger(item.qty) || item.qty<1 || item.qty>variant.quantity || seen.has(key)) throw new Error('invalid item');
      const price=variant.price??p.price; seen.add(key); total+=price*item.qty;
      items.push({id:p.id,name:p.name,color:item.color,size:item.size,qty:item.qty,price});
    }
    const id=crypto.randomUUID();
    await getDb().insert(orders).values({id,createdAt:new Date().toISOString(),customerName:name,address,phone,paymentMethod:data.method,status:'pending',itemsJson:JSON.stringify(items),subtotal:total});
    return NextResponse.json({id},{status:201});
  } catch { return NextResponse.json({error:'No se pudo registrar el pedido. Revisa los datos e inténtalo nuevamente.'},{status:400}); }
}
