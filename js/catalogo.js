// js/catalogo.js
import { supabase } from './supabase-client.js';

let catalogoCompleto = [];
let dadosFiltrados = [];
let currentPage = 1;
const rowsPerPage = 20;

// DOM elements (serão preenchidos no init)
let elements = {};

// Helpers
const norm = (v) => (v ?? '').toString().trim();
const lower = (v) => norm(v).toLowerCase();
const isEmpty = (v) => {
  const s = lower(v);
  return !s || s === '-' || s === 'null' || s === 'undefined' || s === 'sem identificação' || s === 'sem identificacao';
};
const escapeHtml = (str) => {
  if (!str) return '';
  return String(str).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));
};

// Carregar dados do catálogo
async function carregarCatalogo() {
  let all = [];
  let start = 0;
  const limit = 1000;
  while (true) {
    const { data, error } = await supabase.from('catalogo').select('*').range(start, start + limit - 1);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < limit) break;
    start += limit;
  }
  return all;
}

// ---------- FILTROS ----------
function aplicarFiltroStatus(produtos) {
  const opcao = elements.statusFilter.value;
  switch (opcao) {
    case 'todos-com-prateleira':
      return produtos.filter(p => !isEmpty(p.prateleira));
    case 'off-com-prateleira':
      return produtos.filter(p => lower(p.stream_status) === 'off' && !isEmpty(p.prateleira));
    case 'off-sem-prateleira':
      return produtos.filter(p => lower(p.stream_status) === 'off' && isEmpty(p.prateleira));
    case 'on-com-prateleira':
      return produtos.filter(p => lower(p.stream_status) === 'on' && !isEmpty(p.prateleira));
    case 'on-sem-prateleira':
      return produtos.filter(p => lower(p.stream_status) === 'on' && isEmpty(p.prateleira));
    case 'com-identificacao':
      return produtos.filter(p => !isEmpty(p.titulo) && !isEmpty(p.artista) && !isEmpty(p.gravadora));
    case 'sem-identificacao':
      return produtos.filter(p => isEmpty(p.titulo) || isEmpty(p.artista) || isEmpty(p.gravadora));
    default: // 'all'
      return produtos;
  }
}

function atualizarSelectsBase(produtosBase) {
  const prats = new Set(produtosBase.map(p => norm(p.prateleira)).filter(p => !isEmpty(p)));
  const shelfOptions = ['<option value="">Todas as prateleiras</option>'];
  [...prats].sort().forEach(s => shelfOptions.push(`<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`));
  elements.shelfFilter.innerHTML = shelfOptions.join('');

  const formats = new Set(produtosBase.map(p => norm(p.formato)).filter(f => !isEmpty(f)));
  const formatoOptions = ['<option value="">Todos os formatos</option>'];
  [...formats].sort().forEach(f => formatoOptions.push(`<option value="${escapeHtml(f)}">${escapeHtml(f)}</option>`));
  elements.formatoFilter.innerHTML = formatoOptions.join('');

  const gravadoras = new Set(produtosBase.map(p => norm(p.gravadora)).filter(g => !isEmpty(g)));
  const gravadoraOptions = ['<option value="">Todas as gravadoras</option>'];
  [...gravadoras].sort().forEach(g => gravadoraOptions.push(`<option value="${escapeHtml(g)}">${escapeHtml(g)}</option>`));
  elements.gravadoraFilter.innerHTML = gravadoraOptions.join('');
}

function atualizarCardsComFiltros() {
  const total = dadosFiltrados.length;
  const prats = new Set(dadosFiltrados.map(p => norm(p.prateleira)).filter(p => !isEmpty(p)));
  const formats = new Set(dadosFiltrados.map(p => norm(p.formato)).filter(f => !isEmpty(f)));
  elements.totalItemsSpan.innerText = total.toLocaleString('pt-BR');
  elements.totalShelvesSpan.innerText = prats.size.toLocaleString('pt-BR');
  elements.totalFormatosSpan.innerText = formats.size.toLocaleString('pt-BR');
}

