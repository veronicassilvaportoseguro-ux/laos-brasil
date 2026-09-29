/*! LAOS · widget de atendimento (assistente IA + equipe no WhatsApp) · JS puro, sem dependências.
 *
 * <script src="assets/laos-chat.js" defer
 *         data-endpoint="https://laos-ia.<subdominio>.workers.dev"
 *         data-whatsapp="5573998081019"
 *         data-produtos="assets/produtos-indice.json"
 *         data-privacidade="privacidade/"></script>
 *
 * Atributos (todos opcionais, menos data-endpoint para a IA aparecer):
 *   data-endpoint     URL do Worker (sem barra final). Sem ele, o painel oferece só a equipe.
 *   data-whatsapp     número com DDI (padrão 5573998081019).
 *   data-produtos     índice JSON de produtos (relativo à página) para os cartões [[produto:slug]].
 *   data-css          folha de estilo (padrão: laos-chat.css ao lado deste script); "false" para não carregar.
 *   data-privacidade  link da política de privacidade.
 *   data-produto      slug do produto da página (ou <meta name="laos:produto" content="slug">).
 *   data-idioma       pt | es | en (padrão: idioma do navegador).
 *   data-rotulo       texto do botão flutuante.
 * API: window.LaosChat.abrir('ia' | 'equipe' | 'inicio'), window.LaosChat.fechar().
 * Qualquer elemento com [data-laos-chat-abrir] abre o painel (valor opcional: ia | inicio).
 */
