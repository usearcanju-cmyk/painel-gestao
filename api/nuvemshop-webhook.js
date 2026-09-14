import {waitUntil} from '@vercel/functions';
import {verifySignature,eventPayload} from '../lib/nuvemshop.js';
import {enqueue,drain} from '../lib/queue.js';
export const config={api:{bodyParser:false}};
export function webhookHandler({enqueueJob=enqueue,run=drain,background=waitUntil}={}){return async function handler(req,res){res.setHeader('Cache-Control','no-store');if(req.method!=='POST'){res.statusCode=405;return res.end()}
 if(!process.env.NUVEMSHOP_APP_SECRET||!process.env.DATABASE_URL||!process.env.NUVEMSHOP_STORE_ID){res.statusCode=503;return res.end('Configuração pendente')}
 try{let chunks=[],size=0;for await(const part of req){size+=part.length;if(size>65536){res.statusCode=413;return res.end()}chunks.push(part)}const raw=Buffer.concat(chunks);
 if(!verifySignature(raw,req.headers['x-linkedstore-hmac-sha256'],process.env.NUVEMSHOP_APP_SECRET)){res.statusCode=401;return res.end('Assinatura inválida')}
 let p;try{p=eventPayload(raw,process.env.NUVEMSHOP_STORE_ID)}catch{res.statusCode=400;return res.end('Evento inválido')}
 // Acknowledge only AFTER a durable job exists. Provider retries on failure/timeout.
 await enqueueJob(p.storeId,p.orderId);background(run().catch(()=>{}));res.statusCode=202;res.end('Recebido');
 }catch{res.statusCode=503;res.end('Não foi possível gravar. Tente novamente.')}
}

}
export default webhookHandler();
