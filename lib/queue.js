import {randomUUID} from 'node:crypto';
import {query} from './db.js';
import {getOrder,normalizeOrder} from './nuvemshop.js';
export async function enqueue(store,id,q=query){await q(`INSERT INTO arcanju_jobs(store_id,order_id) VALUES($1,$2) ON CONFLICT(store_id,order_id) DO UPDATE SET generation=arcanju_jobs.generation+1,available_at=now(),updated_at=now()`,[store,id])}
export async function drain({limit=8,budgetMs=20000,q=query,fetchOrder=getOrder,store=process.env.NUVEMSHOP_STORE_ID}={}){
 const started=Date.now();let processed=0,failed=0;
 for(let i=0;i<limit&&Date.now()-started<budgetMs;i++){
 const token=randomUUID();const jobs=await q(`UPDATE arcanju_jobs j SET lease_until=now()+interval '60 seconds',claim_token=$2,attempts=attempts+1 WHERE (j.store_id,j.order_id) IN (SELECT store_id,order_id FROM arcanju_jobs WHERE store_id=$1 AND generation>processed_generation AND available_at<=now() AND (lease_until IS NULL OR lease_until<now()) ORDER BY available_at FOR UPDATE SKIP LOCKED LIMIT 1) RETURNING j.*`,[store,token]);
 if(!jobs.length)break;const j=jobs[0];
 try{const o=normalizeOrder(await fetchOrder(j.order_id));if(o.orderId!==j.order_id)throw Error('Pedido retornado não corresponde ao solicitado');
 await q(`WITH ownership AS MATERIALIZED (SELECT 1 FROM arcanju_jobs WHERE store_id=$1 AND order_id=$2 AND claim_token=$5 FOR UPDATE),saved AS (INSERT INTO arcanju_orders(store_id,order_id,source_updated_at,data) SELECT $1,$2,$3::timestamptz,$4::jsonb FROM ownership ON CONFLICT(store_id,order_id) DO UPDATE SET source_updated_at=excluded.source_updated_at,data=excluded.data,received_at=now() WHERE arcanju_orders.source_updated_at<=excluded.source_updated_at RETURNING 1) UPDATE arcanju_jobs SET processed_generation=GREATEST(processed_generation,$6::bigint),lease_until=NULL,claim_token=NULL,last_error=NULL,available_at=now() WHERE store_id=$1 AND order_id=$2 AND claim_token=$5 AND (SELECT count(*) FROM saved)>=0`,[store,j.order_id,o.updatedAt,JSON.stringify(o.data),token,j.generation]);processed++;
 }catch(error){failed++;await q(`UPDATE arcanju_jobs SET lease_until=NULL,claim_token=NULL,last_error=$4,available_at=now()+interval '30 seconds' * LEAST(120,POWER(2,LEAST(attempts,7))) WHERE store_id=$1 AND order_id=$2 AND claim_token=$3`,[store,j.order_id,token,String(error.message).slice(0,250)])}
 }return {processed,failed};
}
