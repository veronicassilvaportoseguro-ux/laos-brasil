/* LAOS — interações do site (JS puro, sem dependências).
   Tudo aqui é aprimoramento: conteúdo e navegação funcionam sem JS. */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const corpo = document.body;
  const RAIZ = corpo.dataset.raiz || '';
  const WHATS = corpo.dataset.whatsapp || '5573998081019';
  const reduzir = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const norm = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const brl = (n) => (Number(n) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const guardar = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* modo privado */ } };
  const ler = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch (e) { return d; } };

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
  if (mega && megaAbre && window.matchMedia('(hover: hover) and (min-width: 961px)').matches) {
    let t;
    const abrir = () => { clearTimeout(t); mega.hidden = false; mega.classList.add('aberto'); megaAbre.setAttribute('aria-expanded', 'true'); };
    const fechar = () => { t = setTimeout(() => { mega.classList.remove('aberto'); mega.hidden = true; megaAbre.setAttribute('aria-expanded', 'false'); }, 160); };
    megaAbre.addEventListener('mouseenter', abrir);
    megaAbre.addEventListener('focus', abrir);
    mega.addEventListener('mouseenter', abrir);
    mega.addEventListener('mouseleave', fechar);
    megaAbre.addEventListener('mouseleave', fechar);
    mega.addEventListener('focusout', (e) => { if (!mega.contains(e.relatedTarget) && e.relatedTarget !== megaAbre) fechar(); });
    megaAbre.addEventListener('focusout', (e) => { if (!mega.contains(e.relatedTarget)) fechar(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !mega.hidden) { fechar(); megaAbre.focus(); } });
  }

  // ---------- diálogos (menu celular, sacola) ----------
  function dialogo(el, abridor) {
    let ultimo = null;
    const focaveis = () => $$('a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]', el).filter((x) => x.offsetParent !== null && x.getAttribute('tabindex') !== '-1');
    const tecla = (e) => {
      if (e.key === 'Escape') fechar();
      if (e.key === 'Tab') {
        const f = focaveis(); if (!f.length) return;
        if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
      }
    };
    function abrir() { ultimo = document.activeElement; el.hidden = false; document.documentElement.style.overflow = 'hidden'; document.documentElement.classList.add('dialogo-aberto'); document.addEventListener('keydown', tecla); if (abridor) abridor.setAttribute('aria-expanded', 'true'); const f = focaveis(); (f[0] || el).focus(); }
    function fechar() { el.hidden = true; document.documentElement.style.overflow = ''; document.documentElement.classList.remove('dialogo-aberto'); document.removeEventListener('keydown', tecla); if (abridor) abridor.setAttribute('aria-expanded', 'false'); if (ultimo) ultimo.focus(); }
    return { abrir, fechar };
  }
  const menu = $('[data-menu]');
  if (menu) {
    const d = dialogo(menu, $('[data-menu-abre]'));
    $('[data-menu-abre]')?.addEventListener('click', d.abrir);
    $$('[data-menu-fecha]').forEach((b) => b.addEventListener('click', d.fechar));
  }

  // ---------- índice de produtos (busca, quiz, sacola) ----------
  let indiceP = null;
  const indice = () => indiceP || (indiceP = fetch(RAIZ + 'assets/produtos.json').then((r) => r.json()));
  // Caminhos internos válidos (o índice é artefato de build, mas não se confia em dado para montar atributo)
  const URL_PRODUTO = /^produtos\/[a-z0-9-]{1,140}\/$/;
  const URL_IMG = /^assets\/img\/[a-z0-9/._-]{1,200}$/;
  const NEUTRA = (fn) => `<span class="foto-neutra"><svg class="foto-neutra__simbolo" viewBox="0 0 32 32" aria-hidden="true" focusable="false"><circle cx="16" cy="16" r="8.5" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M16 3.5v25" stroke="currentColor" stroke-width="1.4"/></svg><span class="foto-neutra__tipo">${esc(fn[0])}</span><span class="foto-neutra__nome">${esc(fn[1])}</span><span class="foto-neutra__aviso">Foto em atualização</span></span>`;
  const cartaoHtml = (p) => `<article class="cartao"><a class="cartao__foto" href="${RAIZ}${URL_PRODUTO.test(p.u) ? esc(p.u) : 'loja/'}" tabindex="-1" aria-hidden="true">${p.d ? '' : '<span class="cartao__selo cartao__selo--esgotado">Esgotado</span>'}${p.i && URL_IMG.test(p.i) ? `<img src="${RAIZ}${esc(p.i)}" alt="" loading="lazy" decoding="async"${p.r ? '' : ' class="cena"'}>${p.fl ? '<span class="cartao__nota-foto">Foto ilustrativa da linha</span>' : ''}` : Array.isArray(p.fn) ? NEUTRA(p.fn) : ''}</a><div class="cartao__txt"><span class="cartao__tipo">${esc(p.t)}</span><h3 class="cartao__nome"><a href="${RAIZ}${URL_PRODUTO.test(p.u) ? esc(p.u) : 'loja/'}">${esc(p.n)}</a></h3>${p.no ? `<p class="cartao__notas">${esc(p.no)}</p>` : ''}</div><div class="cartao__rodape"><span class="preco">${p.pf ? '<small>a partir de</small> ' : ''}${brl(p.p)}</span><button class="cartao__add" type="button" data-add="${esc(p.s)}" aria-label="Adicionar ${esc(p.n)} à sacola"${p.d ? '' : ' disabled'}><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="M8 2v12M2 8h12"/></svg></button></div></article>`;

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
  const dg = gaveta ? dialogo(gaveta, $('[data-sacola-abre]')) : null;
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
    else ul.innerHTML = sacola.map((i) => `<li class="item-sacola" data-k="${esc(i.k)}">${i.i ? `<img src="${RAIZ}${esc(i.i)}" alt="" width="72" height="88">` : '<span></span>'}<div><h3><a href="${RAIZ}${esc(i.u)}">${esc(i.n)}</a></h3><div class="var">${esc([i.t, i.v].filter(Boolean).join(' · '))}</div><div class="qtd"><button type="button" data-item-qtd="-1" aria-label="Diminuir">−</button><output>${Math.max(1, Math.min(99, parseInt(i.q, 10) || 1))}</output><button type="button" data-item-qtd="1" aria-label="Aumentar">+</button></div><br><button class="remover" type="button" data-item-remove>Remover</button></div><strong class="preco">${brl(i.p * i.q)}</strong></li>`).join('');
    const tot = $('[data-sacola-total]'); if (tot) tot.textContent = brl(sacola.reduce((s, i) => s + i.p * i.q, 0));
    const form = $('[data-sacola-form]'); if (form) form.querySelector('button[type=submit]').disabled = !sacola.length;
  }
  $$('[data-sacola-abre]').forEach((b) => b.addEventListener('click', () => { renderSacola(); dg?.abrir(); }));
  document.addEventListener('click', (e) => { if (e.target.closest('[data-sacola-abre-aviso]')) { renderSacola(); dg?.abrir(); } });
  $$('[data-sacola-fecha]').forEach((b) => b.addEventListener('click', () => dg?.fechar()));
  $('[data-sacola-itens]')?.addEventListener('click', (e) => {
    const li = e.target.closest('[data-k]'); if (!li) return;
    const it = sacola.find((i) => i.k === li.dataset.k); if (!it) return;
    const d = e.target.closest('[data-item-qtd]');
    if (d) { it.q = Math.max(1, Math.min(99, it.q + Number(d.dataset.itemQtd))); salvar(); }
    if (e.target.closest('[data-item-remove]')) { sacola = sacola.filter((i) => i !== it); salvar(); }
  });
  const formS = $('[data-sacola-form]');
  if (formS) {
    const cep = $('[data-cep]', formS);
    formS.addEventListener('change', () => { if (cep) cep.hidden = formS.entrega.value === 'loja'; });
    formS.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!sacola.length) return;
      const codigo = 'LAOS-' + Date.now().toString(36).slice(-4).toUpperCase() + Math.random().toString(36).slice(2, 4).toUpperCase();
      const o = origem();
      const linhas = sacola.map((i) => `• ${i.q}× ${i.n}${i.v ? ` (${i.v})` : ''} — ${brl(i.p * i.q)}`);
      const total = sacola.reduce((s, i) => s + i.p * i.q, 0);
      const entrega = formS.entrega.value === 'loja' ? 'Quero buscar numa das lojas em Arraial d\'Ajuda' : `Receber em casa · CEP/cidade: ${formS.cep.value || '(informar)'}`;
      const msg = [`Olá, LAOS! Quero fazer um pedido pelo site.`, `Pedido ${codigo}`, '', ...linhas, '', `Subtotal: ${brl(total)}`, `Nome: ${formS.nome.value}`, `Entrega: ${entrega}`, '', `Vim pelo: ${o ? ({ instagram: 'Instagram', facebook: 'Facebook', meta: 'Instagram/Facebook', google: 'Google' }[String(o.src).toLowerCase()] || o.src) + (o.camp ? ` (${o.camp})` : '') : 'site'}`, '(Frete e forma de pagamento a combinar.)'].join('\n');
      const url = `https://wa.me/${WHATS}?text=${encodeURIComponent(msg)}`;
      window.open(url, '_blank', 'noopener');
      aviso(`Abrimos a mensagem do pedido ${codigo} no seu WhatsApp. Envie para a nossa equipe confirmar. <a href="${esc(url)}" target="_blank" rel="noopener" style="color:inherit">Não abriu? Toque aqui</a>.`, 15000);
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
    const lista = await indice();
    const p = lista.find((x) => x.s === b.dataset.add); if (!p) return;
    adicionar({ s: p.s, n: p.n, t: p.t, p: p.p, v: '', vid: '', i: p.i, u: p.u }, 1);
  });
  atualizarContador();

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
      if (v && precoEl) precoEl.textContent = brl(unit);
      if (precoBarra) precoBarra.textContent = q > 1 ? `${q} × ${brl(unit)}` : brl(unit);
      if (linkWa && !$('[data-add-pdp]', pdp)?.disabled) {
        const item = `${q}× ${pdp.dataset.nome} (${[pdp.dataset.tipo, v?.dataset.varNome].filter(Boolean).join(' · ')})`;
        linkWa.href = `https://wa.me/${WHATS}?text=${encodeURIComponent(`Olá, LAOS! Quero pedir: ${item} — ${brl(unit * q)}. Vi no site.`)}`;
      }
    };
    $$('[data-qtd]', pdp).forEach((b) => b.addEventListener('click', () => { out.textContent = Math.max(1, Math.min(99, Number(out.textContent) + Number(b.dataset.qtd))); atualizaPreco(); }));
    $$('input[name=variante]', pdp).forEach((r) => r.addEventListener('change', atualizaPreco)); atualizaPreco();
    const barra = $('[data-barra-compra]'); const alvo = $('[data-comprar]', pdp);
    if (barra && alvo && 'IntersectionObserver' in window) {
      new IntersectionObserver(([en]) => { const mostrar = !en.isIntersecting && en.boundingClientRect.top < 0; barra.classList.toggle('visivel', mostrar); document.documentElement.classList.toggle('barra-visivel', mostrar); barra.setAttribute('aria-hidden', String(!mostrar)); $('button', barra).tabIndex = mostrar ? 0 : -1; }).observe(alvo);
    }
  }

  // ---------- filtros e ordenação nas listagens ----------
  $$('[data-filtros]').forEach((barra) => {
    const gradeEl = barra.parentElement.querySelector('[data-grade]'); if (!gradeEl) return;
    const cartoes = $$('.cartao', gradeEl);
    const vazio = barra.parentElement.querySelector('[data-sem-resultado]');
    const cont = $('[data-contagem]', barra);
    const campo = barra.parentElement.querySelector('[data-busca-inline] [data-busca-campo]');
    let filtro = { tipo: 'todos', valor: '' };
    const aplicar = () => {
      const q = norm(campo?.value || '').split(/\s+/).filter(Boolean);
      let n = 0;
      for (const c of cartoes) {
        const okF = filtro.tipo === 'todos' || c.dataset[filtro.tipo] === filtro.valor;
        const okQ = !q.length || q.every((t) => c.dataset.nome.includes(t));
        c.hidden = !(okF && okQ); if (!c.hidden) n++;
      }
      if (cont) cont.textContent = `${n} ${n === 1 ? 'produto' : 'produtos'}`;
      if (vazio) vazio.hidden = n > 0;
    };
    $$('[data-filtro]', barra).forEach((b) => b.addEventListener('click', () => {
      $$('[data-filtro]', barra).forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      filtro = { tipo: b.dataset.filtro, valor: b.dataset.valor || '' }; aplicar();
    }));
    campo?.addEventListener('input', aplicar);
    campo?.closest('form')?.addEventListener('submit', (e) => { e.preventDefault(); aplicar(); });
    $('[data-ordenar]', barra)?.addEventListener('change', (e) => {
      const m = e.target.value;
      const cmp = { ordem: (a, b) => a.dataset.ordem - b.dataset.ordem, menor: (a, b) => a.dataset.preco - b.dataset.preco, maior: (a, b) => b.dataset.preco - a.dataset.preco, nome: (a, b) => a.querySelector('.cartao__nome').textContent.localeCompare(b.querySelector('.cartao__nome').textContent, 'pt-BR') }[m];
      cartoes.sort(cmp).forEach((c) => gradeEl.appendChild(c));
    });
  });

  // ---------- busca ----------
  const formB = $('[data-busca]');
  if (formB) {
    const campo = $('[data-busca-campo]', formB), gradeB = $('[data-busca-grade]'), status = $('[data-busca-status]');
    const q0 = new URLSearchParams(location.search).get('q'); if (q0) campo.value = q0;
    let t;
    const buscar = async () => {
      const q = norm(campo.value).split(/\s+/).filter(Boolean);
      if (!q.length) { gradeB.innerHTML = ''; status.textContent = ''; return; }
      const lista = await indice();
      const bate = (p, w) => p.b.includes(w) || norm(p.n).includes(w) || (w.length > 4 && w.endsWith('s') && (p.b.includes(w.slice(0, -1)) || (w.endsWith('es') && p.b.includes(w.slice(0, -2)))));
      const res = lista.filter((p) => q.every((w) => bate(p, w))).sort((a, b) => (b.d - a.d) || (norm(a.n).startsWith(q[0]) ? -1 : 1));
      status.textContent = res.length ? `${res.length} ${res.length === 1 ? 'produto encontrado' : 'produtos encontrados'} para “${campo.value}”` : `Nada encontrado para “${campo.value}”. Tente o nome de uma nota, como lavanda ou caju.`;
      gradeB.innerHTML = res.slice(0, 60).map(cartaoHtml).join('');
    };
    campo.addEventListener('input', () => { clearTimeout(t); t = setTimeout(buscar, 160); });
    formB.addEventListener('submit', (e) => { e.preventDefault(); buscar(); });
    if (q0) buscar();
  }

  // ---------- quiz ----------
  const quiz = $('[data-quiz]');
  if (quiz) {
    const TIPOS = { sala: ['difusor-varetas', 'vela', 'aromatizador-spray', 'aromatizador-litro'], quarto: ['aromatizador-spray', 'aromatizador-60ml', 'vela', 'difusor-varetas', 'sache'], banheiro: ['difusor-varetas', 'aromatizador-spray'], carro: ['aromatizador-carro', 'sache', 'aromatizador-60ml'], presente: ['vela', 'difusor-varetas', 'aromatizador-spray', 'sabonete', 'sache'] };
    quiz.addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = new FormData(quiz); const onde = f.get('onde'), fam = f.get('familia'), fmt = f.get('formato');
      const lista = (await indice()).filter((p) => p.d);
      const doLugar = TIPOS[onde] || [];
      const incompativel = fmt && fmt !== 'qualquer' && onde === 'carro' && !doLugar.includes(fmt);
      const tiposOk = incompativel ? doLugar : fmt && fmt !== 'qualquer' ? [fmt] : doLugar;
      const rotFam = quiz.querySelector('input[name=familia]:checked')?.parentElement?.querySelector('span')?.childNodes[0]?.textContent?.trim().toLowerCase() || 'essa família';
      const combinam = lista.filter((p) => tiposOk.includes(p.tp) && p.f === fam);
      const outras = combinam.length < 4 ? lista.filter((p) => tiposOk.includes(p.tp) && !combinam.includes(p)).slice(0, 8 - combinam.length) : [];
      const sec = $('[data-quiz-resultado]'); sec.hidden = false;
      const avisoCarro = incompativel ? 'No carro e no armário, os formatos são o aromatizador de carro, o sachê e o spray de 60 ml. ' : '';
      $('[data-quiz-titulo]').textContent = combinam.length ? `${avisoCarro}Sugestões para você` : outras.length ? `${avisoCarro}Não temos aromas ${rotFam} nesse formato. Veja outras opções no mesmo formato:` : 'Nenhuma sugestão com essa combinação. Tente outro formato.';
      $('[data-quiz-grade]').innerHTML = combinam.slice(0, 12).map(cartaoHtml).join('') + (combinam.length && outras.length ? '<p class="quiz__outras">Outras opções no mesmo formato, de outras famílias:</p>' : '') + outras.map(cartaoHtml).join('');
      sec.scrollIntoView({ behavior: reduzir ? 'auto' : 'smooth', block: 'start' });
    });
  }

  // ---------- formulário B2B → WhatsApp ----------
  $$('[data-form-b2b]').forEach((form) => form.addEventListener('submit', (e) => {
    e.preventDefault();
    const f = new FormData(form);
    const linhas = [`Olá, LAOS! Quero uma proposta para empresa/evento.`, '', `Nome: ${f.get('nome') || ''}`, f.get('empresa') ? `Empresa/evento: ${f.get('empresa')}` : '', `Tipo: ${f.get('tipo') || ''}`, f.get('cidade') ? `Cidade: ${f.get('cidade')}` : '', f.get('quantidade') ? `Quantidade aproximada: ${f.get('quantidade')}` : '', f.get('data') ? `Para quando: ${new Date(f.get('data') + 'T12:00').toLocaleDateString('pt-BR')}` : '', '', String(f.get('text') || '')].filter((x, i, a) => x !== '' || a[i - 1] !== '');
    window.open(`https://wa.me/${WHATS}?text=${encodeURIComponent(linhas.join('\n'))}`, '_blank', 'noopener');
  }));

  // ---------- atlas: troca a imagem ao passar pelos lugares ----------
  const fig = $('[data-atlas-figura] img');
  if (fig) $$('[data-atlas-img]').forEach((a) => {
    const trocar = () => { if (fig.dataset.atual === a.dataset.atlasImg) return; fig.dataset.atual = a.dataset.atlasImg; fig.style.opacity = '0.2'; const n = new Image(); n.onload = () => { fig.removeAttribute('srcset'); fig.src = a.dataset.atlasImg; fig.style.opacity = '1'; }; n.src = a.dataset.atlasImg; };
    a.addEventListener('mouseenter', trocar); a.addEventListener('focus', trocar);
  });

  // ---------- movimento ----------
  const selo = $('.heroi .selo-traco');
  if (selo && !reduzir) requestAnimationFrame(() => selo.classList.add('desenhar'));
  const rev = $$('.revela');
  if (rev.length && 'IntersectionObserver' in window && !reduzir) {
    const io = new IntersectionObserver((es) => es.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('visto'); io.unobserve(en.target); } }), { rootMargin: '0px 0px -8% 0px' });
    rev.forEach((el) => io.observe(el));
  } else rev.forEach((el) => el.classList.add('visto'));
})();
