# ajustes de layout, rodada 1

Origem: revisão de layout ditada pela Juliana, olhando o app rodando (página inicial, projeto, reunião, memória).
Este documento organiza a fala por tela, separa o que é pedido do que é dúvida e diz onde mexer no código.
O texto foi ditado e transcrito, então alguns trechos vieram truncados. Onde houve interpretação, está marcado como **(interpretação)** e a pergunta correspondente está na seção "dúvidas para a Juliana".

## como usar

1. Ler "contexto" e "o que mudou na cabeça do produto" antes de mexer em qualquer tela.
2. Construir primeiro o componente **cartão de tarefa** (seção própria), porque ele aparece na página inicial, no projeto e na reunião.
3. Seguir a "ordem sugerida" no fim.
4. Responder (ou pedir à Juliana) as "dúvidas" antes de implementar os itens marcados com `?`.

## contexto

- App em Next.js (App Router) + TypeScript, Supabase (Postgres com RLS, Auth, Storage, Realtime), jobs no Vercel Cron. Repositório: `julianabossardi/moldura-gestao`.
- Especificação original: `Plataforma interna da moldura — especificação.md` (as fases 1 a 6 estão implementadas).
- Design system: skill `moldura-design` (Instrument Sans, glass, crimson cirúrgico, caixa baixa). Texto da interface na voz da moldura (skill `moldura-voz`): simples, sem jargão de gestão, sem travessão, sem emoji, tudo em português.
- Bonequinhos e ícones 8-bit são gerados por `scripts/gerar-bonequinhos.py` e `scripts/gerar-icones.py`. Estados em `lib/estados-bonequinho.ts`.
- Regra de dados: nada é apagado, tudo vira status. Poucas tabelas: antes de criar uma, ver se é campo ou lente de uma existente.
- Onde ficam as telas hoje:
  - página inicial: `app/page.tsx`, `components/Seletor.tsx`, `components/TarefasAbertas.tsx`, `components/FazendoAgora.tsx`, `components/EntregaCard.tsx`, `components/Mostrar.tsx`, `components/Bonequinho.tsx`
  - projeto: `app/projetos/[slug]/page.tsx`, `components/projeto/*`
  - reunião: `app/reuniao/page.tsx`, `app/reuniao/[id]/page.tsx`, `components/reuniao/*`
  - memória: `app/memoria/page.tsx`
  - faxina: `app/faxina/page.tsx`, `components/FaxinaFluxo.tsx`
  - painel de edição de item: `components/PainelItem.tsx`
  - estilos: `app/globals.css`

## o que mudou na cabeça do produto

Estes pontos valem para todas as telas.

1. **Visual antes de lista.** Listas e tabelas "soltas" não funcionam para ela. Preferir caixinhas (cartões), com avatar, ícone e cor. Isso vale para tarefas, entregas, reunião e memória.
2. **"Recorte" some da interface. Passa a ser "tarefa".** O botão é "me dá tarefas", o resultado são tarefas. Internamente o código e o banco podem continuar chamando de recorte.
3. **Prioridade simplificada.** Alta, média e baixa não dizem nada para ela. No lugar:
   - **estrela** em quem é importante (prioridade alta). Sem estrela, sem marca.
   - marca de **rápida** (cabe em pouco tempo).
   - marca de **atrasada** (prazo vencido).
   O banco continua guardando o nível de prioridade; só a interface muda.
4. **Cada coisa precisa dizer por que fazer agora.** O que importa para a usuária é: é rápido? é importante? está atrasado? Dar "atrativos" para escolher uma tarefa.
5. **Tudo que aparece precisa ser clicável e abrir os detalhes.** Hoje tarefas, entregas e itens da memória não abrem nada. Os detalhes abrem por uma **gaveta na lateral direita**, com resumo curto e a opção de editar.
6. **Ícones 8-bit para as ações pequenas** (foguinho, estrela e similares), seguindo o que já existe.
7. **A identidade de cada projeto precisa ser visível.** Hoje entrar no folga quase não muda nada na tela.

## página inicial

### 1. cabeçalho e seletor lado a lado

- Hoje: saudação ("oi, juliana", estado, aviso de foguinho) em cima e o seletor (hoje, tempo, estado, quantidade) ocupando uma faixa larga embaixo.
- Pedido: o seletor fica **ao lado** da saudação, mais compacto. Ele está ocupando espaço demais.
- Critério: em desktop, saudação e seletor na mesma altura, em duas colunas. Em celular, empilhados, com o seletor recolhível.

