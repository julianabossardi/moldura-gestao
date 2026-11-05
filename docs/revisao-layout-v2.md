# revisão de layout, rodada 2

Data: 04/11/2026. Referência: design system da moldura v2 (plugin `moldura-idvisual`, `ds/README.md`, `ds/tokens.css` de 23/10 e `ds/logo.md`), pela skill `moldura-sites`.
Telas olhadas no app local, com os dados de teste, em 1280 px: login, início, projeto (folga e vetor), reunião e memória.
Também entram as falas sobre o app da reunião de 03/11 (`docs/reunioes/2026-11-03-semanal.md`).

## o diagnóstico em uma linha

O app foi desenhado com a **versão 1** do design system (vidro, pílula, off-white, degradê furtacor). Na versão 2, de 23/10, essas escolhas foram revistas e várias passaram a ser o oposto. Por isso, a maior parte das correções está num lugar só: `app/moldura.css`.

## os 5 pontos, por impacto

### 1. tokens da v1 no lugar da v2

- **hoje:** `app/moldura.css` define `--m-off-white: #f8f7f8` como fundo da página, `--m-ink-soft: #1a1a1f` como cor de texto, variáveis de vidro (`--m-glass-*`), degradês furtacor e crimson (`--m-grad-irid`, `--m-grad-crimson`), e a furtacor com outros valores.
- **DS v2:** fundo papel `#f3f1f3` ou branco, nunca off-white; texto em tinta `#000` e tinta-2 `#444`; furtacor só como luz (rosa `#ffc2d6`, âmbar `#fff1c2`, água `#c9f3f0`, lilás `#cfc4ff`), nunca degradê de fundo; "vidro de interface é clichê".
- **correção:** trocar a base de `moldura.css` pelos valores de `ds/tokens.css`, mantendo os nomes `--m-*` para não mexer nos componentes. `--m-off-white` passa a apontar para o papel, e `--m-ink-soft` para a tinta. Apagar `--m-glass-*` e os degradês, e substituir cada uso por fundo chapado e filete `--tinta-4`.

### 2. cantos: pílula e arredondado por toda parte

- **hoje:** na página inicial há 40 elementos com `999px` (chips, botões, a barra "cola ou escreve"), 8 com `6px` e 2 com `12px`. O canto diagonal `16px 0` aparece em 10 elementos.
- **DS v2:** canto reto por padrão em botão, campo, chip e cartão. A diagonal oposta (`--raio-diagonal-40` ou `-12`) é um gesto de foco, **uma vez por tela**. Nunca os quatro cantos.
- **correção:**
  - `--m-radius-pill`, `-sm` e `-md` passam a `0`.
  - A diagonal fica só no elemento de foco de cada tela:
    - início: o bloco "suas tarefas de agora"
    - projeto: o número vivo principal
    - reunião: o cronômetro
    - memória: a busca
  - O cartão de tarefa volta a ser reto. Hoje ele leva a diagonal e repete o gesto em cada cartão.
  - O login também: o cartão e o botão "mandar link" estão arredondados nos quatro cantos.

### 3. texto cinza claro em tamanho pequeno

- **hoje:** 18 textos na página inicial em `#908e93` (tinta-3) com 14 px. Exemplos: os rótulos "projeto, tempo, estado, quantas", "uma tela, um print…", "Viviane deu foguinho…" e o menu. No fundo atual o contraste fica perto de 3:1.
- **DS v2:** tinta-3 só em texto de 24 px ou mais. Contraste mínimo de 4,5:1 (AA).
- **correção:** texto de apoio pequeno em tinta-2 `#444`; rótulo e legenda em 13 px, peso 500. Datas, contagens e o "1 de 4" da reunião vão em JetBrains Mono, porque são dado real.

### 4. sombra cinza e cartões "flutuando"

- **hoje:** os cartões levam `box-shadow` em `rgba(0,0,0,…)` (`--m-shadow-sm/md/lg`) sem uma direção de luz.
- **DS v2:** uma luz por tela. A sombra cai do lado oposto, tingida pela cor do fundo (no papel, cinza frio levemente lilás), nunca cinza puro.
- **correção:**
  - Cartões comuns perdem a sombra e ganham filete de 1 px em `--tinta-4`, que é o que separa.
  - Só o elemento de foco de cada tela (o mesmo da diagonal) tem sombra: uma luz, no mesmo ângulo em todas as telas, tingida de `rgba(64, 56, 80, …)`.
  - O véu da gaveta (`.veu`, `rgba(0,0,0,.18)`) segue a mesma tinta.