function aplicarFiltrosCompletos() {
  let resultado = [...catalogoCompleto];
  resultado = aplicarFiltroStatus(resultado);

  const termo = lower(elements.searchInput.value);
  if (termo) {
    resultado = resultado.filter(p =>
      lower(p.titulo).includes(termo) || lower(p.artista).includes(termo) ||
      lower(p.gravadora).includes(termo) || lower(p.numero).includes(termo)
    );
  }

  const prateleira = norm(elements.shelfFilter.value);
  if (prateleira) resultado = resultado.filter(p => norm(p.prateleira) === prateleira);

  const formato = norm(elements.formatoFilter.value);
  if (formato) resultado = resultado.filter(p => norm(p.formato) === formato);

  const gravadora = norm(elements.gravadoraFilter.value);
  if (gravadora) resultado = resultado.filter(p => norm(p.gravadora) === gravadora);

  const identificacao = elements.identificacaoFilter.value;
  if (identificacao === 'somente-identificados') {
    resultado = resultado.filter(p => !isEmpty(p.titulo) && !isEmpty(p.artista) && !isEmpty(p.gravadora));
  } else if (identificacao === 'somente-nao-identificados') {
    resultado = resultado.filter(p => isEmpty(p.titulo) || isEmpty(p.artista) || isEmpty(p.gravadora));
  }

  dadosFiltrados = resultado;
  currentPage = 1;
  atualizarCardsComFiltros();
  renderizarTabela();
  atualizarPaginacaoInfo();
  atualizarStatsPrateleira();
  atualizarResumoFiltrosImpressao();
}

function renderizarTabela() {
  const start = (currentPage - 1) * rowsPerPage;
  const end = start + rowsPerPage;
  const pagina = dadosFiltrados.slice(start, end);
  if (!pagina.length) {
    elements.tableBody.innerHTML = `<tr><td colspan="8" class="text-center py-8 text-gray-400 text-sm">Nenhum produto encontrado com os filtros atuais.</td></tr>`;
    lucide.createIcons();
    return;
  }
  let html = '';
  pagina.forEach((item, idx) => {
    const rowNum = start + idx + 1;
    const statusClass = lower(item.stream_status) === 'off' ? 'badge-off' : 'badge-on';
    const statusText = lower(item.stream_status) === 'off' ? 'OFF' : 'ON';
    html += `<tr>
      <td class="text-gray-400 text-xs">${rowNum}</td>
      <td class="font-medium text-sm">${escapeHtml(item.titulo || '—')}</td>
      <td class="text-sm">${escapeHtml(item.artista || '—')}</td>
      <td><span class="text-xs bg-[#c9a84c]/10 text-[#c9a84c] px-1.5 py-0.5 rounded">${escapeHtml(item.prateleira || '—')}</span></td>
      <td class="text-sm">${escapeHtml(item.formato || '—')}</td>
      <td class="text-xs text-gray-300">${escapeHtml(item.gravadora || '—')}</td>
      <td class="text-xs text-gray-400">${escapeHtml(item.numero || '—')}</td>
      <td><span class="${statusClass}">${statusText}</span></td>
    </tr>`;
  });
  elements.tableBody.innerHTML = html;
  lucide.createIcons();
}

function atualizarPaginacaoInfo() {
  const total = dadosFiltrados.length;
  const start = total === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1;
  const end = Math.min(currentPage * rowsPerPage, total);
  document.getElementById('infoStart').innerText = start;
  document.getElementById('infoEnd').innerText = end;
  document.getElementById('totalFiltered').innerText = total.toLocaleString('pt-BR');
  const totalPages = Math.ceil(total / rowsPerPage);
  const pagContainer = document.getElementById('paginationControls');
  if (!pagContainer) return;
  if (totalPages <= 1) { pagContainer.innerHTML = ''; return; }
  let pagHtml = `<button ${currentPage === 1 ? 'disabled' : ''} data-page="${currentPage - 1}">◀</button>`;
  let startPage = Math.max(1, currentPage - 2);
  let endPage = Math.min(totalPages, startPage + 4);
  if (endPage - startPage < 4) startPage = Math.max(1, endPage - 4);
  for (let i = startPage; i <= endPage; i++) {
    pagHtml += `<button data-page="${i}" class="${i === currentPage ? 'active' : ''}">${i}</button>`;
  }
  pagHtml += `<button ${currentPage === totalPages ? 'disabled' : ''} data-page="${currentPage + 1}">▶</button>`;
  pagContainer.innerHTML = pagHtml;
  pagContainer.querySelectorAll('button[data-page]').forEach(btn => {
    btn.addEventListener('click', () => {
      const page = parseInt(btn.dataset.page, 10);
      if (!isNaN(page) && page >= 1 && page <= totalPages) {
        currentPage = page;
        renderizarTabela();
        atualizarPaginacaoInfo();
      }
    });
  });
}

