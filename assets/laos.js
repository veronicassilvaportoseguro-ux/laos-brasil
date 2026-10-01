/* LAOS — interações do site (JS puro, sem dependências).
   Tudo aqui é aprimoramento: conteúdo e navegação funcionam sem JS. */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const corpo = document.body;
  const RAIZ = corpo.dataset.raiz || '';
  const VERSAO = corpo.dataset.versaoAssets || '';
  const WHATS = corpo.dataset.whatsapp || '5573998081019';
  const reduzir = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const norm = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const brl = (n) => (Number(n) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const guardar = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* modo privado */ } };
  const ler = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch (e) { return d; } };
  const atualizarURL = (campos) => {
    const url = new URL(location.href);
    Object.entries(campos).forEach(([k, v]) => { if (v) url.searchParams.set(k, v); else url.searchParams.delete(k); });
    try { history.replaceState(history.state, '', url); } catch (e) { /* prévia local */ }
  };

  // ---------- origem (UTM) para medir o que cada anúncio vendeu ----------
  (() => {
    const q = new URLSearchParams(location.search);
    const o = { src: q.get('utm_source'), med: q.get('utm_medium'), camp: q.get('utm_campaign') };
    if (q.get('gclid')) o.src = o.src || 'google', o.med = o.med || 'cpc';
    if (q.get('fbclid')) o.src = o.src || 'meta', o.med = o.med || 'social';
    if (o.src) guardar('laos-origem', { ...o, quando: new Date().toISOString().slice(0, 10) });
  })();
  // a origem vale por 30 dias; depois disso é descartada
  const origem = () => { const o = ler('laos-origem', null); if (o && o.quando && (Date.now() - Date.parse(o.quando)) / 864e5 > 30) { try { localStorage.removeItem('laos-origem'); } catch (e) { /* modo privado */ } return null; } return o; };
  const textoCurto = (v, limite) => {
    let t = String(v || '').replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]|[\uD800-\uDFFF]/g, (c) => c.length === 2 ? c : ' ').replace(/[\u0000-\u001f\u007f\u200b-\u200f\u202a-\u202e\u2060-\u206f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, limite).replace(/[\uD800-\uDBFF]$/, '');
    while (encodeURIComponent(t).length > limite * 4) t = t.slice(0, -1).replace(/[\uD800-\uDBFF]$/, '');
    return t;
  };
  function codigoContato() {
    let sufixo;
    try { sufixo = crypto.getRandomValues(new Uint32Array(1))[0].toString(36); }
    catch (e) { sufixo = Math.random().toString(36).slice(2, 10); }
    return 'LAOS-' + Date.now().toString(36).toUpperCase() + '-' + sufixo.toUpperCase();
  }
  function textoOrigem() {
    const o = origem();
    if (!o || typeof o.src !== 'string' || typeof o.quando !== 'string' || !Number.isFinite(Date.parse(o.quando)) || Date.parse(o.quando) > Date.now() + 864e5) return 'site';
    return [textoCurto(o.src, 60), textoCurto(o.med, 30), textoCurto(o.camp, 80)].filter(Boolean).join(' / ') || 'site';
  }
  function abrirContato(url, codigo) {
    try {
      // Com noopener, o navegador pode retornar null mesmo abrindo a janela.
      // O retorno não é confirmação de envio nem de recebimento.
      window.open(url, '_blank', 'noopener');
    } catch (e) { /* o link abaixo preserva o caminho em navegador restrito */ }
    aviso(`A mensagem ${esc(codigo)} está pronta. Revise e envie no WhatsApp para a equipe confirmar. <a href="${esc(url)}" target="_blank" rel="noopener" style="color:inherit">Abrir mensagem no WhatsApp</a>.`, 20000);
  }

  // ---------- aviso flutuante ----------
  let avisoT;
  function aviso(html, ms = 3800) {
    let el = $('.aviso-flutuante');
    if (!el) { el = document.createElement('div'); el.className = 'aviso-flutuante'; el.setAttribute('role', 'status'); corpo.appendChild(el); }
    el.innerHTML = html;
    clearTimeout(avisoT); avisoT = setTimeout(() => el.remove(), ms);
  }

  // ---------- cabeçalho ----------
  const cab = $('[data-cab]');
  if (cab) {
    const rol = () => cab.classList.toggle('rolou', window.scrollY > 8);
    rol(); window.addEventListener('scroll', rol, { passive: true });
  }

  // ---------- mega menu (desktop) ----------
  const mega = $('[data-mega]');
  const megaAbre = $('[data-mega-abre]');
  const desktop = window.matchMedia('(min-width: 1100px)');
  let fecharMega = () => {};
  if (mega && megaAbre) {
    let t, fixado = false;
    const dentro = (alvo) => megaAbre.contains(alvo) || mega.contains(alvo);
    const abrir = () => {
      if (!desktop.matches) return;
      clearTimeout(t);
      mega.hidden = false; mega.classList.add('aberto'); megaAbre.setAttribute('aria-expanded', 'true');
    };
    fecharMega = (devolverFoco = false) => {
      clearTimeout(t);
      const focoDentro = mega.contains(document.activeElement);
      mega.classList.remove('aberto'); mega.hidden = true; megaAbre.setAttribute('aria-expanded', 'false');
      fixado = false;
      if ((devolverFoco || focoDentro) && desktop.matches) megaAbre.focus({ preventScroll: true });
    };
    const fecharDepois = () => {
      clearTimeout(t);
      t = setTimeout(() => { if (!fixado && !mega.contains(document.activeElement)) fecharMega(); }, 160);
    };
    megaAbre.addEventListener('click', (e) => {
      e.preventDefault();
      // O clique depois do hover fixa o painel; o clique seguinte o fecha.
      if (fixado && !mega.hidden) fecharMega(); else { fixado = true; abrir(); }
    });
    megaAbre.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown' && desktop.matches) { e.preventDefault(); abrir(); $('a[href], button', mega)?.focus(); }
    });
    [megaAbre, mega].forEach((el) => {
      el.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') abrir(); });
      el.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') fecharDepois(); });
      el.addEventListener('focusout', (e) => { if (!dentro(e.relatedTarget)) fecharMega(); });
    });
    // Devolver o foco no Escape não dispara abertura: o foco, sozinho, não abre o menu.
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !mega.hidden) { e.preventDefault(); fecharMega(true); } });
    document.addEventListener('pointerdown', (e) => { if (!mega.hidden && !dentro(e.target)) fecharMega(); });
    desktop.addEventListener('change', () => fecharMega());
  }

  // ---------- diálogos (menu celular, sacola) ----------
  let dialogoAtivo = null;
  function dialogo(el, abridores = []) {
    let ultimo = null, overflowAnterior = '', fundo = [];
    const painel = $('[role="dialog"]', el) || el;
    if (!painel.hasAttribute('tabindex')) painel.tabIndex = -1;
    const focaveis = () => $$('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]', painel)
      .filter((x) => x.getClientRects().length && x.getAttribute('tabindex') !== '-1' && !x.closest('[inert]'));
    const focarPrimeiro = () => (focaveis()[0] || painel).focus({ preventScroll: true });
    const tecla = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); fechar(); }
      if (e.key === 'Tab') {
        const f = focaveis(); if (!f.length) { e.preventDefault(); painel.focus(); return; }
        if (e.shiftKey && (document.activeElement === f[0] || !f.includes(document.activeElement))) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && (document.activeElement === f[f.length - 1] || !f.includes(document.activeElement))) { e.preventDefault(); f[0].focus(); }
      }
    };
    const manterFoco = (e) => { if (!el.contains(e.target)) focarPrimeiro(); };
    function abrir(abridor) {
      if (dialogoAtivo === api) return;
      const alvo = abridor?.currentTarget || abridor;
      ultimo = alvo instanceof HTMLElement ? alvo : document.activeElement;
      dialogoAtivo?.fechar(false); fecharMega();
      el.hidden = false;
      overflowAnterior = document.documentElement.style.overflow;
      document.documentElement.style.overflow = 'hidden'; document.documentElement.classList.add('dialogo-aberto');
      // Inert nos irmãos de cada ancestral mantém o diálogo acessível mesmo se estiver dentro do cabeçalho.
      fundo = [];
      if ('inert' in HTMLElement.prototype) {
        for (let atual = el; atual && atual !== corpo; atual = atual.parentElement) {
          Array.from(atual.parentElement?.children || []).forEach((irmao) => {
            if (irmao !== atual && irmao instanceof HTMLElement) { fundo.push([irmao, irmao.inert]); irmao.inert = true; }
          });
        }
      }
      abridores.forEach((b) => b.setAttribute('aria-expanded', 'true'));
      dialogoAtivo = api;
      document.addEventListener('keydown', tecla); document.addEventListener('focusin', manterFoco);
      focarPrimeiro();
    }
    function fechar(devolverFoco = true) {
      if (dialogoAtivo !== api) return;
      document.removeEventListener('keydown', tecla); document.removeEventListener('focusin', manterFoco);
      fundo.forEach(([irmao, anterior]) => { irmao.inert = anterior; }); fundo = [];
      el.hidden = true;
      document.documentElement.style.overflow = overflowAnterior; document.documentElement.classList.remove('dialogo-aberto');
      abridores.forEach((b) => b.setAttribute('aria-expanded', 'false')); dialogoAtivo = null;
      if (devolverFoco) {
        const destino = ultimo?.isConnected && ultimo.getClientRects().length && !ultimo.closest('[inert]') ? ultimo : abridores.find((b) => b.getClientRects().length);
        destino?.focus({ preventScroll: true });
      }
    }
    const api = { abrir, fechar };
    return api;
  }
  const menu = $('[data-menu]');
  if (menu) {
    const abridores = $$('[data-menu-abre]');
    const d = dialogo(menu, abridores);
    abridores.forEach((b) => b.addEventListener('click', d.abrir));
    $$('[data-menu-fecha]').forEach((b) => b.addEventListener('click', () => d.fechar()));
    desktop.addEventListener('change', () => { if (desktop.matches) d.fechar(); });
  }

  // ---------- índice de produtos (busca, quiz, sacola) ----------
  let indiceP = null;
  const indice = () => {
    if (!indiceP) {
      const controle = new AbortController();
      const timeout = setTimeout(() => controle.abort(), 15000);
      indiceP = fetch(RAIZ + 'assets/produtos.json' + (VERSAO ? '?v=' + encodeURIComponent(VERSAO) : ''), { signal: controle.signal })
        .then((r) => { if (!r.ok) throw new Error('Catálogo indisponível'); return r.json(); })
        .then((lista) => { if (!Array.isArray(lista)) throw new Error('Catálogo inválido'); return lista; })
        .catch((erro) => { indiceP = null; throw erro; })
        .finally(() => clearTimeout(timeout));
    }
    return indiceP;
  };
  // Caminhos internos válidos (o índice é artefato de build, mas não se confia em dado para montar atributo)
  const URL_PRODUTO = /^produtos\/[a-z0-9-]{1,140}\/$/;
  const URL_IMG = /^assets\/img\/[a-zA-Z0-9/._-]{1,200}$/;
  const NEUTRA = (fn) => `<span class="foto-neutra"><svg class="foto-neutra__simbolo" viewBox="0 0 32 32" aria-hidden="true" focusable="false"><circle cx="16" cy="16" r="8.5" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M16 3.5v25" stroke="currentColor" stroke-width="1.4"/></svg><span class="foto-neutra__tipo">${esc(fn[0])}</span><span class="foto-neutra__nome">${esc(fn[1])}</span></span>`;
  const cartaoHtml = (p) => {
    const url = RAIZ + (URL_PRODUTO.test(p.u) ? esc(p.u) : 'loja/');
    const acao = p.v && p.d
      ? `<a class="cartao__add" href="${url}" aria-label="Escolher tamanho de ${esc(p.n)}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="M4 12h15m-6-6 6 6-6 6"/></svg></a>`
      : `<button class="cartao__add" type="button" data-add="${esc(p.s)}" aria-label="Adicionar ${esc(p.n)} à sacola"${p.d ? '' : ' disabled'}><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="M8 2v12M2 8h12"/></svg></button>`;
    return `<article class="cartao"${p.i2 && URL_IMG.test(p.i2) ? ` data-foto-ambiente="${RAIZ}${esc(p.i2)}"` : ''}><a class="cartao__foto" href="${url}" tabindex="-1" aria-hidden="true">${p.d ? '' : '<span class="cartao__selo cartao__selo--esgotado">Esgotado</span>'}${p.i && URL_IMG.test(p.i) ? `<img src="${RAIZ}${esc(p.i)}" alt="" loading="lazy" decoding="async"${p.r ? '' : ' class="cena"'}>` : Array.isArray(p.fn) ? NEUTRA(p.fn) : ''}</a><div class="cartao__txt"><span class="cartao__tipo">${esc(p.t)}</span><h3 class="cartao__nome"><a href="${url}">${esc(p.n)}</a></h3>${p.no ? `<p class="cartao__notas">${esc(p.no)}</p>` : ''}</div><div class="cartao__rodape"><span class="preco">${p.pf ? '<small>a partir de</small> ' : ''}${brl(p.p)}</span>${acao}</div></article>`;
  };

  // A segunda imagem só é pedida quando alguém explora o cartão. Não há
  // download extra na entrada nem interferência no primeiro toque do celular.
  const carregarAmbiente = (evento) => {
    if (evento.type === 'pointerover' && (evento.pointerType !== 'mouse' || !matchMedia('(hover: hover)').matches)) return;
    const card = evento.target.closest('.cartao[data-foto-ambiente]');
    if (!card || card.dataset.ambienteCarregando) return;
    const url = new URL(card.dataset.fotoAmbiente, location.href);
    if (url.origin !== location.origin || !url.pathname.includes('/assets/img/')) return;
    const quadro = card.querySelector('.cartao__foto');
    if (!quadro) return;
    card.dataset.ambienteCarregando = '1';
    const im = new Image();
    im.alt = ''; im.className = 'cena cartao__ambiente'; im.decoding = 'async';
    im.onload = () => { quadro.append(im); card.classList.add('foto-pronta'); };
    im.onerror = () => { delete card.dataset.ambienteCarregando; };
    im.src = url.href;
  };
  document.addEventListener('pointerover', carregarAmbiente);
  document.addEventListener('focusin', carregarAmbiente);

  // ---------- sacola ----------
  const CHAVE = 'laos-sacola-v1';
  // O localStorage não é fonte confiável (revisão de segurança M3): valida tipos, formatos e limites ao carregar.
  const SLUG = /^[a-z0-9-]{1,140}$/;
  function limparSacola(v) {
    if (!Array.isArray(v)) return [];
    return v.filter((i) => i && typeof i === 'object' && typeof i.s === 'string' && SLUG.test(i.s)).slice(0, 60).map((i) => ({
      k: String(i.k || i.s).slice(0, 200), s: i.s, n: String(i.n || '').slice(0, 120), t: String(i.t || '').slice(0, 120),
      p: Number.isFinite(Number(i.p)) && Number(i.p) >= 0 ? Number(i.p) : 0, v: String(i.v || '').slice(0, 80), vid: String(i.vid || '').replace(/\D/g, '').slice(0, 20),
      i: typeof i.i === 'string' && URL_IMG.test(i.i) ? i.i : '', u: typeof i.u === 'string' && URL_PRODUTO.test(i.u) ? i.u : 'loja/',
      q: Math.max(1, Math.min(99, parseInt(i.q, 10) || 1)),
    }));
  }
  let sacola = limparSacola(ler(CHAVE, []));
  const gaveta = $('[data-gaveta]');
  const dg = gaveta ? dialogo(gaveta, $$('[data-sacola-abre]')) : null;
  const contar = () => sacola.reduce((s, i) => s + i.q, 0);
  function atualizarContador() { $$('[data-contador]').forEach((c) => { c.textContent = contar(); c.dataset.contador = contar(); }); }
  function salvar() { guardar(CHAVE, sacola); atualizarContador(); renderSacola(); }
  function adicionar(item, qtd = 1) {
    const k = item.s + (item.vid ? ':' + item.vid : '');
    const ex = sacola.find((i) => i.k === k);
    if (ex) ex.q = Math.min(99, ex.q + qtd); else sacola.push({ k, ...item, q: qtd });
    salvar();
    aviso(`${esc(item.n)} na sacola · <button type="button" class="link-seta" data-sacola-abre-aviso style="color:inherit;background:none;border:0;border-bottom:1px solid;cursor:pointer">Ver sacola</button>`);
  }
  function renderSacola() {
    const ul = $('[data-sacola-itens]'); if (!ul) return;
    if (!sacola.length) { ul.innerHTML = '<li class="gaveta__vazia">Sua sacola está vazia.<br><a href="' + RAIZ + 'loja/">Conhecer os aromas</a></li>'; }
    else ul.innerHTML = sacola.map((i) => `<li class="item-sacola" data-k="${esc(i.k)}">${i.i ? `<img src="${RAIZ}${esc(i.i)}" alt="" width="72" height="88">` : '<span></span>'}<div><h3><a href="${RAIZ}${esc(i.u)}">${esc(i.n)}</a></h3><div class="var">${esc([i.t, i.v].filter(Boolean).join(' · '))}</div><div class="qtd"><button type="button" data-item-qtd="-1" aria-label="Diminuir quantidade de ${esc(i.n)}"${i.q <= 1 ? ' disabled' : ''}>−</button><output aria-live="polite">${Math.max(1, Math.min(99, parseInt(i.q, 10) || 1))}</output><button type="button" data-item-qtd="1" aria-label="Aumentar quantidade de ${esc(i.n)}"${i.q >= 99 ? ' disabled' : ''}>+</button></div><br><button class="remover" type="button" data-item-remove aria-label="Remover ${esc(i.n)} da sacola">Remover</button></div><strong class="preco">${brl(i.p * i.q)}</strong></li>`).join('');
    const tot = $('[data-sacola-total]'); if (tot) tot.textContent = brl(sacola.reduce((s, i) => s + i.p * i.q, 0));
    const submit = $('[data-sacola-form] button[type=submit]'); if (submit) submit.disabled = !sacola.length;
  }
  $$('[data-sacola-abre]').forEach((b) => b.addEventListener('click', () => { renderSacola(); dg?.abrir(b); }));
  document.addEventListener('click', (e) => { const b = e.target.closest('[data-sacola-abre-aviso]'); if (b) { renderSacola(); dg?.abrir(b); } });
  $$('[data-sacola-fecha]').forEach((b) => b.addEventListener('click', () => dg?.fechar()));
  $('[data-sacola-itens]')?.addEventListener('click', (e) => {
    const li = e.target.closest('[data-k]'); if (!li) return;
    const it = sacola.find((i) => i.k === li.dataset.k); if (!it) return;
    const d = e.target.closest('[data-item-qtd]');
    if (d && !d.disabled) {
      it.q = Math.max(1, Math.min(99, it.q + Number(d.dataset.itemQtd))); salvar();
      const novo = $$('[data-k]').find((x) => x.dataset.k === it.k);
      const botao = $(`[data-item-qtd="${d.dataset.itemQtd}"]`, novo);
      (botao?.disabled ? $('[data-item-qtd]:not([disabled])', novo) : botao)?.focus({ preventScroll: true });
    }
    if (e.target.closest('[data-item-remove]')) {
      const posicao = sacola.indexOf(it);
      sacola = sacola.filter((i) => i !== it); salvar();
      const itens = $$('[data-k]');
      const proximo = itens[Math.min(posicao, itens.length - 1)];
      (proximo ? $('[data-item-remove]', proximo) : $('[data-sacola-itens] a'))?.focus({ preventScroll: true });
    }
  });
  const formS = $('[data-sacola-form]');
  if (formS) {
    const cep = $('[data-cep]', formS);
    formS.addEventListener('change', () => { if (cep) cep.hidden = formS.entrega.value === 'loja'; });
    formS.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!sacola.length) return;
      const codigo = codigoContato();
      const linhas = sacola.map((i) => `• ${i.q}× ${i.n}${i.v ? ` (${i.v})` : ''} — ${brl(i.p * i.q)}`);
      const total = sacola.reduce((s, i) => s + i.p * i.q, 0);
      const entrega = formS.entrega.value === 'loja' ? 'Quero buscar numa das lojas em Arraial d\'Ajuda' : `Receber em casa · CEP/cidade: ${formS.cep.value || '(informar)'}`;
      const msg = [`Olá, LAOS! Quero fazer um pedido pelo site.`, `Pedido ${codigo}`, '', ...linhas, '', `Subtotal: ${brl(total)}`, `Nome: ${textoCurto(formS.nome.value, 120)}`, `Entrega: ${textoCurto(entrega, 180)}`, '', `Origem: ${textoOrigem()}`, '(Frete e forma de pagamento a combinar.)'].join('\n');
      const url = `https://wa.me/${WHATS}?text=${encodeURIComponent(msg)}`;
      abrirContato(url, codigo);
    });
  }
  // botões de adicionar (cartões e página de produto)
  document.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-add]'); if (!b || b.disabled) return;
    e.preventDefault();
    const pdp = b.hasAttribute('data-add-pdp') ? $('[data-pdp]') : null;
    if (pdp) {
      const v = $('input[name=variante]:checked', pdp);
      const qtd = Number($('[data-qtd-valor]', pdp)?.textContent || 1);
      adicionar({ s: pdp.dataset.pdp, n: pdp.dataset.nome, t: pdp.dataset.tipo, p: Number(v?.dataset.preco || pdp.dataset.preco), v: v?.dataset.varNome || '', vid: v?.value || '', i: (pdp.dataset.img || '').replace(RAIZ, ''), u: pdp.dataset.url }, qtd);
      return;
    }
    b.disabled = true; b.setAttribute('aria-busy', 'true');
    try {
      const lista = await indice();
      const p = lista.find((x) => x.s === b.dataset.add); if (!p) return;
      if (p.v && URL_PRODUTO.test(p.u)) { location.assign(RAIZ + p.u); return; }
      if (!p.d) { aviso('Esse produto está esgotado. Veja as outras opções da loja.'); return; }
      adicionar({ s: p.s, n: p.n, t: p.t, p: p.p, v: '', vid: '', i: p.i, u: p.u }, 1);
    } catch (erro) {
      aviso(`Não conseguimos carregar o produto agora. <button type="button" class="link-seta" data-add="${esc(b.dataset.add)}">Tentar novamente</button>`, 12000);
    } finally { b.disabled = false; b.removeAttribute('aria-busy'); }
  });
  atualizarContador();

  // ---------- trilhos: gesto livre e controles com limites claros ----------
  $$('[data-trilho]').forEach((bloco) => {
    const faixa = $('.trilho', bloco) || bloco;
    const voltar = $('[data-trilho-voltar]', bloco), avancar = $('[data-trilho-avancar]', bloco);
    if (!voltar || !avancar) return;
    if (!voltar.hasAttribute('aria-label')) voltar.setAttribute('aria-label', 'Ver produtos anteriores');
    if (!avancar.hasAttribute('aria-label')) avancar.setAttribute('aria-label', 'Ver próximos produtos');
    const atualizar = () => {
      const fim = Math.max(0, faixa.scrollWidth - faixa.clientWidth);
      voltar.disabled = faixa.scrollLeft <= 2;
      avancar.disabled = faixa.scrollLeft >= fim - 2;
    };
    const mover = (sentido) => {
      const cartao = $('[role="listitem"], .cartao', faixa);
      const passo = Math.max(faixa.clientWidth * 0.82, cartao?.getBoundingClientRect().width || 0);
      faixa.scrollBy({ left: sentido * passo, behavior: reduzir ? 'auto' : 'smooth' });
    };
    voltar.addEventListener('click', () => mover(-1)); avancar.addEventListener('click', () => mover(1));
    let quadro;
    faixa.addEventListener('scroll', () => { if (!quadro) quadro = requestAnimationFrame(() => { quadro = null; atualizar(); }); }, { passive: true });
    if ('ResizeObserver' in window) new ResizeObserver(atualizar).observe(faixa);
    else window.addEventListener('resize', atualizar, { passive: true });
    atualizar();
  });

  // ---------- página de produto ----------
  const pdp = $('[data-pdp]');
  if (pdp) {
    const out = $('[data-qtd-valor]', pdp);
    const precoEl = $('[data-preco-exibido]', pdp);
    const precoBarra = $('[data-preco-barra]');
    const linkWa = $('[data-wa-pdp]', pdp);
    const atualizaPreco = () => {
      const v = $('input[name=variante]:checked', pdp);
      const unit = Number(v?.dataset.preco || pdp.dataset.preco);
      const q = Math.max(1, Math.min(99, Number(out?.textContent || 1)));
      $$('[data-qtd]', pdp).forEach((b) => { b.disabled = Number(b.dataset.qtd) < 0 ? q <= 1 : q >= 99; });
      if (v && precoEl) precoEl.textContent = brl(unit);
      if (precoBarra) precoBarra.textContent = q > 1 ? `${q} × ${brl(unit)}` : brl(unit);
      if (linkWa && !$('[data-add-pdp]', pdp)?.disabled) {
        const item = `${q}× ${pdp.dataset.nome} (${[pdp.dataset.tipo, v?.dataset.varNome].filter(Boolean).join(' · ')})`;
        linkWa.href = `https://wa.me/${WHATS}?text=${encodeURIComponent(`Olá, LAOS! Quero pedir: ${item} — ${brl(unit * q)}. Vi no site.`)}`;
      }
    };
    $$('[data-qtd]', pdp).forEach((b) => b.addEventListener('click', () => { if (out) out.textContent = Math.max(1, Math.min(99, Number(out.textContent) + Number(b.dataset.qtd))); atualizaPreco(); }));
    $$('input[name=variante]', pdp).forEach((r) => r.addEventListener('change', atualizaPreco)); atualizaPreco();
    const barra = $('[data-barra-compra]'); const alvo = $('[data-comprar]', pdp);
    if (barra && alvo && 'IntersectionObserver' in window) {
      new IntersectionObserver(([en]) => { const mostrar = !en.isIntersecting && en.boundingClientRect.top < 0; barra.classList.toggle('visivel', mostrar); document.documentElement.classList.toggle('barra-visivel', mostrar); barra.setAttribute('aria-hidden', String(!mostrar)); $('button', barra).tabIndex = mostrar ? 0 : -1; }).observe(alvo);
    }
    const galeria = $('[data-galeria]', pdp);
    if (galeria) {
      const fotos = $$('[data-galeria-item]', galeria);
      const anterior = $('[data-galeria-anterior]', pdp), proxima = $('[data-galeria-proxima]', pdp), status = $('[data-galeria-status]', pdp);
      let atual = 0, quadro;
      const atualizarGaleria = () => {
        const rolavel = galeria.scrollWidth > galeria.clientWidth + 2;
        if (rolavel && fotos.length) {
          const inicio = galeria.getBoundingClientRect().left;
          atual = fotos.reduce((maisPerto, foto, i) => Math.abs(foto.getBoundingClientRect().left - inicio) < Math.abs(fotos[maisPerto].getBoundingClientRect().left - inicio) ? i : maisPerto, 0);
        } else atual = 0;
        if (anterior) anterior.disabled = !rolavel || atual === 0;
        if (proxima) proxima.disabled = !rolavel || atual === fotos.length - 1;
        if (status) status.textContent = `${atual + 1} / ${Math.max(1, fotos.length)}`;
      };
      const mostrarFoto = (sentido) => {
        const foto = fotos[Math.max(0, Math.min(fotos.length - 1, atual + sentido))];
        if (!foto) return;
        const esquerda = foto.getBoundingClientRect().left - galeria.getBoundingClientRect().left + galeria.scrollLeft;
        galeria.scrollTo({ left: esquerda, behavior: reduzir ? 'auto' : 'smooth' });
      };
      anterior?.addEventListener('click', () => mostrarFoto(-1)); proxima?.addEventListener('click', () => mostrarFoto(1));
      galeria.addEventListener('scroll', () => { if (!quadro) quadro = requestAnimationFrame(() => { quadro = null; atualizarGaleria(); }); }, { passive: true });
      if ('ResizeObserver' in window) new ResizeObserver(atualizarGaleria).observe(galeria);
      else window.addEventListener('resize', atualizarGaleria, { passive: true });
      atualizarGaleria();
    }
  }

  // ---------- expansão progressiva: o HTML completo continua disponível sem JS ----------
  function criarMais(grade) {
    const bloco = document.createElement('div'); bloco.className = 'lista-mais'; bloco.hidden = true;
    const contador = document.createElement('p'); contador.setAttribute('aria-live', 'polite'); contador.setAttribute('aria-atomic', 'true');
    const botao = document.createElement('button'); botao.type = 'button'; botao.className = 'botao botao--linha'; botao.textContent = 'Mostrar mais produtos';
    if (grade.id) botao.setAttribute('aria-controls', grade.id);
    bloco.append(contador, botao); grade.after(bloco);
    const atualizar = (mostrados, total, primeiroNovo = null) => {
      const tinhaFoco = document.activeElement === botao;
      contador.textContent = `Mostrando ${mostrados} de ${total} ${total === 1 ? 'produto' : 'produtos'}`;
      bloco.hidden = total === 0; botao.hidden = mostrados >= total;
      // No último lote o botão some; o foco segue para o começo dos produtos recém revelados.
      if (tinhaFoco && botao.hidden) {
        const destino = primeiroNovo && $('.cartao__nome', primeiroNovo) || contador;
        destino.tabIndex = -1; destino.focus();
      }
    };
    return { botao, atualizar };
  }

  // ---------- filtros e ordenação nas listagens ----------
  $$('[data-filtros]').forEach((barra) => {
    const gradeEl = barra.parentElement.querySelector('[data-grade]'); if (!gradeEl) return;
    const cartoes = $$('.cartao', gradeEl);
    const vazio = barra.parentElement.querySelector('[data-sem-resultado]');
    const cont = $('[data-contagem]', barra);
    const campo = barra.parentElement.querySelector('[data-busca-inline] [data-busca-campo]');
    const botoes = $$('[data-filtro]', barra);
    const ordenar = $('[data-ordenar]', barra);
    const parametros = new URLSearchParams(location.search);
    const inicial = botoes.find((b) => b.dataset.filtro === parametros.get('filtro') && (b.dataset.valor || '') === (parametros.get('valor') || ''));
    let filtro = inicial ? { tipo: inicial.dataset.filtro, valor: inicial.dataset.valor || '' } : { tipo: 'todos', valor: '' };
    if (campo && parametros.has('q')) campo.value = parametros.get('q');
    const mais = criarMais(gradeEl);
    const celular = window.matchMedia('(max-width: 760px)');
    const tamanhoLote = () => celular.matches ? 12 : 24;
    let limite = tamanhoLote(), encontrados = [], expandiu = false;
    const exibir = (primeiroNovo = null) => {
      const visiveis = new Set(encontrados.slice(0, limite));
      cartoes.forEach((c) => { c.hidden = !visiveis.has(c); });
      mais.atualizar(visiveis.size, encontrados.length, primeiroNovo);
    };
    const aplicar = (registrar = true) => {
      const q = norm(campo?.value || '').split(/\s+/).filter(Boolean);
      encontrados = cartoes.filter((c) => {
        const okF = filtro.tipo === 'todos' || c.dataset[filtro.tipo] === filtro.valor;
        const okQ = !q.length || q.every((t) => norm(c.dataset.nome).includes(t));
        return okF && okQ;
      });
      limite = tamanhoLote(); expandiu = false;
      const n = encontrados.length;
      if (cont) cont.textContent = `${n} ${n === 1 ? 'produto' : 'produtos'}`;
      if (vazio) vazio.hidden = n > 0;
      exibir();
      if (registrar) atualizarURL({ q: campo?.value.trim() || '', filtro: filtro.tipo === 'todos' ? '' : filtro.tipo, valor: filtro.valor });
    };
    mais.botao.addEventListener('click', () => {
      const primeiroNovo = encontrados[limite];
      limite += tamanhoLote(); expandiu = true; exibir(primeiroNovo);
    });
    celular.addEventListener('change', () => { if (!expandiu) limite = tamanhoLote(); exibir(); });
    botoes.forEach((b) => b.addEventListener('click', () => {
      botoes.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      filtro = { tipo: b.dataset.filtro, valor: b.dataset.valor || '' }; aplicar();
    }));
    if (inicial) botoes.forEach((b) => b.setAttribute('aria-pressed', String(b === inicial)));
    campo?.addEventListener('input', () => aplicar());
    campo?.closest('form')?.addEventListener('submit', (e) => { e.preventDefault(); aplicar(); });
    const ordenarGrade = (registrar = true) => {
      const m = ordenar?.value || 'ordem';
      const cmp = { ordem: (a, b) => a.dataset.ordem - b.dataset.ordem, menor: (a, b) => a.dataset.preco - b.dataset.preco, maior: (a, b) => b.dataset.preco - a.dataset.preco, nome: (a, b) => a.querySelector('.cartao__nome').textContent.localeCompare(b.querySelector('.cartao__nome').textContent, 'pt-BR') }[m];
      if (cmp) cartoes.sort(cmp).forEach((c) => gradeEl.appendChild(c));
      aplicar(false);
      if (registrar) atualizarURL({ ordenar: m === 'ordem' ? '' : m });
    };
    ordenar?.addEventListener('change', () => ordenarGrade());
    if (ordenar && ['ordem', 'menor', 'maior', 'nome'].includes(parametros.get('ordenar'))) ordenar.value = parametros.get('ordenar');
    ordenarGrade(false);
  });

  // ---------- busca ----------
  const formB = $('[data-busca]');
  if (formB && $('[data-busca-campo]', formB) && $('[data-busca-grade]') && $('[data-busca-status]')) {
    const campo = $('[data-busca-campo]', formB), gradeB = $('[data-busca-grade]'), status = $('[data-busca-status]');
    const q0 = new URLSearchParams(location.search).get('q'); if (q0) campo.value = q0;
    const mais = criarMais(gradeB);
    let t, versao = 0, resultados = [], limite = 24;
    const exibirBusca = () => {
      const antes = gradeB.children.length, ate = Math.min(limite, resultados.length);
      gradeB.insertAdjacentHTML('beforeend', resultados.slice(antes, ate).map(cartaoHtml).join(''));
      mais.atualizar(ate, resultados.length, gradeB.children[antes]);
    };
    mais.botao.addEventListener('click', () => { limite += 24; exibirBusca(); });
    const buscar = async () => {
      const chamada = ++versao, texto = campo.value.trim();
      const q = norm(texto).split(/\s+/).filter(Boolean);
      atualizarURL({ q: texto });
      resultados = []; limite = 24; gradeB.innerHTML = ''; mais.atualizar(0, 0);
      if (!q.length) { status.textContent = ''; formB.removeAttribute('aria-busy'); gradeB.removeAttribute('aria-busy'); return; }
      formB.setAttribute('aria-busy', 'true'); gradeB.setAttribute('aria-busy', 'true'); status.textContent = 'Buscando no catálogo…';
      try {
        const lista = await indice(); if (chamada !== versao) return;
        const bate = (p, w) => norm(p.b).includes(w) || norm(p.n).includes(w) || (w.length > 4 && w.endsWith('s') && (norm(p.b).includes(w.slice(0, -1)) || (w.endsWith('es') && norm(p.b).includes(w.slice(0, -2)))));
        resultados = lista.filter((p) => q.every((w) => bate(p, w))).sort((a, b) => (Number(b.d) - Number(a.d)) || Number(norm(b.n).startsWith(q[0])) - Number(norm(a.n).startsWith(q[0])));
        status.textContent = resultados.length ? `${resultados.length} ${resultados.length === 1 ? 'produto encontrado' : 'produtos encontrados'} para “${texto}”` : `Nada encontrado para “${texto}”. Tente o nome de uma nota, como lavanda ou caju.`;
        exibirBusca();
      } catch (erro) {
        if (chamada !== versao) return;
        gradeB.innerHTML = ''; status.innerHTML = 'Não conseguimos carregar os produtos agora. <button type="button" class="botao botao--linha" data-busca-tentar>Tentar novamente</button>';
      } finally {
        if (chamada === versao) { formB.removeAttribute('aria-busy'); gradeB.removeAttribute('aria-busy'); }
      }
    };
    campo.addEventListener('input', () => { versao++; clearTimeout(t); t = setTimeout(buscar, 160); });
    formB.addEventListener('submit', (e) => { e.preventDefault(); clearTimeout(t); buscar(); });
    status.addEventListener('click', (e) => { if (e.target.closest('[data-busca-tentar]')) { campo.focus({ preventScroll: true }); buscar(); } });
    if (q0) buscar();
  }

  // ---------- quiz ----------
  const quiz = $('[data-quiz]');
  if (quiz && $('[data-quiz-resultado]') && $('[data-quiz-titulo]') && $('[data-quiz-grade]')) {
    const TIPOS = { sala: ['difusor-varetas', 'vela', 'aromatizador-spray', 'aromatizador-litro'], quarto: ['aromatizador-spray', 'aromatizador-60ml', 'vela', 'difusor-varetas', 'sache'], banheiro: ['difusor-varetas', 'aromatizador-spray'], carro: ['aromatizador-carro', 'sache', 'aromatizador-60ml'], presente: ['vela', 'difusor-varetas', 'aromatizador-spray', 'sabonete', 'sache'] };
    const sec = $('[data-quiz-resultado]'), titulo = $('[data-quiz-titulo]'), gradeQ = $('[data-quiz-grade]'), submit = $('button[type=submit]', quiz);
    const avisoQuiz = document.createElement('p'); avisoQuiz.className = 'quiz-aviso'; avisoQuiz.hidden = true; gradeQ.before(avisoQuiz);
    const passos = (() => {
      const campos = Array.from(quiz.children).filter((el) => el.tagName === 'FIELDSET');
      const legendas = campos.map((el) => $('legend', el));
      if (!submit || campos.length < 2 || legendas.some((el) => !el) || campos.some((el) => !$('input, select, textarea', el))) return null;
      const paiSubmit = submit.parentElement, proximoSubmit = submit.nextSibling;
      const estado = { noValidate: quiz.noValidate, submitHidden: submit.hidden, paiHidden: paiSubmit.hidden, campos: campos.map((el) => el.hidden), legendas: legendas.map((el) => el.getAttribute('tabindex')), radios: $$('input[type=radio]', quiz).map((el) => [el, el.required]) };
      const progresso = document.createElement('p'), navegacao = document.createElement('div');
      const anterior = document.createElement('button'), continuar = document.createElement('button');
      let atual = 0;
      const mostrar = (indice, moverFoco = true) => {
        atual = Math.max(0, Math.min(campos.length - 1, indice));
        campos.forEach((el, i) => { el.hidden = i !== atual; });
        progresso.textContent = `Pergunta ${atual + 1} de ${campos.length}`;
        anterior.hidden = atual === 0; continuar.hidden = atual === campos.length - 1; submit.hidden = atual !== campos.length - 1;
        if (moverFoco) {
          legendas[atual].focus({ preventScroll: true });
          const topo = quiz.getBoundingClientRect().top + window.scrollY - (cab?.getBoundingClientRect().height || 0) - 20;
          window.scrollTo({ top: Math.max(0, topo), behavior: reduzir ? 'auto' : 'smooth' });
        }
      };
      const validar = (controles) => {
        const invalido = Array.from(controles).find((el) => typeof el.checkValidity === 'function' && !el.checkValidity());
        if (!invalido) return true;
        const indice = campos.findIndex((el) => el.contains(invalido));
        if (indice >= 0) mostrar(indice);
        invalido.reportValidity(); return false;
      };
      const tecla = (e) => { if (e.key === 'Enter' && e.target.matches('input[type=radio]')) e.preventDefault(); };
      try {
        progresso.className = 'quiz-progresso'; progresso.setAttribute('aria-live', 'polite'); progresso.setAttribute('aria-atomic', 'true');
        navegacao.className = 'quiz-navegacao';
        anterior.type = continuar.type = 'button'; anterior.className = 'botao botao--linha'; continuar.className = 'botao';
        anterior.textContent = 'Anterior'; continuar.textContent = 'Continuar';
        anterior.addEventListener('click', () => mostrar(atual - 1));
        continuar.addEventListener('click', () => { if (validar($$('input, select, textarea', campos[atual]))) mostrar(atual + 1); });
        legendas.forEach((el) => { el.tabIndex = -1; });
        campos.forEach((el) => {
          const grupos = new Set();
          $$('input[type=radio]:not([disabled])', el).forEach((radio) => { if (radio.name && !grupos.has(radio.name)) { radio.required = true; grupos.add(radio.name); } });
        });
        quiz.noValidate = true;
        // Reusa o botão original; o seu suporte vazio fica oculto somente no aprimoramento.
        if (paiSubmit !== quiz && paiSubmit.children.length === 1) paiSubmit.hidden = true;
        navegacao.append(anterior, continuar, submit); quiz.prepend(progresso); quiz.append(navegacao);
        quiz.addEventListener('keydown', tecla); mostrar(0, false);
        return { ultimo: () => atual === campos.length - 1, validarTodas: () => validar(quiz.elements) };
      } catch (erro) {
        progresso.remove(); navegacao.remove(); paiSubmit.insertBefore(submit, proximoSubmit);
        quiz.noValidate = estado.noValidate; submit.hidden = estado.submitHidden; paiSubmit.hidden = estado.paiHidden;
        campos.forEach((el, i) => { el.hidden = estado.campos[i]; });
        legendas.forEach((el, i) => { if (estado.legendas[i] === null) el.removeAttribute('tabindex'); else el.setAttribute('tabindex', estado.legendas[i]); });
        estado.radios.forEach(([el, required]) => { el.required = required; }); quiz.removeEventListener('keydown', tecla);
        return null;
      }
    })();
    let versao = 0;
    const sugerir = async (retomarFoco = false) => {
      if (!(passos ? passos.validarTodas() : quiz.reportValidity())) return;
      const chamada = ++versao;
      sec.hidden = false; sec.setAttribute('aria-busy', 'true'); quiz.setAttribute('aria-busy', 'true');
      titulo.textContent = 'Encontrando aromas para você…'; gradeQ.innerHTML = ''; avisoQuiz.hidden = true; avisoQuiz.textContent = ''; if (submit) submit.disabled = true;
      try {
        const lista = (await indice()).filter((p) => p.d); if (chamada !== versao) return;
        const f = new FormData(quiz); const onde = f.get('onde'), fam = f.get('familia'), fmt = f.get('formato');
        const doLugar = TIPOS[onde] || [];
        const incompativel = fmt && fmt !== 'qualquer' && onde === 'carro' && !doLugar.includes(fmt);
        const tiposOk = incompativel ? doLugar : fmt && fmt !== 'qualquer' ? [fmt] : doLugar;
        const rotFam = quiz.querySelector('input[name=familia]:checked')?.parentElement?.querySelector('span')?.childNodes[0]?.textContent?.trim().toLowerCase() || 'essa família';
        const combinam = lista.filter((p) => tiposOk.includes(p.tp) && p.f === fam);
        const outras = combinam.length < 4 ? lista.filter((p) => tiposOk.includes(p.tp) && !combinam.includes(p)).slice(0, 8 - combinam.length) : [];
        avisoQuiz.textContent = incompativel ? 'No carro e no armário, os formatos são o aromatizador de carro, o sachê e o spray de 60 ml.' : '';
        avisoQuiz.hidden = !incompativel;
        titulo.textContent = combinam.length ? 'Sugestões para você' : outras.length ? `Não temos aromas ${rotFam} nesse formato. Veja outras opções no mesmo formato:` : 'Nenhuma sugestão com essa combinação. Tente outro formato.';
        gradeQ.innerHTML = combinam.slice(0, 12).map(cartaoHtml).join('') + (combinam.length && outras.length ? '<p class="quiz__outras">Outras opções no mesmo formato, de outras famílias:</p>' : '') + outras.map(cartaoHtml).join('');
      } catch (erro) {
        if (chamada !== versao) return;
        titulo.textContent = 'Seus aromas estão a um passo';
        gradeQ.innerHTML = '<p>Não conseguimos carregar as sugestões agora. <button type="button" class="botao botao--linha" data-quiz-tentar>Tentar novamente</button></p>';
      } finally {
        if (chamada === versao) {
          sec.removeAttribute('aria-busy'); quiz.removeAttribute('aria-busy'); if (submit) submit.disabled = false;
          if (retomarFoco) { titulo.tabIndex = -1; titulo.focus({ preventScroll: true }); }
          sec.scrollIntoView({ behavior: reduzir ? 'auto' : 'smooth', block: 'start' });
        }
      }
    };
    quiz.addEventListener('submit', (e) => { e.preventDefault(); if (!passos || passos.ultimo()) sugerir(); });
    gradeQ.addEventListener('click', (e) => { if (e.target.closest('[data-quiz-tentar]')) sugerir(true); });
  }

  // ---------- formulário B2B → WhatsApp ----------
  $$('[data-form-b2b]').forEach((form) => form.addEventListener('submit', (e) => {
    e.preventDefault();
    const f = new FormData(form);
    const codigo = codigoContato();
    const campo = (nome, limite = 120) => textoCurto(f.get(nome), limite);
    const data = campo('data', 10);
    const dataValida = /^\d{4}-\d{2}-\d{2}$/.test(data) && Number.isFinite(Date.parse(data + 'T12:00:00'));
    const linhas = [`Olá, LAOS! Quero uma proposta para empresa/evento.`, `Solicitação ${codigo}`, '', `Nome: ${campo('nome')}`, campo('empresa') ? `Empresa/evento: ${campo('empresa')}` : '', `Tipo: ${campo('tipo')}`, campo('cidade') ? `Cidade: ${campo('cidade')}` : '', campo('quantidade', 60) ? `Quantidade aproximada: ${campo('quantidade', 60)}` : '', dataValida ? `Para quando: ${new Date(data + 'T12:00:00').toLocaleDateString('pt-BR')}` : '', '', campo('text', 900), '', `Origem: ${textoOrigem()}`, '(Produtos, quantidade, disponibilidade, condições e prazo a confirmar com a equipe.)'].filter((x, i, a) => x !== '' || a[i - 1] !== '');
    abrirContato(`https://wa.me/${WHATS}?text=${encodeURIComponent(linhas.join('\n'))}`, codigo);
  }));

  // ---------- atlas: troca a imagem ao passar pelos lugares ----------
  const fig = $('[data-atlas-figura] img');
  if (fig) {
    let versao = 0, pendente = '';
    $$('[data-atlas-img]').forEach((a) => {
      const trocar = () => {
        const url = a.dataset.atlasImg;
        if (fig.dataset.atual === url) { versao++; pendente = ''; fig.style.opacity = '1'; return; }
        if (pendente === url) return;
        const chamada = ++versao; pendente = url; fig.style.opacity = '0.7';
        const n = new Image();
        n.onload = () => {
          if (chamada !== versao) return;
          fig.removeAttribute('srcset'); fig.src = url; fig.dataset.atual = url; fig.style.opacity = '1'; pendente = '';
        };
        n.onerror = () => { if (chamada === versao) { fig.style.opacity = '1'; pendente = ''; } };
        n.src = url;
      };
      a.addEventListener('mouseenter', trocar); a.addEventListener('focus', trocar);
    });
  }

  // O rodapé já oferece os caminhos de contato. Recolher o atalho flutuante
  // nesse trecho mantém a assinatura livre sem fechar um atendimento aberto.
  const rodape = $('.rodape');
  if (rodape && 'IntersectionObserver' in window) {
    new IntersectionObserver(([entrada]) => {
      document.documentElement.classList.toggle('rodape-visivel', entrada.isIntersecting);
    }, { threshold: 0 }).observe(rodape);
  }

  // ---------- movimento ----------
  const selo = $('.heroi .selo-traco');
  if (selo && !reduzir) requestAnimationFrame(() => selo.classList.add('desenhar'));
  const rev = $$('.revela');
  if (rev.length && 'IntersectionObserver' in window && !reduzir) {
    const io = new IntersectionObserver((es) => es.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('visto'); io.unobserve(en.target); } }), { rootMargin: '0px 0px -8% 0px' });
    rev.forEach((el) => io.observe(el));
  } else rev.forEach((el) => el.classList.add('visto'));
})();
