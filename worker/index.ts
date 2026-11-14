import handler from 'vinext/server/fetch-handler';

export default {
  async fetch(request:Request,env:Cloudflare.Env,ctx:ExecutionContext) {
    const response=await handler.fetch(request,env,ctx);
    const result=new Response(response.body,response);
    result.headers.set('X-Content-Type-Options','nosniff');
    result.headers.set('Referrer-Policy','strict-origin-when-cross-origin');
    result.headers.set('X-Frame-Options','SAMEORIGIN');
    result.headers.set('Permissions-Policy','camera=(), microphone=(), geolocation=()');
    if(new URL(request.url).protocol==='https:')result.headers.set('Strict-Transport-Security','max-age=31536000');
    if(new URL(request.url).pathname.startsWith('/api/admin/'))result.headers.set('Cache-Control','no-store');
    return result;
  }
};