function atualizarStatsPrateleira() {
  const prateleiraSelecionada = norm(elements.shelfFilter.value);
  if (!prateleiraSelecionada) {
    elements.shelfStatsPanel.classList.add('hidden');
    return;
  }
  let produtosBase = aplicarFiltroStatus(catalogoCompleto);
  const produtos = produtosBase.filter(p => norm(p.prateleira) === prateleiraSelecionada);
  const total = produtos.length;
  const semNumero = produtos.filter(p => isEmpty(p.numero)).length;
  const semArtista = produtos.filter(p => isEmpty(p.artista)).length;
  const semTitulo = produtos.filter(p => isEmpty(p.titulo)).length;
  const completos = produtos.filter(p => !isEmpty(p.numero) && !isEmpty(p.artista) && !isEmpty(p.titulo)).length;
  document.getElementById('statTotal').innerText = total;
  document.getElementById('statSemNumero').innerText = semNumero;
  document.getElementById('statSemArtista').innerText = semArtista;
  document.getElementById('statSemTitulo').innerText = semTitulo;
  document.getElementById('statCompletos').innerText = completos;
  document.getElementById('shelfNameBadge').innerHTML = `<i data-lucide="tag" class="inline w-3 h-3 mr-1"></i> ${escapeHtml(prateleiraSelecionada)}`;
  elements.shelfStatsPanel.classList.remove('hidden');
  lucide.createIcons();
}

function getActiveFiltersSummary() {
  const filtros = [];
  const statusText = elements.statusFilter.options[elements.statusFilter.selectedIndex]?.text || '';
  if (statusText && elements.statusFilter.value !== 'all') filtros.push(`Status: ${statusText}`);
  const termo = elements.searchInput.value.trim();
  if (termo) filtros.push(`Busca: "${termo}"`);
  const prateleira = elements.shelfFilter.value;
  if (prateleira) filtros.push(`Prateleira: ${prateleira}`);
  const formato = elements.formatoFilter.value;
  if (formato) filtros.push(`Formato: ${formato}`);
  const gravadora = elements.gravadoraFilter.value;
  if (gravadora) filtros.push(`Gravadora: ${gravadora}`);
  const ident = elements.identificacaoFilter.value;
  if (ident === 'somente-identificados') filtros.push('Somente identificados');
  if (ident === 'somente-nao-identificados') filtros.push('Somente não identificados');
  return filtros.length ? filtros.join(' · ') : 'Nenhum filtro aplicado';
}

function atualizarResumoFiltrosImpressao() {
  const summary = getActiveFiltersSummary();
  const printSummarySpan = document.getElementById('printFilterSummary');
  if (printSummarySpan) printSummarySpan.innerText = `Filtros ativos: ${summary}`;
  const printDateSpan = document.getElementById('printDateSpan');
  if (printDateSpan) printDateSpan.innerText = new Date().toLocaleString('pt-BR');
}

function limparFiltros() {
  elements.statusFilter.value = 'all';
  elements.searchInput.value = '';
  elements.shelfFilter.value = '';
  elements.formatoFilter.value = '';
  elements.gravadoraFilter.value = '';
  elements.identificacaoFilter.value = '';
  aplicarFiltrosCompletos();
  const produtosBase = aplicarFiltroStatus(catalogoCompleto);
  atualizarSelectsBase(produtosBase);
}

