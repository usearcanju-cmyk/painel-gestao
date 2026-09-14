# Atualização V5 — vendas pagas automáticas

## Agora: atualizar o GitHub
1. Faça backup JSON dos dados pelo app atual.
2. Extraia este ZIP e envie TODO o conteúdo para a raiz do MESMO repositório, mantendo api/, lib/, private/, public/, scripts/, tests/ e db/.
3. Confirme a substituição dos arquivos existentes em Commit changes. Não precisa apagar o repositório. Arquivos novos precisam entrar também.
4. Aguarde o deploy automático ficar Ready. A senha e SESSION_SECRET já cadastrados na Vercel continuam os mesmos. O ajuste de login sem Upstash foi preservado.

O app continua abrindo antes de configurar o banco. A área de vendas automáticas mostrará “pendente”. Não significa senha errada.

## Próxima etapa, com orientação no chat
Na Vercel > Storage, criaremos/conectaremos um Neon Postgres e cadastraremos DATABASE_URL. Isso guarda pedidos e fila de avisos quando você fecha o navegador. Não é o Upstash que foi adiado.
Depois configuraremos a aplicação autorizada da Nuvemshop e as variáveis do servidor. Não envie tokens no chat nem no GitHub.

## O que está pronto no código
- POST /api/nuvemshop-webhook valida assinatura HMAC do corpo original e verifica a loja.
- Grava primeiro o evento em uma fila persistente. Só então confirma recebimento.
- Um trabalho em segundo plano consulta o pedido pela API. Apenas pagamento paid entra como venda; pendentes são excluídos, cancelamentos retiram a venda e reembolsos/status desconhecidos exigem revisão.
- Cada pedido tem chave única. Avisos repetidos não criam outra venda. Avisos fora de ordem consultam o estado atual; uma resposta com versão antiga não substitui uma versão nova.
- O painel autenticado consulta o banco a cada15s enquanto está aberto. Atrasos do provedor/processamento podem aumentar esse tempo; não é garantia de atualização instantânea.
- Indicadores “O mês, agora” incluem as vendas de hoje. A projeção original permanece até ontem.
- Sem dado de mídia real no dia importado, aplica-se a premissa percentual do mês como estimativa, nunca CPA real do Facebook.
- Meses fechados e lançamentos manuais conflitantes não são sobrescritos: a venda fica preservada no servidor aguardando conciliação no painel.
- /api/cron faz uma conferência diária de pedidos alterados e retoma a fila. Jobs pendentes também são retomados por novas entregas de webhook e pelas consultas do painel.

## Limites desta entrega
As contas reais ainda não estão conectadas. Nenhum deploy, webhook remoto ou banco foi criado por esta execução. Metas, premissas e lançamentos manuais continuam no navegador e exigem backup; somente os pedidos/fila são centralizados aqui. Meta Ads e Envio Ecomm continuam para as próximas etapas, não possuem sincronização automática nesta versão. A importação manual mensal anterior permanece disponível.

Falhas de fornecedor/banco ficam pendentes. Com painel fechado e sem novos eventos, a próxima retomada automática pode ser a conferência diária. Para recuperação frequente independente de eventos/abas, configurar cron mais frequente em plano compatível ou fila gerenciada. Não se deve anunciar SLA instantâneo.

O endpoint do painel lê no máximo10mil registros/3,5MB por consulta. Ao exceder, bloqueia a consulta e exige evolução para paginação, sem truncar silenciosamente. A conferência diária cobre alterações desde a última conferência completa com sobreposição de1h; a primeira cobre3dias. Não substitui importação histórica de meses antigos.


### Chave Nuvemshop
Esta versão usa o token de **Aplicativos sob medida** da própria loja. Nunca coloque esse token no GitHub, no HTML ou em mensagens; use somente nas Variáveis de Ambiente da Vercel.
