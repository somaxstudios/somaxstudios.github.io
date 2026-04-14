import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabaseUrl = 'https://ulbqzvztwrqmaxbzsmmv.supabase.co';
const supabaseKey = 'sb_publishable_shOmcA8udv3Tw0xKYzafAw_s1YXgbDk';
const supabase = createClient(supabaseUrl, supabaseKey);

let dadosGlobais = [];
let chartStream = null;
let chartFormato = null;
let filtersVisible = false;

const el = {
    btnTabDashboard: document.getElementById('btnTabDashboard'),
    btnTabDados: document.getElementById('btnTabDados'),
    viewDashboard: document.getElementById('viewDashboard'),
    viewDados: document.getElementById('viewDados'),
    loader: document.getElementById('loader'),

    avisoAcessoModal: document.getElementById('avisoAcessoModal'),
    btnConfirmarAviso: document.getElementById('btnConfirmarAviso'),

    toggleFiltersBtn: document.getElementById('toggleFiltersBtn'),
    filterContent: document.getElementById('filterContent'),

    filtroTexto: document.getElementById('filtroTexto'),
    filtroStream: document.getElementById('filtroStream'),
    filtroPrateleira: document.getElementById('filtroPrateleira'),
    filtroGravadora: document.getElementById('filtroGravadora'),

    btnExportarCSV: document.getElementById('btnExportarCSV'),
    btnExportarPDF: document.getElementById('btnExportarPDF'),

    kpiTotal: document.getElementById('kpiTotal'),
    kpiOnStream: document.getElementById('kpiOnStream'),
    kpiOffStream: document.getElementById('kpiOffStream'),
    kpiPrateleiras: document.getElementById('kpiPrateleiras'),

    chartStream: document.getElementById('chartStream'),
    chartFormato: document.getElementById('chartFormato'),
    formatoEmptyMsg: document.getElementById('formatoEmptyMsg'),
    prateleirasList: document.getElementById('prateleirasList'),

    tableBody: document.getElementById('tableBody'),
    noResults: document.getElementById('noResults'),
    mainTable: document.getElementById('mainTable')
};

function switchTab(tab) {
    if (!el.btnTabDashboard || !el.btnTabDados || !el.viewDashboard || !el.viewDados) return;

    if (tab === 'dashboard') {
        el.btnTabDashboard.className = 'tab-active px-5 py-2 text-sm font-medium rounded-md border transition-all';
        el.btnTabDados.className = 'tab-inactive px-5 py-2 text-sm font-medium rounded-md border transition-all';
        el.viewDashboard.classList.remove('hidden');
        el.viewDados.classList.add('hidden');
    } else {
        el.btnTabDados.className = 'tab-active px-5 py-2 text-sm font-medium rounded-md border transition-all';
        el.btnTabDashboard.className = 'tab-inactive px-5 py-2 text-sm font-medium rounded-md border transition-all';
        el.viewDados.classList.remove('hidden');
        el.viewDashboard.classList.add('hidden');
    }
}

function initTabs() {
    if (el.btnTabDashboard) {
        el.btnTabDashboard.addEventListener('click', () => switchTab('dashboard'));
    }

    if (el.btnTabDados) {
        el.btnTabDados.addEventListener('click', () => switchTab('dados'));
    }
}

function iniciarModalAviso() {
    if (!el.avisoAcessoModal || !el.btnConfirmarAviso) return;

    const avisoAceito = sessionStorage.getItem('somax_aviso_confidencialidade');

    if (avisoAceito === 'ok') {
        el.avisoAcessoModal.classList.add('hidden');
        return;
    }

    el.avisoAcessoModal.classList.remove('hidden');

    el.btnConfirmarAviso.addEventListener('click', () => {
        sessionStorage.setItem('somax_aviso_confidencialidade', 'ok');
        el.avisoAcessoModal.classList.add('hidden');
    });
}

function initFiltros() {
    if (el.toggleFiltersBtn && el.filterContent) {
        el.toggleFiltersBtn.addEventListener('click', () => {
            filtersVisible = !filtersVisible;

            if (filtersVisible) {
                el.filterContent.classList.remove('hidden');
                el.toggleFiltersBtn.innerHTML = `<span id="filterIcon">🔼</span> Esconder Filtros`;
            } else {
                el.filterContent.classList.add('hidden');
                el.toggleFiltersBtn.innerHTML = `<span id="filterIcon">🔽</span> Mostrar Filtros`;
            }
        });
    }

    [el.filtroTexto, el.filtroStream, el.filtroPrateleira, el.filtroGravadora].forEach(input => {
        if (!input) return;
        input.addEventListener('input', aplicarFiltros);
        input.addEventListener('change', aplicarFiltros);
    });
}

