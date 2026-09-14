export async function collect(from,to){
const env=process.env;const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const num=(x,label)=>{let n=Number(x);if(x==null||x===''||!Number.isFinite(n)||n<0)throw Error('Valor inválido na fonte: '+label);return n};
const localDate=stamp=>{const d=new Date(stamp);if(isNaN(d))throw Error('Data inválida na fonte');return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(d)};
const current=()=>to;
function monthRanges(from,to){let arr=[],d=from;while(d<=to){let [y,m]=d.split('-').map(Number),next=new Date(Date.UTC(y,m,1)).toISOString().slice(0,10),last=new Date(Date.parse(next+'T12:00:00Z')-86400000).toISOString().slice(0,10);arr.push([d,last<to?last:to]);d=next}return arr}
async function getJSON(url,headers,host){if(new URL(url).hostname!==host)throw Error('Host de paginação inesperado');for(let i=0;i<2;i++){let r=await fetch(url,{headers,redirect:'error',signal:AbortSignal.timeout(12000)});if((r.status===429||r.status>=500)&&i<1){await sleep(Math.min(10000,1000*2**i));continue}if(!r.ok)throw Error(host+' respondeu HTTP '+r.status);let data=await r.json();return data}throw Error('Fonte indisponível')}
function startDate(){return from}
async function nuvemshop(){
 if(!env.NUVEMSHOP_STORE_ID||!env.NUVEMSHOP_TOKEN||!env.NUVEMSHOP_USER_AGENT)throw Error('Configuração Nuvemshop pendente');
 if(!/^\d+$/.test(env.NUVEMSHOP_STORE_ID))throw Error('ID da loja inválido');
 let factors=JSON.parse(env.SHIRT_PRODUCT_FACTORS||'{}'),all=env.ALL_PRODUCTS_ARE_SHIRTS==='true';
 if(!all&&!Object.keys(factors).length)throw Error('Informe produtos de camisetas em SHIRT_PRODUCT_FACTORS; não conte brindes como camisetas');
 const host='api.nuvemshop.com.br',version=env.NUVEMSHOP_API_VERSION||'2025-03';
 if(!/^\d{4}-\d{2}$/.test(version))throw Error('Versão Nuvemshop inválida');
 let result=[],seen=new Set();
 for(let [from,to]of monthRanges(startDate(),current())){
 for(let page=1;page<=101;page++){
 if(page===101)throw Error('Mais de 10 mil pedidos em um mês; subdivida a consulta antes de importar');
 let url=new URL('https://'+host+'/'+version+'/'+env.NUVEMSHOP_STORE_ID+'/orders');
 for(let [k,v]of Object.entries({status:'any',payment_status:'any',created_at_min:from+'T00:00:00-03:00',created_at_max:to+'T23:59:59-03:00',page,per_page:100}))url.searchParams.set(k,v);
 let batch=await getJSON(url,{Authorization:'Bearer '+env.NUVEMSHOP_TOKEN,'User-Agent':env.NUVEMSHOP_USER_AGENT},host);
 if(!Array.isArray(batch))throw Error('Resposta Nuvemshop inesperada');
 for(let o of batch){if(seen.has(String(o.id)))continue;seen.add(String(o.id));if(o.currency!=='BRL')throw Error('Pedido em moeda diferente de BRL');
 let quantity=0;for(let p of o.products||[]){let factor=all?1:Number(factors[String(p.product_id)]||0);if(!Number.isInteger(factor)||factor<0)throw Error('Fator de camiseta inválido');quantity+=num(p.quantity,'quantidade')*factor}
 if(!Number.isInteger(quantity)||quantity<1||quantity>100)throw Error('Pedido '+o.number+' exige revisão de itens/quantidade');
 let shipIn=num(o.shipping_cost_customer,'frete cobrado'),revenue=num(o.total,'total')-shipIn;if(revenue<0)throw Error('Total menor que frete');
 let status=o.status==='cancelled'?'excluded':o.payment_status==='paid'?'paid':['pending','authorized','abandoned','voided'].includes(o.payment_status)?'excluded':'review';
 result.push({id:String(o.number),date:localDate(o.paid_at||o.created_at),quantity,revenue,shipIn,status,rawStatus:o.status+'/'+o.payment_status,uf:o.shipping_address?.province||'',city:o.shipping_address?.city||''});
 }
 if(batch.length<100)break;await sleep(600);
 }}
 return result;
}
async function meta(){
 if(!env.META_TOKEN||!env.META_ACCOUNT_ID||!env.META_GRAPH_VERSION)throw Error('Configuração Meta pendente');
 let version=env.META_GRAPH_VERSION;if(!/^v\d+\.\d+$/.test(version))throw Error('Defina a versão Graph habilitada no seu app');
 let id=env.META_ACCOUNT_ID.replace(/^act_/,'');if(!/^\d+$/.test(id))throw Error('Conta de anúncios inválida');
 let base='https://graph.facebook.com/'+version+'/act_'+id,headers={Authorization:'Bearer '+env.META_TOKEN},host='graph.facebook.com';
 let account=await getJSON(base+'?fields=currency,timezone_name',headers,host);
 if(account.currency!=='BRL'||account.timezone_name!=='America/Sao_Paulo')throw Error('Conta Meta deve estar em BRL e America/Sao_Paulo para esta versão');
 let map=new Map();for(let [from,to]of monthRanges(startDate(),current())){
 let url=new URL(base+'/insights');for(let [k,v]of Object.entries({fields:'date_start,spend',level:'account',time_increment:'1',time_range:JSON.stringify({since:from,until:to}),limit:'100'}))url.searchParams.set(k,v);
 let next=url.toString(),pages=0;while(next){if(++pages>100)throw Error('Paginação Meta excedida');let r=await getJSON(next,headers,host);if(!Array.isArray(r.data))throw Error('Resposta Meta inesperada');for(let a of r.data){let key=id+':'+a.date_start;if(map.has(key))throw Error('Data Meta duplicada');map.set(key,{id:key,date:a.date_start,spend:num(a.spend,'gasto')})}next=r.paging?.next||''}
 // Dias sem linha de gasto numa consulta completa representam zero no relatório da conta.
 for(let d=from;d<=to;d=new Date(Date.parse(d+'T12:00Z')+86400000).toISOString().slice(0,10)){let key=id+':'+d;if(!map.has(key))map.set(key,{id:key,date:d,spend:0})}
 }return [...map.values()];
}

const [orders,ads]=await Promise.all([nuvemshop(),meta()]);return {version:2,origin:'bridge',generatedAt:new Date().toISOString(),orders,ads,shipping:[],sources:{nuvemshop:{ok:true,message:'Pedidos do intervalo selecionado'},meta:{ok:true,message:'Gasto diário da conta'},shipping:{ok:false,message:'Fornecedor de etiquetas pendente; importe custos por CSV.'},appmax:{ok:false,message:'Taxas estimadas; extrato ainda não conectado.'}}};
}
