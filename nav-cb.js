// ============================================================
// Navegação: botão ativo em destaque, contador de pacotes,
// "Voltar ao álbum" e área do criador.
// ============================================================
(function(){
  let telaAtual = 'projeto';
  const botoes = () => document.querySelectorAll('.cb-principal button[data-nav]');

  function marcar(nome){
    botoes().forEach(b => b.classList.toggle('cb-ativo', b.dataset.nav === nome));
    const voltar = document.getElementById('cbVoltarAlbum');
    if(voltar) voltar.classList.toggle('cb-visivel', ['simulados', 'admin'].includes(telaAtual) && nome !== 'pacote');
  }

  // Abrir tela: marca o botão da tela atual
  const abrirTelaOriginal = window.abrirTela;
  if(typeof abrirTelaOriginal === 'function'){
    window.abrirTela = function(nome){
      const r = abrirTelaOriginal.apply(this, arguments);
      telaAtual = nome; marcar(nome);
      try{ window.scrollTo({ top: 0, behavior: 'smooth' }); }catch(e){}
      return r;
    };
  }
  // Abrir pacote: o botão do pacote fica em destaque enquanto a janela está aberta
  const abrirPacoteOriginal = window.abrirPacote;
  if(typeof abrirPacoteOriginal === 'function'){
    window.abrirPacote = function(){ marcar('pacote'); return abrirPacoteOriginal.apply(this, arguments); };
  }
  const fecharModalOriginal = window.fecharModal;
  if(typeof fecharModalOriginal === 'function'){
    window.fecharModal = function(){ const r = fecharModalOriginal.apply(this, arguments); marcar(telaAtual); return r; };
  }

  // Contador de pacotes no botão (só aparece quando há pacote para abrir)
  function atualizarContador(){
    const b = document.querySelector('.cb-principal button[data-nav="pacote"]'); if(!b) return;
    let n = 0; try{ n = Number(estado.pacotes || 0); }catch(e){}
    let badge = b.querySelector('.cb-badge');
    if(n > 0){
      if(!badge){ badge = document.createElement('span'); badge.className = 'cb-badge'; b.appendChild(badge); }
      badge.textContent = n > 9 ? '9+' : String(n);
      b.classList.add('cb-tem-pacote');
    }else{
      if(badge) badge.remove();
      b.classList.remove('cb-tem-pacote');
    }
  }
  const status = document.getElementById('navStatusPacotes');
  if(status) new MutationObserver(atualizarContador).observe(status, { childList: true, characterData: true, subtree: true });
  setInterval(atualizarContador, 3000);

  // Botão flutuante "Voltar ao álbum"
  const voltar = document.createElement('button');
  voltar.id = 'cbVoltarAlbum'; voltar.className = 'cb-voltar-album';
  voltar.innerHTML = '← Voltar ao álbum';
  voltar.onclick = () => window.abrirTela('album');
  document.body.appendChild(voltar);

  // Área do criador
  window.cbAbrirCriador = function(){
    if(typeof cbAlternarMenu === 'function') cbAlternarMenu(false);
    if(typeof modal !== 'function') return;
    modal(`<div class="cb-criador">
      <div class="cb-criador-topo"><img src="logo-projeto.svg" alt=""><div><span>Criador do projeto</span><h2>Prof. Carlos André Tavares de Lima</h2></div></div>
      <p>Licenciado em Geografia. Especialista em Políticas Públicas, Serviço Social, Administração Escolar, Ciência de Dados e Gestão Pública. Criador de projetos digitais educacionais.</p>
      <p>O Álbum Combate ao Bullying e ao Cyberbullying une figurinhas, simulados, jogo e pesquisa para ajudar escolas a prevenir a intimidação sistemática (Lei nº 13.185/2015) e promover a cultura de paz.</p>
      <ul>
        <li>📧 cincoregioes@gmail.com</li>
        <li>📷 Instagram: @carlos.tavares.oficial</li>
      </ul>
      <p class="cb-criador-rodape">© ${new Date().getFullYear()} Carlos André Tavares de Lima. Todos os direitos reservados. Uso autorizado nas escolas participantes do projeto.</p>
      <button class="btn" onclick="fecharModal()">Fechar</button>
    </div>`);
  };

  marcar(document.getElementById('tela-album')?.classList.contains('ativa') ? 'album' : 'projeto');
  atualizarContador();
})();
