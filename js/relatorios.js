import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

import { supabase } from './supabase-client.js';

let catalogo = [];

// Estado dos filtros da seção "Catalogados x Não Catalogados"
const confState = {
  situacao: '',
  prateleira: '',
  formato: '',
  gravadora: '',
  status: '',
  busca: '',
  pagina: 1
};
const CONF_ROWS_PER_PAGE = 25;

function $(id) {
  return document.getElementById(id);
}

function txt(id, value) {
  const el = $(id);
  if (el) el.textContent = value;
}

function html(id, value) {
  const el = $(id);
  if (el) el.innerHTML = value;
}

function pct(valor, total) {
  if (!total || total <= 0) return '0%';
  return `${((valor / total) * 100).toFixed(1).replace('.', ',')}%`;
}

function num(valor) {
  return Number(valor || 0).toLocaleString('pt-BR');
}

function normalizar(valor) {
  return String(valor ?? '').trim();
}

function normalizarUpper(valor) {
  return normalizar(valor).toUpperCase();
}

function vazio(valor) {
  const v = normalizar(valor).toLowerCase();

  return (
    !v ||
    v === '-' ||
    v === 'null' ||
    v === 'undefined' ||
    v === 'sem identificação' ||
    v === 'sem identificacao'
  );
}

function ehSemIdentificacao(item) {
  const titulo = normalizar(item.titulo).toLowerCase();
  const artista = normalizar(item.artista).toLowerCase();

  return (
    titulo.includes('sem identificação') ||
    titulo.includes('sem identificacao') ||
    artista.includes('sem identificação') ||
    artista.includes('sem identificacao')
  );
}

function camposAusentes(item) {
  const campos = [];

  if (vazio(item.titulo)) campos.push('Título');
  if (vazio(item.artista)) campos.push('Artista');
  if (vazio(item.numero)) campos.push('Nº Tape');
  if (vazio(item.formato)) campos.push('Formato');
  if (vazio(item.prateleira)) campos.push('Prateleira');
  if (vazio(item.stream_status)) campos.push('Status');

  return campos;
}

function ehPendente(item) {
  return camposAusentes(item).length > 0 || ehSemIdentificacao(item);
}

function contarPorCampo(dados, campo) {
  const mapa = {};

  dados.forEach(item => {
    let valor = normalizar(item[campo]);
    if (!valor) valor = 'Não informado';

    valor = valor.toUpperCase();
    mapa[valor] = (mapa[valor] || 0) + 1;
  });

  return Object.entries(mapa).sort((a, b) => b[1] - a[1]);
}

function gerarMapaPrateleirasPadrao() {
  const regras = {
    1: 'J',
    2: 'L',
    3: 'L',
    4: 'L',
    5: 'L',
    6: 'K',
    7: 'F',
    8: 'F'
  };

  const lista = [];

  for (let numPrateleira = 1; numPrateleira <= 8; numPrateleira++) {
    const maxLetra = regras[numPrateleira];
    const maxCodigo = maxLetra.charCodeAt(0);

    for (let c = 'A'.charCodeAt(0); c <= maxCodigo; c++) {
      lista.push(`${numPrateleira}${String.fromCharCode(c)}`);
    }
  }

  return lista;
}

async function carregarTodosOsDados() {
  let todos = [];
  const step = 1000;
  let inicio = 0;
  let continuar = true;

  while (continuar) {
    const { data, error } = await supabase
      .from('catalogo')
      .select('*')
      .range(inicio, inicio + step - 1);

    if (error) {
      console.error('Erro ao buscar catálogo:', error);
      alert('Erro ao carregar dados do Supabase. Veja o console.');
      return [];
    }

    if (data && data.length > 0) {
      todos = todos.concat(data);
      inicio += step;

      if (data.length < step) continuar = false;
    } else {
      continuar = false;
    }
  }

  return todos;
}