### 2. "me dá tarefas" e o bloco de tarefas do período

Este é o ponto mais importante da página inicial. O fluxo que ela descreve:

> vou gerar, ver duas ou três tarefas, focar nelas durante esse tempo, escolher uma, começar, e ir marcando se foi cumprida ou não.

- Renomear "me dá recortes" para **"me dá tarefas"**.
- As tarefas sugeridas (1, 2 ou 3) aparecem **embaixo do seletor, como quadrados com destaque**, lado a lado.
- Cada quadrado é um cartão de tarefa (ver seção própria), com o motivo de estar ali ("por que agora") e o tempo estimado.
- Ela **escolhe uma e começa**. As outras continuam visíveis como "da sessão".
- Cada tarefa da sessão pode ser marcada como **cumprida** ou **não cumprida**. **(interpretação)** "não cumprida" devolve a tarefa para a lista, sem culpa, e conta como retorno do recorte (hoje `recorte_retorno`: aceito, trocado, editado, concluido, abandonado).
- Hoje, ao começar, a tarefa vai para uma barra "fazendo agora" no topo com um botão "concluir" sozinho. Ela achou essa dinâmica estranha e difícil de visualizar. A barra "fazendo agora" deve virar parte do bloco da sessão, não um elemento solto.
- Critério: depois de "me dá tarefas", ela vê até 3 quadrados; escolhe um; vê qual está em andamento, quais faltam e quais já foram cumpridas, tudo no mesmo bloco.

### 3. "minhas tarefas abertas"

- Hoje: lista recolhida, com nome e "alta/media/baixa". Ela não entendeu se era dos recortes ou não, e achou "solta".
- Pedido: deixar claro que **é o backlog geral**, separado das tarefas da sessão. Usar cartões (caixinhas), não linhas de tabela. Trocar o texto de prioridade pelos ícones (estrela, rápida, atrasada).
- Ideia: título do bloco mais claro, por exemplo "todas as minhas tarefas", agrupadas por projeto, com cartões menores.
- Critério: ninguém confunde o backlog com as tarefas do período.

### 4. botão "mostrar"

- Hoje: botão pequeno no canto superior direito, ela achou "aleatório".
- Pedido: botão com **mais destaque** e que diga **para que serve**. Textos possíveis: "compartilhar uma ideia", "compartilhar uma referência", "compartilhar algo". **(interpretação)** deve permitir escolher o que está compartilhando (ideia, referência, entrega).
- Critério: dá para entender o botão sem explicação, e ele fica em lugar visível, não no canto.

### 5. equipe e entregas recentes

- A parte da equipe (bonequinhos com estado e "fazendo agora") está **boa**, "bonitinha". Manter.
- **Bug / falta:** as entregas **não dá para clicar**. Devem abrir a gaveta lateral com os detalhes.
- **Bug:** "responder em áudio" **não funcionou** para ela. Investigar (ver "pendências técnicas": a gravação falha em silêncio quando o microfone está bloqueado e o formato do áudio em Safari/iPhone é diferente). Mostrar mensagem clara quando não conseguir gravar.
- Reações: ver a seção "reações" abaixo.

## reações (foguinho, estrela)

- Hoje: um foguinho por pessoa por entrega (tabela `reacoes`, com `unique (item_id, pessoa_id, tipo)`), e clicar de novo remove a reação.
- Pedido: **poder clicar várias vezes**, sem limite por pessoa, "como curtir várias vezes". Exemplos dela: uma entrega que ficou muito legal (vários foguinhos) e uma tarefa de muita prioridade (várias estrelinhas).
- Ícones: **dois** (ela citou foguinho, estrela e coração; ver dúvida 4).
- Vale para **entregas e para tarefas**, nos cartões.
- Mudança de dados: remover a unicidade por pessoa para os tipos de clique (foguinho, estrela), guardar cada clique como uma linha, mostrar a contagem. Isso também resolve a regra "nada é apagado" (hoje desfazer o foguinho apaga a linha). A reação em áudio continua uma por pessoa por item (índice único parcial em `tipo = 'audio'`).
- Cuidado: o estado "feliz" do bonequinho (`equipe_resumo`) conta pessoas distintas com reação nas últimas 48h. Continua valendo com cliques múltiplos.

