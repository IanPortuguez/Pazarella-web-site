export type Variant = {color:string;size:string;quantity:number;price?:number};
export type Product = {id:number;name:string;category:string;price:number;colors:string[];sizes:string[];variants:Variant[];image:string;version:number};
export type Item = {id:number;color:string;size:string;qty:number};
export function stock(product:Product,color:string,size:string){return product.variants.find(v=>v.color===color&&v.size===size)?.quantity??0}

export function priceFor(product:Product,color:string,size:string){return product.variants.find(v=>v.color===color&&v.size===size)?.price??product.price}
