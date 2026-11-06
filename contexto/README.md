# contexto

O que o app precisa saber além da transcrição. A transcrição diz o que foi falado; estes arquivos dizem o cenário.
Edite à vontade: o código lê tudo na hora de rodar (`npm run reuniao:cruzar`).

- `papeis.md`: quem costuma fazer o quê. Serve de sugestão de dono quando a fala não diz.
- `projetos.md`: uma seção por projeto (`## slug`), com prazos, marcos e como as coisas se dividem.
- `glossario.md`: termos que a transcrição escreve errado ou que têm nome interno. É trocado no texto antes da leitura.
- `estado.md`: só o que o banco não sabe (coisa feita fora do app, mudança de mãos que ninguém registrou). Tarefas abertas e concluídas há pouco o app lê do banco, não precisa repetir aqui.

Se algum arquivo ficar grande, divida por projeto. Só o recorte dos projetos citados na reunião vai para o modelo.