### 5. a marca e a identidade do projeto quase não aparecem

- **hoje:** o símbolo da moldura não aparece em nenhuma tela; o logotipo está no topo, sem uso do símbolo. A identidade de cada projeto continua fraca: folga tem fundo branco e destaque crimson, igual à moldura, e o vetor só fica um pouco mais azul. O acabamento de papel não aparece em lugar nenhum.
- **DS v2:** o símbolo é a constante da marca, um uso por espaço, sempre pelos arquivos SVG. O acabamento de papel aparece de forma pontual, não como fundo inteiro.
- **correção:**
  - Usar as camadas soltas do símbolo como **marcadores de seção**. Hoje os títulos "suas tarefas de agora", "equipe" e "entregas recentes" não têm marcador. A camada de fora marca a seção e a de dentro marca o subnível, sempre com os SVG de `ds/assets/logos/`.
  - Uma textura de papel leve só no cabeçalho da página do projeto, que também ganha a cor de fundo do projeto. Ela some com `prefers-contrast: more`.
  - Para a cor de cada projeto, continua valendo a dúvida 3 da rodada 1: preciso das cores e da marca de folga e vetor.

## por tela

### login

- Cartão e botão arredondados nos quatro cantos. É o primeiro contato e hoje tem cara de interface genérica.
- A tela é só tipográfica, então o foco é a hierarquia: "entrar" pode ser bem maior (display de tela), com o texto pequeno em tinta-2. Tirar o cartão e deixar o formulário direto no papel, com o símbolo em sangria num canto, como na capa de uma peça.

### início

- O seletor ao lado da saudação funcionou (pedido da rodada 1).
- O botão "me dá tarefas" é uma pílula crimson cheia. Pela v2, o crimson é pontual e fica no estado do botão. Proposta: botão reto preto, com o ponto crimson no ícone ou no estado pressionado.
- "mostrar para a equipe" está melhor que antes, mas também é diagonal; pelo ponto 2, fica reto.
- "todas as suas tarefas" recolhida em "‹ 7 tarefas abertas", em cinza claro pequeno: quase some.
- A barra flutuante "cola ou escreve" cobre o fim da página. Precisa de respiro embaixo (padding do `main` igual à altura da barra mais 24 px).

### projeto

- Os números vivos em escala grande (1240, 312) são o melhor momento tipográfico do app: palavra grande contra texto pequeno real. Manter.
- A legenda dos números ("+48 na semana") está em cinza claro pequeno (ponto 3).
- **marcos:** a linha do tempo é um ponto solto numa linha. Pela v2, o verbo aqui é **construir**: régua com as datas em mono, índices (01, 02, 03) e o marco atual enquadrado. Na reunião pediram "marco da semana e do mês, como no vetor" (ver abaixo).
- O menu fica escondido num "≡" colado na borda esquerda. Ninguém acha.

### reunião

- O texto que explica a gravação entrou (pedido da rodada 1), mas em cinza claro pequeno, num parágrafo longo. Pela voz da moldura, uma frase curta perto do botão basta.
- "isso é decisão" e "isso é tarefa" ainda parecem filtros (pílulas soltas).
- **falta um caminho para colar a transcrição.** A reunião de 03/11 veio de uma transcrição externa e não havia onde colocar no app.
- Os blocos "o que falta", "feito desde a última reunião" e "mostrado para a equipe" usam o mesmo cartão. Uma régua por bloco, com o índice, ajudaria a ler a sequência.

### memória

- Busca, referências recentes e entregas recentes no topo: atende à rodada 1.
- Os selects ("todos os projetos", "todos os tipos") são pílulas cinza. Ficam retos, com filete.
- A "vibe de biblioteca" ainda não aparece. Pela v2, é o lugar de **construir** à mostra: cada item com legenda tipo "FIG.", a data em mono e o tipo como índice.