(function () {
  'use strict';
  var script = document.currentScript;
  if (!script || window.LaosChat) return;

  var d = script.dataset;
  function resolver(u, base) {
    try { return new URL(u, base).href; } catch (e) { return null; }
  }
  var CFG = {
    endpoint: (d.endpoint || '').trim().replace(/\/+$/, ''),
    whatsapp: (d.whatsapp || '5573998081019').replace(/\D/g, '') || '5573998081019',
    produtos: d.produtos ? resolver(d.produtos, document.baseURI) : null,
    css: d.css === 'false' ? null : resolver(d.css || 'laos-chat.css', script.src || document.baseURI),
    privacidade: d.privacidade ? resolver(d.privacidade, document.baseURI) : null,
    produto: d.produto || (document.querySelector('meta[name="laos:produto"]') || {}).content || null,
  };
  var CHAVE_SESSAO = 'laos-chat:v1';
  var MAX_HISTORICO = 12;
  var MAX_CHARS = 700;

  var TEXTOS = {
    pt: {
      lancador: 'Fale com a LAOS', sobre: 'LAOS · Casa de aromas', titulo: 'Como podemos ajudar?', tituloIa: 'Assistente LAOS',
      iaTitulo: 'Perguntar à assistente', iaDesc: 'Respostas na hora sobre aromas, tamanhos e preços do catálogo.', selo: 'IA',
      eqTitulo: 'Falar com a equipe', eqDesc: 'Pedidos, frete, pagamento e trocas com uma pessoa da loja, no WhatsApp.',
      lojas: "Duas lojas em Arraial d'Ajuda: Praça da Igreja e Rua do Mucugê.",
      avisoTitulo: 'Antes de começar',
      aviso: 'Sou a assistente virtual da LAOS, uma inteligência artificial. Respondo com o catálogo da loja e posso errar: pedido, frete e estoque de hoje são confirmados pela equipe no WhatsApp.',
      privacidade: 'Não envie dados de cartão, senhas, documentos ou informações de saúde. A conversa é processada por um provedor de IA (DeepSeek), que pode tratá-la fora do Brasil. A LAOS não guarda o texto; ele fica só nesta aba.',
      politica: 'Política de privacidade', comecar: 'Começar conversa',
      placeholder: 'Pergunte sobre aromas e preços…', rotuloCampo: 'Sua mensagem para a assistente',
      enviar: 'Enviar', parar: 'Parar resposta', whats: 'Continuar no WhatsApp', nova: 'Nova conversa', voltar: 'Voltar', fechar: 'Fechar',
      escrevendo: 'A assistente está escrevendo…', pronta: 'Resposta da assistente pronta.',
      falha: 'A assistente está indisponível agora. A equipe da LAOS atende você no WhatsApp.',
      verificar: 'Não consegui confirmar todos os dados desta resposta. Confira com a equipe antes de comprar.',
      cortada: 'Resposta interrompida.', verProduto: 'Ver produto', aPartir: 'a partir de', esgotado: 'esgotado na coleta',
      contador: function (n) { return n + '/' + MAX_CHARS; }, longa: 'Mensagem longa demais: resuma em até ' + MAX_CHARS + ' caracteres.',
      sugestoes: ['Quais velas vocês têm?', 'Um aroma cítrico para a sala', 'Presente até R$ 70'],
      novaJanela: '(abre em nova janela)', voce: 'Você', assistente: 'Assistente LAOS · IA',
      msgWhats: 'Olá! Vim pelo site da LAOS e gostaria de falar com a equipe.',
      msgWhatsProduto: function (n) { return 'Olá! Vim pelo site da LAOS e tenho interesse em: ' + n + '.'; },
      msgWhatsIa: function (q, ps) { return 'Olá! Vim pelo site da LAOS. Conversei com a assistente virtual sobre: "' + q + '".' + (ps ? ' Produtos: ' + ps + '.' : ''); },
    },
    es: {
      lancador: 'Habla con LAOS', sobre: 'LAOS · Casa de aromas', titulo: '¿Cómo podemos ayudarte?', tituloIa: 'Asistente LAOS',
      iaTitulo: 'Preguntar a la asistente', iaDesc: 'Respuestas al instante sobre aromas, tamaños y precios del catálogo.', selo: 'IA',
      eqTitulo: 'Hablar con el equipo', eqDesc: 'Pedidos, envíos, pagos y cambios con una persona de la tienda, por WhatsApp.',
      lojas: "Dos tiendas en Arraial d'Ajuda: Praça da Igreja y Rua do Mucugê.",
      avisoTitulo: 'Antes de empezar',
      aviso: 'Soy la asistente virtual de LAOS, una inteligencia artificial. Respondo con el catálogo de la tienda y puedo equivocarme: pedidos, envíos y stock de hoy los confirma el equipo por WhatsApp.',
      privacidade: 'No envíes datos de tarjeta, contraseñas, documentos ni información de salud. La conversación la procesa un proveedor de IA (DeepSeek), que puede tratarla fuera de Brasil. LAOS no guarda el texto; queda solo en esta pestaña.',
      politica: 'Política de privacidad', comecar: 'Empezar conversación',
      placeholder: 'Pregunta por aromas y precios…', rotuloCampo: 'Tu mensaje para la asistente',
      enviar: 'Enviar', parar: 'Detener respuesta', whats: 'Seguir por WhatsApp', nova: 'Nueva conversación', voltar: 'Volver', fechar: 'Cerrar',
      escrevendo: 'La asistente está escribiendo…', pronta: 'Respuesta de la asistente lista.',
      falha: 'La asistente no está disponible ahora. El equipo de LAOS te atiende por WhatsApp.',
      verificar: 'No pude confirmar todos los datos de esta respuesta. Confírmalos con el equipo antes de comprar.',
      cortada: 'Respuesta interrumpida.', verProduto: 'Ver producto', aPartir: 'desde', esgotado: 'agotado en la fecha del catálogo',
      contador: function (n) { return n + '/' + MAX_CHARS; }, longa: 'Mensaje demasiado largo: resúmelo en hasta ' + MAX_CHARS + ' caracteres.',
      sugestoes: ['¿Qué velas tienen?', 'Un aroma cítrico para la sala', 'Un regalo de hasta R$ 70'],
      novaJanela: '(se abre en una ventana nueva)', voce: 'Tú', assistente: 'Asistente LAOS · IA',
      msgWhats: '¡Hola! Vengo del sitio de LAOS y me gustaría hablar con el equipo.',
      msgWhatsProduto: function (n) { return '¡Hola! Vengo del sitio de LAOS y me interesa: ' + n + '.'; },
      msgWhatsIa: function (q, ps) { return '¡Hola! Vengo del sitio de LAOS. Hablé con la asistente virtual sobre: "' + q + '".' + (ps ? ' Productos: ' + ps + '.' : ''); },
    },
    en: {
      lancador: 'Talk to LAOS', sobre: 'LAOS · House of scents', titulo: 'How can we help?', tituloIa: 'LAOS assistant',
      iaTitulo: 'Ask the assistant', iaDesc: 'Instant answers about scents, sizes and prices from our catalog.', selo: 'AI',
      eqTitulo: 'Talk to the team', eqDesc: 'Orders, shipping, payment and returns with a person from the store, on WhatsApp.',
      lojas: "Two stores in Arraial d'Ajuda: Praça da Igreja and Rua do Mucugê.",
      avisoTitulo: 'Before you start',
      aviso: "I'm the LAOS virtual assistant, an artificial intelligence. I answer from the store catalog and can make mistakes: orders, shipping and today's stock are confirmed by the team on WhatsApp.",
      privacidade: "Don't share card details, passwords, ID numbers or health information. The chat is processed by an AI provider (DeepSeek), which may handle it outside Brazil. LAOS doesn't store the text; it stays in this tab only.",
      politica: 'Privacy policy', comecar: 'Start chatting',
      placeholder: 'Ask about scents and prices…', rotuloCampo: 'Your message to the assistant',
      enviar: 'Send', parar: 'Stop answer', whats: 'Continue on WhatsApp', nova: 'New chat', voltar: 'Back', fechar: 'Close',
      escrevendo: 'The assistant is typing…', pronta: 'Assistant answer ready.',
      falha: 'The assistant is unavailable right now. The LAOS team can help you on WhatsApp.',
      verificar: "I couldn't confirm every detail in this answer. Please check with the team before buying.",
      cortada: 'Answer interrupted.', verProduto: 'View product', aPartir: 'from', esgotado: 'sold out on catalog date',
      contador: function (n) { return n + '/' + MAX_CHARS; }, longa: 'Message too long: keep it under ' + MAX_CHARS + ' characters.',
      sugestoes: ['Which candles do you have?', 'A citrus scent for the living room', 'A gift up to R$ 70'],
      novaJanela: '(opens in a new window)', voce: 'You', assistente: 'LAOS assistant · AI',
      msgWhats: "Hi! I found LAOS on the website and I'd like to talk to the team.",
      msgWhatsProduto: function (n) { return "Hi! I found LAOS on the website and I'm interested in: " + n + '.'; },
      msgWhatsIa: function (q, ps) { return 'Hi! I came from the LAOS website. I asked the virtual assistant about: "' + q + '".' + (ps ? ' Products: ' + ps + '.' : ''); },
    },
  };
  var idioma = String(d.idioma || navigator.language || document.documentElement.lang || 'pt').slice(0, 2).toLowerCase();
  var T = TEXTOS[idioma] || TEXTOS.pt;
  var rotuloLancador = d.rotulo || T.lancador;

  // ---------- estado ----------
  var estado = { aberto: false, vista: 'inicio', aceito: false, historico: [], ocupado: false, controle: null, parado: false, foco: null };
  try {
    var salvo = JSON.parse(sessionStorage.getItem(CHAVE_SESSAO) || 'null');
    if (salvo && Array.isArray(salvo.historico)) {
      estado.aceito = !!salvo.aceito;
      estado.historico = salvo.historico.filter(function (m) { return m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string'; }).slice(-40);
    }
  } catch (e) { /* sessão indisponível: segue sem memória */ }
  function salvar() {
    try { sessionStorage.setItem(CHAVE_SESSAO, JSON.stringify({ aceito: estado.aceito, historico: estado.historico.slice(-40) })); } catch (e) { /* cota ou modo privado */ }
  }

  // ---------- utilidades ----------
  function el(tag, atributos, filhos) {
    var n = document.createElement(tag);
    if (atributos) for (var k in atributos) {
      if (!Object.prototype.hasOwnProperty.call(atributos, k) || atributos[k] == null || atributos[k] === false) continue;
      if (k === 'texto') n.textContent = atributos[k];
      else if (k === 'classe') n.className = atributos[k];
      else n.setAttribute(k, atributos[k] === true ? '' : atributos[k]);
    }
    (filhos || []).forEach(function (f) { if (f != null) n.appendChild(typeof f === 'string' ? document.createTextNode(f) : f); });
    return n;
  }
  function svg(caminho, classe) {
    var ns = 'http://www.w3.org/2000/svg';
    var s = document.createElementNS(ns, 'svg');
    s.setAttribute('viewBox', '0 0 24 24');
    s.setAttribute('aria-hidden', 'true');
    s.setAttribute('focusable', 'false');
    if (classe) s.setAttribute('class', classe);
    caminho.split('|').forEach(function (dd) {
      var p = document.createElementNS(ns, 'path');
      p.setAttribute('d', dd);
      s.appendChild(p);
    });
    return s;
  }
  var ICONES = {
    pavio: 'M12 3.5a8.5 8.5 0 1 0 0 17a8.5 8.5 0 1 0 0-17|M5 19L19 5',
    fechar: 'M6 6l12 12|M18 6L6 18',
    voltar: 'M15 5l-7 7l7 7',
    enviar: 'M4 12h14|M12 6l6 6l-6 6',
    parar: 'M7 7h10v10H7z',
    conversa: 'M4 5h16v11H9l-5 4z|M8 9.5h8|M8 12.5h5',
    seta: 'M5 12h14|M13 6l6 6l-6 6',
  };
  function linkWhatsApp(texto) {
    return 'https://wa.me/' + CFG.whatsapp + '?text=' + encodeURIComponent(texto || T.msgWhats);
  }
  function formatarPreco(v) {
    if (typeof v !== 'number' || !isFinite(v)) return '';
    try { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v); } catch (e) { return 'R$ ' + v.toFixed(2).replace('.', ','); }
  }

  // ---------- índice de produtos (cartões) ----------
  var indice = null;
  var indicePromessa = null;
  function carregarIndice() {
    if (!CFG.produtos) return Promise.resolve(null);
    if (!indicePromessa) {
      indicePromessa = fetch(CFG.produtos, { credentials: 'same-origin' })
        .then(function (r) { if (!r.ok) throw new Error('índice ' + r.status); return r.json(); })
        .then(function (j) {
          var mapa = {};
          var lista = Array.isArray(j) ? j : Array.isArray(j.produtos) ? j.produtos : null;
          if (lista) lista.forEach(function (p) { if (p && p.slug) mapa[p.slug] = p; });
          else if (j && j.produtos && typeof j.produtos === 'object') mapa = j.produtos;
          Object.keys(mapa).forEach(function (s) {
            var p = mapa[s];
            p.url = p.url ? resolver(p.url, CFG.produtos) : null;
            p.imagem = p.imagem ? resolver(p.imagem, CFG.produtos) : null;
          });
          indice = mapa;
          return mapa;
        })
        .catch(function () { indice = {}; return indice; });
    }
    return indicePromessa;
  }

  // ---------- montagem do DOM ----------
  var host = el('div', { 'data-laos-chat': '', classe: 'laos-chat-host' });
  host.hidden = true; // só aparece depois do CSS
  var raiz = host.attachShadow ? host.attachShadow({ mode: 'open' }) : host;
  var semShadow = raiz === host;

  function montar() {
    if (CFG.css) {
      var link = el('link', { rel: 'stylesheet', href: CFG.css });
      link.addEventListener('load', function () { host.hidden = false; });
      link.addEventListener('error', function () { host.hidden = false; });
      raiz.appendChild(link);
      setTimeout(function () { host.hidden = false; }, 2500);
    } else {
      host.hidden = false;
    }
    var produtoTitulo = CFG.produto ? (document.querySelector('h1') || {}).textContent : null;

    var lancador = el('button', { type: 'button', classe: 'lc-lancador', 'aria-haspopup': 'dialog', 'aria-expanded': 'false', 'aria-controls': 'lc-painel' }, [
      svg(ICONES.pavio, 'lc-icone'), el('span', { texto: rotuloLancador }),
    ]);

    var voltar = el('button', { type: 'button', classe: 'lc-icone-botao lc-voltar', 'aria-label': T.voltar, hidden: true }, [svg(ICONES.voltar)]);
    var fechar = el('button', { type: 'button', classe: 'lc-icone-botao lc-fechar', 'aria-label': T.fechar }, [svg(ICONES.fechar)]);
    var titulo = el('h2', { id: 'lc-titulo', classe: 'lc-titulo', texto: T.titulo });
    var topo = el('header', { classe: 'lc-topo' }, [voltar, el('div', { classe: 'lc-topo-texto' }, [el('p', { classe: 'lc-sobre', texto: T.sobre }), titulo]), fechar]);

    // Vista inicial: as duas escolhas.
    var escolhaIa = CFG.endpoint
      ? el('button', { type: 'button', classe: 'lc-escolha lc-escolha-ia' }, [
          el('span', { classe: 'lc-escolha-icone' }, [svg(ICONES.pavio)]),
          el('span', { classe: 'lc-escolha-texto' }, [
            el('span', { classe: 'lc-escolha-titulo' }, [T.iaTitulo, el('span', { classe: 'lc-selo', texto: T.selo })]),
            el('span', { classe: 'lc-escolha-desc', texto: T.iaDesc }),
          ]),
          svg(ICONES.seta, 'lc-escolha-seta'),
        ])
      : null;
    var escolhaEquipe = el('a', { classe: 'lc-escolha lc-escolha-equipe', href: linkWhatsApp(produtoTitulo ? T.msgWhatsProduto(produtoTitulo.trim().slice(0, 120)) : T.msgWhats), target: '_blank', rel: 'noopener' }, [
      el('span', { classe: 'lc-escolha-icone' }, [svg(ICONES.conversa)]),
      el('span', { classe: 'lc-escolha-texto' }, [
        el('span', { classe: 'lc-escolha-titulo', texto: T.eqTitulo }),
        el('span', { classe: 'lc-escolha-desc', texto: T.eqDesc }),
        el('span', { classe: 'lc-sr', texto: T.novaJanela }),
      ]),
      svg(ICONES.seta, 'lc-escolha-seta'),
    ]);
    var vistaInicio = el('section', { classe: 'lc-vista lc-inicio' }, [escolhaIa, escolhaEquipe, el('p', { classe: 'lc-lojas', texto: T.lojas })]);

    // Vista da assistente.
    var aceitar = el('button', { type: 'button', classe: 'lc-botao lc-botao-primario', texto: T.comecar });
    var aviso = el('div', { classe: 'lc-aviso', role: 'note', 'aria-labelledby': 'lc-aviso-titulo' }, [
      el('p', { id: 'lc-aviso-titulo', classe: 'lc-aviso-titulo', texto: T.avisoTitulo }),
      el('p', { texto: T.aviso }),
      el('p', { classe: 'lc-aviso-privacidade', texto: T.privacidade }),
      CFG.privacidade ? el('p', {}, [el('a', { href: CFG.privacidade, target: '_blank', rel: 'noopener', texto: T.politica }, [el('span', { classe: 'lc-sr', texto: ' ' + T.novaJanela })])]) : null,
      aceitar,
    ]);
    var mensagens = el('div', { classe: 'lc-mensagens', role: 'log', 'aria-live': 'polite', 'aria-relevant': 'additions', 'aria-label': T.tituloIa });
    var sugestoes = el('div', { classe: 'lc-sugestoes' }, T.sugestoes.map(function (s) {
      return el('button', { type: 'button', classe: 'lc-sugestao', texto: s });
    }));
    var statusVivo = el('p', { classe: 'lc-sr', role: 'status', 'aria-live': 'polite' });
    var vistaIa = el('section', { classe: 'lc-vista lc-ia', hidden: true }, [aviso, mensagens, sugestoes, statusVivo]);

    var corpo = el('div', { classe: 'lc-corpo' }, [vistaInicio, vistaIa]);

    // Composição de mensagem.
    var campo = el('textarea', { id: 'lc-campo', classe: 'lc-campo', rows: '1', maxlength: String(MAX_CHARS + 200), placeholder: T.placeholder, 'aria-describedby': 'lc-contador', autocomplete: 'off' });
    var enviar = el('button', { type: 'submit', classe: 'lc-enviar', 'aria-label': T.enviar }, [svg(ICONES.enviar)]);
    var contador = el('span', { id: 'lc-contador', classe: 'lc-contador', 'aria-live': 'polite' });
    var formulario = el('form', { classe: 'lc-form', novalidate: true }, [el('label', { for: 'lc-campo', classe: 'lc-sr', texto: T.rotuloCampo }), campo, enviar]);
    var linkWhats = el('a', { classe: 'lc-link-whats', href: linkWhatsApp(), target: '_blank', rel: 'noopener' }, [svg(ICONES.conversa, 'lc-icone-pequeno'), T.whats, el('span', { classe: 'lc-sr', texto: ' ' + T.novaJanela })]);
    var nova = el('button', { type: 'button', classe: 'lc-link-nova', texto: T.nova });
    var rodape = el('footer', { classe: 'lc-rodape', hidden: true }, [formulario, el('div', { classe: 'lc-rodape-linha' }, [linkWhats, contador, nova])]);

    var painel = el('div', { id: 'lc-painel', classe: 'lc-painel', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'lc-titulo', hidden: true }, [topo, corpo, rodape]);
    var raizUi = el('div', { classe: 'laos-chat' + (semShadow ? ' lc-sem-shadow' : '') }, [lancador, painel]);
    raiz.appendChild(raizUi);
    document.body.appendChild(host);

    var ui = { lancador: lancador, painel: painel, titulo: titulo, voltar: voltar, fechar: fechar, vistaInicio: vistaInicio, vistaIa: vistaIa, aviso: aviso, aceitar: aceitar, mensagens: mensagens, sugestoes: sugestoes, statusVivo: statusVivo, rodape: rodape, formulario: formulario, campo: campo, enviar: enviar, contador: contador, linkWhats: linkWhats, nova: nova, escolhaIa: escolhaIa, corpo: corpo };
    ligar(ui);
    return ui;
  }

  // ---------- renderização de texto da IA (sem HTML: só nós de texto) ----------
  var RE_PRODUTO = /\[\[produto:([a-z0-9-]+)\]\]/g;
  function interpretar(texto, final) {
    var t = String(texto);
    if (!final) t = t.replace(/\[\[[^\]]*\]?$/, '').replace(/\[$/, '');
    var slugs = [];
    t.replace(RE_PRODUTO, function (_, s) { if (slugs.indexOf(s) < 0) slugs.push(s); return ''; });
    var whatsapp = /\[\[whatsapp\]\]/i.test(t);
    t = t.replace(RE_PRODUTO, '').replace(/\[\[whatsapp\]\]/gi, '').replace(/\[\[[^\]]*\]\]/g, '');
    t = t.replace(/[ \t]+([.,;:!?)])/g, '$1').replace(/[ \t]{2,}/g, ' ').replace(/\(\s*\)/g, '').trim();
    return { texto: t, slugs: slugs, whatsapp: whatsapp };
  }
  function inline(alvo, linha) {
    var partes = linha.split(/(\*\*[^*]+\*\*)/g);
    partes.forEach(function (p) {
      if (!p) return;
      if (/^\*\*[^*]+\*\*$/.test(p)) alvo.appendChild(el('strong', { texto: p.slice(2, -2) }));
      else alvo.appendChild(document.createTextNode(p.replace(/\*\*/g, '')));
    });
    // Preço não quebra entre "R$" e o valor.
    Array.prototype.forEach.call(alvo.childNodes, function (n) {
      var t = n.nodeType === 3 ? n : n.firstChild && n.firstChild.nodeType === 3 ? n.firstChild : null;
      if (t) t.nodeValue = t.nodeValue.replace(/R\$ (?=\d)/g, 'R$\u00a0');
    });
  }
  function desenharTexto(destino, texto) {
    destino.textContent = '';
    var blocos = texto.split(/\n{2,}/);
    blocos.forEach(function (bloco) {
      var linhas = bloco.split('\n').filter(function (l) { return l.trim(); });
      var lista = null;
      var paragrafo = null;
      linhas.forEach(function (l) {
        var m = l.match(/^\s*(?:[-•*]|\d+[.)])\s+(.*)$/);
        if (m) {
          if (!lista) { lista = el(/^\s*\d/.test(l) ? 'ol' : 'ul'); destino.appendChild(lista); }
          var li = el('li');
          inline(li, m[1]);
          lista.appendChild(li);
          paragrafo = null;
        } else {
          lista = null;
          if (!paragrafo) { paragrafo = el('p'); destino.appendChild(paragrafo); } else paragrafo.appendChild(el('br'));
          inline(paragrafo, l);
        }
      });
    });
  }

  function cartao(slug) {
    var p = indice && indice[slug];
    if (!p) return null;
    var preco = typeof p.preco === 'number' ? formatarPreco(p.preco) : '';
    if (preco && typeof p.preco_max === 'number' && p.preco_max > p.preco) preco = T.aPartir + ' ' + preco;
    var filhos = [];
    if (p.imagem) {
      var img = el('img', { src: p.imagem, alt: '', loading: 'lazy', decoding: 'async', width: '56', height: '56' });
      img.addEventListener('error', function () { img.remove(); });
      filhos.push(el('span', { classe: 'lc-cartao-foto' }, [img]));
    }
    filhos.push(el('span', { classe: 'lc-cartao-texto' }, [
      el('span', { classe: 'lc-cartao-nome', texto: p.nome || slug }),
      el('span', { classe: 'lc-cartao-preco', texto: preco + (p.disponivel === false ? ' · ' + T.esgotado : '') }),
      p.url ? el('span', { classe: 'lc-cartao-acao' }, [T.verProduto, svg(ICONES.seta, 'lc-icone-pequeno')]) : null,
    ]));
    return p.url ? el('a', { classe: 'lc-cartao', href: p.url }, filhos) : el('div', { classe: 'lc-cartao' }, filhos);
  }

  function nomesDosProdutos(slugs) {
    return slugs.map(function (s) { return indice && indice[s] ? indice[s].nome : null; }).filter(Boolean).slice(0, 3).join(', ');
  }

  function botaoWhats(pergunta, slugs) {
    return el('a', { classe: 'lc-botao lc-botao-whats', href: linkWhatsApp(T.msgWhatsIa(String(pergunta || '').slice(0, 180), nomesDosProdutos(slugs))), target: '_blank', rel: 'noopener' }, [
      svg(ICONES.conversa, 'lc-icone-pequeno'), T.whats, el('span', { classe: 'lc-sr', texto: ' ' + T.novaJanela }),
    ]);
  }

  // ---------- comportamento ----------
  var ui = null;

  function focaveis() {
    var lista = ui.painel.querySelectorAll('button:not([disabled]), a[href], textarea:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])');
    return Array.prototype.filter.call(lista, function (n) { return !n.closest('[hidden]') && n.getClientRects().length > 0; });
  }
  function ativo() {
    return semShadow ? document.activeElement : raiz.activeElement;
  }
  function telaPequena() {
    return window.matchMedia && window.matchMedia('(max-width: 640px)').matches;
  }

  function mostrarVista(vista) {
    estado.vista = vista;
    var ia = vista === 'ia';
    ui.vistaInicio.hidden = ia;
    ui.vistaIa.hidden = !ia;
    ui.painel.classList.toggle('lc-painel-ia', ia);
    ui.voltar.hidden = !ia;
    ui.titulo.textContent = ia ? T.tituloIa : T.titulo;
    ui.aviso.hidden = !ia || estado.aceito;
    ui.rodape.hidden = !ia || !estado.aceito;
    ui.mensagens.hidden = !ia || !estado.aceito;
    ui.sugestoes.hidden = !ia || !estado.aceito || estado.historico.length > 0;
    if (ia) carregarIndice().then(redesenharCartoes);
  }

  function abrir(vista) {
    if (!ui) return;
    if (vista === 'ia' && !CFG.endpoint) vista = 'inicio';
    estado.aberto = true;
    estado.foco = document.activeElement;
    ui.painel.hidden = false;
    ui.lancador.setAttribute('aria-expanded', 'true');
    ui.lancador.classList.add('lc-lancador-aberto');
    mostrarVista(vista || estado.vista || 'inicio');
    if (telaPequena()) document.documentElement.style.overflow = 'hidden';
    requestAnimationFrame(function () {
      var alvo = estado.vista === 'ia' ? (estado.aceito ? ui.campo : ui.aceitar) : ui.escolhaIa || focaveis()[1];
      (alvo || ui.fechar).focus();
    });
  }

  function fecharPainel() {
    if (!ui || !estado.aberto) return;
    estado.aberto = false;
    ui.painel.hidden = true;
    ui.lancador.setAttribute('aria-expanded', 'false');
    ui.lancador.classList.remove('lc-lancador-aberto');
    document.documentElement.style.overflow = '';
    ui.lancador.focus();
  }

  function ajustarCampo() {
    var c = ui.campo;
    c.style.height = 'auto';
    c.style.height = Math.min(c.scrollHeight, 140) + 'px';
    var n = c.value.length;
    ui.contador.textContent = n > MAX_CHARS * 0.8 ? T.contador(n) : '';
    ui.contador.classList.toggle('lc-contador-alerta', n > MAX_CHARS);
  }

  function rolarParaFim() {
    ui.corpo.scrollTop = ui.corpo.scrollHeight;
  }

  function adicionarUsuario(texto) {
    var item = el('div', { classe: 'lc-msg lc-msg-usuario' }, [el('p', { classe: 'lc-sr', texto: T.voce + ':' }), el('div', { classe: 'lc-bolha' })]);
    desenharTexto(item.lastChild, texto);
    ui.mensagens.appendChild(item);
    return item;
  }

  function adicionarAssistente() {
    var bolha = el('div', { classe: 'lc-bolha', 'aria-busy': 'true' }, [el('span', { classe: 'lc-digitando', 'aria-hidden': 'true' }, [el('i'), el('i'), el('i')])]);
    var extras = el('div', { classe: 'lc-extras' });
    var item = el('div', { classe: 'lc-msg lc-msg-assistente' }, [el('p', { classe: 'lc-rotulo', texto: T.assistente }), bolha, extras]);
    ui.mensagens.appendChild(item);
    return { item: item, bolha: bolha, extras: extras };
  }

  function preencherAssistente(alvo, texto, final, opcoes) {
    var r = interpretar(texto, final);
    if (r.texto) desenharTexto(alvo.bolha, r.texto);
    alvo.slugs = r.slugs;
    var cartoes = alvo.extras.querySelector('.lc-cartoes');
    if (r.slugs.length) {
      if (!cartoes) { cartoes = el('div', { classe: 'lc-cartoes' }); alvo.extras.appendChild(cartoes); }
      var feitos = cartoes.getAttribute('data-slugs') || '';
      var chave = r.slugs.slice(0, 4).join(',') + '|' + (indice ? 1 : 0);
      if (feitos !== chave) {
        cartoes.textContent = '';
        r.slugs.slice(0, 4).forEach(function (s) { var c = cartao(s); if (c) cartoes.appendChild(c); });
        cartoes.setAttribute('data-slugs', chave);
      }
    }
    if (final && (r.whatsapp || (opcoes && opcoes.whatsapp)) && !alvo.extras.querySelector('.lc-botao-whats')) {
      alvo.extras.appendChild(botaoWhats(opcoes && opcoes.pergunta, r.slugs));
    }
    return r;
  }

  function nota(alvo, texto) {
    alvo.extras.appendChild(el('p', { classe: 'lc-nota', texto: texto }));
  }

  function redesenharCartoes() {
    if (!ui) return;
    var itens = ui.mensagens.querySelectorAll('.lc-msg-assistente');
    Array.prototype.forEach.call(itens, function (item) {
      if (!item._laos || typeof item._laos.texto !== 'string') return; // ainda em streaming
      preencherAssistente(item._laos, item._laos.texto, true, {});
    });
  }

  function redesenharHistorico() {
    ui.mensagens.textContent = '';
    var ultimaPergunta = '';
    estado.historico.forEach(function (m) {
      if (m.role === 'user') { adicionarUsuario(m.content); ultimaPergunta = m.content; }
      else {
        var a = adicionarAssistente();
        a.bolha.removeAttribute('aria-busy');
        a.texto = m.content;
        a.item._laos = a;
        preencherAssistente(a, m.content, true, { pergunta: ultimaPergunta });
      }
    });
    atualizarWhatsRodape();
  }

  function atualizarWhatsRodape() {
    var ultima = null;
    for (var i = estado.historico.length - 1; i >= 0; i--) if (estado.historico[i].role === 'user') { ultima = estado.historico[i].content; break; }
    ui.linkWhats.href = ultima ? linkWhatsApp(T.msgWhatsIa(ultima.slice(0, 180), '')) : linkWhatsApp();
  }

  function paraEnvio() {
    var h = estado.historico.slice(-MAX_HISTORICO);
    while (h.length && h[0].role !== 'user') h.shift();
    return h.map(function (m) {
      var o = { role: m.role, content: m.content };
      if (m.role === 'assistant' && m.assinatura) o.assinatura = m.assinatura;
      return o;
    });
  }

  function contextoPagina() {
    var titulo = (document.title || '').slice(0, 100);
    return CFG.produto ? { produto: CFG.produto, titulo: titulo } : { titulo: titulo };
  }

  async function lerSse(corpoResposta, aoEvento) {
    var leitor = corpoResposta.getReader();
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
        var dados = bloco.split('\n').filter(function (l) { return l.indexOf('data:') === 0; }).map(function (l) { return l.slice(5).replace(/^ /, ''); }).join('\n');
        if (dados) { try { aoEvento(JSON.parse(dados)); } catch (e) { /* evento ilegível: ignora */ } }
      }
    }
  }

  function modoOcupado(sim) {
    estado.ocupado = sim;
    ui.campo.disabled = false;
    ui.enviar.setAttribute('aria-label', sim ? T.parar : T.enviar);
    ui.enviar.textContent = '';
    ui.enviar.appendChild(svg(sim ? ICONES.parar : ICONES.enviar));
    ui.enviar.classList.toggle('lc-enviar-parar', sim);
    ui.nova.disabled = sim;
  }

  async function perguntar(texto) {
    if (estado.ocupado) return;
    texto = texto.trim();
    if (!texto) return;
    if (texto.length > MAX_CHARS) { ui.contador.textContent = T.longa; ui.contador.classList.add('lc-contador-alerta'); return; }
    ui.sugestoes.hidden = true;
    estado.historico.push({ role: 'user', content: texto });
    salvar();
    atualizarWhatsRodape();
    adicionarUsuario(texto);
    var alvo = adicionarAssistente();
    alvo.item._laos = alvo;
    rolarParaFim();
    ui.statusVivo.textContent = T.escrevendo;
    modoOcupado(true);
    estado.parado = false;
    var controle = new AbortController();
    estado.controle = controle;
    var prazo = setTimeout(function () { controle.abort(); }, 90000);
    var acumulado = '';
    var fim = null;
    var erro = null;
    var agendado = false;
    function agendar() {
      if (agendado) return;
      agendado = true;
      requestAnimationFrame(function () {
        agendado = false;
        preencherAssistente(alvo, acumulado, false);
        rolarParaFim();
      });
    }
    try {
      var resposta = await fetch(CFG.endpoint + '/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modo: 'cliente', mensagens: paraEnvio(), pagina: contextoPagina() }),
        signal: controle.signal,
        credentials: 'omit',
      });
      var tipo = resposta.headers.get('Content-Type') || '';
      if (!resposta.ok || tipo.indexOf('text/event-stream') < 0) {
        var j = null;
        try { j = await resposta.json(); } catch (e) { /* sem corpo */ }
        erro = { mensagem: (j && j.erro && j.erro.mensagem) || T.falha };
      } else {
        await lerSse(resposta.body, function (ev) {
          if (ev.tipo === 'delta' && typeof ev.texto === 'string') { acumulado += ev.texto; agendar(); }
          else if (ev.tipo === 'fim') fim = ev;
          else if (ev.tipo === 'erro') erro = { mensagem: ev.mensagem || T.falha };
        });
        if (!fim && !erro) erro = { mensagem: T.falha };
      }
    } catch (e) {
      erro = estado.parado ? { parado: true } : { mensagem: T.falha };
    } finally {
      clearTimeout(prazo);
    }
    alvo.bolha.removeAttribute('aria-busy');
    var semTexto = !interpretar(acumulado, true).texto;
    if (semTexto) alvo.bolha.textContent = '';
    if (fim && !erro) {
      alvo.texto = acumulado;
      preencherAssistente(alvo, acumulado, true, { pergunta: texto });
      estado.historico.push({ role: 'assistant', content: acumulado, assinatura: fim.assinatura || null });
      salvar();
      if (fim.verificacao && fim.verificacao.ok === false) nota(alvo, T.verificar);
      if (fim.motivo === 'length') nota(alvo, T.cortada);
    } else {
      if (!semTexto) { alvo.texto = acumulado; preencherAssistente(alvo, acumulado, true, { pergunta: texto }); }
      if (erro && erro.parado) {
        if (semTexto) alvo.item.remove(); else nota(alvo, T.cortada);
      } else {
        if (semTexto) desenharTexto(alvo.bolha, (erro && erro.mensagem) || T.falha);
        else nota(alvo, (erro && erro.mensagem) || T.falha);
        alvo.item.classList.add('lc-msg-erro');
        if (!alvo.extras.querySelector('.lc-botao-whats')) alvo.extras.appendChild(botaoWhats(texto, alvo.slugs || []));
      }
    }
    ui.statusVivo.textContent = T.pronta;
    modoOcupado(false);
    estado.controle = null;
    rolarParaFim();
    if (estado.aberto) ui.campo.focus();
  }

  function ligar(u) {
    ui = u;
    u.lancador.addEventListener('click', function () { estado.aberto ? fecharPainel() : abrir(); });
    u.fechar.addEventListener('click', fecharPainel);
    u.voltar.addEventListener('click', function () { mostrarVista('inicio'); (u.escolhaIa || u.fechar).focus(); });
    if (u.escolhaIa) u.escolhaIa.addEventListener('click', function () {
      mostrarVista('ia');
      (estado.aceito ? u.campo : u.aceitar).focus();
    });
    u.aceitar.addEventListener('click', function () {
      estado.aceito = true;
      salvar();
      mostrarVista('ia');
      u.campo.focus();
    });
    u.sugestoes.addEventListener('click', function (e) {
      var b = e.target.closest('.lc-sugestao');
      if (b) perguntar(b.textContent);
    });
    u.formulario.addEventListener('submit', function (e) {
      e.preventDefault();
      if (estado.ocupado) {
        estado.parado = true;
        if (estado.controle) estado.controle.abort();
        return;
      }
      var t = u.campo.value;
      if (t.trim().length > MAX_CHARS) { u.contador.textContent = T.longa; u.contador.classList.add('lc-contador-alerta'); return; }
      u.campo.value = '';
      ajustarCampo();
      perguntar(t);
    });
    u.campo.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
        e.preventDefault();
        if (!estado.ocupado) u.formulario.requestSubmit ? u.formulario.requestSubmit() : u.formulario.dispatchEvent(new Event('submit', { cancelable: true }));
      }
    });
    u.campo.addEventListener('input', ajustarCampo);
    u.nova.addEventListener('click', function () {
      if (estado.ocupado) return;
      estado.historico = [];
      salvar();
      u.mensagens.textContent = '';
      atualizarWhatsRodape();
      mostrarVista('ia');
      u.campo.focus();
    });
    u.painel.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { e.stopPropagation(); fecharPainel(); return; }
      if (e.key !== 'Tab') return;
      var lista = focaveis();
      if (!lista.length) return;
      var primeiro = lista[0];
      var ultimo = lista[lista.length - 1];
      var atual = ativo();
      if (e.shiftKey && (atual === primeiro || !u.painel.contains(atual))) { e.preventDefault(); ultimo.focus(); }
      else if (!e.shiftKey && (atual === ultimo || !u.painel.contains(atual))) { e.preventDefault(); primeiro.focus(); }
    });
    document.addEventListener('click', function (e) {
      var gatilho = e.target && e.target.closest && e.target.closest('[data-laos-chat-abrir]');
      if (!gatilho) return;
      e.preventDefault();
      abrir(gatilho.getAttribute('data-laos-chat-abrir') || 'inicio');
    });
    if (estado.historico.length) redesenharHistorico();
  }

  function iniciar() {
    if (!document.body) return;
    montar();
    window.LaosChat = { abrir: abrir, fechar: fecharPainel, versao: '1.0.0' };
    host.dispatchEvent(new CustomEvent('laos-chat:pronto', { bubbles: true }));
  }
  window.LaosChat = { abrir: function () {}, fechar: function () {}, versao: '1.0.0' };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
})();
