import {secure} from '../lib/auth.js';
import {query} from '../lib/db.js';
import {drain} from '../lib/queue.js';
import {reconcile} from '../lib/reconcile.js';

export default async function handler(req, res) {
  if (!secure(req, res)) return;

  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'GET') {
    res.statusCode = 405;
    return res.end('{}');
  }

  if (
    !process.env.DATABASE_URL ||
    !process.env.NUVEMSHOP_STORE_ID ||
    !process.env.NUVEMSHOP_TOKEN
  ) {
    res.statusCode = 503;
    return res.end(JSON.stringify({
      error: 'Vendas automáticas pendentes: configure banco e chave da Nuvemshop.'
    }));
  }

  try {
    const store = process.env.NUVEMSHOP_STORE_ID;
    const [last] = await query(
      'SELECT checked_until FROM arcanju_sync WHERE store_id=$1',
      [store]
    );

    let queued = 0;
    let processed = 0;

    if (
      !last?.checked_until ||
      Date.now() - new Date(last.checked_until).getTime() > 30000
    ) {
      queued = await reconcile();
      processed = await drain({limit: 20, budgetMs: 25000});
    }

    const rows = await query(
      'SELECT data,received_at FROM arcanju_orders WHERE store_id=$1 ORDER BY order_id LIMIT 10001',
      [store]
    );

    if (rows.length > 10000) {
      throw Error('Histórico excede esta versão. Necessária paginação antes de continuar.');
    }

    const [stats] = await query(
      `SELECT
        count(*) FILTER (WHERE generation > processed_generation)::int AS pending,
        count(*) FILTER (
          WHERE generation > processed_generation
          AND last_error IS NOT NULL
        )::int AS failed,
        max(updated_at) AS last_event
      FROM arcanju_jobs
      WHERE store_id=$1`,
      [store]
    );

    const [sync] = await query(
      'SELECT checked_until,last_error FROM arcanju_sync WHERE store_id=$1',
      [store]
    );

    const data = {
      reconciliation: sync || null,
      version: 2,
      origin: 'bridge',
      live: true,
      generatedAt: new Date().toISOString(),
      orders: rows.map(r => r.data),
      ads: [],
      shipping: [],
      queue: {...stats, queued, processed},
      sources: {
        nuvemshop: {
          ok: !!sync?.checked_until,
          message: sync?.checked_until
            ? 'Loja consultada automaticamente.'
            : 'Aguardando primeira consulta.'
        },
        meta: {
          ok: false,
          message: 'Mídia automática ainda não ativada.'
        },
        shipping: {
          ok: false,
          message: 'Envio Ecomm ainda não conectado.'
        }
      }
    };

    const raw = JSON.stringify(data);

    if (Buffer.byteLength(raw) > 3500000) {
      throw Error('Histórico exige paginação.');
    }

    res.end(raw);
  } catch (e) {
    res.statusCode = 503;
    res.end(JSON.stringify({
      error: e.message?.startsWith('Histórico')
        ? e.message
        : 'Não foi possível consultar a loja. Confira token, permissões e banco.'
    }));
  }
}
