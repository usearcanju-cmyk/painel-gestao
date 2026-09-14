# Use Arcanju — Financeiro com login (V3)

App V2 preservado, com entrada protegida e funções adaptadas para Vercel. Sem dependências npm. Node 22.

## Subir no GitHub e Vercel
1. Extraia o ZIP e envie o CONTEÚDO da pasta para a raiz do repositório (api, lib, private, public, scripts, tests, package.json, vercel.json, .gitignore, .env.example, README). Não envie o arquivo de configuração privada, .env.local, backups financeiros nem o ZIP do Claude. Repositório privado é indicado para preservar regras comerciais.
2. Na Vercel: Add New > Project > importe seu repositório. Framework: Other. Root: pasta contendo package.json. Sem build command; Output Directory: public (já configurado). Node22.
3. Configure APP_PASSWORD_HASH e SESSION_SECRET a partir do arquivo privado separado. Não prefixe com NEXT_PUBLIC, PUBLIC ou VITE.
4. Adicione Upstash Redis via Marketplace/Storage e obtenha UPSTASH_REDIS_REST_URL e UPSTASH_REDIS_REST_TOKEN. São usados para limite persistente de10 logins por IP em15min. Em produção, se faltarem ou o serviço falhar, login permanece fechado. Há serviços/planos externos: confira condições vigentes no painel antes de contratar.
5. Deploy/redeploy. Abra a URL e digite a senha escolhida. Cada recarregamento/nova abertura pede senha. Sair e15min sem interação bloqueiam a interface; token em memória expira no servidor em8h. Sem persistência de token/cookie/lembrar-me.
6. Antes de usar dados reais: confirme que `/api/app` sem credencial devolve401, `/private/app.html` não está acessível e `/api/snapshot` sem credencial devolve401. Não publique arquivos private como estáticos nem mude outputDirectory para a raiz.

A publicação na Vercel NÃO foi executada aqui. Os testes locais não substituem essas verificações de roteamento do deploy.

## Primeiro uso
Metas do mês > configure receita e lucro. Agenda > escolha os dias dos custos fixos; nenhum vencimento foi inventado. Configuração > revise premissas. Faça backup da versão HTML anterior e restaure neste app: mudar de domínio não transfere localStorage automaticamente.

**Dados de gestão continuam armazenados no navegador deste dispositivo.** Vercel não sincroniza automaticamente metas/lançamentos entre PC e celular. Exporte backups. Não existe banco financeiro central nem cron ativo nesta entrega. Upstash é só o limitador de login. O histórico de vendas ainda não foi fornecido em formato legível e não foi fabricado.

## Nuvemshop + Meta (servidor preparado, contas ainda não autorizadas)
Cadastre variáveis de `.env.example` exclusivamente no servidor e redeploy. Acesso só de leitura. Senhas e tokens não devem ser enviados pelo chat.
- Nuvemshop: app autorizado para leitura de pedidos, storeID, token e User-Agent de contato válido. API_VERSION editável; conferir compatibilidade da conta e documentação atual.
- SHIRT_PRODUCT_FACTORS: JSON com productID e camisetas por unidade. Exemplo fictício `{"123":1,"456":2}`. Brindes ausentes do mapa não contam. Use ALL_PRODUCTS_ARE_SHIRTS=true somente se realmente TODOS os itens forem camisetas unitárias.
- Meta: conta de anúncios em BRL e America/Sao_Paulo, token autorizado para ler Insights/ads_read e versão Graph habilitada no app.
- Clique “Sincronizar mês” no canto inferior. Consulta o mês selecionado, pagina, junta gasto da conta sem somar receita atribuída da Meta e importa por ID. Se uma fonte falha, não aplica importação parcial. Consultas grandes podem ultrapassar60s/3,5MB: use CSV; não declare histórico completo se falhar. Importação inicial é mês a mês, não um cron de todo histórico.
- Reembolsos/status desconhecidos bloqueiam confirmação; custos não disponíveis permanecem estimativas até revisão. Pedidos são selecionados por criação; a competência usa pagamento quando disponível. Uma mudança em pedido criado em mês antigo exige sincronizar esse mês de criação. Não há webhook incremental nesta entrega.
- Fretes pagos e Appmax reais ainda não conectados. Fornecedor de etiquetas precisa ser confirmado. Use CSV, sem confundir frete cobrado com custo de etiqueta.
- A antiga área “servidor externo” e downloads de servidor V2 permanece como alternativa avançada. Para ESTE deploy use o botão “Sincronizar mês”, não é necessário rodar o servidor V2 permanente.
- Não existe OAuth interativo pronto nem cron permanente: configurar tokens legítimos é etapa de ativação. A senha do app não concede acesso a nenhum provedor.

## Segurança e dados
HTML completo servido apenas por função autenticada; public contém somente login. Autenticação scrypt com salt + HMAC em sessão temporária. Senha/segredos não incluídos neste repositório. Login servidor limita tentativas em Redis; modo local usa memória. Header no-store e bloqueio de iframe. Qualquer acesso físico ao perfil do navegador ainda pode ler seus dados locais; login não criptografa localStorage. Não use em navegador compartilhado sem perfil pessoal. Para invalidar todos os tokens, troque SESSION_SECRET e redeploy.

## Desenvolvimento e testes
`npm run password` gera hash e chave a partir de senha digitada de forma oculta. Coloque as saídas em `.env.local` (ignorado pelo git). `npm run dev` abre http://localhost:3000. `npm test` executa verificações de credencial/token. Nunca configure dev na rede pública.
Testes locais adicionais desta entrega: requisições HTTP reais de login com a senha escolhida, proteção de rotas e arquivos privados, compilação do JavaScript. O financeiro preserva a referência previamente testada. O teste visual/login pelo navegador não pôde ser executado porque o Chromium não está instalado neste ambiente. APIs reais/Vercel/Upstash reais dependem de credenciais e não foram validadas ponta a ponta.

## Referências
- https://vercel.com/docs/functions/runtimes/node-js
- https://vercel.com/docs/project-configuration
- https://vercel.com/docs/storage
- https://upstash.com/docs/redis/features/restapi