function calcularStats(dados) {
  const total = dados.length;

  const on = dados.filter(i => normalizar(i.stream_status) === 'On').length;
  const off = dados.filter(i => normalizar(i.stream_status) === 'Off').length;
  const takenDown = dados.filter(i => i.taken_down === true).length;

  const podeLancar = dados.filter(i => i.pode_lancar === true).length;
  const podeLancarOff = dados.filter(i =>
    i.pode_lancar === true &&
    normalizar(i.stream_status) === 'Off'
  ).length;

  const semTitulo = dados.filter(i => vazio(i.titulo)).length;
  const semArtista = dados.filter(i => vazio(i.artista)).length;
  const semTape = dados.filter(i => vazio(i.numero)).length;
  const semPrateleira = dados.filter(i => vazio(i.prateleira)).length;
  const semFormato = dados.filter(i => vazio(i.formato)).length;
  const semStatus = dados.filter(i => vazio(i.stream_status)).length;

  const semIdentificacao = dados.filter(ehSemIdentificacao).length;
  const pendencias = dados.filter(ehPendente).length;

  return {
    total,
    on,
    off,
    takenDown,
    podeLancar,
    podeLancarOff,
    semTitulo,
    semArtista,
    semTape,
    semPrateleira,
    semFormato,
    semStatus,
    semIdentificacao,
    pendencias,
    porPrateleira: contarPorCampo(dados, 'prateleira'),
    porFormato: contarPorCampo(dados, 'formato'),
    porStream: contarPorCampo(dados, 'stream_status')
  };
}

function setBar(id, percentual) {
  const el = $(id);
  if (el) el.style.width = percentual;
}

function linhaVazia(colspan, texto = 'Nenhum registro encontrado.') {
  return `
    <tr>
      <td colspan="${colspan}" class="text-center text-gray-500 py-6">
        ${texto}
      </td>
    </tr>
  `;
}

