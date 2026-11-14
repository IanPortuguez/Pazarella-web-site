import {env} from 'cloudflare:workers';
// Status change and all stock releases are one SQLite statement with transactional triggers.
export async function releaseExpiredReservations(){
 if(!env.DB)throw new Error('Missing DB');
 await env.DB.prepare("UPDATE orders SET status='cancelled' WHERE status='pending' AND stock_managed=1 AND expires_at<=? AND deleted_at IS NULL").bind(Date.now()).run();
}
