(function(){
  const CFG={url:'https://byajgsbilwiojdowqnlp.supabase.co',key:'sb_publishable_MxqtFZap1Oxbo3L-vYicaA_Fj899LEO'};
  const objetivos=[
    {titulo:'Fase 1 — Reconhecer o bullying',texto:'Objetivo pedagógico: diferenciar brincadeira, conflito e bullying, percebendo a repetição, a intenção e o desequilíbrio de poder.'},
    {titulo:'Fase 2 — Desarmar o cyberbullying',texto:'Objetivo pedagógico: identificar ataques em grupos, perfis falsos e exposição de imagens, e praticar o “pense antes de postar”.'},
    {titulo:'Fase 3 — Espectador que age',texto:'Objetivo pedagógico: reconhecer atitudes seguras de quem assiste: não fazer plateia, apoiar a vítima e chamar ajuda.'},
    {titulo:'Fase 4 — Rede de proteção',texto:'Objetivo pedagógico: relacionar colegas, professores, família, gestão e canais de denúncia na proteção de quem sofre.'},
    {titulo:'Fase final — Cultura de paz',texto:'Objetivo pedagógico: consolidar que respeito, empatia e cidadania digital são direitos e responsabilidades de todos.'}
  ];
  function ciclo(){try{return JSON.parse(localStorage.getItem('cb_ciclo_v1')||'null')}catch(e){return null}}
  function device(){let id=localStorage.getItem('cb_device_id_v1');if(!id){id=crypto?.randomUUID?crypto.randomUUID():'00000000-0000-4000-8000-'+String(Date.now()).padStart(12,'0').slice(-12);localStorage.setItem('cb_device_id_v1',id)}return id}
  async function registrar(nome,resultado,recompensa){const c=ciclo();if(!c)return;try{await fetch(`${CFG.url}/rest/v1/cb_atividades_resultados`,{method:'POST',headers:{apikey:CFG.key,'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify({ciclo_id:c.id,device_id:device(),atividade:nome,categoria:'game',resultado,pontos:100,recompensa})})}catch(e){}}
  function cardDireitos(){
    let box=document.getElementById('dxGameDireitos');if(box)return;
    box=document.createElement('div');box.id='dxGameDireitos';box.style.cssText='position:fixed;inset:0;background:rgba(3,10,20,.92);z-index:100000;display:flex;align-items:center;justify-content:center;padding:18px';
    box.innerHTML=`<div style="max-width:720px;background:#fff;color:#122235;border-radius:22px;padding:28px;box-shadow:0 30px 70px #0008"><span style="font-weight:900;color:#166534">MISSÃO PEDAGÓGICA CONCLUÍDA</span><h2 style="font-size:2rem;margin:.4rem 0">Painel de Direitos — Escola que protege</h2><p>Você concluiu o game. Agora transforme o que aprendeu em atitude.</p><div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:18px 0"><div style="padding:14px;background:#ecfdf5;border-radius:14px"><b>Lei 13.185/2015</b><br><small>Programa de Combate à Intimidação Sistemática (Bullying): define bullying e cyberbullying.</small></div><div style="padding:14px;background:#eff6ff;border-radius:14px"><b>Lei 14.811/2024</b><br><small>Art. 146-A do Código Penal: bullying e cyberbullying são crimes.</small></div><div style="padding:14px;background:#fff7ed;border-radius:14px"><b>Lei 13.663/2018</b><br><small>A escola deve prevenir e combater a violência e o bullying e promover a cultura de paz.</small></div><div style="padding:14px;background:#f5f3ff;border-radius:14px"><b>Canais de ajuda</b><br><small>Professores e coordenação, Conselho Tutelar, Disque 100 e SaferNet (canaldeajuda.org.br).</small></div></div><p><b>Reflexão final:</b> qual atitude concreta você pode adotar amanhã para que ninguém sofra bullying na sua escola?</p><button style="border:0;border-radius:12px;padding:12px 18px;background:#166534;color:#fff;font-weight:800" onclick="document.getElementById('dxGameDireitos').remove();location.href='../index.html'">Voltar ao álbum</button></div>`;
    document.body.appendChild(box);
  }
  function atualizarObjetivo(){
    const fase=Number(document.getElementById('faseAtual')?.textContent||1)-1;
    const o=objetivos[Math.min(Math.max(fase,0),objetivos.length-1)];
    const t=document.getElementById('temaFase');if(t)t.innerHTML=`<b>${o.titulo}</b><br>${o.texto}`;
    const d=document.getElementById('descricaoFase');if(d)d.textContent='Conclua os objetivos do tabuleiro e relacione a vitória ao objetivo pedagógico desta fase.';
  }
  const obs=new MutationObserver(atualizarObjetivo);
  window.addEventListener('load',()=>{atualizarObjetivo();const f=document.getElementById('faseAtual');if(f)obs.observe(f,{childList:true,subtree:true,characterData:true})});
  const check=setInterval(()=>{
    if(typeof openModal!=='function')return;
    clearInterval(check);
    const antigo=window.openModal;
    window.openModal=function(title,text,options){
      const fase=document.getElementById('faseAtual')?.textContent||'?';
      const venceu=/vencida|missão concluída|conclu/i.test(String(title)+' '+String(text));
      if(venceu){registrar(`Game — fase ${fase}`,String(title),/pacote/i.test(String(text))?'pacote/figurinha':'recompensa do game');}
      const ret=antigo.apply(this,arguments);
      if(/missão concluída/i.test(String(title)))setTimeout(cardDireitos,350);
      return ret;
    };
  },100);
})();