function escapeHtml(valor) {
  return String(valor ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function atualizarDatas() {
  const agora = new Date();
  const data = agora.toLocaleDateString('pt-BR');
  const dataHora = agora.toLocaleString('pt-BR');

  txt('genDate', dataHora);
  txt('coverDate', data);
  txt('footerGeneratedAt', `Gerado em ${dataHora}`);
}

function atualizarResumo(stats) {
  txt('coverTotal', `${num(stats.total)} itens`);

  txt('kpiTotal', num(stats.total));
  txt('kpiOn', num(stats.on));
  txt('kpiOff', num(stats.off));
  txt('kpiTakenDown', num(stats.takenDown));
  txt('kpiPodeLancar', num(stats.podeLancarOff));
  txt('kpiSemArtista', num(stats.semArtista));
  txt('kpiSemTape', num(stats.semTape));
  txt('kpiSemPrateleira', num(stats.semPrateleira));
  txt('kpiSemFormato', num(stats.semFormato));
  txt('kpiPendencias', num(stats.pendencias));

  txt('pctOn', `${pct(stats.on, stats.total)} do catálogo`);
  txt('pctOff', `${pct(stats.off, stats.total)} do catálogo`);
  txt('pctTakenDown', `${pct(stats.takenDown, stats.total)} do catálogo`);

  txt('donutTotal', num(stats.total));
  txt('legendOn', num(stats.on));
  txt('legendOff', num(stats.off));
  txt('legendTakenDown', num(stats.takenDown));
  txt('legendPendencias', num(stats.pendencias));

  const pOn = stats.total ? (stats.on / stats.total) * 100 : 0;
  const pOff = stats.total ? (stats.off / stats.total) * 100 : 0;
  const pTd = stats.total ? (stats.takenDown / stats.total) * 100 : 0;
  const pPend = stats.total ? (stats.pendencias / stats.total) * 100 : 0;

  const a = pOn;
  const b = pOn + pOff;
  const c = pOn + pOff + pTd;
  const d = Math.min(100, pOn + pOff + pTd + pPend);

  const donut = $('statusDonut');
  if (donut) {
    donut.style.background = `
      conic-gradient(
        #2ecc71 0% ${a}%,
        #e74c3c ${a}% ${b}%,
        #e67e22 ${b}% ${c}%,
        #9b59b6 ${c}% ${d}%,
        #333333 ${d}% 100%
      )
    `;
  }

  const completude = stats.total
    ? Math.max(0, 100 - ((stats.pendencias / stats.total) * 100))
    : 0;

  const comArtista = stats.total
    ? ((stats.total - stats.semArtista) / stats.total) * 100
    : 0;

  const comTape = stats.total
    ? ((stats.total - stats.semTape) / stats.total) * 100
    : 0;

  txt('healthCompletudeLabel', `${completude.toFixed(1).replace('.', ',')}%`);
  txt('healthOnLabel', pct(stats.on, stats.total));
  txt('healthArtistaLabel', `${comArtista.toFixed(1).replace('.', ',')}%`);
  txt('healthTapeLabel', `${comTape.toFixed(1).replace('.', ',')}%`);

  setBar('healthCompletudeBar', `${completude}%`);
  setBar('healthOnBar', `${pOn}%`);
  setBar('healthArtistaBar', `${comArtista}%`);
  setBar('healthTapeBar', `${comTape}%`);
}

function atualizarStatus(stats) {
  txt('statusOnTotal', num(stats.on));
  txt('statusOffTotal', num(stats.off));
  txt('statusPodeLancarOffTotal', num(stats.podeLancarOff));

  txt('statusOnPct', `${pct(stats.on, stats.total)} do catálogo`);
  txt('statusOffPct', `${pct(stats.off, stats.total)} do catálogo`);
  txt('statusPodeLancarOffPct', `${pct(stats.podeLancarOff, stats.off)} dos Off Stream`);

  setBar('statusOnBar', pct(stats.on, stats.total).replace(',', '.'));
  setBar('statusOffBar', pct(stats.off, stats.total).replace(',', '.'));
  setBar('statusPodeLancarOffBar', pct(stats.podeLancarOff, stats.off).replace(',', '.'));

  const rows = [
    ['ON STREAM', stats.on, pct(stats.on, stats.total), 'Produtos disponíveis em stream'],
    ['OFF STREAM', stats.off, pct(stats.off, stats.total), 'Produtos fora das plataformas'],
    ['OFF + PODE LANÇAR', stats.podeLancarOff, pct(stats.podeLancarOff, stats.total), 'Oportunidade de lançamento'],
    ['TAKEN DOWN', stats.takenDown, pct(stats.takenDown, stats.total), 'Produtos removidos'],
    ['PENDÊNCIAS', stats.pendencias, pct(stats.pendencias, stats.total), 'Produtos com dados incompletos']
  ];

  html('statusTableBody', rows.map(row => `
    <tr>
      <td class="font-semibold">${row[0]}</td>
      <td>${num(row[1])}</td>
      <td>${row[2]}</td>
      <td>${row[3]}</td>
    </tr>
  `).join(''));
}

function atualizarPrateleiras(stats) {
  const mapaPadrao = gerarMapaPrateleirasPadrao();

  const contagem = {};
  catalogo.forEach(item => {
    const p = normalizarUpper(item.prateleira);
    if (p) contagem[p] = (contagem[p] || 0) + 1;
  });

  const todas = mapaPadrao.map(prateleira => ({
    prateleira,
    total: contagem[prateleira] || 0
  }));

  const ativas = todas.filter(i => i.total > 0).length;
  const vazias = todas.filter(i => i.total === 0).length;

  txt('shelfActiveCount', `${ativas} prateleiras ativas de ${todas.length}`);
  txt('shelfVazias', num(vazias));
  txt('shelfSemPrateleira', num(stats.semPrateleira));
  txt('shelfSemIdentificacao', num(stats.semIdentificacao));

  // Trecho modificado: prateleiras vazias não imprimem no modo resumido
  html('shelfCompactGrid', todas.map(item => `
    <div class="shelf-mini-card" data-empty="${item.total > 0 ? 'false' : 'true'}">
      <div class="flex items-center justify-between mb-1">
        <span class="text-xs text-gray-500 uppercase">Prat.</span>
        <span class="text-xs font-bold text-gold">${item.prateleira}</span>
      </div>
      <p class="text-2xl font-black ${item.total > 0 ? 'text-white' : 'text-gray-700'}">${num(item.total)}</p>
      <p class="text-[9px] text-gray-500">${item.total > 0 ? 'itens catalogados' : 'sem itens'}</p>
    </div>
  `).join(''));

  const top = Object.entries(contagem)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12);

  const maior = top.length ? top[0][1] : 0;

  html('shelfBars', top.map(([prateleira, total]) => {
    const largura = maior ? (total / maior) * 100 : 0;

    return `
      <div>
        <div class="flex justify-between text-xs mb-1">
          <span class="text-gray-400">Prateleira ${prateleira}</span>
          <span class="text-gold font-semibold">${num(total)}</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill bg-gradient-to-r from-gold-dim to-gold" style="width: ${largura}%"></div>
        </div>
      </div>
    `;
  }).join('') || '<p class="text-gray-500 text-sm">Nenhuma prateleira encontrada.</p>');
}

function atualizarFormatos(stats) {
  const formatos = stats.porFormato.filter(([nome]) => nome !== 'NÃO INFORMADO');

  html('formatCards', formatos.slice(0, 10).map(([formato, total]) => `
    <div class="bg-somax-card border border-somax-border rounded-xl p-4 text-center">
      <i data-lucide="disc-3" class="w-6 h-6 text-gold mx-auto mb-2"></i>
      <p class="text-2xl font-black text-gold">${num(total)}</p>
      <p class="text-[10px] text-gray-500 uppercase tracking-wider">${escapeHtml(formato)}</p>
      <p class="text-[9px] text-gray-600">${pct(total, stats.total)}</p>
    </div>
  `).join(''));

  html('formatTableBody', formatos.map(([formato, total]) => {
    const itensFormato = catalogo.filter(i => normalizarUpper(i.formato) === formato);
    const on = itensFormato.filter(i => normalizar(i.stream_status) === 'On').length;
    const off = itensFormato.filter(i => normalizar(i.stream_status) === 'Off').length;

    return `
      <tr>
        <td class="font-semibold">${escapeHtml(formato)}</td>
        <td>${num(total)}</td>
        <td>${pct(total, stats.total)}</td>
        <td>${num(on)}</td>
        <td>${num(off)}</td>
        <td>
          <div class="progress-bar">
            <div class="progress-fill bg-gradient-to-r from-gold-dim to-gold" style="width: ${total && stats.total ? (total / stats.total) * 100 : 0}%"></div>
          </div>
        </td>
      </tr>
    `;
  }).join('') || linhaVazia(6));
}

function rowItem(item, campos = []) {
  const valores = {
    id: item.id || '-',
    titulo: item.titulo || 'Sem título',
    artista: item.artista || 'Sem artista',
    numero: item.numero || '-',
    formato: item.formato || '-',
    prateleira: item.prateleira || '-',
    stream: item.stream_status || '-',
    pode_lancar: item.pode_lancar === true ? 'Sim' : item.pode_lancar === false ? 'Não' : '-',
    campos: camposAusentes(item).join(', ') || 'Sem identificação'
  };

  return valores;
}

function limitar(dados, limite = 120) {
  return dados.slice(0, limite);
}

function atualizarAlertas(stats) {
  const semArtista = catalogo.filter(i => vazio(i.artista));
  const semTape = catalogo.filter(i => vazio(i.numero));
  // Modificação: semIdent agora considera apenas itens com prateleira preenchida
  const semIdent = catalogo.filter(i =>
    ehSemIdentificacao(i) &&
    !vazio(i.prateleira)
  );

  txt('alertSemArtista', num(semArtista.length));
  txt('alertSemTape', num(semTape.length));
  txt('alertSemPrateleira', num(stats.semPrateleira));
  txt('alertSemIdentificacao', num(semIdent.length));

  txt('noArtistCount', `${num(semArtista.length)} registros`);
  txt('noTapeCount', `${num(semTape.length)} registros`);
  txt('noIdentCount', `${num(semIdent.length)} registros`);

  html('noArtistTable', limitar(semArtista).map(item => {
    const r = rowItem(item);
    return `
      <tr>
        <td>${escapeHtml(r.titulo)}</td>
        <td>${escapeHtml(r.numero)}</td>
        <td>${escapeHtml(r.formato)}</td>
        <td>${escapeHtml(r.prateleira)}</td>
        <td>${escapeHtml(r.stream)}</td>
      </tr>
    `;
  }).join('') || linhaVazia(5));

  html('noTapeTable', limitar(semTape).map(item => {
    const r = rowItem(item);
    return `
      <tr>
        <td>${escapeHtml(r.titulo)}</td>
        <td>${escapeHtml(r.artista)}</td>
        <td>${escapeHtml(r.formato)}</td>
        <td>${escapeHtml(r.prateleira)}</td>
        <td>${escapeHtml(r.stream)}</td>
      </tr>
    `;
  }).join('') || linhaVazia(5));

  html('noIdentTable', limitar(semIdent).map(item => {
    const r = rowItem(item);
    return `
      <tr>
        <td>${escapeHtml(r.id)}</td>
        <td>${escapeHtml(r.titulo)}</td>
        <td>${escapeHtml(r.artista)}</td>
        <td>${escapeHtml(r.numero)}</td>
        <td>${escapeHtml(r.formato)}</td>
        <td>${escapeHtml(r.prateleira)}</td>
      </tr>
    `;
  }).join('') || linhaVazia(6));
}

function atualizarNaoCatalogados(stats) {
  const pendentes = catalogo.filter(ehPendente);

  txt('logicSemPrateleira', num(stats.semPrateleira));
  txt('logicSemArtista', num(stats.semArtista));
  txt('logicSemNumero', num(stats.semTape));
  txt('logicSemFormato', num(stats.semFormato));
  txt('logicSemStatus', num(stats.semStatus));

  txt('uncatalogedTotal', num(pendentes.length));
  txt('uncatalogedCount', `${num(pendentes.length)} registros`);

  // Preenche os campos do resumo quantitativo para impressão resumida
  txt('printResumoSemArtista', num(stats.semArtista));
  txt('printResumoSemTape', num(stats.semTape));
  txt('printResumoSemPrateleira', num(stats.semPrateleira));
  txt('printResumoSemFormato', num(stats.semFormato));
  txt('printResumoSemStatus', num(stats.semStatus));
  txt('printResumoPendentes', num(pendentes.length));

  html('uncatalogedTable', limitar(pendentes, 200).map(item => {
    const r = rowItem(item);
    return `
      <tr>
        <td>${escapeHtml(r.id)}</td>
        <td>${escapeHtml(r.titulo)}</td>
        <td>${escapeHtml(r.artista)}</td>
        <td>${escapeHtml(r.numero)}</td>
        <td>${escapeHtml(r.formato)}</td>
        <td>${escapeHtml(r.prateleira)}</td>
        <td>${escapeHtml(r.stream)}</td>
        <td>${escapeHtml(r.campos)}</td>
      </tr>
    `;
  }).join('') || linhaVazia(8));
}

function atualizarTakenDown(stats) {
  const td = catalogo.filter(i => i.taken_down === true);
  const tdPode = td.filter(i => i.pode_lancar === true);

  txt('tdTotal', num(td.length));
  txt('tdPct', pct(td.length, stats.total));
  txt('tdPodeLancar', num(tdPode.length));
  txt('tdCount', `${num(td.length)} registros`);

  html('takenDownTable', limitar(td, 200).map(item => {
    const r = rowItem(item);
    return `
      <tr>
        <td>${escapeHtml(r.titulo)}</td>
        <td>${escapeHtml(r.artista)}</td>
        <td>${escapeHtml(r.numero)}</td>
        <td>${escapeHtml(r.formato)}</td>
        <td>${escapeHtml(r.prateleira)}</td>
        <td>${escapeHtml(r.stream)}</td>
        <td>${escapeHtml(r.pode_lancar)}</td>
      </tr>
    `;
  }).join('') || linhaVazia(7));

  const porFormato = contarPorCampo(td, 'formato');

  html('takenDownFormatCards', porFormato.slice(0, 8).map(([formato, total]) => `
    <div class="bg-somax-dark rounded-lg p-3 border border-somax-border text-center">
      <p class="text-xl font-bold text-orange-400">${num(total)}</p>
      <p class="text-[10px] text-gray-500 uppercase">${escapeHtml(formato)}</p>
    </div>
  `).join('') || '<p class="text-gray-500 text-sm">Nenhum taken down encontrado.</p>');
}

function atualizarPodeLancar(stats) {
  const lista = catalogo.filter(i =>
    i.pode_lancar === true &&
    normalizar(i.stream_status) === 'Off'
  );

  txt('launchTotal', num(lista.length));
  txt('launchPctOff', pct(lista.length, stats.off));
  txt('launchPctTotal', pct(lista.length, stats.total));
  txt('launchCount', `${num(lista.length)} registros`);

  const porFormato = contarPorCampo(lista, 'formato');

  html('launchFormatCards', porFormato.slice(0, 10).map(([formato, total]) => `
    <div class="bg-somax-card border border-cyan-500/20 rounded-xl p-4 text-center">
      <p class="text-2xl font-black text-cyan-400">${num(total)}</p>
      <p class="text-[10px] text-gray-500 uppercase tracking-wider">${escapeHtml(formato)}</p>
      <p class="text-[9px] text-cyan-400/70">${pct(total, lista.length)}</p>
    </div>
  `).join(''));

  html('launchTable', limitar(lista, 200).map(item => {
    const r = rowItem(item);
    return `
      <tr>
        <td>${escapeHtml(r.titulo)}</td>
        <td>${escapeHtml(r.artista)}</td>
        <td>${escapeHtml(r.numero)}</td>
        <td>${escapeHtml(r.formato)}</td>
        <td>${escapeHtml(r.prateleira)}</td>
        <td>${escapeHtml(r.stream)}</td>
      </tr>
    `;
  }).join('') || linhaVazia(6));
}

function atualizarNavegacao() {
  const links = document.querySelectorAll('.sidebar-link[data-section]');
  const sections = [...links].map(link => document.getElementById(link.dataset.section)).filter(Boolean);

  function marcarAtivo() {
    let atual = sections[0]?.id;

    sections.forEach(section => {
      const rect = section.getBoundingClientRect();
      if (rect.top <= 140) atual = section.id;
    });

    links.forEach(link => {
      link.classList.toggle('active', link.dataset.section === atual);
    });
  }

  window.addEventListener('scroll', marcarAtivo, { passive: true });
  marcarAtivo();
}

function configurarMenuMobile() {
  const btn = $('menuToggle');
  const sidebar = $('sidebar');

  if (!btn || !sidebar) return;

  btn.addEventListener('click', () => {
    sidebar.classList.toggle('open');
  });

  document.querySelectorAll('.sidebar-link').forEach(link => {
    link.addEventListener('click', () => {
      sidebar.classList.remove('open');
    });
  });
}

// ==================== FUNÇÃO DE IMPRESSÃO CORRIGIDA ====================
function aplicarModoImpressao() {
  const modoSelect = $('modoImpressao');
  const modo = modoSelect ? modoSelect.value : 'resumido';

  document.body.classList.remove('print-resumido', 'print-completo');
  document.documentElement.classList.remove('print-resumido', 'print-completo');

  const classe = modo === 'completo' ? 'print-completo' : 'print-resumido';

  document.body.classList.add(classe);
  document.documentElement.classList.add(classe);

  document.body.dataset.printMode = modo;
  document.documentElement.dataset.printMode = modo;

  const badge = $('reportTypeBadge');
  if (badge) {
    badge.textContent = modo === 'completo' ? 'Relatório Completo' : 'Resumo Executivo';
  }

  return modo;
}

function configurarBotoes() {
  const btnPrint = $('btnImprimirRelatorio');
  const btnRefresh = $('btnAtualizarRelatorio');
  const modoImpressao = $('modoImpressao');

  if (modoImpressao) {
    modoImpressao.addEventListener('change', aplicarModoImpressao);
  }

  window.addEventListener('beforeprint', aplicarModoImpressao);

  if (btnPrint) {
    btnPrint.addEventListener('click', () => {
      aplicarModoImpressao();

      setTimeout(() => {
        window.print();
      }, 300);
    });
  }

  window.addEventListener('afterprint', () => {
    document.body.classList.remove('print-resumido', 'print-completo');
    document.documentElement.classList.remove('print-resumido', 'print-completo');
    delete document.body.dataset.printMode;
    delete document.documentElement.dataset.printMode;
  });

  if (btnRefresh) {
    btnRefresh.addEventListener('click', async () => {
      await inicializar();
    });
  }

  aplicarModoImpressao();
}
// =======================================================================

function renderTudo() {
  const stats = calcularStats(catalogo);

  atualizarDatas();
  atualizarResumo(stats);
  atualizarStatus(stats);
  atualizarPrateleiras(stats);
  atualizarFormatos(stats);
  atualizarAlertas(stats);
  atualizarNaoCatalogados(stats);
  atualizarTakenDown(stats);
  atualizarPodeLancar(stats);

  if (window.lucide) {
    window.lucide.createIcons();
  }
}

async function inicializar() {
  const loading = $('loadingOverlay');

  if (loading) loading.style.display = 'flex';

  catalogo = await carregarTodosOsDados();
  renderTudo();

  if (loading) loading.style.display = 'none';
}

configurarMenuMobile();
configurarBotoes();
atualizarNavegacao();
inicializar();