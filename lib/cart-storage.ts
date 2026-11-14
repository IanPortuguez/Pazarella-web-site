import type {Item} from './catalog';
// Convenience only: this is never the source for prices, stock, identity or payment state.
export function parseCart(raw:string|null):Item[]{
  if(!raw||raw.length>16000)return [];
  try{
    const data:unknown=JSON.parse(raw);
    if(!Array.isArray(data)||data.length>30)return [];
    const seen=new Set<string>();
    return data.flatMap((item:unknown)=>{
      if(!item||typeof item!=='object')return [];
      const v=item as Item;
      if(!Number.isSafeInteger(v.id)||v.id<=0||typeof v.color!=='string'||!v.color||v.color.length>30||typeof v.size!=='string'||!v.size||v.size.length>20||!Number.isSafeInteger(v.qty)||v.qty<1||v.qty>100000)return [];
      const key=JSON.stringify([v.id,v.color,v.size]);if(seen.has(key))return [];seen.add(key);
      return [{id:v.id,color:v.color,size:v.size,qty:v.qty}];
    });
  }catch{return []}
}
