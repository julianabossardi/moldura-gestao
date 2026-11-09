# tarefas da moldura e recorrência · instruções para o Claude Code

09/11/2026. Escrito pela Juliana com o Claude no chat. Tem duas partes:

1. **Recorrência:** implementar no app as tarefas que se repetem e mostrar a previsão delas.
2. **Carga inicial:** subir a lista de tarefas abaixo, que hoje não está no app (inclui o que saiu da reunião de 03/11 e foi revisto em 09/11).

Faça a parte 1 antes da 2, porque a lista usa recorrências e o campo `comeca_em`.
Não commite sem eu pedir. Antes de gravar qualquer coisa no banco, mostre o que vai entrar e espere eu confirmar.

---

## parte 1 · recorrência

### o que já existe (confira antes de mexer)

- `itens` tem `titulo`, `objetivo`, `definicao_pronto`, `responsavel_id`, `prazo`, `prioridade`, `pai_id`, `projeto_id`, `status` (inclui `expirada`) e `origem`.
- Nada é apagado (trigger "nada é apagado na moldura: use status").
- Já há crons diários em `vercel.json` (`/api/cron/...`, com `cronAutorizado`).
- O app guarda um responsável por item.

### o que eu quero

Há tarefas que acontecem toda semana ou todo mês e que ninguém vai lembrar de falar na reunião. Por exemplo, os posts do Instagram. Quero que o app as crie sozinho a cada período e que a gente veja, com antecedência, o que vem pela frente.

### proposta de modelo (ajuste se o código pedir outra coisa e me diga por quê)

**Tabela `recorrencias`**, com o modelo da tarefa que se repete:

| campo | para quê |
|---|---|
| `projeto_id` | projeto da tarefa |
| `titulo`, `objetivo`, `definicao_pronto`, `prioridade` | copiados para cada tarefa criada |
| `responsavel_id` | dono padrão; dá para trocar em cada tarefa |
| `frequencia` | `semanal`, `quinzenal` ou `mensal` |
| `quantidade` | quantas tarefas por período (ex.: 2 posts por semana) |
| `variacoes` | lista opcional de textos que se alternam no título ou no objetivo (ex.: "1 lâmina", "carrossel de 4 lâminas") |
| `prazo_no_periodo` | quando vence dentro do período (ex.: sexta da semana; último dia útil do mês) |
| `depende_de` | outra recorrência que precisa estar feita antes (ex.: publicar o texto no LinkedIn depende do texto do site) |
| `ativa` | desligar sem apagar |

**Na tabela `itens`:**
- `recorrencia_id`, apontando para o modelo.
- `periodo`: a data de início do período, como `2026-11-09`. A combinação `recorrencia_id + periodo + número da vez` é única, o que torna a criação idempotente.
- `comeca_em` (date): a tarefa só aparece no painel da pessoa a partir dessa data. Serve para recorrências e para tarefas pontuais que ainda não podem ser feitas (ver a do DUNS).

### como funciona

- **Criação:** um cron diário cria as tarefas do período atual que ainda não existem, com `origem` nova `recorrencia` (enum `item_origem`). A tarefa nasce com o dono padrão, prazo calculado e, se houver variações, a próxima da lista.
- **Período que acabou:** a tarefa recorrente que não foi feita vira `expirada`, não fica acumulando. Expirada continua no histórico e na conta da reunião ("2 posts previstos, 1 feito").
- **Dependência:** a tarefa que depende de outra nasce com `comeca_em` vazio e só aparece quando a anterior for concluída. Se for mais simples, ela nasce normal e mostra "espera: <tarefa>".
- **Histórico:** é a própria lista de tarefas criadas por uma recorrência, feitas, expiradas ou abertas. Não precisa de tabela de log.
- **Previsão:** calculada, não gravada. Para cada recorrência ativa, mostrar as próximas ocorrências das próximas 4 semanas. Lugares:
  - na página do projeto, uma área "o que se repete", com a previsão e um botão para editar ou desligar;
  - no painel da reunião, por projeto, "previsto para esta semana" e o que expirou desde a reunião anterior;
  - no painel do dia de cada pessoa, só as tarefas já criadas (a previsão não entra, para não poluir).
- **Edição:** mudar a recorrência só afeta as próximas tarefas. As já criadas ficam como estão.
- **Passo 2 da reunião:** a tarefa recorrente que aparecer na fala ("tem que fazer o post") não vira tarefa nova. Ela casa com a do período. Acrescente isso nas regras de `lib/ia/cruzar.ts` e mande as recorrências ativas junto com o estado.

