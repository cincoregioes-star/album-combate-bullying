# Combate ao Bullying e ao Cyberbullying — Álbum Digital Premium

Álbum digital pedagógico sobre bullying, cyberbullying, empatia, cidadania digital e cultura de paz. Usa a mesma estrutura do álbum **Dupla Exclusão Premium**, com conteúdo novo.

A escola que aparece no álbum, **Escola Municipal Horizonte Azul**, é **fictícia**. Para usar em uma escola real, troque o nome em `album-data.js` e em `index.html`, e substitua o arquivo `logo-escola.png`.

## Créditos
**Idealização, projeto digital, desenvolvimento do aplicativo e arquitetura da plataforma:** Prof. Carlos André Tavares de Lima
Licenciado em Geografia • Especialista em Políticas Públicas e Gestão Pública • Criador de Projetos Digitais Educativos
cincoregioes@gmail.com

## O que tem no álbum
- **36 figurinhas em 6 páginas temáticas**, com 4 raras, 10 especiais e 22 comuns:
  1. O que é bullying
  2. Formas de bullying
  3. Cyberbullying
  4. Sinais e consequências
  5. Como agir: rede de proteção
  6. Escola que protege
- **Ficha de cada figurinha** com mensagem central, por que isso importa, reflexão, direito relacionado (lei) e uma pergunta para conversar.
- **5 simulados de 10 questões.** Quem acerta 10 ganha 1 pacote; com qualquer erro ganha 1 figurinha. As alternativas corretas são redistribuídas automaticamente.
- **Desafio Final** (10 questões) e **Missão Resgate** (5 questões).
- **Pesquisa 1** (diagnóstico inicial) e **Pesquisa 2** (avaliação final), anônimas, com indicadores de antes e depois.
- **Game match-3** com 5 fases pedagógicas, que revela as figurinhas do álbum e dá prêmios ao álbum.
- **Painel dos professores** (`professor.html`) com login por nome de usuário, impacto antes e depois, ciclos, concluintes e exportação em CSV.
- **PWA** offline e **APK Android**.

## Onde editar o conteúdo
Todo o conteúdo pedagógico (figurinhas, páginas, simulados, desafio, missão, pesquisas e fases do game) está em **`album-data.js`**.

## Figurinhas
As 36 figurinhas da pasta `figurinhas/` são as artes finais, no formato vertical 9:16 (768×1376 px).
Os prompts usados para gerá-las estão em **`docs/PROMPTS_FIGURINHAS.md`**. Para trocar uma imagem, salve a nova com o mesmo nome (`01.webp` … `36.webp`). Não é preciso mudar nenhum código.

## Modo livre (padrão) e Supabase
O álbum vem em **modo livre**: tudo funciona sem servidor (álbum, pacotes, simulados, desafio, missões, game e as duas pesquisas) e o progresso de cada aluno fica salvo no próprio aparelho/navegador.

- **Pesquisa 1** (diagnóstico inicial) pode ser respondida a qualquer momento.
- **Pesquisa 2** (avaliação final) é liberada automaticamente quando o aluno **completa o álbum** (36 figurinhas coladas). Ao enviá-la, o aluno vê o seu "antes e depois".
- **Identificação do aluno** fica bloqueada com o aviso de que será habilitada após a definição do projeto.

### Para ter o painel dos professores (opcional)
1. Crie um projeto no Supabase e rode `supabase/COMBATE_BULLYING_SUPABASE.sql` no SQL Editor.
2. Crie o login de cada professor com o comando que está no fim do arquivo.
3. Em `supabase-config.js`, preencha `url` e a chave pública (`publishableKey` e `anonKey`) e mude `enabled` para `true`. Em `game/game-v13.js`, preencha a mesma `url` e `key`.

Com o Supabase ligado, o professor também pode liberar a Pesquisa 2 para a turma inteira pelo painel.

## Publicar no GitHub Pages
Em **Settings → Pages**, escolha *Deploy from a branch*, depois a branch `main` e a pasta `/ (root)`.
Endereço: `https://cincoregioes-star.github.io/album-combate-bullying/`. O QR Code está em `qrcode/`.

## App para usar sem internet
- **Android:** a cada atualização na branch `main`, o GitHub gera o app (`combate-bullying.apk`) e publica em **Releases**. O botão **📲 Baixar o app** do site aponta para
  `https://github.com/cincoregioes-star/album-combate-bullying/releases/latest/download/combate-bullying.apk`.
  O app já traz todas as figurinhas, áudios e o game: funciona totalmente offline.
- **iPhone/iPad e computador:** o site é um app instalável (PWA). Depois de aberto uma vez com internet, funciona offline.
- A chave de assinatura do app está em `android-wrapper/combate-bullying.keystore` (senha no `app/build.gradle`). Mantenha esse arquivo: é ele que permite instalar versões novas por cima das antigas.

## Leis citadas no conteúdo
- Lei 13.185/2015: Programa de Combate à Intimidação Sistemática (Bullying)
- Lei 14.811/2024: art. 146-A do Código Penal (bullying e cyberbullying)
- Lei 13.663/2018: altera a LDB para incluir a prevenção do bullying e a cultura de paz
- Lei 13.277/2016: 7 de abril, Dia Nacional de Combate ao Bullying e à Violência na Escola
- ECA (Lei 8.069/1990), Lei 7.716/1989 e Lei 13.146/2015

## Painel do piloto (professor e Secretaria)

- Endereço: `professor.html` (ex.: https://cincoregioes-star.github.io/album-combate-bullying/professor.html).
- Banco: projeto Supabase `combate-bullying` (`kjtoayyyhwhbcuqyxijj`), criado com `supabase/PAINEL_PILOTO.sql`.
- Nenhum nome de aluno vai para o servidor. Cada aluno recebe um cartão com um código aleatório de 5 caracteres, que funciona em um único celular. O app só envia figurinhas, simulados, pacotes e a data de uso.
- A Secretaria cadastra escolas e cria o login de cada escola. A escola cria turmas (os códigos são gerados na hora) e imprime os cartões.
- Senha da Secretaria: o SQL cria o usuário `secretaria` com senha aleatória. Para definir a sua, rode no SQL Editor:
  `update public.cbp_usuarios set senha_hash = extensions.crypt('SUA-SENHA', extensions.gen_salt('bf')) where usuario = 'secretaria';`
- As pesquisas inicial e final continuam em papel, anônimas.
