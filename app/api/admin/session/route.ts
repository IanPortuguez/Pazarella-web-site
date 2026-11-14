import {NextRequest,NextResponse} from 'next/server';
import {authorized,makeToken,owner,sameOrigin,verifyPassword} from '@/lib/admin-auth';

export async function GET(req:NextRequest){return NextResponse.json({authenticated:await authorized(req)},{headers:{'Cache-Control':'no-store'}})}
export async function POST(req:NextRequest){
  const user=await owner();
  if(!user||!sameOrigin(req))return NextResponse.json({error:'Acceso no autorizado.'},{status:403});
  try{const body=await req.json() as {username?:unknown;password?:unknown};
    if(!body||typeof body.username!=='string'||typeof body.password!=='string'||!await verifyPassword(body.username,body.password))return NextResponse.json({error:'Usuario o contraseña incorrectos.'},{status:401});
    const response=NextResponse.json({ok:true},{headers:{'Cache-Control':'no-store'}});
    response.cookies.set('paz_admin',await makeToken(user.userId),{httpOnly:true,secure:true,sameSite:'strict',path:'/',maxAge:8*60*60});return response;
  }catch{return NextResponse.json({error:'No se pudo iniciar sesión.'},{status:400})}
}
export async function DELETE(req:NextRequest){if(!await owner()||!sameOrigin(req))return NextResponse.json({error:'Acceso no autorizado.'},{status:403});const response=NextResponse.json({ok:true});response.cookies.set('paz_admin','',{httpOnly:true,secure:true,sameSite:'strict',path:'/',maxAge:0});return response}
