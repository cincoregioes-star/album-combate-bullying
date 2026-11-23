# Combate ao Bullying e ao Cyberbullying — Álbum Digital Premium

Álbum digital pedagógico sobre bullying, cyberbullying, empatia, cidadania digital e cultura de paz. Usa a mesma estrutura do álbum **Dupla Exclusão Premium**, com conteúdo novo.

A escola que aparece no álbum, **Escola Municipal Horizonte Azul**, é **fictícia**. Para usar em uma escola real, troque o nome em `album-data.js` e em `index.html`, e substitua o arquivo `logo-escola.png`.

## Créditos
**Idealização, projeto digital, desenvolvimento do aplicativo e arquitetura da plataforma:** Prof. Carlos André Tavares de Lima
Professor de Geografia • Administração Escolar • Criador de Projetos Digitais Educativos
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
- **4 pílulas visuais**: Bullying não é brincadeira, Cyberbullying, Espectador que age e Pedir ajuda é coragem.
- **Game match-3** com 5 fases pedagógicas, que revela as figurinhas do álbum e dá prêmios ao álbum.
- **Painel dos professores** (`professor.html`) com login por nome de usuário, impacto antes e depois, ciclos, concluintes e exportação em CSV.
- **PWA** offline e **APK Android**.

## Onde editar o conteúdo
Todo o conteúdo pedagógico (figurinhas, páginas, simulados, desafio, missão, pesquisas, pílulas e fases do game) está em **`album-data.js`**.

## Figurinhas
As 36 imagens da pasta `figurinhas/` são **provisórias**. Os prompts ultrarrealistas para gerar cada uma estão em **`docs/PROMPTS_FIGURINHAS.md`**.
Gere cada imagem na **vertical (retrato 2:3), em 1024×1536 px**, e salve com o mesmo nome (`01.webp` … `36.webp`). Não é preciso mudar nenhum código.

## Supabase (dados dos alunos e painel)
O álbum usa o **mesmo projeto Supabase** do Dupla Exclusão, mas com **tabelas e funções próprias (prefixo `cb_`)**. Os dados não se misturam e um ciclo novo aqui não reinicia o outro álbum.

1. No Supabase, abra **SQL Editor → New query**.
2. Cole o arquivo `supabase/COMBATE_BULLYING_SUPABASE.sql` e clique em **Run**.
3. Crie o login de cada professor com o comando que está no fim do arquivo:
   `select public.cb_criar_professor('usuario', 'Nome do Professor', 'senha', 'admin');`

Enquanto o SQL não for executado, o álbum funciona normalmente no aparelho e guarda os registros numa fila para enviar depois. As pesquisas, porém, só abrem depois que o ciclo existir no Supabase.

## Publicar no GitHub Pages
Em **Settings → Pages**, escolha *Deploy from a branch*, depois a branch `main` e a pasta `/ (root)`.
Endereço: `https://cincoregioes-star.github.io/album-combate-bullying/`. O QR Code está em `qrcode/`.

## APK Android
O workflow `.github/workflows/build-apk.yml` gera o APK (sem assinatura) a cada alteração na branch `main`. Também dá para rodar manualmente em **Actions**.
Pacote: `br.com.combatebullying.album`.

## Leis citadas no conteúdo
- Lei 13.185/2015: Programa de Combate à Intimidação Sistemática (Bullying)
- Lei 14.811/2024: art. 146-A do Código Penal (bullying e cyberbullying)
- Lei 13.663/2018: altera a LDB para incluir a prevenção do bullying e a cultura de paz
- Lei 13.277/2016: 7 de abril, Dia Nacional de Combate ao Bullying e à Violência na Escola
- ECA (Lei 8.069/1990), Lei 7.716/1989 e Lei 13.146/2015
