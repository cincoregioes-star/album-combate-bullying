// ============================================================
// Painel do Professor / Secretaria — Combate ao Bullying (piloto)
// ============================================================
const Painel = (function(){
  const CFG = window.CB_PAINEL || {};
  const K_SESSAO = 'cbp_sessao_painel';
  const K_NOMES = 'cbp_nomes_locais_v1';
  let sessao = null, dados = null;

  const $ = id => document.getElementById(id);
  const esc = t => String(t == null ? '' : t).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  async function rpc(nome, corpo){
    const r = await fetch(`${CFG.url}/rest/v1/rpc/${nome}`, {
      method: 'POST',
      headers: { apikey: CFG.key, Authorization: `Bearer ${CFG.key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(corpo || {})
    });
    const txt = await r.text();
    let j = null; try { j = JSON.parse(txt); } catch(e) {}
    if(!r.ok){
      if(txt.includes('sessao_invalida')){ sair(false); throw new Error('Sua sessão expirou. Entre de novo.'); }
      throw new Error('Não foi possível falar com o servidor.');
    }
    return j;
  }

  function mostrar(t){
    ['telaLogin','telaPainel','telaSenha','semConfig'].forEach(id => $(id).classList.add('oculto'));
    $({login:'telaLogin', painel:'telaPainel', senha:'telaSenha', config:'semConfig'}[t]).classList.remove('oculto');
    $('topoUsuario').classList.toggle('oculto', !(t === 'painel' || t === 'senha'));
  }

  async function entrar(ev){
    ev.preventDefault();
    $('lMsg').textContent = ''; $('lBtn').disabled = true;
    try{
      const r = await rpc('cbp_login', { p_usuario: $('lUsuario').value, p_senha: $('lSenha').value });
      if(!r || !r.ok){ $('lMsg').textContent = (r && r.erro) || 'Não foi possível entrar.'; return; }
      sessao = { token: r.token, nome: r.nome, perfil: r.perfil };
      sessionStorage.setItem(K_SESSAO, JSON.stringify(sessao));
      $('lSenha').value = '';
      await carregar();
    }catch(e){ $('lMsg').textContent = e.message; }
    finally{ $('lBtn').disabled = false; }
  }

  async function sair(chamar = true){
    if(chamar && sessao){ try{ await rpc('cbp_logout', { p_token: sessao.token }); }catch(e){} }
    sessao = null; dados = null; sessionStorage.removeItem(K_SESSAO);
    mostrar('login');
  }

  function abrirSenha(){ $('sMsg').textContent = ''; mostrar('senha'); }
  async function trocarSenha(ev){
    ev.preventDefault();
    try{
      const r = await rpc('cbp_trocar_senha', { p_token: sessao.token, p_atual: $('sAtual').value, p_nova: $('sNova').value });
      if(!r.ok){ $('sMsg').textContent = r.erro; return; }
      $('sAtual').value = ''; $('sNova').value = '';
      alert('Senha alterada.'); mostrar('painel');
    }catch(e){ $('sMsg').textContent = e.message; }
  }

  async function carregar(){
    try{
      dados = await rpc('cbp_painel', { p_token: sessao.token });
      $('quem').textContent = `${dados.nome} · ${dados.perfil === 'secretaria' ? 'Secretaria (todas as escolas)' : 'Escola'}`;
      render(); mostrar('painel');
    }catch(e){ alert(e.message); }
  }

  // ---------- nomes só neste navegador ----------
  function nomes(){ try{ return JSON.parse(localStorage.getItem(K_NOMES) || '{}'); }catch(e){ return {}; } }
  function salvarNome(id, valor){ const n = nomes(); if(valor.trim()) n[id] = valor.trim().slice(0, 80); else delete n[id]; localStorage.setItem(K_NOMES, JSON.stringify(n)); }

  // ---------- métricas ----------
  function metricas(alunos){
    const ativos = alunos.filter(a => a.vinculado);
    const media = ativos.length ? ativos.reduce((s, a) => s + a.figurinhas, 0) / ativos.length : 0;
    const completos = alunos.filter(a => a.figurinhas >= 36).length;
    const semana = alunos.filter(a => a.ultimo_uso && (Date.now() - new Date(a.ultimo_uso)) < 7 * 864e5).length;
    return { total: alunos.length, ativos: ativos.length, media, completos, semana };
  }
  function blocoMetricas(m){
    return `<div><span>Alunos com cartão</span><b>${m.total}</b></div>
      <div><span>Códigos ativados</span><b>${m.ativos}</b></div>
      <div><span>Média de figurinhas (ativos)</span><b>${m.media.toFixed(1).replace('.', ',')}/36</b></div>
      <div><span>Álbuns completos · usaram na semana</span><b>${m.completos} · ${m.semana}</b></div>`;
  }
  function quando(iso){
    if(!iso) return '—';
    const d = (Date.now() - new Date(iso)) / 864e5;
    if(d < 1) return 'hoje'; if(d < 2) return 'ontem'; return `há ${Math.floor(d)} dias`;
  }

  function render(){
    const sec = dados.perfil === 'secretaria';
    $('areaSecretaria').classList.toggle('oculto', !sec);
    const todos = dados.escolas.flatMap(e => e.turmas.flatMap(t => t.alunos));
    $('tituloVisao').textContent = sec ? 'Visão da rede' : (dados.escolas[0] ? dados.escolas[0].nome : 'Minha escola');
    $('metricasGerais').innerHTML = blocoMetricas(metricas(todos));
    $('atualizadoEm').textContent = 'Atualizado às ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    $('resumoEscolas').innerHTML = sec && dados.escolas.length ? `<div class="tabwrap"><table class="tabela"><thead><tr><th>Escola</th><th>Turmas</th><th>Alunos</th><th>Ativados</th><th>Média figurinhas</th><th>Completos</th></tr></thead><tbody>${
      dados.escolas.map(e => { const m = metricas(e.turmas.flatMap(t => t.alunos)); return `<tr><td>${esc(e.nome)}</td><td>${e.turmas.length}</td><td>${m.total}</td><td>${m.ativos}</td><td>${m.media.toFixed(1).replace('.', ',')}</td><td>${m.completos}</td></tr>`; }).join('')
    }</tbody></table></div>` : '';

    const n = nomes();
    $('escolas').innerHTML = dados.escolas.map(e => `
      <section class="card escola">
        <div class="linha" style="justify-content:space-between"><h2>${esc(e.nome)}</h2><div class="linha"><span class="muted peq">${e.turmas.length} turma(s)</span><button class="mini sol" onclick="Painel.relatorio('${e.id}')">📄 Relatório da escola</button></div></div>
        ${sec ? `<details><summary>Logins desta escola (${e.usuarios.length})</summary>
          <p class="muted peq">${e.usuarios.length ? e.usuarios.map(u => `${esc(u.usuario)} (${esc(u.nome)})`).join(' · ') : 'Nenhum login criado.'}</p>
          <div class="linha"><input id="u_${e.id}" placeholder="usuário (ex.: escola.horizonte)"><input id="un_${e.id}" placeholder="Nome (ex.: Coordenação)"><input id="us_${e.id}" type="password" placeholder="Senha (mín. 8)"><button onclick="Painel.criarLogin('${e.id}')">Criar login</button></div>
          <div id="mu_${e.id}" class="msg"></div></details>` : ''}
        <details ${e.turmas.length ? '' : 'open'}><summary>Nova turma</summary>
          <div class="linha"><input id="t_${e.id}" placeholder="Turma (ex.: 6º A)"><input id="tq_${e.id}" type="number" min="1" max="60" value="30" style="width:110px" title="Número de alunos"><button class="pri" onclick="Painel.criarTurma('${e.id}')">Criar turma e gerar códigos</button></div>
          <div id="mt_${e.id}" class="msg"></div></details>
        ${e.turmas.map(t => {
          const m = metricas(t.alunos);
          return `<div class="turma">
            <div class="linha" style="justify-content:space-between">
              <h3>${esc(t.nome)} <span class="muted peq">· ${m.ativos}/${m.total} ativados · média ${m.media.toFixed(1).replace('.', ',')} figurinhas</span></h3>
              <div class="linha"><button class="mini sol" onclick="Painel.cartoes('${e.id}','${t.id}')">🖨 Imprimir cartões</button><button class="mini" onclick="Painel.csv('${e.id}','${t.id}')">Baixar planilha</button><button class="mini" onclick="Painel.certificados('${e.id}','${t.id}')">🏅 Certificados</button><button class="mini" onclick="Painel.addAluno('${t.id}')">+ Aluno</button><button class="mini perigo" onclick="Painel.excluirTurma('${t.id}','${esc(t.nome)}')">Excluir turma</button></div>
            </div>
            <div class="tabwrap"><table class="tabela"><thead><tr><th>Nº</th><th>Nome (só neste navegador)</th><th>Código</th><th>Situação</th><th>Figurinhas</th><th class="esconde-mob">Simulados</th><th class="esconde-mob">Último uso</th><th></th></tr></thead><tbody>
            ${t.alunos.map(a => `<tr>
              <td><b>${String(a.numero).padStart(2, '0')}</b></td>
              <td><input class="nome-local" value="${esc(n[a.id] || '')}" placeholder="opcional" onchange="Painel.nome('${a.id}', this.value)"></td>
              <td class="cod">${esc(a.codigo)}</td>
              <td>${a.alerta_aparelho ? '<span class="pill p-alerta" title="Alguém tentou usar este código em outro celular">⚠ outro celular</span>' : a.vinculado ? '<span class="pill p-ok">Ativo</span>' : '<span class="pill p-nao">Aguardando</span>'}${a.reinicios ? ` <span class="pill p-alerta" title="O aluno reiniciou o álbum no celular; o painel guarda o maior progresso">↺ ${a.reinicios}</span>` : ''}</td>
              <td><span class="barra"><i style="width:${Math.round(a.figurinhas / 36 * 100)}%"></i></span>${a.figurinhas}/36</td>
              <td class="esconde-mob">${a.simulados}/5</td>
              <td class="esconde-mob">${quando(a.ultimo_uso)}</td>
              <td class="linha">${a.vinculado || a.alerta_aparelho ? `<button class="mini" title="Use quando o aluno trocar de celular" onclick="Painel.liberar('${a.id}', false)">Liberar celular</button>` : ''}<button class="mini" title="Gera um código novo (cartão perdido)" onclick="Painel.liberar('${a.id}', true)">Novo código</button></td>
            </tr>`).join('')}
            </tbody></table></div></div>`;
        }).join('')}
      </section>`).join('') || '<section class="card"><p class="muted">Nenhuma escola cadastrada ainda.</p></section>';
  }

  // ---------- ações ----------
  async function acao(nome, corpo, msgId){
    try{
      const r = await rpc(nome, Object.assign({ p_token: sessao.token }, corpo));
      if(!r.ok){ if(msgId && $(msgId)) $(msgId).textContent = r.erro; else alert(r.erro); return false; }
      await carregar(); return true;
    }catch(e){ alert(e.message); return false; }
  }
  const criarEscola = () => acao('cbp_criar_escola', { p_nome: $('novaEscola').value }, 'msgEscola').then(ok => { if(ok) $('novaEscola').value = ''; });
  const criarTurma = id => acao('cbp_criar_turma', { p_escola: id, p_nome: $('t_' + id).value, p_alunos: parseInt($('tq_' + id).value, 10) }, 'mt_' + id);
  const criarLogin = id => acao('cbp_criar_usuario_escola', { p_escola: id, p_usuario: $('u_' + id).value, p_nome: $('un_' + id).value, p_senha: $('us_' + id).value }, 'mu_' + id);
  const addAluno = t => acao('cbp_adicionar_aluno', { p_turma: t });
  function liberar(a, novo){
    const txt = novo ? 'Gerar um código novo para este aluno? O cartão antigo deixa de funcionar e será preciso imprimir outro.' : 'Liberar o código para ser usado em outro celular? Use quando o aluno trocar de aparelho.';
    if(confirm(txt)) acao('cbp_liberar_aparelho', { p_aluno: a, p_novo_codigo: novo });
  }
  function excluirTurma(t, nome){
    if(prompt(`Isto apaga a turma ${nome} e todos os códigos e progressos dela. Para confirmar, digite EXCLUIR`) === 'EXCLUIR') acao('cbp_excluir_turma', { p_turma: t });
  }

  function achar(eId, tId){ const e = dados.escolas.find(x => x.id === eId); return { e, t: e && e.turmas.find(x => x.id === tId) }; }

  function cartoes(eId, tId){
    const { e, t } = achar(eId, tId); if(!t) return;
    const n = nomes();
    const site = new URL('index.html', location.href).href.replace(/index\.html$/, '');
    const qrDe = cod => { try{ const q = qrcode(0, 'M'); q.addData(site + 'index.html?codigo=' + cod); q.make(); return q.createSvgTag({ cellSize: 3, margin: 0, scalable: true }); }catch(e){ return ''; } };
    const w = window.open('', '_blank');
    w.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Cartões ${esc(t.nome)}</title><style>
      @page{size:A4;margin:8mm}body{font-family:Arial,sans-serif;margin:0;color:#111}
      .grade{display:grid;grid-template-columns:1fr 1fr;gap:4mm}
      .c{border:1.5px dashed #555;border-radius:4mm;padding:4mm 5mm;height:64mm;box-sizing:border-box;display:flex;flex-direction:column;justify-content:space-between;break-inside:avoid}
      .t{font-size:9pt;color:#333}.t b{font-size:10pt;color:#111}
      .cod{font-family:Consolas,monospace;font-size:26pt;font-weight:800;letter-spacing:.2em;text-align:center;border:2px solid #111;border-radius:3mm;padding:1.5mm 0;margin:1.5mm 0}
      .baixo{display:flex;gap:3mm;align-items:center}.qr{width:22mm;height:22mm;flex:0 0 22mm}.qr svg{width:100%;height:100%}
      ol{margin:0;padding-left:4.5mm;font-size:8.2pt;line-height:1.3}
      .nome{font-size:8.5pt;border-bottom:1px solid #999;min-height:4mm}
      .ac{text-align:center;margin:6mm 0}button{font-size:14px;padding:8px 16px}
      @media print{.ac{display:none}}
    </style></head><body><div class="ac"><button onclick="print()">Imprimir</button></div><div class="grade">
    ${t.alunos.map(a => `<div class="c">
      <div class="t"><b>Álbum Combate ao Bullying</b><br>${esc(e.nome)} · Turma ${esc(t.nome)} · Nº ${String(a.numero).padStart(2, '0')}</div>
      <div class="nome">${esc(n[a.id] || '')}</div>
      <div class="cod">${esc(a.codigo)}</div>
      <div class="baixo"><div class="qr">${qrDe(a.codigo)}</div><ol><li>Aponte a câmera do celular para o QR Code. O código entra sozinho.</li><li>Sem câmera: abra ${esc(site)} e toque em <b>☰ Mais → Digitar código do aluno</b>.</li><li>Não digite seu nome.</li><li>Guarde o cartão: o código funciona só no seu celular.</li></ol></div>
    </div>`).join('')}
    </div></body></html>`);
    w.document.close();
  }

  function csv(eId, tId){
    const { e, t } = achar(eId, tId); if(!t) return;
    const n = nomes();
    const linhas = [['Escola', 'Turma', 'Nº', 'Nome (local)', 'Código', 'Situação', 'Figurinhas', 'Simulados', 'Pacotes', 'Último uso']]
      .concat(t.alunos.map(a => [e.nome, t.nome, a.numero, n[a.id] || '', a.codigo, a.vinculado ? 'Ativo' : 'Aguardando', a.figurinhas, a.simulados, a.pacotes, a.ultimo_uso ? new Date(a.ultimo_uso).toLocaleString('pt-BR') : '']));
    const txt = '﻿' + linhas.map(l => l.map(v => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\r\n');
    const b = new Blob([txt], { type: 'text/csv;charset=utf-8' });
    const link = document.createElement('a'); link.href = URL.createObjectURL(b);
    link.download = `progresso_${e.nome}_${t.nome}.csv`.replace(/[^\w.\-]+/g, '_'); link.click();
  }


  // ---------- exportar tudo ----------
  function exportarTudo(){
    if(!dados) return;
    const n = nomes();
    const linhas = [['Escola', 'Turma', 'Nº', 'Nome (local)', 'Código', 'Situação', 'Figurinhas', 'Simulados', 'Pacotes', 'Reinícios', 'Último uso']];
    dados.escolas.forEach(e => e.turmas.forEach(t => t.alunos.forEach(a => linhas.push([e.nome, t.nome, a.numero, n[a.id] || '', a.codigo, a.vinculado ? 'Ativo' : 'Aguardando', a.figurinhas, a.simulados, a.pacotes, a.reinicios || 0, a.ultimo_uso ? new Date(a.ultimo_uso).toLocaleString('pt-BR') : '']))));
    baixarCsv(linhas, `progresso_completo_${new Date().toISOString().slice(0, 10)}.csv`);
  }
  function baixarCsv(linhas, nome){
    const txt = '﻿' + linhas.map(l => l.map(v => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\r\n');
    const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([txt], { type: 'text/csv;charset=utf-8' }));
    link.download = nome.replace(/[^\w.\-]+/g, '_'); link.click();
  }

  // ---------- relatório ----------
  function janela(titulo, corpo, css){
    const w = window.open('', '_blank');
    w.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${esc(titulo)}</title><style>
      @page{size:A4;margin:14mm}body{font-family:Arial,sans-serif;color:#111;margin:0;font-size:11pt}
      h1{font-size:17pt;margin:0 0 2mm}h2{font-size:13pt;margin:7mm 0 2mm;border-bottom:2px solid #333;padding-bottom:1mm}
      .sub{color:#444;font-size:10pt}.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:3mm;margin:4mm 0}
      .kpis div{border:1px solid #bbb;border-radius:3mm;padding:3mm}.kpis b{display:block;font-size:17pt}.kpis span{font-size:8.5pt;color:#444}
      table{width:100%;border-collapse:collapse;font-size:9.5pt}th,td{border:1px solid #999;padding:1.6mm 2mm;text-align:left}th{background:#eee}
      .bar{display:inline-block;height:3mm;background:#f59e0b;vertical-align:middle}.ac{text-align:center;margin:5mm}@media print{.ac{display:none}}
      .nota{font-size:9pt;color:#333;margin-top:4mm;border-left:3px solid #999;padding-left:3mm}${css || ''}
    </style></head><body><div class="ac"><button onclick="print()" style="font-size:14px;padding:8px 18px">Imprimir / salvar em PDF</button></div>${corpo}</body></html>`);
    w.document.close();
  }
  function relatorio(eId){
    const e = dados.escolas.find(x => x.id === eId); if(!e) return;
    const todos = e.turmas.flatMap(t => t.alunos); const m = metricas(todos);
    const faixa = (a, b) => todos.filter(x => x.vinculado && x.figurinhas >= a && x.figurinhas <= b).length;
    const corpo = `<h1>Relatório do piloto — ${esc(e.nome)}</h1>
      <div class="sub">Álbum Digital Combate ao Bullying e ao Cyberbullying · gerado em ${new Date().toLocaleString('pt-BR')}</div>
      <div class="kpis"><div><b>${m.total}</b><span>alunos com cartão</span></div><div><b>${m.ativos}</b><span>códigos ativados (${m.total ? Math.round(m.ativos / m.total * 100) : 0}%)</span></div>
      <div><b>${m.media.toFixed(1).replace('.', ',')}</b><span>média de figurinhas (ativos, de 36)</span></div><div><b>${m.completos}</b><span>álbuns completos</span></div></div>
      <h2>Por turma</h2><table><tr><th>Turma</th><th>Alunos</th><th>Ativados</th><th>Média de figurinhas</th><th>Simulados (média)</th><th>Completos</th><th>Usaram na última semana</th></tr>
      ${e.turmas.map(t => { const k = metricas(t.alunos); const at = t.alunos.filter(a => a.vinculado); const sim = at.length ? at.reduce((s, a) => s + a.simulados, 0) / at.length : 0;
        return `<tr><td>${esc(t.nome)}</td><td>${k.total}</td><td>${k.ativos}</td><td><span class="bar" style="width:${Math.round(k.media / 36 * 30)}mm"></span> ${k.media.toFixed(1).replace('.', ',')}</td><td>${sim.toFixed(1).replace('.', ',')} de 5</td><td>${k.completos}</td><td>${k.semana}</td></tr>`; }).join('')}</table>
      <h2>Distribuição do progresso (alunos ativos)</h2><table><tr><th>Figurinhas coladas</th><th>Alunos</th></tr>
      <tr><td>0 a 9</td><td>${faixa(0, 9)}</td></tr><tr><td>10 a 19</td><td>${faixa(10, 19)}</td></tr><tr><td>20 a 35</td><td>${faixa(20, 35)}</td></tr><tr><td>36 (completo)</td><td>${faixa(36, 36)}</td></tr></table>
      <h2>Resultados das pesquisas (antes e depois)</h2>
      <p>As pesquisas inicial e final são aplicadas em papel, de forma anônima, e tabuladas na planilha do projeto. Anexe aqui o resumo da escola (aba "Resumo", filtrando pela escola).</p>
      <p class="nota">Privacidade: o sistema não guarda nomes de alunos. Os alunos são identificados apenas por códigos aleatórios; a correspondência com os nomes fica com a escola. O progresso no álbum é um indicador de engajamento, não uma avaliação.</p>`;
    janela('Relatório ' + e.nome, corpo);
  }

  // ---------- certificados ----------
  function certificados(eId, tId){
    const { e, t } = achar(eId, tId); if(!t) return;
    const n = nomes();
    const lista = t.alunos.filter(a => a.figurinhas >= 36);
    if(!lista.length){ alert('Nenhum aluno desta turma completou o álbum ainda (36 figurinhas).'); return; }
    const data = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
    const corpo = lista.map(a => `<div class="cert"><div class="borda">
      <div class="selo">🏅</div><h1>Certificado</h1>
      <p class="txt">Certificamos que</p><div class="nome">${esc(n[a.id] || '')}</div>
      <p class="txt">estudante da turma <b>${esc(t.nome)}</b> da <b>${esc(e.nome)}</b>, completou o<br><b>Álbum Digital Combate ao Bullying e ao Cyberbullying</b>,<br>reconhecendo, prevenindo e enfrentando o bullying com respeito e empatia.</p>
      <p class="data">Beberibe/CE, ${data}.</p>
      <div class="ass"><div>Professor(a) responsável</div><div>Direção da escola</div></div>
      <p class="rod">Projeto: Prof. Carlos André Tavares de Lima</p></div></div>`).join('');
    janela('Certificados ' + t.nome, corpo, `@page{size:A4 landscape;margin:10mm}.cert{page-break-after:always;height:180mm;display:flex}.cert:last-child{page-break-after:auto}
      .borda{flex:1;border:3mm double #4338ca;border-radius:5mm;padding:10mm 16mm;text-align:center;display:flex;flex-direction:column;justify-content:center}
      .selo{font-size:28pt}.cert h1{font-size:30pt;letter-spacing:.1em;color:#312e81;text-transform:uppercase}.txt{font-size:13pt;line-height:1.5;margin:2mm 0}
      .nome{font-size:22pt;font-weight:bold;border-bottom:1px solid #333;min-height:12mm;margin:2mm 25mm}.data{margin-top:6mm}
      .ass{display:flex;justify-content:space-around;margin-top:12mm}.ass div{border-top:1px solid #333;padding-top:1mm;width:70mm;font-size:10pt}.rod{font-size:8.5pt;color:#555;margin-top:6mm}`);
  }

  // ---------- início ----------
  if(!CFG.url || !CFG.key){ mostrar('config'); }
  else{
    try{ sessao = JSON.parse(sessionStorage.getItem(K_SESSAO) || 'null'); }catch(e){}
    if(sessao) carregar(); else mostrar('login');
  }

  return { exportarTudo, relatorio, certificados, entrar, sair, abrirSenha, trocarSenha, carregar, mostrar, criarEscola, criarTurma, criarLogin, addAluno, liberar, excluirTurma, cartoes, csv, nome: salvarNome };
})();
