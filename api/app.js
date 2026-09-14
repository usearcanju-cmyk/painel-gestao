import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {secure} from '../lib/auth.js';
export default async function handler(req,res){if(!secure(req,res))return;if(req.method!=='GET'){res.statusCode=405;return res.end()}res.setHeader('Content-Type','text/html;charset=utf-8');res.end(await readFile(join(process.cwd(),'private/app.html'),'utf8'))}
