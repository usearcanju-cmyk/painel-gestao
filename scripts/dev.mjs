import http from 'node:http';import {readFile} from 'node:fs/promises';
import setup from '../api/setup.js';
import webhook from '../api/nuvemshop-webhook.js';import live from '../api/live.js';import cron from '../api/cron.js';
import login from '../api/login.js';import app from '../api/app.js';import snapshot from '../api/snapshot.js';
try{process.loadEnvFile('.env.local')}catch{}
const routes={'/api/setup':setup,'/api/nuvemshop-webhook':webhook,'/api/live':live,'/api/cron':cron,'/api/login':login,'/api/app':app,'/api/snapshot':snapshot};
http.createServer(async(req,res)=>{try{const p=new URL(req.url,'http://localhost').pathname;if(p==='/'||p==='/index.html'){res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','text/html;charset=utf-8');return res.end(await readFile('public/index.html'))}if(!routes[p]){res.statusCode=404;return res.end('Não encontrado')}if(req.method==='POST'&&p!=='/api/nuvemshop-webhook'){let chunks=[],size=0;for await(const c of req){size+=c.length;if(size>2048){res.statusCode=413;return res.end()}chunks.push(c)}try{req.body=JSON.parse(Buffer.concat(chunks).toString())}catch{res.statusCode=400;return res.end('{}')}}await routes[p](req,res)}catch{res.statusCode=500;res.end('Erro interno')}}).listen(3000,'127.0.0.1',()=>console.log('http://localhost:3000'));
