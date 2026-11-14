import { NextResponse } from 'next/server';
import { getDb } from '@/db';
import { inventoryProducts } from '@/db/schema';
import { desc } from 'drizzle-orm';
import type { Variant } from '@/lib/catalog';
export async function GET(){
  try{const rows=await getDb().select().from(inventoryProducts).orderBy(desc(inventoryProducts.createdAt)).limit(500);
    const data=rows.map(p=>{const variants=(JSON.parse(p.variantsJson) as Variant[]).map(v=>({...v,price:v.price??p.price}));return {id:p.id,name:p.name,category:p.category,price:Math.min(...variants.map(v=>v.price)),variants,colors:[...new Set(variants.map(v=>v.color))],sizes:[...new Set(variants.map(v=>v.size))],image:p.imageKey?`/api/images/${p.imageKey}`:'',version:p.version}});
    return NextResponse.json(data,{headers:{'Cache-Control':'no-store'}})
  }catch{return NextResponse.json({error:'No se pudo cargar el catálogo.'},{status:500})}
}