// ---------- EXPORTAÇÕES (PDF, CSV, Impressão) ----------
async function exportarPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  doc.setFontSize(14);
  doc.setTextColor(40, 40, 40);
  doc.text('Somax Studios – Relatório de Catálogo', 14, 15);
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text(`Gerado: ${new Date().toLocaleString('pt-BR')}`, 14, 22);
  const filtrosResumo = getActiveFiltersSummary();
  doc.text(`Filtros: ${filtrosResumo}`, 14, 29);
  doc.text(`Total de itens: ${dadosFiltrados.length}`, 14, 36);
  const headers = [['#', 'Título', 'Artista', 'Prateleira', 'Formato', 'Gravadora', 'Número', 'Status']];
  const body = dadosFiltrados.map((item, idx) => [
    idx+1, item.titulo || '—', item.artista || '—', item.prateleira || '—',
    item.formato || '—', item.gravadora || '—', item.numero || '—',
    (lower(item.stream_status) === 'off' ? 'OFF' : 'ON')
  ]);
  doc.autoTable({
    head: headers,
    body: body,
    startY: 42,
    theme: 'striped',
    headStyles: { fillColor: [201, 168, 76], textColor: [0, 0, 0], fontStyle: 'bold' },
    styles: { fontSize: 7, cellPadding: 2, textColor: [30, 30, 30] },
    columnStyles: { 0: { cellWidth: 8 }, 1: { cellWidth: 35 }, 2: { cellWidth: 30 }, 3: { cellWidth: 25 }, 4: { cellWidth: 18 }, 5: { cellWidth: 25 }, 6: { cellWidth: 15 }, 7: { cellWidth: 12 } }
  });
  doc.save(`somax_catalogo_${new Date().toISOString().slice(0,19)}.pdf`);
}

function exportarCSV() {
  if (!dadosFiltrados.length) { alert('Nenhum produto para exportar.'); return; }
  const headers = ['Prateleira', 'Título', 'Artista', 'Formato', 'Gravadora', 'Número', 'Status'];
  const rows = dadosFiltrados.map(p => [
    norm(p.prateleira), p.titulo || '', p.artista || '', p.formato || '',
    p.gravadora || '', p.numero || '', (lower(p.stream_status) === 'off' ? 'OFF' : 'ON')
  ]);
  const csv = [headers, ...rows].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `somax_catalogo_${new Date().toISOString().slice(0,19)}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

function imprimirRelatorioCompleto() {
  const filtrosTexto = getActiveFiltersSummary();
  const dataHora = new Date().toLocaleString('pt-BR');
  const totalItens = dadosFiltrados.length;
  let linhasTabela = '';
  dadosFiltrados.forEach((item, idx) => {
    const statusText = lower(item.stream_status) === 'off' ? 'OFF' : 'ON';
    linhasTabela += `<tr>
      <td style="border:1px solid #ccc; padding:6px;">${idx+1}</td>
      <td style="border:1px solid #ccc; padding:6px;">${escapeHtml(item.titulo || '—')}</td>
      <td style="border:1px solid #ccc; padding:6px;">${escapeHtml(item.artista || '—')}</td>
      <td style="border:1px solid #ccc; padding:6px;">${escapeHtml(item.prateleira || '—')}</td>
      <td style="border:1px solid #ccc; padding:6px;">${escapeHtml(item.formato || '—')}</td>
      <td style="border:1px solid #ccc; padding:6px;">${escapeHtml(item.gravadora || '—')}</td>
      <td style="border:1px solid #ccc; padding:6px;">${escapeHtml(item.numero || '—')}</td>
      <td style="border:1px solid #ccc; padding:6px;">${statusText}</td>
    </tr>`;
  });
  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <!DOCTYPE html>
    <html><head><title>Somax Studios - Relatório Catálogo</title>
    <style>
      * { margin:0; padding:0; box-sizing:border-box; }
      body { font-family: 'Inter', sans-serif; margin: 1.5cm; background: white; color: black; }
      h1 { font-size: 20pt; margin-bottom: 8px; }
      .info { margin-bottom: 20px; font-size: 10pt; border-bottom: 1px solid #aaa; padding-bottom: 8px; }
      table { width: 100%; border-collapse: collapse; font-size: 9pt; margin-top: 12px; }
      th { background: #f0f0f0; border: 1px solid #aaa; padding: 8px; text-align: left; }
      td { border: 1px solid #ddd; padding: 6px; }
      .footer { margin-top: 20px; font-size: 8pt; text-align: center; color: #555; }
    </style>
    </head><body>
    <h1>Somax Studios · Catálogo Completo</h1>
    <div class="info"><strong>Filtros aplicados:</strong> ${filtrosTexto}<br>
    <strong>Total de itens:</strong> ${totalItens} &nbsp;|&nbsp; <strong>Gerado em:</strong> ${dataHora}</div>
    <table>
      <thead><tr><th>#</th><th>Título</th><th>Artista</th><th>Prateleira</th><th>Formato</th><th>Gravadora</th><th>Número</th><th>Status</th></tr></thead>
      <tbody>${linhasTabela || '<tr><td colspan="8">Nenhum registro encontrado</td></tr>'}</tbody>
    </table>
    <div class="footer">Somax Studios - Relatório oficial do catálogo</div>
    </body></html>
  `);
  printWindow.document.close();
  printWindow.print();
}

