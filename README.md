# Use Arcanju Financeiro V4

Leia primeiro LEIA-PRIMEIRO.md. Mantém app financeiro V2/V3 e autenticação; adiciona pedidos centrais, webhook Nuvemshop, fila persistente, retomada e painel automático.

## Publicação
Node22, npm install, Framework Other, Output Directory public. package-lock.json incluído. api/ são funções; private/ e db/ entram nos bundles indicados em vercel.json e NUNCA devem ser servidos como estáticos. Não mude Output Directory para raiz.
Vercel suporta processamento pós-resposta via @vercel/functions waitUntil; o trabalho está sujeito ao limite de execução da função. Antes da resposta202, a fila já está no Postgres. Se morrer depois, a mensagem permanece pendente para retomada.

## Variáveis de ambiente
Preserve APP_PASSWORD_HASH e SESSION_SECRET já configurados. Upstash continua OPCIONAL para limite distribuído de login; sem ele há apenas limite por instância em memória, que não equivale a proteção distribuída.

Novas para Nuvemshop automática:
- DATABASE_URL: conexão Neon Postgres, privada. Não colocar NEXT_PUBLIC ou semelhante.
- NUVEMSHOP_STORE_ID: ID numérico da loja autorizada.
- NUVEMSHOP_TOKEN: access token do app autorizado, escopo read_orders.
- NUVEMSHOP_USER_AGENT: identificação do app e contato do responsável.
- NUVEMSHOP_API_VERSION: 2025-03 na base desta entrega, editável conforme compatibilidade vigente.
- NUVEMSHOP_APP_SECRET: client/app secret correspondente ao app que criou os webhooks. Não é o token de acesso nem a senha do painel.
- SHIRT_PRODUCT_FACTORS: JSON de product_id para quantidade de camisetas por unidade. Exemplo fictício {"123":1,"456":2}. Brindes ficam fora do mapa. ALL_PRODUCTS_ARE_SHIRTS=true só se TODOS os itens vendidos forem camisetas unitárias.
- APP_URL: URL HTTPS da produção, por exemplo https://painel-gestao-tau.vercel.app.
- CRON_SECRET: segredo aleatório de pelo menos32 caracteres, exclusivo do agendamento. Gere localmente com `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` e coloque somente na Vercel.

Depois de cadastrar: redeploy. No painel, Conexões & histórico > Vendas automáticas:
1. Preparar banco (cria tabelas, não apaga existentes).
2. Ativar avisos da loja (cria webhooks faltantes, não duplica os mesmos eventos/URL).

O destino é APP_URL + /api/nuvemshop-webhook. Eventos: order/paid, order/updated, order/cancelled, order/edited, order/pending, order/voided. Não abra essa URL no navegador para testar: ela só aceita POST autenticado por assinatura da Nuvemshop.
Alternativas via terminal: npm run db:setup e npm run webhooks:register, com .env.local privado. Tokens de provedores ficam exclusivamente no servidor. O código não implementa tela OAuth: obter a autorização da aplicação é uma etapa anterior.

## Agendamento e plano
vercel.json inclui cron diário às09UTC. Configure CRON_SECRET para a Vercel autenticar chamadas. Planos Hobby limitam frequência diária; Vercel também restringe Hobby a uso pessoal não comercial. Para operação comercial, verificar plano compatível. Pode aumentar frequência em plano que a permita, preservando autenticação. Conferência diária não depende de navegador aberto.
A conferência usa updated_at_min/max e só avança o marco após enfileirar o intervalo completo. Interrupção, volume >10mil ou timeout preservam marco anterior e last_error; o intervalo precisa ser reduzido/evoluído nesses casos. Fila não descarta erros automaticamente.

## Dados e finanças
arcanju_orders guarda id de loja/pedido, data/valores/status/quantidade e localidade, sem nome/CPF/telefone/endereço completo ou tokens do pedido. arcanju_jobs guarda o trabalho pendente. Dados são consultados somente após login. Política de retenção/exclusão e permissões do banco deve ser definida antes de produção ampla.
Postgres é fonte dos pedidos automáticos. localStorage continua fonte de metas, custos, caixa e lançamentos manuais. Restaurar backup antigo não apaga pedidos do servidor. Evite lançar manualmente os mesmos pedidos: meses conflitantes aguardam conciliação.
Custo de camiseta15, oferta2por249,90, experiência9,15, frete18 e demais premissas mantidos. Custos ausentes são estimados, incluindo marketing no dia sem relatório. Mídia real substitui a estimativa quando importada. Lucro atual não é lucro líquido final comprovado sem conciliação de taxas/frete/falhas.
A aprovação de pagamento não marca a entrega como concluída. Escala continua dependendo de margem, caixa, capacidade e confirmação operacional.

## Testes
- npm test: credenciais, token, assinatura, corpo alterado, loja errada, status, brindes, frete, timezone e confirmação somente após gravação.
- npm run test:queue: PGlite (Postgres em WASM) executa SQL real de schema/fila. Testa repetição, cancelamento, resposta antiga, novo evento durante processamento e retenção de falha. Não é teste contra seu Neon remoto.
- npm run test:finance: VM com DOM simulado,14 telas, regressão financeira, nova venda, cancelamento, marketing estimado e atualização por consulta sem clique.
- Não foi executado teste visual em navegador real nem integração ponta a ponta com suas contas/Vercel/Neon.

Antes de ativar em produção: confirmar `/api/app`, `/api/live` e `/api/setup` sem login retornam401 e `/private/app.html` retorna404. Enviar webhook inválido deve retornar401 e não criar pedido. Conferir um pedido pago real, repetir aviso e comparar valores/quantidades com Nuvemshop. Conferir cancelamento. A visualização do app deve atualizar após processamento e próxima consulta.

## Fontes oficiais consultadas
https://tiendanube.github.io/api-documentation/resources/webhook
https://tiendanube.github.io/api-documentation/resources/order
https://github.com/neondatabase/serverless
https://vercel.com/docs/functions/functions-api-reference/vercel-functions-package
https://vercel.com/docs/cron-jobs/usage-and-pricing
https://vercel.com/docs/plans/hobby
