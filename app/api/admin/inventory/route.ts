import {NextRequest,NextResponse} from 'next/server';
import {env} from 'cloudflare:workers';
import {getDb} from '@/db';
import {inventoryProducts,categories,inventoryOptions} from '@/db/schema';
import {authorized,sameOrigin} from '@/lib/admin-auth';
import {eq,and,sql} from 'drizzle-orm';
import {releaseExpiredReservations} from '@/lib/order-stock';
import {processProductImage} from '@/lib/image-upload';
import {buildVariants} from '@/lib/inventory-matrix';
import type {Variant} from '@/lib/catalog';
const jsonError=(message:string,status=400)=>NextResponse.json({error:message},{status});
export async function POST(req:NextRequest){
 if(!await authorized(req)||!sameOrigin(req))return jsonError('No autorizado.',403);
 const bucket=env.BUCKET;if(!bucket)return jsonError('El almacenamiento de imágenes no está disponible.',503);
 const length=Number(req.headers.get('content-length')||0);if(length>3_300_000)return jsonError('La imagen debe pesar menos de 3 MB.');
 let key='';
 try{const f=await req.formData();const name=String(f.get('name')||'').trim(),category=String(f.get('category')||'').trim(),price=Number(f.get('price'));const colors=JSON.parse(String(f.get('colors')||'[]')) as unknown,sizes=JSON.parse(String(f.get('sizes')||'[]')) as unknown;const prices=JSON.parse(String(f.get('sizePrices')||'{}')) as Record<string,number>;
  if(!name||name.length>100||!category||category.length>60||!Number.isSafeInteger(price)||price<=0||price>100000000||!Array.isArray(colors)||!Array.isArray(sizes)||colors.length<1||sizes.length<1||colors.length>12||sizes.length>12||colors.length*sizes.length>80||colors.some(x=>typeof x!=='string'||!x.trim()||x.trim().length>30)||sizes.some(x=>typeof x!=='string'||!x.trim()||x.trim().length>20))return jsonError('Revisa los datos, tallas y colores.');
  const cleanColors=[...new Set(colors.map(x=>x.trim()))],cleanSizes=[...new Set(sizes.map(x=>x.trim()))];if(!prices||typeof prices!=='object'||cleanSizes.some(size=>!Number.isSafeInteger(prices[size])||prices[size]<=0||prices[size]>100000000))return jsonError('Indica un precio válido para cada talla.');if(!(await getDb().select().from(categories).where(eq(categories.name,category))).length)return jsonError('Selecciona una categoría registrada.');let variants:Variant[];try{variants=buildVariants(cleanColors,cleanSizes,prices,JSON.parse(String(f.get('variants')||'[]')))}catch(e){return jsonError(e instanceof Error?e.message:'Revisa las cantidades.')}
  const file=f.get('image');
  if(file instanceof File&&file.size>0){
   if(file.size>3_000_000)return jsonError('Selecciona una imagen JPG, PNG o WebP de hasta 3 MB.');
   let bytes:Uint8Array;try{bytes=await processProductImage(new Uint8Array(await file.arrayBuffer()),env.IMAGES,['localhost','127.0.0.1'].includes(new URL(env.SITE_ORIGIN||'https://invalid').hostname))}catch{return jsonError('No se pudo validar la foto. Usa el formulario para cargar una imagen JPG, PNG o WebP válida.');}
   key=`${crypto.randomUUID()}.jpg`;await bucket.put(`products/${key}`,bytes,{httpMetadata:{contentType:'image/jpeg'}});
  }else{return jsonError('Selecciona una fotografía para la prenda.');}

  await getDb().insert(inventoryOptions).values([...cleanSizes.map(name=>({kind:'size',name})),...cleanColors.map(name=>({kind:'color',name}))]).onConflictDoNothing();
  const [saved]=await getDb().insert(inventoryProducts).values({name,category,price:Math.min(...variants.map(v=>v.price!)),variantsJson:JSON.stringify(variants),imageKey:key,createdAt:new Date().toISOString()}).returning({id:inventoryProducts.id});
  return NextResponse.json(saved,{status:201});
 }catch{if(key)await bucket.delete(`products/${key}`).catch(()=>{});return jsonError('No se pudo guardar la prenda.',500)}
}
export async function PATCH(req:NextRequest){
 if(!await authorized(req)||!sameOrigin(req))return jsonError('No autorizado.',403);
 try{const data=await req.json() as {id:number;color?:string;size?:string;quantity?:number;version:number;removeOption?:{kind:string;name:string};sizePrices?:Record<string,number>};
 if(!Number.isSafeInteger(data.id)||!Number.isSafeInteger(data.version))return jsonError('Datos inválidos.');
 const db=getDb();const [row]=await db.select().from(inventoryProducts).where(eq(inventoryProducts.id,data.id));if(!row)return jsonError('Prenda no encontrada.',404);if(row.version!==data.version)return jsonError('El inventario cambió. Actualiza la página.',409);
 let variants=JSON.parse(row.variantsJson) as Variant[];
 if(data.removeOption){const option=data.removeOption;if(!['size','color'].includes(option.kind)||typeof option.name!=='string')return jsonError('Opción inválida.');const field=option.kind as 'size'|'color';if(!variants.some(v=>v[field]===option.name))return jsonError('La opción no existe en esta prenda.',404);variants=variants.filter(v=>v[field]!==option.name);if(!variants.length)return jsonError('La prenda debe conservar al menos una talla y un color. Para quitarla completa, usa Eliminar prenda.');}
 else if(data.sizePrices){const sizes=[...new Set(variants.map(v=>v.size))];if(typeof data.sizePrices!=='object'||sizes.some(size=>!Number.isSafeInteger(data.sizePrices![size])||data.sizePrices![size]<=0||data.sizePrices![size]>100000000))return jsonError('Indica un precio válido para cada talla.');for(const v of variants)v.price=data.sizePrices[v.size]}
 else {if(!Number.isSafeInteger(data.quantity)||data.quantity!<0||data.quantity!>100000)return jsonError('Cantidad inválida.');const variant=variants.find(v=>v.color===data.color&&v.size===data.size);if(!variant)return jsonError('Variante no encontrada.',404);variant.quantity=data.quantity!}
 const updated=await db.update(inventoryProducts).set({price:Math.min(...variants.map(v=>v.price??row.price)),variantsJson:JSON.stringify(variants),version:sql`${inventoryProducts.version}+1`}).where(and(eq(inventoryProducts.id,row.id),eq(inventoryProducts.version,row.version))).returning({id:inventoryProducts.id});
 return updated.length?NextResponse.json({ok:true}):jsonError('El inventario cambió. Actualiza la página.',409)
 }catch{return jsonError('No se pudo actualizar. No se pueden quitar variantes vinculadas a pedidos activos.',409)}
}
export async function DELETE(req:NextRequest){
 if(!await authorized(req)||!sameOrigin(req))return jsonError('No autorizado.',403);
 try{const data=await req.json() as {id:number;version:number};if(!Number.isSafeInteger(data.id)||!Number.isSafeInteger(data.version))return jsonError('Datos inválidos.');
 const removed=await getDb().delete(inventoryProducts).where(and(eq(inventoryProducts.id,data.id),eq(inventoryProducts.version,data.version))).returning({image:inventoryProducts.imageKey});if(!removed.length)return jsonError('La prenda cambió o ya fue eliminada. Actualiza el inventario.',409);
 if(removed[0].image&&env.BUCKET)await env.BUCKET.delete(`products/${removed[0].image}`).catch(()=>{});return NextResponse.json({ok:true});
 }catch{return jsonError('No se pudo eliminar: puede estar vinculada a pedidos activos. Cancela o retira esos pedidos primero.',409)}
}

export async function GET(req:NextRequest){
 if(!await authorized(req,'inventory.read'))return jsonError('No autorizado.',403);
 await releaseExpiredReservations();
 const result=await env.DB!.prepare("SELECT l.product_id AS productId,l.color,l.size,SUM(l.quantity) AS reserved FROM order_lines l JOIN orders o ON o.id=l.order_id WHERE l.reservation_state='reserved' AND o.deleted_at IS NULL GROUP BY l.product_id,l.color,l.size").all();
 return NextResponse.json(result.results,{headers:{'Cache-Control':'no-store'}});
}