### testes que quero ver

- criar duas vezes no mesmo dia não duplica;
- `quantidade: 2` cria duas tarefas, com variações alternadas;
- a virada de período expira o que ficou aberto e cria o novo;
- `comeca_em` no futuro esconde do painel do dia e mostra na página do projeto;
- a dependência só libera depois de concluir a anterior;
- recorrência desligada não cria nada e a previsão some.

---

## parte 2 · carga inicial

### como subir

1. Converta as tabelas abaixo para `docs/tarefas/2026-11-09.json`. Os campos são projeto, título, objetivo, definição de pronto, responsável, prioridade, prazo, `comeca_em` e pai, onde houver.
2. Escreva `scripts/importar-tarefas.ts`. Ele lê o JSON e pula o que já existir, comparando título e projeto como o `aprovar` faz com `ja_feitas`. A tarefa-filha nasce com `pai_id`. O script gera embedding como os outros e grava `origem: manual`.
3. Rode primeiro com `--simular` e me mostre a lista do que entraria e do que seria pulado. Só grave depois de eu confirmar.
4. As recorrências entram na tabela `recorrencias`, não como tarefa. A primeira leva do período atual é criada pelo próprio mecanismo.

### regras de prioridade

- **folga:** `alta` é o que é necessário para publicar o app e para a divulgação de 12/12. O resto do folga é `media`.
- **moldura:** `media` ou `baixa`, nunca `alta` neste momento.
- **vetor:** fica de fora por enquanto.

Atualize `contexto/projetos.md` com esta regra, com o marco em **12/12/2026** (antes estava 11/12) e com as recorrências.

### marco

| projeto | marco | data |
|---|---|---|
| folga | divulgação do folga (evento) | 12/12/2026 |

Desdobramentos sugeridos do marco, para o app mostrar como sugestão e não como tarefa: agendar o local e o horário, criar o convite, montar a lista de convidados, planejar a divulgação.

### moldura · recorrências

| título | dono | prioridade | frequência | definição de pronto |
|---|---|---|---|---|
| fazer um post para o Instagram da moldura (variações: "1 lâmina", "carrossel de 4 lâminas") | Juliana (às vezes Larissa ou Viviane) | media | semanal, 2 por semana | post construído, publicado no Instagram e compartilhado |
| adaptar um post do Instagram para o LinkedIn | Juliana | baixa | quinzenal | post adaptado e publicado no LinkedIn da moldura |
| escrever um texto novo para o site | Juliana (aberto às três) | baixa | mensal | texto revisado e publicado no site |
| publicar no LinkedIn o texto do mês do site | Juliana | baixa | mensal, depende do texto do site | texto publicado no LinkedIn com link para o site |
| buscar editais abertos | Juliana | media | quinzenal | lista de editais com prazo; os que valem viram tarefa de inscrição |

### moldura · tarefas

| título | dono | prioridade | prazo | definição de pronto |
|---|---|---|---|---|
| alinhar com a Raquel o post compartilhado | Juliana | media | 13/11/2026 | combinado com a Raquel quando ela publica e como a moldura entra |
| marcar meia hora para a Larissa explicar o design system | Juliana | media | | horário marcado com as três |
| terminar o mecanismo de inscrição em editais | Juliana | media | | mecanismo usado em pelo menos uma inscrição real |
| inscrever o folga no BNDES | Juliana | media | | inscrição enviada |
| inscrever o folga no Inovativa | Juliana | media | 30/11/2026 | inscrição enviada |
| definir as entregas finais do site | Juliana | media | 12/12/2026 | lista do que falta no site, com dono de cada item |
| revisar o site e repassar à Larissa o que melhorar | Juliana | baixa | | lista de melhorias enviada à Larissa |
| revisar o site e repassar à Larissa o que melhorar | Viviane | baixa | | lista de melhorias enviada à Larissa |
| revisar os textos dos cases | Juliana | baixa | | textos dos cases revisados e atualizados no site |
| definir o modelo de mockup dos cases da página inicial | Larissa | baixa | | modelo padrão aprovado pelas três |
| ↳ aplicar o modelo de mockup nos outros cases | Larissa | baixa | | todos os cases da página inicial no modelo novo |
| fazer mais mockups para os cases | Larissa | baixa | | |
| atualizar o formulário "trabalhe conosco" do site | Juliana | baixa | | formulário com textos e campos atuais, publicado |
| estudar tráfego pago para prospecção | Viviane | baixa | | resumo do que aprendeu e uma proposta de teste |
| ligar o chip e trocar o telefone da moldura | Juliana | baixa | | telefone novo funcionando e trocado onde aparece (site, redes) |

