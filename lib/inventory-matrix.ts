import type {Variant} from './catalog';
export function buildVariants(colors:string[],sizes:string[],prices:Record<string,number>,input:unknown):Variant[]{
 if(!Array.isArray(input)||input.length!==colors.length*sizes.length||input.length>80)throw new Error('Completa todas las combinaciones de talla y color.');
 const quantities=new Map<string,number>();
 for(const raw of input){if(!raw||typeof raw!=='object')throw new Error('Combinación inválida.');const v=raw as {color:unknown;size:unknown;quantity:unknown};if(typeof v.color!=='string'||typeof v.size!=='string'||!colors.includes(v.color)||!sizes.includes(v.size)||typeof v.quantity!=='number'||!Number.isSafeInteger(v.quantity)||v.quantity<0||v.quantity>100000)throw new Error('Revisa las cantidades de cada combinación.');const key=JSON.stringify([v.size,v.color]);if(quantities.has(key))throw new Error('Hay combinaciones repetidas.');quantities.set(key,v.quantity)}
 return colors.flatMap(color=>sizes.map(size=>{const quantity=quantities.get(JSON.stringify([size,color]));if(quantity===undefined)throw new Error('Falta una combinación.');return {color,size,price:prices[size],quantity}}));
}