## da reunião de 03/11 para o app

Não são ajustes de layout, mas mudam o que o layout precisa mostrar.

1. **processo, não só projeto.** Posts semanais e prospecção são contínuos, sem marco. Proposta: projeto com `tipo` (projeto ou processo). O processo mostra a cadência ("toda semana") no lugar dos marcos.
2. **marco da semana e do mês** à vista no início, por projeto.
3. **"me dá tarefas" a partir do que está priorizado na semana**, e não só do backlog todo.
4. **o app travou na demonstração.** Localmente, o início carrega em cerca de 0,8 s e as outras telas em 0,3 a 0,4 s. Isso precisa ser medido em produção quando o deploy voltar (hoje dá erro 500). Mostrar um esqueleto da página enquanto carrega também evita a sensação de "travado".
5. **colar transcrição na reunião**: a mesma proposta que a IA faz a partir do áudio, mas a partir do texto. A reunião de 03/11 já está nesse formato em `docs/reunioes/2026-11-03-proposta.json`.

## ordem sugerida

1. ~~Tokens v2 em `app/moldura.css` (pontos 1, 3 e 4)~~ **feito em 04/11**. Fundo papel, texto em tinta, cinza pequeno em tinta-2, sem vidro, sombra tingida só no cartão em andamento, chips e botões retos, tipografia na escala de tela (corpo 17, legenda 13). Ainda há duas diagonais na página inicial (o seletor `.vidro` e o cartão em andamento), e elas ficam para a etapa 2.
2. ~~Cantos (ponto 2) e o elemento de foco de cada tela~~ **feito em 04/11**. A classe `.foco` aplica a diagonal de 40 px e a única sombra da tela. No início, ela fica na primeira tarefa da sessão; no projeto, no primeiro número vivo; na reunião, no cronômetro; na memória, na busca. Os painéis (`.vidro`), os cartões e o "mostrar para a equipe" ficaram retos. O botão principal (`.btn.acento`) agora é preto, com um ponto crimson, e só fica crimson cheio enquanto está pressionado. O login continua sem foco e fica para a etapa 4.
3. ~~Símbolo como marcador de seção, e cabeçalho do projeto com cor e papel (ponto 5)~~ **feito em 04/11**, com uma parte ainda aberta.
   - **Marcadores:** as camadas do símbolo foram tiradas, sem redesenho, de `moldura-simbolo.svg` do DS v2 e estão em `public/marca/simbolo-camada-{v,l,j}.svg`. A camada v marca cada seção (`h2` sem classe dentro de `.bloco`) e fica pendurada na margem. A camada l marca o subnível, que hoje é o nome do projeto nos encaminhamentos da reunião. No celular e dentro das gavetas, o marcador volta para dentro.
   - **Cabeçalho do projeto:** virou uma faixa com a cor do projeto (`--tema-fundo`), um filete em cima na cor do texto do projeto e grão de papel em SVG (`feTurbulence`). O grão some com `prefers-contrast: more`.
   - **Em aberto:** as cores de folga, moldura e vetor ainda são as de antes. O tema da moldura no banco ainda usa o off-white `#f8f7f8`. Falta receber as cores e as marcas (dúvida 3 da rodada 1).
4. ~~Login~~ **feito em 04/11**.
   - Saiu o cartão. A tela agora tem papel no fundo, "entrar" em display de tela, o apoio em tinta-2 e o campo com rótulo próprio.
   - O botão principal tem o ponto crimson.
   - O símbolo entra em sangria no canto inferior direito, girado 180°, com os braços rentes às bordas e o conteúdo dentro do ângulo. Ele usa o arquivo `moldura-simbolo.svg` do DS v2, em tinta-4.
   - O texto entra em 225 ms, um item a cada 0,4 s. Com `prefers-reduced-motion`, não há animação.

**pedidos de 04/11 (fora da ordem)**