## cartão de tarefa (componente novo)

Ela descreveu o cartão em voz alta. Compilado:

- **Nome da tarefa.**
- **Responsável**, por meio do **bonequinho dela** (o nome é opcional, o ícone basta).
- **Características em ícones:**
  - estrela se for importante (prioridade alta)
  - ícone de **rápida** (ela citou "um tempinho")
  - ícone de **atrasada** se o prazo passou
  - "não consigo pensar em outra opção" (aberto a mais)
- **Reações clicáveis várias vezes** (foguinho, estrela), com contagem.
- **Clicar no cartão abre a gaveta lateral** com as informações da tarefa, mais resumidas, e a opção de editar.
- O mesmo cartão é usado: nas tarefas da sessão (página inicial), no backlog, nas colunas do projeto (aba gestão), no painel da reunião.

### painel de detalhes e edição da tarefa

Ela abriu o painel atual (por exemplo, "colocar logo no site") e comentou os campos:

- **Título**: ok.
- **"Texto"** não faz sentido para tarefa. Trocar por dois campos: **objetivo** e **definição de pronto**. **(interpretação)** vale só para tipo tarefa; para ideia, referência e outros, continua um campo de texto.
- **Projeto**, **responsável**, **prioridade**: ok por enquanto. A prioridade vira um controle simples de "importante" (estrela) em vez de três níveis. "Depois a gente vê se precisa de mais."
- O painel deve abrir **pela lateral direita**, o mesmo comportamento da gaveta de detalhes.

## projeto

### identidade do projeto

- Hoje: ao entrar no folga quase nada muda na tela (o tema seed do folga é praticamente branco e crimson, o mesmo do app).
- Pedido: **mudar a cor de fundo** e deixar nítido que "estamos falando deste projeto", com a marca do projeto.
- Ação: pedir à Juliana as cores e a marca de folga, moldura e Vetor (dúvida 3), aplicar o tema em mais áreas (fundo da página, cabeçalho, cartões, talvez o menu), não só em variáveis de texto e destaque.

### aba "como estamos"

- **Números vivos:** "sei que tem que melhorar" (sem detalhes). Manter como está e tratar depois.
- **Tarefas ("em curso agora" e gestão):** trocar a lista por **cartões em caixinhas**, com o bonequinho de quem é responsável, estrela e tempo. Mais visual.
- **Próximo marco:** hoje é um texto e uma data. Ela quer algo "mais interessante" e **progressivo**: uma **linha do tempo** em que dá para ir para trás e para a frente. Mudança de dados: hoje há um único `proximo_marco`; uma linha do tempo precisa de uma **lista de marcos** (passados e futuros, com data e se foi cumprido). **(interpretação)** nova coluna `marcos` em `projetos` (jsonb) em vez de tabela nova.
- **Entregas recentes:** hoje não é clicável. Deve ficar no mesmo estilo do cartão de entrega da página inicial (o "ícones do mapa"), clicável, com reações.
- **Movimento da semana:** ela **não entendeu** o que é. Reescrever o título e a explicação (por exemplo "o que andou nesta semana") e mostrar com bonequinhos e cartões, não com uma contagem solta. **(interpretação)** é a lista de quantos itens cada pessoa mexeu nos últimos 7 dias.
- **Links rápidos:** nova seção, em "como estamos". Acesso rápido ao **app/produto**, ao **site publicado** e à **homologação**. Ver dúvida 1 sobre o que mais entra. Mudança de dados: hoje `projetos.links` é uma lista de `{titulo, url}` (documentos fixados na aba gestão). Dar um `tipo` a cada link (produção, homologação, repositório, design, outro) e mostrar os de acesso rápido no topo de "como estamos". Os campos de GitHub e Vercel já existem em `projetos.integracoes` e podem alimentar esses links.

### aba "gestão"

- Colunas por responsável: manter a ideia, mas com **cartões de tarefa** (bonequinho, ícones) em vez de linhas simples.
- O resto (decisões, documentos fixados, ideias e referências) fica para a próxima rodada, exceto o que depender do cartão e da gaveta.

## reunião

Ela não entendeu bem como a reunião funciona. O modelo mental dela:

