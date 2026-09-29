// IA da equipe LAOS — JS puro. Código de acesso só no sessionStorage (some ao fechar a aba).
(function () {
  'use strict';
  var cfg = window.LAOS_EQUIPE || {};
  var params = new URLSearchParams(location.search);
  var ENDPOINT = (params.get('endpoint') || cfg.endpoint || '').replace(/\/+$/, '');
  var CHAVE_CODIGO = 'laos-equipe:codigo';
  var $ = function (id) { return document.getElementById(id); };

  var estado = { codigo: null, historico: [], texto: '', controle: null };
  try { estado.codigo = sessionStorage.getItem(CHAVE_CODIGO); } catch (e) { /* sem sessão */ }

  // ---------- acesso ----------
  function mostrarTrabalho(sim) {
    $('acesso').hidden = sim;
    $('trabalho').hidden = !sim;
    $('sair').hidden = !sim;
    if (sim) {
      carregarProdutos();
      atualizarCampos();
      document.querySelector('input[name="tarefa"]:checked').focus();
    } else {
      $('codigo').focus();
    }
  }

  async function validarCodigo(codigo) {
    var r = await fetch(ENDPOINT + '/uso', { headers: { 'X-Equipe-Codigo': codigo }, credentials: 'omit' });
    if (r.ok) return { ok: true };
    var j = null;
    try { j = await r.json(); } catch (e) { /* sem corpo */ }
    return { ok: false, mensagem: (j && j.erro && j.erro.mensagem) || 'Não foi possível entrar (HTTP ' + r.status + ').' };
  }

  $('form-acesso').addEventListener('submit', async function (e) {
    e.preventDefault();
    var codigo = $('codigo').value.trim();
    $('acesso-erro').textContent = '';
    if (!ENDPOINT || /SUBDOMINIO/.test(ENDPOINT)) { $('acesso-erro').textContent = 'Endpoint do Worker não configurado (config.js).'; return; }
    try {
      var r = await validarCodigo(codigo);
      if (!r.ok) { $('acesso-erro').textContent = r.mensagem; return; }
      estado.codigo = codigo;
      try { sessionStorage.setItem(CHAVE_CODIGO, codigo); } catch (e2) { /* segue só em memória */ }
      $('codigo').value = '';
      mostrarTrabalho(true);
    } catch (err) {
      $('acesso-erro').textContent = 'Sem conexão com a IA agora. Tente de novo em instantes.';
    }
  });

  $('sair').addEventListener('click', function () {
    estado.codigo = null;
    try { sessionStorage.removeItem(CHAVE_CODIGO); } catch (e) { /* ok */ }
    mostrarTrabalho(false);
  });

  // ---------- produtos (sugestões) ----------
  var produtosCarregados = false;
  function carregarProdutos() {
    if (produtosCarregados || !cfg.produtos) return;
    produtosCarregados = true;
    fetch(cfg.produtos).then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
      if (!j || !j.produtos) return;
      var lista = $('lista-produtos');
      Object.keys(j.produtos).sort(function (a, b) { return j.produtos[a].nome.localeCompare(j.produtos[b].nome, 'pt'); }).forEach(function (slug) {
        var o = document.createElement('option');
        o.value = j.produtos[slug].nome;
        o.label = slug;
        lista.appendChild(o);
      });
    }).catch(function () { /* sugestões são opcionais */ });
  }

  // ---------- campos por tarefa ----------
  function tarefaAtual() {
    return document.querySelector('input[name="tarefa"]:checked').value;
  }
  function atualizarCampos() {
    var t = tarefaAtual();
    document.querySelectorAll('.campo[data-para]').forEach(function (c) {
      c.hidden = c.getAttribute('data-para').split(' ').indexOf(t) < 0;
    });
    var rotulo = document.querySelector('label[for="observacoes"]');
    if (!rotulo.dataset.original) rotulo.dataset.original = rotulo.innerHTML;
    if (t === 'livre') rotulo.textContent = 'Pedido';
    else rotulo.innerHTML = rotulo.dataset.original;
  }
  document.querySelectorAll('input[name="tarefa"]').forEach(function (r) { r.addEventListener('change', atualizarCampos); });

  // Neutraliza marcações que tentariam fechar o bloco do cliente.
  function neutralizar(s) {
    return String(s).replace(/<\s*\/?\s*(mensagem_do_cliente|mensagem_do_visitante|system|sistema)\b[^>]*>/gi, '[marcação removida]');
  }

  function montarPedido() {
    var t = tarefaAtual();
    var v = function (id) { return $(id).value.trim(); };
    var linhas = ['TAREFA: ' + t];
    if (v('produtos')) linhas.push('Produtos: ' + v('produtos'));
    if (t === 'resposta_cliente') {
      linhas.push('Canal: ' + v('canal'));
      if (v('mensagem-cliente')) linhas.push('<mensagem_do_cliente>\n' + neutralizar(v('mensagem-cliente')) + '\n</mensagem_do_cliente>');
    }
    if (t === 'proposta_b2b') {
      if (v('cliente-b2b')) linhas.push('Para: ' + v('cliente-b2b'));
      if (v('quantidades')) linhas.push('Quantidades e uso: ' + v('quantidades'));
    }
    if (t === 'legenda_instagram' && v('ocasiao')) linhas.push('Tema/ocasião: ' + v('ocasiao'));
    if (v('observacoes')) linhas.push((t === 'livre' ? 'Pedido: ' : 'Informado pela equipe: ') + v('observacoes'));
    return linhas.join('\n');
  }

  // ---------- saída ----------
  function desenhar(texto) {
    var saida = $('saida');
    saida.textContent = '';
    texto.split(/\n{2,}/).forEach(function (bloco) {
      var p = document.createElement('p');
      bloco.split('\n').forEach(function (linha, i) {
        if (i) p.appendChild(document.createElement('br'));
        linha.split(/(\[CONFIRMAR[^\]]*\]|\*\*[^*]+\*\*)/g).forEach(function (parte) {
          if (!parte) return;
          if (/^\[CONFIRMAR/.test(parte)) { var m = document.createElement('mark'); m.textContent = parte; p.appendChild(m); }
          else if (/^\*\*[^*]+\*\*$/.test(parte)) { var b = document.createElement('strong'); b.textContent = parte.slice(2, -2); p.appendChild(b); }
          else p.appendChild(document.createTextNode(parte));
        });
      });
      saida.appendChild(p);
    });
    var pend = (texto.match(/\[CONFIRMAR[^\]]*\]/g) || []).length;
    $('pendencias').hidden = !pend;
    $('pendencias').textContent = pend ? pend + (pend === 1 ? ' ponto a confirmar antes de usar.' : ' pontos a confirmar antes de usar.') : '';
  }

  function textoParaCopiar() {
    // Tira o negrito em markdown para colar limpo no WhatsApp/Instagram (o WhatsApp usa *um asterisco*).
    return estado.texto.replace(/\*\*([^*]+)\*\*/g, '$1').trim();
  }

  $('copiar').addEventListener('click', async function () {
    var ok = false;
    try { await navigator.clipboard.writeText(textoParaCopiar()); ok = true; } catch (e) {
      var ta = document.createElement('textarea');
      ta.value = textoParaCopiar();
      document.body.appendChild(ta);
      ta.select();
      try { ok = document.execCommand('copy'); } catch (e2) { ok = false; }
      ta.remove();
    }
    $('status').textContent = ok ? 'Copiado.' : 'Não consegui copiar; selecione o texto manualmente.';
    $('copiar').textContent = ok ? 'Copiado ✓' : 'Copiar';
    setTimeout(function () { $('copiar').textContent = 'Copiar'; }, 2000);
  });

  async function lerSse(corpo, aoEvento) {
    var leitor = corpo.getReader();
    var dec = new TextDecoder();
    var buf = '';
    for (;;) {
      var r = await leitor.read();
      if (r.done) break;
      buf += dec.decode(r.value, { stream: true });
      var i;
      while ((i = buf.indexOf('\n\n')) >= 0) {
        var bloco = buf.slice(0, i);
        buf = buf.slice(i + 2);
        var dados = bloco.split('\n').filter(function (l) { return l.indexOf('data:') === 0; }).map(function (l) { return l.slice(5).trim(); }).join('');
        if (dados) { try { aoEvento(JSON.parse(dados)); } catch (e) { /* ignora */ } }
      }
    }
  }

  function ocupado(sim) {
    $('gerar').disabled = sim;
    $('parar').hidden = !sim;
    $('copiar').disabled = sim || !estado.texto;
    $('refinar').hidden = sim || !estado.texto;
    $('saida').setAttribute('aria-busy', sim ? 'true' : 'false');
  }

  async function gerar(mensagens) {
    estado.texto = '';
    ocupado(true);
    $('status').textContent = 'Gerando…';
    $('saida').innerHTML = '<p class="vazio">Gerando…</p>';
    var controle = new AbortController();
    estado.controle = controle;
    var fim = null;
    var erro = null;
    try {
      var r = await fetch(ENDPOINT + '/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Equipe-Codigo': estado.codigo },
        body: JSON.stringify({ modo: 'equipe', mensagens: mensagens }),
        signal: controle.signal,
        credentials: 'omit',
      });
      if (r.status === 401 || r.status === 403) {
        var j401 = await r.json().catch(function () { return null; });
        erro = (j401 && j401.erro && j401.erro.mensagem) || 'Código inválido.';
        $('sair').click();
        $('acesso-erro').textContent = erro + ' Entre de novo.';
        return;
      }
      if (!r.ok || (r.headers.get('Content-Type') || '').indexOf('event-stream') < 0) {
        var j = await r.json().catch(function () { return null; });
        erro = (j && j.erro && j.erro.mensagem) || 'A IA não respondeu (HTTP ' + r.status + ').';
      } else {
        await lerSse(r.body, function (ev) {
          if (ev.tipo === 'delta') { estado.texto += ev.texto; desenhar(estado.texto); }
          else if (ev.tipo === 'fim') fim = ev;
          else if (ev.tipo === 'erro') erro = ev.mensagem;
        });
        if (!fim && !erro) erro = 'A resposta foi interrompida.';
      }
    } catch (e) {
      erro = controle.signal.aborted ? 'Parado.' : 'Sem conexão com a IA.';
    } finally {
      estado.controle = null;
    }
    if (fim) {
      estado.historico = mensagens.concat([{ role: 'assistant', content: estado.texto, assinatura: fim.assinatura }]);
      $('status').textContent = 'Pronto' + (fim.motivo === 'length' ? ' (texto cortado pelo limite; peça "continue").' : '.');
    } else {
      if (!estado.texto) $('saida').innerHTML = '';
      var p = document.createElement('p');
      p.className = 'erro';
      p.textContent = erro;
      $('saida').appendChild(p);
      $('status').textContent = erro;
    }
    ocupado(false);
  }

  $('form-tarefa').addEventListener('submit', function (e) {
    e.preventDefault();
    var pedido = montarPedido();
    if (pedido.split('\n').length < 2) { $('status').textContent = 'Preencha ao menos um campo.'; return; }
    $('form-ajuste').hidden = true;
    gerar([{ role: 'user', content: pedido }]);
  });
  $('parar').addEventListener('click', function () { if (estado.controle) estado.controle.abort(); });
  $('refinar').addEventListener('click', function () {
    $('form-ajuste').hidden = false;
    $('ajuste').focus();
  });
  $('form-ajuste').addEventListener('submit', function (e) {
    e.preventDefault();
    var a = $('ajuste').value.trim();
    if (!a || !estado.historico.length) return;
    $('ajuste').value = '';
    gerar(estado.historico.concat([{ role: 'user', content: 'Ajuste o texto anterior: ' + a }]).slice(-12));
  });

  mostrarTrabalho(!!estado.codigo);
})();
