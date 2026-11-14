import {env} from 'cloudflare:workers';
import {NextRequest,NextResponse} from 'next/server';
import {getChatGPTUser} from '@/app/chatgpt-auth';
export async function GET(_req:NextRequest,{params}:{params:Promise<{id:string}>}){
  if(!await getChatGPTUser())return new NextResponse(null,{status:401});
  const {id}=await params;if(!/^[0-9a-f-]{36}\.(jpg|png|webp)$/.test(id))return new NextResponse(null,{status:404});
  const bucket=env.BUCKET;if(!bucket)return new NextResponse(null,{status:503});
  const obj=await bucket.get(`products/${id}`);if(!obj)return new NextResponse(null,{status:404});
  const headers=new Headers();obj.writeHttpMetadata(headers);headers.set('Cache-Control','private, max-age=3600');headers.set('X-Content-Type-Options','nosniff');return new NextResponse(obj.body,{headers});
}
