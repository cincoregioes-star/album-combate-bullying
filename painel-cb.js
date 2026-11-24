// ============================================================
// Combate ao Bullying — código do aluno e envio do progresso
// O app só ENVIA: figurinhas coladas, simulados e pacotes.
// Nenhum nome é pedido ou enviado.
// ============================================================
(function(){
  const CFG = window.CB_PAINEL || {};
  const ATIVO = !!(CFG.url && CFG.key);
  const K_DEV = 'cbp_device_v1', K_COD = 'cbp_codigo_v1', K_INFO = 'cbp_info_v1', K_ULT = 'cbp_ultimo_envio_v1';

  function device(){
    let d = localStorage.getItem(K_DEV);
    if(!d){ d = (crypto.randomUUID ? crypto.randomUUID() : 'd-' + Date.now() + '-' + Math.random().toString(36).slice(2)); localStorage.setItem(K_DEV, d); }
    return d;
  }
  function codigo(){ return localStorage.getItem(K_COD) || ''; }
  function info(){ try{ return JSON.parse(localStorage.getItem(K_INFO) || 'null'); }catch(e){ return null; } }
  function esc(t){ return String(t == null ? '' : t).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

  async function rpc(nome, corpo){
    const r = await fetch(`${CFG.url}/rest/v1/rpc/${nome}`, {
      method: 'POST',
      headers: { apikey: CFG.key, Authorization: `Bearer ${CFG.key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(corpo)
    });
    if(!r.ok) throw new Error('falha_rede');
    return r.json();
  }

  function fecharMenu(){ if(typeof cbAlternarMenu === 'function') cbAlternarMenu(false); }

  function abrirCodigo(msg){
    if(typeof modal !== 'function') return;
    fecharMenu();
    const inf = info();
    if(codigo() && inf){
      modal(`<div class="dx13-card cbp-card"><h2>Meu código</h2>
        <div class="cbp-codigo">${esc(codigo())}</div>
        <p><b>${esc(inf.escola)}</b><br>Turma ${esc(inf.turma)} · nº ${esc(inf.numero)}</p>
        <p class="dx13-priv">Seu progresso no álbum é enviado ao professor quando o celular tem internet. Seu nome não é enviado.</p>
        <button class="btn" onclick="fecharModal()">Fechar</button></div>`);
      return;
    }
    modal(`<div class="dx13-card cbp-card"><h2>Código do aluno</h2>
      <p>Digite o código do cartão que o professor entregou. É preciso estar com internet só desta vez.</p>
      <input id="cbpCampo" class="cbp-campo" maxlength="5" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="Ex.: K4P9X">
      <p id="cbpMsg" class="cbp-msg">${msg ? esc(msg) : ''}</p>
      <button class="btn" id="cbpBtn" onclick="window.cbpVincular()">Confirmar código</button>
      <p class="dx13-priv">Não digite seu nome. O código serve só para o professor acompanhar quantas figurinhas e simulados você já fez.</p></div>`);
    setTimeout(() => { const c = document.getElementById('cbpCampo'); if(c){ c.focus(); c.addEventListener('keydown', e => { if(e.key === 'Enter') window.cbpVincular(); }); } }, 50);
  }

  window.cbpVincular = async function(){
    const campo = document.getElementById('cbpCampo'), msg = document.getElementById('cbpMsg'), btn = document.getElementById('cbpBtn');
    const cod = (campo && campo.value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if(cod.length !== 5){ if(msg) msg.textContent = 'O código tem 5 letras e números.'; return; }
    if(!navigator.onLine){ if(msg) msg.textContent = 'Sem internet agora. Tente de novo quando estiver conectado.'; return; }
    if(btn){ btn.disabled = true; btn.textContent = 'Conferindo...'; }
    try{
      const r = await rpc('cbp_aluno_vincular', { p_codigo: cod, p_device: device() });
      if(r && r.ok){
        localStorage.setItem(K_COD, cod);
        localStorage.setItem(K_INFO, JSON.stringify({ escola: r.escola, turma: r.turma, numero: r.numero }));
        localStorage.removeItem(K_ULT);
        await enviar(true);
        atualizarBotoes();
        abrirCodigo();
        return;
      }
      const erros = {
        codigo_invalido: 'Código não encontrado. Confira as letras e números do cartão.',
        outro_aparelho: 'Este código já está sendo usado em outro celular. Fale com o professor.'
      };
      if(msg) msg.textContent = erros[r && r.erro] || 'Não foi possível confirmar. Tente de novo.';
    }catch(e){
      if(msg) msg.textContent = 'Sem conexão com o servidor. Tente de novo mais tarde.';
    }
    if(btn){ btn.disabled = false; btn.textContent = 'Confirmar código'; }
  };

  let enviando = false;
  async function enviar(forcar){
    if(!ATIVO || !codigo() || enviando || !navigator.onLine || typeof window.cbProgresso !== 'function') return;
    const p = window.cbProgresso();
    const assinatura = `${p.figurinhas}|${p.simulados}|${p.pacotes}|${new Date().toDateString()}`;
    if(!forcar && localStorage.getItem(K_ULT) === assinatura) return;
    enviando = true;
    try{
      const r = await rpc('cbp_aluno_progresso', { p_codigo: codigo(), p_device: device(), p_figurinhas: p.figurinhas, p_simulados: p.simulados, p_pacotes: p.pacotes });
      if(r && r.ok) localStorage.setItem(K_ULT, assinatura);
    }catch(e){}
    enviando = false;
  }

  function atualizarBotoes(){
    const nav = document.querySelector('.topo nav');
    let b = document.getElementById('cbpBtnCodigo');
    if(nav && !b){
      b = document.createElement('button'); b.id = 'cbpBtnCodigo'; b.onclick = () => abrirCodigo();
      const ref = document.getElementById('cbMostrarProfessor');
      if(ref && ref.nextSibling) nav.insertBefore(b, ref.nextSibling); else nav.appendChild(b);
    }
    if(b) b.textContent = codigo() ? '🔑 Meu código' : '🔑 Digitar código do aluno';
    const hero = document.querySelector('.cb-hero');
    let aviso = document.getElementById('cbpAviso');
    if(hero && !codigo() && !aviso){
      aviso = document.createElement('button'); aviso.id = 'cbpAviso'; aviso.className = 'cbp-aviso';
      aviso.innerHTML = '🔑 <b>Recebeu um cartão com código?</b> Toque aqui para digitar.';
      aviso.onclick = () => abrirCodigo();
      hero.insertAdjacentElement('afterend', aviso);
    }
    if(aviso && codigo()) aviso.remove();
  }

  if(!ATIVO) return;
  window.cbpAbrirCodigo = abrirCodigo;
  function iniciar(){
    atualizarBotoes();
    enviar(false);
    setInterval(() => enviar(false), 30000);
    window.addEventListener('online', () => enviar(false));
    document.addEventListener('visibilitychange', () => { if(document.visibilityState === 'hidden') enviar(false); });
  }
  if(document.readyState === 'complete') setTimeout(iniciar, 400); else window.addEventListener('load', () => setTimeout(iniciar, 400));
})();
