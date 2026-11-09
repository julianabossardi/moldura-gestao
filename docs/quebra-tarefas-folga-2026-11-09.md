# quebra de tarefas do folga · equilíbrio entre as três

09/11/2026. Complemento de `docs/tarefas-e-recorrencia-2026-11-09.md`. A carga inicial subiu bem, mas ficou desproporcional: Juliana com muito mais tarefas que Larissa e Viviane. Esta lista quebra as tarefas grandes da Larissa e da Viviane em tarefas menores e acrescenta três frentes novas.

## como subir

1. Leia as tarefas que já estão no banco. As tarefas-mãe abaixo já existem; **não crie de novo**. Crie as filhas com `pai_id` apontando para elas.
2. "ajeitar o mapa" e "refinar o design da landing" já existem como filhas da identidade visual. **Reaproveite as duas** como as tarefas de página do mapa e da landing, completando objetivo e definição de pronto. Não duplique.
3. Rode primeiro em modo simulação, mostre o que entraria, o que seria pulado e o que seria reaproveitado, e só grave depois de eu confirmar.
4. Prioridade: tudo aqui é `alta` (é necessário para publicar o app e para a divulgação de 12/12), salvo onde estiver indicado. Projeto: `folga`. Origem: `manual`.
5. Onde há "depende de", use `comeca_em` ou mostre "espera: <tarefa>", como definido na parte de recorrência.

## Larissa

### tarefa-mãe existente: revisar a identidade visual (componentes, depois páginas)

Filhas, na ordem em que fazem sentido:

| título | definição de pronto | depende de |
|---|---|---|
| revisar as cores e a tipografia do folga | paleta e escala de texto fechadas, com o uso de cada cor (fundo, texto, destaque, estados) | |
| revisar espaçamento, bordas e sombras | valores definidos e aplicados nos componentes | cores e tipografia |
| revisar botões, campos e seleção | variações (normal, foco, desativado, erro) prontas | cores e tipografia |
| revisar o cartão de evento | cartão com imagem, título, data, local e preço no visual novo | botões e campos |
| revisar filtros e etiquetas | filtros usáveis no celular, com estado ativo e inativo | botões e campos |
| revisar a navegação (menu, abas, voltar) | navegação no visual novo, testada numa tela de 360 px | botões e campos |
| revisar ícones e ilustrações | conjunto único de ícones, e ilustrações para estado vazio, erro e carregando | cores e tipografia |
| documentar os componentes | cada componente com uso, variações e o que não fazer | todas as anteriores |

### uma tarefa por página

Cada página: aplicar a identidade nova, revisar no celular e no computador, e passar os ajustes de código à Viviane. Todas dependem de "revisar o cartão de evento", "revisar filtros e etiquetas" e "revisar a navegação", salvo a landing e a newsletter, que dependem só das cores, da tipografia e dos botões.

| título | definição de pronto |
|---|---|
| refazer o design da home do folga | home no visual novo e aprovada pelas três |
| refazer o design da agenda do folga | agenda no visual novo, com o estado vazio |
| refazer o design do catálogo do folga | catálogo no visual novo, com filtros |
| ajeitar o mapa (já existe: reaproveitar) | mapa no visual novo, com marcadores e cartão de evento |
| refinar o design da landing (já existe: reaproveitar) | landing no visual novo, com o texto já revisado |
| refazer o design do perfil do folga | perfil no visual novo, com login e conta |
| refazer o design da newsletter do folga | e-mail da newsletter no visual novo, testado em dois clientes de e-mail |

### frentes novas

| título | definição de pronto | depende de |
|---|---|---|
| construir o plugin de identidade do folga | plugin que carrega cores, tipografia, componentes e regras do folga e faz um assistente produzir peças no padrão (como a moldura-visual faz para a moldura); testado com pelo menos um post e uma página | cores, tipografia e documentação dos componentes |
| construir os artefatos de design do folga | artefatos de design publicados (guia de identidade, biblioteca de componentes e as sete páginas), editáveis e exportáveis | todas as páginas |

O produto físico para o evento (já existe) continua com a Larissa, depois da identidade.

## Viviane

### tarefa-mãe existente: adaptar o folga para mobile

Substitui a quebra anterior (que tinha oito filhas, duas da Juliana). Tudo da Viviane, salvo onde indicado.

| título | definição de pronto | depende de |
|---|---|---|
| escolher como empacotar o app para o Google Play (TWA, Capacitor ou outro) | escolha registrada como decisão, com o motivo | |
| ajustar as telas principais para celular (agenda, filtros, detalhe do evento, mapa) | telas usáveis numa tela de 360 px | |
| ajustar a navegação para celular (menu, voltar, gestos) | dá para navegar o app inteiro com uma mão | |
| garantir login e sessão no app instalado | login funciona e a sessão não cai ao fechar o app | escolha do empacotamento |
| garantir que o app funciona com internet fraca | telas principais carregam com cache e mostram aviso sem conexão | |
| preparar ícone, tela de abertura e manifest | ícones e tela de abertura no visual do folga | revisão das cores e dos ícones (Larissa) |
| aplicar o design novo das páginas no código | cada página da Larissa implementada e conferida contra o design | cada página da Larissa, uma a uma |
| gerar a versão assinada e testar em celular real | app instalado e testado em pelo menos dois aparelhos | todas as anteriores |
| escrever a ficha do app no Google Play (descrição, prints, link da política) | ficha preenchida e revisada (Juliana revisa o texto) | prints das páginas novas |

### frentes novas

| título | prioridade | definição de pronto |
|---|---|---|
| escrever o texto do mês para o site da moldura (sobre o processo de adaptar o folga para mobile) | baixa | texto revisado pela Juliana e publicado no site |
| criar um post para as redes da moldura, usando o plugin de identidade do folga | media | post construído com o plugin, revisado pela Larissa e publicado |

## o que sai da Juliana

- A tarefa "escrever a ficha do app no Google Play" passa para a Viviane (a Juliana só revisa o texto).
- A tarefa "escrever um texto novo para o site" deste mês (recorrência) passa para a Viviane, como acima. Não crie outra para a Juliana neste mês.
- Um post deste mês das duas por semana da recorrência passa para a Viviane, o que é o post com o plugin. As recorrências seguintes voltam ao dono padrão.
- "montar o grupo de teste fechado que o Google exige" continua com a Juliana, porque exige convidar pessoas.

## pontos que a Juliana ainda confirma

- O "texto para site" e o "post para redes" foram atribuídos à Viviane, mas a Larissa também pode pegar o post. O texto do site é da moldura ou da landing do folga?
- A prioridade do plugin e dos artefatos de design depende de quanto eles destravam a divulgação.
