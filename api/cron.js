import {createHash,timingSafeEqual} from 'node:crypto';import {drain} from '../lib/queue.js';import {reconcile} from '../lib/reconcile.js';
const hash=s=>createHash('sha256').update(s).digest();
export default async function handler(req,res){res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json');if(req.method!=='GET'){res.statusCode=405;return res.end('{}')}
 const secret=process.env.CRON_SECRET;if(!secret||secret.length<32||!timingSafeEqual(hash(req.headers.authorization||''),hash('Bearer '+secret))){res.statusCode=401;return res.end('{}')}
 try{const recovered=await drain({limit:8,budgetMs:10000});const queued=await reconcile();const processed=await drain({limit:15,budgetMs:12000});res.end(JSON.stringify({queued,recovered,processed}))}catch{res.statusCode=503;res.end(JSON.stringify({error:'Conferência pendente. Eventos preservados para nova tentativa.'}))}}
