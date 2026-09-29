// Mascara dados pessoais no texto ANTES de ir para a IA (LGPD; revisão de compliance A5, 29/09/2026).
// E-mail → l***@gmail.com · telefone → (73) 9****-**19 · CPF → ***.***.***-** · cartão → **** **** **** 1111
// Nome e endereço não têm padrão confiável: a página pede para não colar.
(function (raiz) {
  'use strict';

  function soDigitos(s) {
    return String(s).replace(/\D/g, '');
  }

  function mascararTelefone(bruto) {
    var d = soDigitos(bruto);
    if (d.length > 11 && d.indexOf('55') === 0) d = d.slice(2);
    var ddd = '';
    var num = d;
    if (d.length >= 10) {
      ddd = d.slice(0, 2);
      num = d.slice(2);
    }
    var meio = num.length >= 9 ? num.charAt(0) + '****-**' : num.charAt(0) + '***-**';
    return (ddd ? '(' + ddd + ') ' : '') + meio + num.slice(-2);
  }

  // Ordem importa: e-mail e cartão antes dos telefones (um cartão tem grupos que parecem telefone).
  var REGRAS = [
    { tipo: 'email', re: /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g, trocar: function (m) { return m.charAt(0) + '***@' + m.split('@')[1]; } },
    { tipo: 'cartao', re: /(?<!\d)\+?(?:\d[ -]?){12,18}\d(?!\d)/g, trocar: function (m) {
      var d = soDigitos(m);
      if (/^55\d{2}9?\d{8}$/.test(d)) return mascararTelefone(m); // +55 com DDD (12 ou 13 digitos) e telefone, nao cartao
      return '**** **** **** ' + d.slice(-4);
    } },
    { tipo: 'cpf', re: /(?<!\d)\d{3}\.\d{3}\.\d{3}-?\d{2}(?!\d)/g, trocar: function () { return '***.***.***-**'; } },
    { tipo: 'cpf', re: /(CPF[\s:nº°.-]*)(\d{11}|\d{3}\s?\d{3}\s?\d{3}\s?\d{2})(?!\d)/gi, trocar: function (m, rotulo) { return rotulo + '***.***.***-**'; } },
    // Telefone com DDD (e +55 opcional): (73) 99808-1019, 73 99808 1019, +55 73 998081019
    { tipo: 'telefone', re: /(?<![\d*])(?:\+?55[\s.-]?)?(?:\(\s?\d{2}\s?\)|\d{2})[\s.-]?9?\d{4}[\s.-]?\d{4}(?!\d)/g, trocar: mascararTelefone },
    // 11 dígitos soltos: celular (terceiro dígito 9) ou CPF
    { tipo: 'numero11', re: /(?<![\d*])\d{11}(?!\d)/g, trocar: function (m) { return m.charAt(2) === '9' ? mascararTelefone(m) : '***.***.***-**'; } },
    // Telefone sem DDD, com hífen: 99808-1019, 3575-1234
    { tipo: 'telefone', re: /(?<![\d*,.-])9?\d{4}-\d{4}(?![\d-])/g, trocar: mascararTelefone },
  ];

  function mascarar(texto) {
    var t = String(texto == null ? '' : texto);
    var contagem = 0;
    REGRAS.forEach(function (r) {
      t = t.replace(r.re, function () {
        contagem++;
        return r.trocar.apply(null, arguments);
      });
    });
    return { texto: t, contagem: contagem };
  }

  raiz.LaosMascarar = { mascarar: mascarar };
})(typeof window !== 'undefined' ? window : globalThis);