### folga · tarefas

| título | dono | prioridade | prazo | começa em | definição de pronto |
|---|---|---|---|---|---|
| planejar as sprints do folga até a divulgação | Juliana | alta | 13/11/2026 | | sprints com objetivo até 12/12 no app (`sprint_objetivos`) |
| pegar o número DUNS e passar para a Viviane | Juliana | alta | 14/11/2026 | 12/11/2026 | número recebido por e-mail e enviado à Viviane |
| cadastrar o folga como aplicativo no Google Play | Viviane | alta | | | pedido aberto no Google Play com o DUNS |
| adaptar o folga para mobile (tarefa-mãe, ver quebra abaixo) | Viviane | alta | | | app instalado em celular real, com as telas principais funcionando |
| montar o mecanismo de posts automáticos a partir dos filtros | Viviane | alta | | | posts gerados a partir dos filtros do app, com o que é automático e o que precisa de nós descrito |
| liberar a chave do Mercado Pago para cobrar pelo app | Viviane | alta | | | cobrança de teste feita pelo app |
| fazer o versionamento do app | Viviane | media | | | |
| revisar a identidade visual: componentes, depois páginas | Larissa | alta | | | componentes revistos e aplicados nas páginas do folga |
| ↳ ajeitar o mapa | Larissa | alta | | | mapa no novo visual e funcionando |
| ↳ refinar o design da landing | Larissa | alta | | | landing no novo visual, com o texto revisado |
| ↳ pensar os produtos físicos para o evento | Larissa | alta | 12/12/2026 | | lista de produtos com custo e prazo de produção |
| revisar o texto da landing | Juliana | alta | | | texto revisado e passado para a Larissa |
| revisar as notificações | Juliana | alta | | | textos e momentos das notificações revistos |
| revisar o fluxo da newsletter paga (2 meses, sugestões personalizadas) | Juliana | alta | | | fluxo testado do pagamento ao primeiro envio, com ajustes listados para a Viviane |
| terminar a página da curadoria | Juliana | media | | | página publicada |
| atualizar a curadoria com fontes e lugares novos | Juliana | media | | | fontes novas cadastradas |

As três tarefas da Larissa marcadas com ↳ dependem da revisão da identidade visual. A do texto da landing (Juliana) vem antes do refinamento do design da landing.

### folga · quebra de "adaptar para mobile" (Viviane)

Proposta para a Viviane ajustar. Todas são filhas da tarefa-mãe, com prioridade alta, salvo onde está indicado.

| título | dono | definição de pronto |
|---|---|---|
| escolher como empacotar o app para o Google Play (TWA, Capacitor ou outro) | Viviane | escolha registrada como decisão, com o motivo |
| ajustar as telas principais para celular (agenda, filtros, detalhe do evento, mapa) | Viviane | telas usáveis numa tela de 360 px |
| ajustar a navegação para celular (menu, voltar, gestos) | Viviane | dá para navegar o app inteiro com uma mão |
| garantir login e sessão no app instalado | Viviane | login funciona e a sessão não cai ao fechar o app |
| preparar ícone, tela de abertura e manifest | Viviane | ícones e tela de abertura no visual do folga (pedir à Larissa) |
| gerar a versão assinada e testar em celular real | Viviane | app instalado e testado em pelo menos dois aparelhos |
| montar o grupo de teste fechado que o Google exige | Juliana | testadores convidados e testando pelo período pedido |
| escrever a ficha do app no Google Play (descrição, prints, link da política) | Juliana | ficha preenchida e revisada |

### fica de fora

Corrigido na revisão de 09/11. Não suba:
- testar se a data salva na agenda (cortada)
- decidir se a newsletter sobe junto com o app (cortada)
- aplicar o material da Larissa sobre como construir um site (já feito)
- tudo do vetor, por enquanto

### ideia para o app

Registre como ideia no projeto do app de gestão (ou `moldura`, se não houver): "a tarefa recorrente sugere o formato do post (1 lâmina, carrossel) conforme o que saiu nas últimas semanas".
