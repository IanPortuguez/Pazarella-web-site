// Client optimization only. The server still fully decodes and sanitizes the resulting JPEG.
export async function prepareProductImage(file:File){
 if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>15_000_000)throw new Error('Selecciona JPG, PNG o WebP de hasta 15 MB.');
 const bitmap=await createImageBitmap(file);
 try{if(bitmap.width*bitmap.height>40_000_000)throw new Error('La fotografía es demasiado grande.');
 const scale=Math.min(1,1024/Math.max(bitmap.width,bitmap.height));
 const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));const context=canvas.getContext('2d');if(!context)throw new Error('No se pudo preparar la foto.');context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(bitmap,0,0,canvas.width,canvas.height);
 const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('No se pudo preparar la foto.')),'image/jpeg',0.86));
 return new File([blob],'prenda.jpg',{type:'image/jpeg'});
 }finally{bitmap.close()}
}
