import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import type { NextRequest } from 'next/server';

const enc=new TextEncoder();
const cfg=()=>env as unknown as {ADMIN_EMAIL?:string; ADMIN_PASSWORD_SALT?:string; ADMIN_PASSWORD_HASH?:string; ADMIN_SESSION_SECRET?:string};
const hex=(data:ArrayBuffer)=>Array.from(new Uint8Array(data),b=>b.toString(16).padStart(2,'0')).join('');
async function sign(value:string){const secret=cfg().ADMIN_SESSION_SECRET;if(!secret)throw new Error('Missing session secret');const key=await crypto.subtle.importKey('raw',enc.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);return hex(await crypto.subtle.sign('HMAC',key,enc.encode(value)))}
function equal(a:string,b:string){if(a.length!==b.length)return false;let diff=0;for(let i=0;i<a.length;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);return diff===0}
export async function owner(){const user=await getChatGPTUser();const email=cfg().ADMIN_EMAIL;return user&&email&&user.email.toLowerCase()===email.trim().toLowerCase()?user:null}
export async function verifyPassword(username:string,password:string){const {ADMIN_PASSWORD_SALT:salt,ADMIN_PASSWORD_HASH:hash}=cfg();if(username!=='admin'||!salt||!hash||password.length>128)return false;const key=await crypto.subtle.importKey('raw',enc.encode(password),'PBKDF2',false,['deriveBits']);const derived=await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:enc.encode(salt),iterations:100000},key,256);return equal(hex(derived),hash)}
export async function makeToken(userId:string){const expires=Date.now()+8*60*60*1000;const value=`${expires}.${userId}`;return `${expires}.${await sign(value)}`}
export async function authorized(req:NextRequest){const user=await owner();if(!user)return false;const token=req.cookies.get('paz_admin')?.value;if(!token)return false;const [expiry,signature,...rest]=token.split('.');if(rest.length||!expiry||!signature||!/^\d+$/.test(expiry)||Number(expiry)<Date.now())return false;return equal(await sign(`${expiry}.${user.userId}`),signature)}
export function sameOrigin(req:NextRequest){return req.headers.get('origin')===new URL(req.url).origin}
