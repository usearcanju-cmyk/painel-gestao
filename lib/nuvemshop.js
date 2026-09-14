import {createHmac,timingSafeEqual} from 'node:crypto';
export const EVENTS=['order/paid','order/updated','order/cancelled','order/edited','order/pending','order/voided'];
export function verifySignature(raw,signature,secret){if(!secret||typeof signature!=='string'||!/^[a-f0-9]{64}$/i.test(signature))return false;return timingSafeEqual(createHmac('sha256',secret).update(raw).digest(),Buffer.from(signature,'hex'))}
export function eventPayload(raw,store){const p=JSON.parse(raw);if(String(p.store_id)!==String(store))throw Error('Loja inválida');if(!EVENTS.includes(p.event))throw Error('Evento não suportado');if(!/^\d+$/.test(String(p.id)))throw Error('Pedido inválido');return {storeId:String(p.store_id),orderId:String(p.id),event:p.event}}
const number=(v,label)=>{const n=Number(v);if(v==null||v===''||!Number.isFinite(n)||n<0)throw Error('Revisar '+label);return n};
export const localDay=stamp=>{const d=new Date(stamp);if(isNaN(d))throw Error('Data inválida');return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(d)};
export function normalizeOrder(o,env=process.env){
 if(o.currency!=='BRL')throw Error('Moeda diferente de BRL');
 if(!/^\d+$/.test(String(o.id))||o.number==null)throw Error('Identificador inválido');
 const factors=JSON.parse(env.SHIRT_PRODUCT_FACTORS||'{}'),all=env.ALL_PRODUCTS_ARE_SHIRTS==='true';
 if(!all&&!Object.keys(factors).length)throw Error('Configure os produtos em SHIRT_PRODUCT_FACTORS.');
 let quantity=0;for(const p of o.products||[]){const k=all?1:Number(factors[String(p.product_id)]??0);if(!Number.isInteger(k)||k<0)throw Error('Fator de camisetas inválido');quantity+=number(p.quantity,'quantidade')*k}
 if(!Number.isInteger(quantity)||quantity<1||quantity>100)throw Error('Revisar quantidade de camisetas do pedido '+o.number);
 const shipIn=number(o.shipping_cost_customer,'frete cobrado'),revenue=Math.round((number(o.total,'total')-shipIn)*100)/100;if(revenue<0)throw Error('Total menor que frete');
 const status=o.status==='cancelled'?'excluded':o.payment_status==='paid'?'paid':['pending','authorized','abandoned','voided'].includes(o.payment_status)?'excluded':'review';
 if(!o.updated_at||!Number.isFinite(Date.parse(o.updated_at)))throw Error('Pedido sem data de atualização');
 return {orderId:String(o.id),updatedAt:new Date(o.updated_at).toISOString(),data:{id:String(o.number),date:localDay(o.paid_at||o.created_at),quantity,revenue,shipIn,status,rawStatus:o.status+'/'+o.payment_status,uf:String(o.shipping_address?.province||''),city:String(o.shipping_address?.city||'')}};
}
export async function shopRequest(path,{method='GET',body}={}){
 const e=process.env;if(!/^\d+$/.test(e.NUVEMSHOP_STORE_ID||'')||!e.NUVEMSHOP_TOKEN||!e.NUVEMSHOP_USER_AGENT)throw Error('Configuração Nuvemshop pendente');
 const version=e.NUVEMSHOP_API_VERSION||'2025-03';if(!/^\d{4}-\d{2}$/.test(version))throw Error('Versão inválida');
 const r=await fetch('https://api.nuvemshop.com.br/'+version+'/'+e.NUVEMSHOP_STORE_ID+'/'+path,{method,headers:{Authentication:'bearer '+e.NUVEMSHOP_TOKEN,Authorization:'Bearer '+e.NUVEMSHOP_TOKEN,'User-Agent':e.NUVEMSHOP_USER_AGENT,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,redirect:'error',signal:AbortSignal.timeout(12000)});
 if(!r.ok)throw Error('Nuvemshop HTTP '+r.status);return r.json();
}
export async function getOrder(id){if(!/^\d+$/.test(String(id)))throw Error('ID inválido');return shopRequest('orders/'+id)}
