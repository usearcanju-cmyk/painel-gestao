import {readFile} from 'node:fs/promises';import {query} from '../lib/db.js';
try{process.loadEnvFile('.env.local')}catch{}
const sql=await readFile(new URL('../db/schema.sql',import.meta.url),'utf8');for(const statement of sql.split(';').map(s=>s.trim()).filter(Boolean))await query(statement);console.log('Tabelas criadas. Nenhum dado existente foi apagado.');
