import {EVENTS,shopRequest} from '../lib/nuvemshop.js';
try{process.loadEnvFile('.env.local')}catch{}
const origin=process.env.APP_URL;if(!origin||new URL(origin).protocol!=='https:')throw Error('Defina APP_URL com a URL HTTPS do painel');const url=new URL('/api/nuvemshop-webhook',origin).href;
const existing=[];for(let page=1;page<=100;page++){const batch=await shopRequest('webhooks?per_page=100&page='+page);if(!Array.isArray(batch))throw Error('Resposta inesperada');existing.push(...batch);if(batch.length<100)break;if(page===100)throw Error('Paginação excedida')}
for(const event of EVENTS){if(existing.some(w=>w.url===url&&w.event===event)){console.log(event+': já cadastrado');continue}await shopRequest('webhooks',{method:'POST',body:{url,event}});console.log(event+': cadastrado')}
