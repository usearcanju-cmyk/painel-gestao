import {PGlite} from '@electric-sql/pglite';import {readFile} from 'node:fs/promises';import assert from 'node:assert/strict';import {enqueue,drain} from '../lib/queue.js';
const db=new PGlite();await db.exec(await readFile(new URL('../db/schema.sql',import.meta.url),'utf8'));const q=async(sql,args)=>(await db.query(sql,args)).rows;process.env.ALL_PRODUCTS_ARE_SHIRTS='true';
let current={id:123,number:5001,currency:'BRL',created_at:'2026-09-15T01:00:00Z',paid_at:'2026-09-15T02:00:00Z',updated_at:'2026-09-15T02:00:00Z',total:'249.90',shipping_cost_customer:'0',products:[{quantity:2}],status:'open',payment_status:'paid'};
const run=()=>drain({q,fetchOrder:async()=>current,store:'42'});
await enqueue('42','123',q);await enqueue('42','123',q);await run();let rows=await q('SELECT * FROM arcanju_orders');if(!rows.length)console.log(await q('SELECT * FROM arcanju_jobs'));assert.equal(rows.length,1);assert.equal(rows[0].data.revenue,249.9);
await enqueue('42','123',q);await run();assert.equal((await q('SELECT * FROM arcanju_orders')).length,1);
current={...current,status:'cancelled',updated_at:'2026-09-15T03:00:00Z'};await enqueue('42','123',q);await run();assert.equal((await q('SELECT * FROM arcanju_orders'))[0].data.status,'excluded');
current={...current,status:'open',updated_at:'2026-09-15T02:00:00Z'};await enqueue('42','123',q);await run();assert.equal((await q('SELECT * FROM arcanju_orders'))[0].data.status,'excluded');
// A second event arriving during fetch remains pending until another fetch.
await enqueue('42','123',q);let once=false;await drain({limit:1,q,store:'42',fetchOrder:async()=>{if(!once){once=true;await enqueue('42','123',q)}return current}});let [j]=await q('SELECT * FROM arcanju_jobs');assert.ok(Number(j.generation)>Number(j.processed_generation));await run();[j]=await q('SELECT * FROM arcanju_jobs');assert.equal(Number(j.generation),Number(j.processed_generation));
await enqueue('42','999',q);await drain({limit:1,q,store:'42',fetchOrder:async()=>{throw Error('provider unavailable')}});[j]=await q("SELECT * FROM arcanju_jobs WHERE order_id='999'");assert.ok(j.last_error);assert.ok(Number(j.generation)>Number(j.processed_generation));
console.log('PASS SQL/Postgres: repeated events, updates, stale responses, event during fetch, durable retry');await db.close();
