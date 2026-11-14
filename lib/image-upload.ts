import jpeg from 'jpeg-js';
// Canonical upload format: JPEG. PNG/WebP are converted by the form before sending.
// Decode and re-encode from pixels, discarding EXIF, comments and any appended payload.
export function sanitizeProductImage(bytes:Uint8Array){
 if(!bytes.length||bytes.length>3_000_000||bytes[0]!==255||bytes[1]!==216||bytes[2]!==255)throw new Error('La imagen debe enviarse como JPG válido desde el formulario.');
 const decoded=jpeg.decode(bytes,{useTArray:true,formatAsRGBA:true,tolerantDecoding:false,maxResolutionInMP:1.2,maxMemoryUsageInMB:32});
 if(!decoded.width||!decoded.height||decoded.width>1600||decoded.height>1600||decoded.width*decoded.height>1_200_000)throw new Error('La imagen supera la resolución permitida.');
 const clean=jpeg.encode({width:decoded.width,height:decoded.height,data:decoded.data},85).data;
 if(clean.length>3_000_000)throw new Error('La imagen procesada pesa más de 3 MB.');
 return new Uint8Array(clean);
}

export async function processProductImage(bytes:Uint8Array,images:ImagesBinding|undefined,localDevelopment:boolean){
 if(localDevelopment)return sanitizeProductImage(bytes);
 if(!images)throw new Error('Falta el binding IMAGES.');
 if(!bytes.length||bytes.length>3_000_000||bytes[0]!==255||bytes[1]!==216||bytes[2]!==255)throw new Error('Formato de imagen inválido.');
 const stream=()=>new ReadableStream<Uint8Array>({start(c){c.enqueue(bytes);c.close()}});
 const info=await images.info(stream());
 if(!('width' in info)||info.format!=='image/jpeg'||info.width*info.height>1_200_000||info.width>1600||info.height>1600)throw new Error('Resolución o formato inválidos.');
 const output=await images.input(stream()).transform({width:1024,height:1024,fit:'scale-down'}).output({format:'image/jpeg',quality:85,anim:false});
 const result=new Uint8Array(await output.response().arrayBuffer());if(result.length>3_000_000)throw new Error('La imagen procesada es demasiado grande.');return result;
}