- "o que andou nesta semana" saiu da página do projeto, junto com a consulta e o CSS que só ela usava.
- **cartão de tarefa compacto.**
  - Não tem mais altura mínima.
  - O bonequinho fica à esquerda e o título ao lado.
  - Numa linha só ficam as marcas (estrela, atrasada, em andamento), o projeto em mono e as reações.
  - O mesmo formato vale para o cartão de item (`CartaoItem`), o cartão de sugestão da sessão (`PainelDoDia`) e o cartão do painel da reunião (`PainelProjetoView`).
  - Na sessão do início, a grade usa `auto-fill`, então uma tarefa sozinha não ocupa mais a largura toda. Como o cartão ficou pequeno, o foco dela passou da diagonal de 40 px para a de 12 px.
5. Colar transcrição na reunião.
6. Projeto como processo e marco da semana.

## revisão da Juliana, 04/11 (ditada)

**feito**

- **cabeçalho de sistema** em todas as telas internas: marca com "gestão" em mono, navegação (início, reunião, memória, faxina), onde estou e notificações. Ocupa a largura toda e fica fixo no topo.
- **notificações**: o aviso solto ("Viviane deu foguinho…") saiu da página e foi para um painel no cabeçalho, com as reações nas minhas coisas e o que a equipe fez nos últimos 7 dias. O "novo" fica guardado no aparelho.
- **topo do início**: "oi, juliana / como você se sente hoje?", e a equipe ao lado, com os bonequinhos soltos, sem caixa (estado e o que está fazendo). A seção "equipe" de baixo saiu.
- **seletor**:
  - projeto: "todos" e depois moldura, vettor e folga, nesta ordem. A API aceita "todos" e busca tarefas de todos os projetos ativos.
  - "tempo disponível"
  - "como você está": focada, criativa e distraída. "leve" continua no banco e aparece como "distraída", com uma dica de que as tarefas vêm mais fáceis.
  - "quantas tarefas", com a opção "quantas achar melhor"
- **tarefas de agora** dentro de uma caixa com fundo.
- **desfazer feita**: no cartão da sessão e na gaveta. A gaveta também ganhou "cancelar tarefa" e "reabrir".
- **todas as suas tarefas**: filtros por status (a fazer, em andamento, feitas, canceladas, com a contagem de cada um). Feitas e canceladas mostram os últimos 30 dias. Só aparece a lista do filtro escolhido; nada fica recolhido.
- **novidades** no lugar de "entregas recentes", no início e no projeto: "larissa entregou…", "juliana compartilhou uma referência…", "maria concluiu…", com a categoria em mono e há quanto tempo.
- **projeto**:
  - os marcos subiram para o topo de "como estamos";
  - o cabeçalho mostra "desde novembro de 2026 · N semanas";
  - o evento do folga em 11/12 entrou como marco (banco local) e no registro da reunião.
- **reunião**: o subtítulo agora é "grave a conversa olhando para o que está acontecendo em cada projeto."
- **ordem e nome dos projetos** (banco local): moldura 1, vettor 2, folga 3. O nome do vetor passou a "vettor"; o slug continua `vetor`.

**em aberto**

- **identidade visual de cada projeto**: faltam as cores e a marca.
- **links rápidos**: adicionar pela tela do projeto, para ver como fica.
- ~~**sprint**~~ **feito em 05/11: sprint quinzenal por projeto.**
  - Migration `20261112000000_sprint_quinzenal.sql`, sem tabela nova:
    - `projetos.sprint_inicio` é a segunda-feira da sprint 1, preenchida pela semana em que o projeto foi criado;
    - `projetos.sprint_objetivos` guarda um objetivo por número de sprint.
  - O cálculo está em `lib/sprint.ts`, com testes.
  - No topo de "como estamos", o bloco "sprint N" mostra:
    - as datas, o dia (de 14) e quantos dias faltam;
    - uma régua de 14 dias (passados em tinta, hoje em crimson, as duas semanas separadas);
    - o objetivo, editável;
    - as tarefas da sprint: em andamento, e abertas com prazo até o fim dela, incluindo as atrasadas.
  - O bloco "em curso agora" foi trocado pela sprint.
  - Ainda não foi aplicada no banco da nuvem.
- **aba gestão**: repensar para não virar "uma coisa depois da outra".
- **títulos das tarefas** ("definir filtros de categoria", "mandar fotos do espaço"…): são dados de teste do banco local, não tarefas reais. No banco da nuvem ainda não há nenhuma tarefa.