> a gente entra na reunião, conversa, vê o que está em andamento, o que falta, como está cada coisa. dá para abrir um link. é uma troca que a gente grava, e depois estrutura o que ficou de encaminhamento.

Ajustes:

- **Painel visual por projeto, em caixinhas.** Mostrar, por projeto: o que está em andamento, o que falta, como está cada coisa. Usar cartões de tarefa com bonequinho, não listas por pessoa. Dar nome claro a cada bloco.
- **Explicar o que a gravação faz.** Ela ficou em dúvida se **gravar aqui vale para todas**. Resposta do sistema: sim, é uma gravação só da reunião inteira. Escrever isso na tela, de forma curta, perto do botão começar.
- **"isso é decisão" e "isso é tarefa".** Ela não entendeu. Explicar na interface que são **marcas de horário** para ajudar a IA a separar o que for decisão e o que for tarefa depois. **(interpretação)** manter, mas com uma frase de explicação e um feedback claro quando marcar. Ver dúvida 6.
- **Abrir links durante a reunião.** Ela citou "a gente pode abrir um link". Colocar os links rápidos do projeto no painel da reunião.
- **Reuniões anteriores:** hoje é uma lista simples que leva para outra página. Pedido: **abrir pela lateral direita** (gaveta).
- **"o que foi aprovado":** na tela de uma reunião aprovada, ela estranhou o bloco. Deixar mais claro o que é "encaminhamento" (tarefas, decisões e ideias que saíram da reunião). Usar cartões e agrupar por projeto.
- Critério: alguém que nunca viu a tela entende, sem explicação, que ela grava tudo, mostra o que mudou por projeto e, depois, organiza os encaminhamentos.

## memória

- Ela quer uma **vibe de biblioteca**. Não viu como ficou na prática.
- **Está difícil de achar.** A lista corrida de itens (texto, série de posts etc.) é ruim para navegar.
- **Clicar num item deve abrir uma gaveta lateral** com os detalhes, em vez de ir direto para o link ou não fazer nada. Hoje ela não sabe o que acontece ao clicar.
- **Referências recentes e material de entrega recente devem ficar mais em cima**, mais em destaque.
- **(interpretação)** organizar como estantes/prateleiras por categoria (referências, ideias, textos para o site, entregas), com cartões, e a busca no topo. Ver dúvida 8.

## faxina

A fala termina em "e esse da faxina" e não há mais nada. **Sem pedido registrado.** Perguntar à Juliana (dúvida 2).

## mudanças de dados (resumo)

| mudança | motivo |
| --- | --- |
| `reacoes`: tirar `unique (item_id, pessoa_id, tipo)`; índice único parcial só para `tipo = 'audio'`; tipos `foguinho` e `estrela` (e opcionalmente `coracao`) | clicar várias vezes |
| `itens`: campos `objetivo` e `definicao_de_pronto` (ou estrutura no `corpo`) para tarefas | trocar "texto" |
| "rápida": usar `minutos_estimados <= 30` ou um campo próprio, com controle no painel | ícone de rápida |
| "atrasada": derivado de `prazo` menor que hoje e status aberta, sem campo novo | ícone de atrasada |
| `projetos.marcos` (jsonb): lista de `{titulo, data, feito}` | linha do tempo |
| `projetos.links`: acrescentar `tipo` em cada link | links rápidos |

Toda mudança de banco entra como migração nova em `supabase/migrations/`, sem editar as antigas.

## dúvidas para a Juliana

Marcadas com `?` acima.

1. **"o Upab o próprio site"**: no trecho "acessar de modo rápido o Upab, o próprio site, o site publicado, a homologação", a palavra "Upab" não ficou clara. Provável: "o app". Quais links rápidos entram em cada projeto (app, site publicado, homologação, repositório, design, outros)?
2. **Faxina:** a fala termina em "e esse da faxina". O que ela queria dizer?
3. **Cores e marca de cada projeto** (folga, moldura, Vetor): cor de fundo, cor de texto, cor de destaque e logotipo. Hoje os três são quase brancos.
4. **Ícones de reação:** quais dois (ou três)? Foguinho e estrela? Coração também? Os dois de clique múltiplo são os mesmos nas entregas e nas tarefas?
5. **"Cumprida ou não" nas tarefas da sessão:** o que acontece quando ela marca "não deu"? Volta para a lista como estava, ou registra algo?
6. **Marcas "isso é decisão" e "isso é tarefa" na reunião:** manter? Ou trocar por um jeito mais simples de marcar o momento?
7. **Nome do botão "mostrar":** compartilhar o quê? Escolher entre "compartilhar", "mostrar para a equipe", "guardar uma ideia", ou um menu com os três.
8. **Memória:** prefere estantes por categoria (referências, ideias, textos para o site, entregas) ou uma grade única de cartões com filtros?
9. **Tarefas rápidas:** qual é o corte? Até 30 minutos?

