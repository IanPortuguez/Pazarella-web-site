import { NextRequest, NextResponse } from 'next/server';
import { authorized, sameOrigin } from '@/lib/admin-auth';
import { getDb } from '@/db';
import { orders } from '@/db/schema';
import { desc, eq } from 'drizzle-orm';

export async function GET(req:NextRequest) {
  if (!await authorized(req)) return NextResponse.json({error:'No autorizado.'},{status:403});
  const rows=await getDb().select().from(orders).orderBy(desc(orders.createdAt)).limit(100);
  return NextResponse.json(rows,{headers:{'Cache-Control':'no-store'}});
}
export async function PATCH(req:NextRequest) {
  if (!await authorized(req) || !sameOrigin(req)) return NextResponse.json({error:'No autorizado.'},{status:403});
  try {
    const raw=await req.json();
    if (!raw || typeof raw !== 'object') throw new Error('invalid request');
    const {id,status}=raw as {id?:unknown;status?:unknown};
    if (typeof id!=='string' || !/^[0-9a-f-]{36}$/i.test(id) || typeof status!=='string' || !['pending','paid'].includes(status)) return NextResponse.json({error:'Datos inválidos.'},{status:400});
    const updated=await getDb().update(orders).set({status}).where(eq(orders.id,id)).returning({id:orders.id});
    return updated.length ? NextResponse.json({ok:true}) : NextResponse.json({error:'Pedido no encontrado.'},{status:404});
  } catch { return NextResponse.json({error:'No se pudo actualizar.'},{status:400}); }
}

export async function DELETE(req:NextRequest){
 if(!await authorized(req)||!sameOrigin(req))return NextResponse.json({error:'No autorizado.'},{status:403});
 try{const data=await req.json() as {id?:unknown};if(typeof data.id!=='string'||!/^[0-9a-f-]{36}$/i.test(data.id))return NextResponse.json({error:'Pedido inválido.'},{status:400});const removed=await getDb().delete(orders).where(eq(orders.id,data.id)).returning({id:orders.id});return removed.length?NextResponse.json({ok:true}):NextResponse.json({error:'Pedido no encontrado.'},{status:404})}catch{return NextResponse.json({error:'No se pudo eliminar el pedido.'},{status:500})}
}