function initExportacoes() {
    if (el.btnExportarCSV) {
        el.btnExportarCSV.addEventListener('click', exportarCSV);
    }

    if (el.btnExportarPDF) {
        el.btnExportarPDF.addEventListener('click', exportarPDF);
    }
}

async function carregarDados() {
    try {
        let todosOsDados = [];
        let from = 0;
        const limite = 1000;
        let temMaisDados = true;

        while (temMaisDados) {
            const { data, error } = await supabase
                .from('catalogo')
                .select('id, titulo, artista, gravadora, prateleira, stream_status, formato, taken_down')
                .eq('taken_down', false)
                .range(from, from + limite - 1)
                .order('titulo', { ascending: true });

            if (error) throw error;

            todosOsDados = todosOsDados.concat(data || []);

            if (!data || data.length < limite) {
                temMaisDados = false;
            } else {
                from += limite;
            }
        }

        dadosGlobais = todosOsDados;

        if (el.loader) {
            el.loader.classList.add('hidden');
        }

        switchTab('dashboard');
        preencherFiltrosDinamicos();
        renderizarDashboard();
        aplicarFiltros();

    } catch (err) {
        console.error('Erro Supabase:', err);

        if (el.loader) {
            el.loader.innerHTML = `<p class="text-rose-500 font-medium">Erro de conexão: ${err.message}</p>`;
        }
    }
}

function preencherFiltrosDinamicos() {
    if (el.filtroPrateleira) {
        const prateleiras = [...new Set(dadosGlobais.map(i => i.prateleira).filter(Boolean))].sort();
        el.filtroPrateleira.innerHTML = '<option value="">Prateleira (Todas)</option>';
        prateleiras.forEach(p => el.filtroPrateleira.add(new Option(p, p)));
    }

    if (el.filtroGravadora) {
        const gravadoras = [...new Set(dadosGlobais.map(i => i.gravadora).filter(Boolean))].sort();
        // ALTERAÇÃO 1: Label do filtro dinâmico
        el.filtroGravadora.innerHTML = '<option value="">Gravadora (Label) (Todas)</option>';
        gravadoras.forEach(g => el.filtroGravadora.add(new Option(g, g)));
    }
}

function renderizarDashboard() {
    let onCount = 0;
    let offCount = 0;

    dadosGlobais.forEach(item => {
        const status = String(item.stream_status || '').trim().toUpperCase();
        if (status === 'ON') onCount++;
        else offCount++;
    });

    if (el.kpiTotal) el.kpiTotal.innerText = dadosGlobais.length;
    if (el.kpiOnStream) el.kpiOnStream.innerText = onCount;
    if (el.kpiOffStream) el.kpiOffStream.innerText = offCount;

    const prateleirasUnicas = new Set(dadosGlobais.map(i => i.prateleira).filter(Boolean));
    if (el.kpiPrateleiras) el.kpiPrateleiras.innerText = prateleirasUnicas.size;

    if (chartStream) chartStream.destroy();
    if (el.chartStream) {
        chartStream = new Chart(el.chartStream, {
            type: 'doughnut',
            data: {
                labels: ['ON Stream', 'OFF Stream'],
                datasets: [{
                    data: [onCount, offCount],
                    backgroundColor: ['#34d399', '#fb7185'],
                    borderWidth: 0,
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { color: '#a1a1aa' }
                    }
                },
                cutout: '70%'
            }
        });
    }

    const formatoCount = {};
    let temFormato = false;

    dadosGlobais.forEach(item => {
        if (item.formato && typeof item.formato === 'string' && item.formato.trim() !== '') {
            temFormato = true;
            const nomeFormato = item.formato.trim();
            formatoCount[nomeFormato] = (formatoCount[nomeFormato] || 0) + 1;
        }
    });

    if (chartFormato) chartFormato.destroy();

    if (!temFormato || Object.keys(formatoCount).length === 0) {
        if (el.formatoEmptyMsg) el.formatoEmptyMsg.classList.remove('hidden');

        if (el.chartFormato) {
            chartFormato = new Chart(el.chartFormato, {
                type: 'doughnut',
                data: {
                    labels: ['Sem dados'],
                    datasets: [{
                        data: [1],
                        backgroundColor: ['#3f3f46'],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false }
                    }
                }
            });
        }
    } else {
        if (el.formatoEmptyMsg) el.formatoEmptyMsg.classList.add('hidden');

        if (el.chartFormato) {
            chartFormato = new Chart(el.chartFormato, {
                type: 'bar',
                data: {
                    labels: Object.keys(formatoCount),
                    datasets: [{
                        label: 'Obras',
                        data: Object.values(formatoCount),
                        backgroundColor: '#6366f1',
                        borderRadius: 6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: { color: '#27272a' },
                            ticks: { color: '#a1a1aa' }
                        },
                        x: {
                            ticks: {
                                color: '#a1a1aa',
                                rotation: 30,
                                autoSkip: true
                            }
                        }
                    }
                }
            });
        }
    }

    renderPrateleiras();
}

