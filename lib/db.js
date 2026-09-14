import {neon} from '@neondatabase/serverless';
let cached,previous;
export function db(){const url=process.env.DATABASE_URL;if(!url)throw Error('Banco pendente: configure DATABASE_URL do Neon.');if(url!==previous){cached=neon(url,{fetchOptions:{signal:undefined}});previous=url}return cached}
export function query(text,params=[]){return db().query(text,params,{fetchOptions:{signal:AbortSignal.timeout(10000)}})}