## fora desta rodada

- Aba "gestão" além dos cartões (decisões, documentos fixados, ideias).
- Melhoria dos números vivos ("sei que tem que melhorar", sem detalhe).
- Portal do cliente (não foi revisado).

## pendências técnicas da revisão de código (não vieram da fala)

Itens que a revisão técnica encontrou. Entram junto, porque vários tocam nas mesmas telas.

**Corrigidos na revisão (já no código)**

- Os jobs agendados aceitavam o cabeçalho `Bearer undefined` quando `CRON_SECRET` não estava configurado. Agora, sem segredo, ninguém passa.
- A prévia de link (`/api/previa`) podia ser usada por clientes para o servidor buscar endereços. Agora só sócias.
- A visão `portal_projetos` não tinha o acesso do papel anônimo revogado.
- Os modos de desenvolvimento `EMBEDDING_FAKE` e `TRANSCRICAO_FAKE` são ignorados em produção.

**Para fazer**

1. **Gravação de áudio em Safari/iPhone.** O Safari grava `audio/mp4`, e o código nomeia o arquivo como `.webm`. Escolher a extensão pelo tipo do blob em `Captura.tsx`, `EntregaCard.tsx` e `ModoReuniao.tsx`. Mostrar mensagem quando o microfone estiver bloqueado, em vez de falhar em silêncio. Esta é a provável causa do "responder em áudio não funcionou".
2. **Confirmação automática das capturas** depois de 3 dias sem resposta, com "desfazer" (está na spec, não foi feita).
3. **"Sócia responsável pelo projeto"** para confirmar capturas de clientes: o modelo não tem esse campo. Hoje qualquer sócia confirma. Decidir se vale criar o campo.
4. **Limite de uso** nas capturas de clientes (cada captura chama a IA). Limitar, por exemplo, a 20 por hora por cliente.
5. **Testes.** Não há testes automatizados. Começar por funções puras (`estadoDoBonequinho`, `variacaoSemana`, `montarPainel`) e por um roteiro de RLS como o que foi feito à mão (cliente vê só o dele).
6. **Primeira ida à nuvem.** Aplicar as migrações do zero (`supabase db push`), colar o modelo de e-mail de `supabase/templates/magic_link.html` nos modelos "Magic Link" e "Confirm signup" do painel do Supabase, cadastrar a URL do site e as URLs de redirecionamento, e acrescentar à lista de sócias do trigger `nova_pessoa_auth` os e-mails da Lari e da Vivi.

**Variáveis de ambiente para a Vercel**

`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SITE_URL`, `CRON_SECRET`, `ANTHROPIC_API_KEY`, `GROQ_API_KEY`, `VOYAGE_API_KEY`, `REPLICATE_API_TOKEN`, `HUGGINGFACE_TOKEN`, `GOOGLE_SERVICE_ACCOUNT_JSON`, `GITHUB_TOKEN`, `VERCEL_TOKEN`, `FOLGA_DATABASE_URL`, `MEMORIA_LIMIAR` (opcional). O arquivo `.env.example` lista todas. Nunca definir `EMBEDDING_FAKE` nem `TRANSCRICAO_FAKE` em produção.

## ordem sugerida

1. Cartão de tarefa + gaveta lateral de detalhes (componente base).
2. Reações com cliques múltiplos (migração + ícones).
3. Página inicial: seletor ao lado, "me dá tarefas", bloco da sessão, botão de compartilhar.
4. Prioridade em ícones, painel de edição com objetivo e definição de pronto.
5. Projeto: identidade (cores), cartões, linha do tempo de marcos, links rápidos.
6. Reunião: painel em cartões, explicação da gravação, gaveta de reuniões anteriores.
7. Memória: estantes e gaveta.
8. Pendências técnicas (áudio em Safari primeiro).
