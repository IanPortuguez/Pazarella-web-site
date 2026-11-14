import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {spawn} from 'node:child_process';
const state=await mkdtemp(path.join(tmpdir(),'pazarella-integration-'));
process.env.TEST_STATE_DIR=state;
const migrated=spawnSync(process.execPath,['node_modules/wrangler/bin/wrangler.js','d1','migrations','apply','DB','--local','--config','wrangler.jsonc','--persist-to',state],{encoding:'utf8'});if(migrated.status!==0)throw new Error(migrated.stdout+migrated.stderr);
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5174','--strictPort'],{stdio:['ignore','pipe','pipe']});
let logs='';server.stdout.on('data',chunk=>{logs+=chunk});server.stderr.on('data',chunk=>{logs+=chunk});
try{
 let ready=false;for(let i=0;i<90;i++){if(server.exitCode!==null)throw new Error('El servidor se cerró: '+logs);try{const r=await fetch('http://127.0.0.1:5174/api/products');if(r.ok){ready=true;break}}catch{}await new Promise(r=>setTimeout(r,500))}
 if(!ready)throw new Error('El servidor no respondió: '+logs);
 const test=spawn(process.execPath,['tests/api-smoke.mjs'],{stdio:'inherit'});
 const code=await new Promise(resolve=>test.on('exit',resolve));process.exitCode=code??1;
}finally{server.kill('SIGTERM');await new Promise(resolve=>server.once('exit',resolve));await rm(state,{recursive:true,force:true})}