function renderPrateleiras() {
    if (!el.prateleirasList) return;

    const contagemPrat = {};

    dadosGlobais.forEach(item => {
        if (item.prateleira) {
            contagemPrat[item.prateleira] = (contagemPrat[item.prateleira] || 0) + 1;
        }
    });

    const sortedPrat = Object.entries(contagemPrat).sort((a, b) => b[1] - a[1]);

    if (sortedPrat.length === 0) {
        el.prateleirasList.innerHTML = '<div class="text-center text-zinc-500 text-sm py-4">Nenhuma prateleira encontrada</div>';
        return;
    }

    el.prateleirasList.innerHTML = sortedPrat.map(([nome, qtd]) => `
        <button type="button"
            class="w-full flex justify-between items-center bg-zinc-800/50 hover:bg-zinc-800 rounded-lg p-2 cursor-pointer transition border border-transparent hover:border-brand/30 text-left"
            data-prateleira="${escapeHtmlAttr(nome)}">
            <span class="font-medium text-zinc-200">${escapeHtml(nome)}</span>
            <span class="text-brand text-sm font-bold">${qtd} itens</span>
        </button>
    `).join('');

    el.prateleirasList.querySelectorAll('[data-prateleira]').forEach(botao => {
        botao.addEventListener('click', () => {
            const prateleiraNome = botao.getAttribute('data-prateleira') || '';
            switchTab('dados');

            if (el.filtroPrateleira) {
                el.filtroPrateleira.value = prateleiraNome;
            }

            if (!filtersVisible && el.filterContent && el.toggleFiltersBtn) {
                filtersVisible = true;
                el.filterContent.classList.remove('hidden');
                el.toggleFiltersBtn.innerHTML = `<span id="filterIcon">🔼</span> Esconder Filtros`;
            }

            aplicarFiltros();
        });
    });
}

function aplicarFiltros() {
    const texto = (el.filtroTexto?.value || '').toLowerCase().trim();
    const stream = el.filtroStream?.value || '';
    const prateleira = el.filtroPrateleira?.value || '';
    const gravadora = el.filtroGravadora?.value || '';

    const filtrados = dadosGlobais.filter(item => {
        const titulo = String(item.titulo || '').toLowerCase();
        const artista = String(item.artista || '').toLowerCase();
        const statusStr = String(item.stream_status || '').trim().toUpperCase();

        const searchMatch = !texto || titulo.includes(texto) || artista.includes(texto);
        const prateleiraMatch = !prateleira || item.prateleira === prateleira;
        const gravadoraMatch = !gravadora || item.gravadora === gravadora;

        let streamMatch = true;
        if (stream === 'ON') streamMatch = statusStr === 'ON';
        if (stream === 'OFF') streamMatch = statusStr !== 'ON';

        return searchMatch && prateleiraMatch && gravadoraMatch && streamMatch;
    });

    renderTabela(filtrados);
}

