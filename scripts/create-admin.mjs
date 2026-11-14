import {randomBytes,randomUUID,createHmac,pbkdf2Sync} from 'node:crypto';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

// Values are supplied via environment, never as CLI arguments or committed defaults.
const {ADMIN_USERNAME,ADMIN_EMAIL,ADMIN_PASSWORD,AUTH_PEPPER}=process.env;
if(!ADMIN_USERNAME||!ADMIN_EMAIL||!ADMIN_PASSWORD||!AUTH_PEPPER)throw new Error('Define ADMIN_USERNAME, ADMIN_EMAIL, ADMIN_PASSWORD y AUTH_PEPPER.');
const username=ADMIN_USERNAME.trim().toLowerCase(),email=ADMIN_EMAIL.trim().toLowerCase();
if(!/^[a-z0-9_.-]{3,80}$/.test(username)||!/^\S+@\S+\.\S+$/.test(email)||email.length>254||ADMIN_PASSWORD.length<12||ADMIN_PASSWORD.length>128||AUTH_PEPPER.length<32)throw new Error('Revisa usuario/correo. Contraseña: 12–128 caracteres; AUTH_PEPPER: mínimo 32.');
const salt=randomBytes(16).toString('hex');
const material=createHmac('sha256',AUTH_PEPPER).update(ADMIN_PASSWORD).digest();
const hash=pbkdf2Sync(material,salt,100000,32,'sha256').toString('hex');
const quote=value=>`'${String(value).replaceAll("'","''")}'`;
const sql=`INSERT INTO users (id,username,email,password_salt,password_hash,password_iterations,role,active,created_at) VALUES (${[randomUUID(),username,email,salt,hash].map(quote).join(',')},100000,'owner',1,${quote(new Date().toISOString())});`;
const dir=await mkdtemp(path.join(tmpdir(),'pazarella-admin-'));
try{
 const file=path.join(dir,'admin.sql');await writeFile(file,sql,{mode:0o600});
 const remote=process.argv.includes('--remote');
 const result=spawnSync(process.execPath,['node_modules/wrangler/bin/wrangler.js','d1','execute','DB',remote?'--remote':'--local','--config','wrangler.jsonc',...(!remote?['--persist-to',process.env.TEST_STATE_DIR||'.wrangler/state']:[]),'--file',file],{stdio:'inherit',env:{...process.env,ADMIN_PASSWORD:undefined,AUTH_PEPPER:undefined}});
 if(result.error)throw result.error;if(result.status!==0)process.exitCode=result.status??1;
 else console.log('Administrador creado. No se ha guardado la contraseña en texto plano.');
}finally{await rm(dir,{recursive:true,force:true})}