async function carregarDadosApp() {
  if (!elements.appLoadingOverlay) return;
  elements.appLoadingOverlay.classList.remove('hidden');
  try {
    catalogoCompleto = await carregarCatalogo();
    const produtosBase = aplicarFiltroStatus(catalogoCompleto);
    atualizarSelectsBase(produtosBase);
    aplicarFiltrosCompletos();
    elements.dataAtualizacaoSpan.innerText = `Atualizado: ${new Date().toLocaleString('pt-BR')}`;
  } catch (err) {
    console.error(err);
    elements.tableBody.innerHTML = `<td><td colspan="8" class="text-center py-6 text-red-400 text-sm">Erro ao carregar: ${err.message}</td></td>`;
  } finally {
    elements.appLoadingOverlay.classList.add('hidden');
  }
}

async function logout() {
  await supabase.auth.signOut();
  localStorage.removeItem('somax_last_login_date');
  window.location.href = 'login.html';
}

// ---------- INICIALIZAÇÃO ----------
export async function init() {
  // Verifica sessão antes de tudo
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    // Redireciona para login se não logado
    window.location.href = 'login.html';
    return;
  }

  // Captura elementos DOM
  elements = {
    appContainer: document.getElementById('appContainer'),
    appLoadingOverlay: document.getElementById('appLoadingOverlay'),
    tableBody: document.getElementById('tableBody'),
    searchInput: document.getElementById('searchInput'),
    statusFilter: document.getElementById('statusFilter'),
    shelfFilter: document.getElementById('shelfFilter'),
    formatoFilter: document.getElementById('formatoFilter'),
    gravadoraFilter: document.getElementById('gravadoraFilter'),
    identificacaoFilter: document.getElementById('identificacaoFilter'),
    clearFiltersBtn: document.getElementById('clearFilters'),
    btnRefresh: document.getElementById('btnRefresh'),
    btnExportCSV: document.getElementById('btnExportCSV'),
    btnExportPDF: document.getElementById('btnExportPDF'),
    btnPrintReport: document.getElementById('btnPrintReport'),
    btnLogout: document.getElementById('btnLogout'),
    totalItemsSpan: document.getElementById('totalItemsValue'),
    totalShelvesSpan: document.getElementById('totalShelvesValue'),
    totalFormatosSpan: document.getElementById('totalFormatosValue'),
    dataAtualizacaoSpan: document.getElementById('dataAtualizacao'),
    shelfStatsPanel: document.getElementById('shelfStatsPanel')
  };

  // Configura eventos
  elements.statusFilter.addEventListener('change', () => {
    const novosProdutosBase = aplicarFiltroStatus(catalogoCompleto);
    atualizarSelectsBase(novosProdutosBase);
    aplicarFiltrosCompletos();
  });
  elements.searchInput.addEventListener('input', aplicarFiltrosCompletos);
  elements.shelfFilter.addEventListener('change', aplicarFiltrosCompletos);
  elements.formatoFilter.addEventListener('change', aplicarFiltrosCompletos);
  elements.gravadoraFilter.addEventListener('change', aplicarFiltrosCompletos);
  elements.identificacaoFilter.addEventListener('change', aplicarFiltrosCompletos);
  elements.clearFiltersBtn.addEventListener('click', limparFiltros);
  elements.btnRefresh.addEventListener('click', () => carregarDadosApp());
  elements.btnExportCSV.addEventListener('click', exportarCSV);
  elements.btnExportPDF.addEventListener('click', exportarPDF);
  elements.btnPrintReport.addEventListener('click', imprimirRelatorioCompleto);
  elements.btnLogout.addEventListener('click', logout);

  // Carrega dados
  await carregarDadosApp();
  lucide.createIcons();
}