import {createHash} from 'node:crypto';
const memory=new Map();
export async function allowLogin(req){
 const ip=String(req.headers['x-vercel-forwarded-for']||req.socket?.remoteAddress||'unknown').split(',')[0];const id=createHash('sha256').update(ip).digest('hex');
 const url=process.env.UPSTASH_REDIS_REST_URL,token=process.env.UPSTASH_REDIS_REST_TOKEN;
 if(!url||!token){const old=memory.get(id);const v=old&&old.until>Date.now()?old:{n:0,until:Date.now()+900000};v.n++;memory.set(id,v);return v.n<=10}
 if(new URL(url).protocol!=='https:')throw Error('Configuração do limitador inválida');
 const script="local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],900) end; return n";
 const r=await fetch(url,{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(['EVAL',script,1,'arcanju:login:'+id]),signal:AbortSignal.timeout(5000)});if(!r.ok)throw Error('Limitador indisponível');const data=await r.json();if(data.error||!Number.isInteger(data.result))throw Error('Limitador indisponível');return data.result<=10;
}