function renderTabela(itens) {
    const tbody = document.getElementById('tableBody');
    const mobileCards = document.getElementById('mobileCards');
    const noResults = document.getElementById('noResults');

    if (tbody) tbody.innerHTML = '';
    if (mobileCards) mobileCards.innerHTML = '';

    if (!itens.length) {
        noResults?.classList.remove('hidden');
        return;
    }

    noResults?.classList.add('hidden');

    itens.forEach(item => {
        const isON = String(item.stream_status || '').trim().toUpperCase() === 'ON';

        const statusBadge = isON
            ? `<span class="inline-flex items-center justify-center bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-1 rounded text-xs font-bold min-w-[48px]">ON</span>`
            : `<span class="inline-flex items-center justify-center bg-zinc-800 text-zinc-400 border border-zinc-700 px-2 py-1 rounded text-xs font-bold min-w-[48px]">OFF</span>`;

        // DESKTOP
        if (tbody) {
            const tr = document.createElement('tr');
            tr.className = 'hover:bg-zinc-800/40 transition-colors border-b border-zinc-800/50';

            tr.innerHTML = `
                <td class="px-4 py-3 font-medium text-white">${escapeHtml(item.titulo || '-')}</td>
                <td class="px-4 py-3 text-zinc-300">${escapeHtml(item.artista || '-')}</td>
                <td class="px-4 py-3 text-zinc-400">${escapeHtml(item.gravadora || '-')}</td>
                <td class="px-4 py-3 text-zinc-300">${escapeHtml(item.prateleira || '-')}</td>
                <td class="px-4 py-3 text-center">${statusBadge}</td>
            `;
            tbody.appendChild(tr);
        }

        // MOBILE
        if (mobileCards) {
            const card = document.createElement('div');
            card.className = 'mobile-card';

            card.innerHTML = `
                <div class="mobile-card-title">${escapeHtml(item.titulo || '-')}</div>

                <div class="mobile-card-grid">
                    <div class="mobile-card-row">
                        <span class="mobile-card-label">Artista</span>
                        <span class="mobile-card-value">${escapeHtml(item.artista || '-')}</span>
                    </div>

                    <div class="mobile-card-row">
                        <span class="mobile-card-label">Gravadora (Label)</span> <span class="mobile-card-value">${escapeHtml(item.gravadora || '-')}</span>
                    </div>

                    <div class="mobile-card-row">
                        <span class="mobile-card-label">Prateleira</span>
                        <span class="mobile-card-value">${escapeHtml(item.prateleira || '-')}</span>
                    </div>

                    <div class="mobile-card-row">
                        <span class="mobile-card-label">Status Stream</span>
                        <span class="mobile-card-value">${statusBadge}</span>
                    </div>
                </div>
            `;

            mobileCards.appendChild(card);
        }
    });
}

function exportarCSV() {
    const confirmado = confirm('Atenção: esta exportação contém dados internos da Somax Studios. Confirmar exportação?');
    if (!confirmado) return;

    // ALTERAÇÃO 3: Cabeçalho do CSV
    let csv = 'Titulo,Artista,Gravadora (Label),Prateleira,Status Stream\n';
    const linhas = document.querySelectorAll('#tableBody tr');

    linhas.forEach(tr => {
        const cols = tr.querySelectorAll('td');
        if (!cols.length) return;

        const titulo = cols[0].innerText.replace(/"/g, '""');
        const artista = cols[1].innerText.replace(/"/g, '""');
        const gravadora = cols[2].innerText.replace(/"/g, '""');
        const prateleira = cols[3].innerText.replace(/"/g, '""');
        const status = cols[4].innerText.trim().replace(/"/g, '""');

        csv += `"${titulo}","${artista}","${gravadora}","${prateleira}","${status}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'Catalogo_Somax_Interno.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function exportarPDF() {
    const confirmado = confirm('Atenção: esta exportação contém dados internos da Somax Studios. Confirmar exportação?');
    if (!confirmado) return;

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');

    doc.setFillColor(9, 9, 11);
    doc.rect(0, 0, 210, 30, 'F');

    doc.setFontSize(16);
    doc.setTextColor(255);
    doc.text('Gerenciamento de Catálogo SOMAX', 14, 16);

    doc.setFontSize(8);
    doc.setTextColor(180);
    doc.text('Documento interno e confidencial - Somax Studios', 14, 23);

    doc.autoTable({
        html: '#mainTable',
        startY: 35,
        theme: 'grid',
        headStyles: { fillColor: [99, 102, 241], textColor: 255 },
        styles: { fontSize: 8, textColor: [40, 40, 40] }
    });

    doc.save('Catalogo_Somax_Interno.pdf');
}

function escapeHtml(value) {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

function escapeHtmlAttr(value) {
    return escapeHtml(value);
}

function bloquearInspecaoBasica() {
    document.addEventListener('contextmenu', event => event.preventDefault());

    document.addEventListener('keydown', event => {
        const key = String(event.key || '').toUpperCase();

        if (key === 'F12') {
            event.preventDefault();
        }

        if (event.ctrlKey && event.shiftKey && ['I', 'J', 'C'].includes(key)) {
            event.preventDefault();
        }

        if (event.ctrlKey && key === 'U') {
            event.preventDefault();
        }
    });
}

function init() {
    initTabs();
    iniciarModalAviso();
    initFiltros();
    initExportacoes();
    bloquearInspecaoBasica();
    carregarDados();
}

document.addEventListener('DOMContentLoaded', init);

// opcional para debug manual no console
window.switchTab = switchTab;
window.aplicarFiltros = aplicarFiltros;
window.exportarCSV = exportarCSV;
window.exportarPDF = exportarPDF;
