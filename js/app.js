import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// Configuração Supabase
const supabaseUrl = 'https://ulbqzvztwrqmaxbzsmmv.supabase.co';
const supabaseKey = 'sb_publishable_shOmcA8udv3Tw0xKYzafAw_s1YXgbDk';
const supabase = createClient(supabaseUrl, supabaseKey);

// Elementos DOM
const tableBody = document.getElementById('tableBody');
const noResultsMsg = document.getElementById('noResultsMsg');
const addSection = document.getElementById('addSection');
const searchInput = document.getElementById('searchInput');
const filterFormato = document.getElementById('filterFormato');
const filterPrateleira = document.getElementById('filterPrateleira');
const filterStream = document.getElementById('filterStream');
const filterPodeLancar = document.getElementById('filterPodeLancar');
const filterGravadora = document.getElementById('filterGravadora');
const sortBy = document.getElementById('sortBy');
const btnBuscar = document.getElementById('btnBuscar');
const btnNovoGlobal = document.getElementById('btnNovoGlobal');
const btnShowAddNoResults = document.getElementById('btnShowAddNoResults');

// Paginação
let currentPage = 1;
const itemsPerPage = 30;
let totalRecords = 0;
let totalPages = 1;

// Variáveis de estado para os filtros
let currentSearch = '';
let currentFormato = '';
let currentPrateleira = '';
let currentStream = '';
let currentPodeLancar = '';
let currentGravadora = '';
let currentSort = 'created_desc';

// Evita múltiplas execuções de salvar
let salvandoInline = false;

// --- HELPERS ---
function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/[&<>]/g, m => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;'
    }[m]));
}

function escapeAttr(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function badgeStreamStatus(valor) {
    if (valor === 'On') {
        return '<span class="bg-emerald-900/80 text-emerald-200 px-2 py-1 rounded-full text-xs border border-emerald-700">On Stream</span>';
    }
    if (valor === 'Off') {
        return '<span class="bg-amber-900/80 text-amber-200 px-2 py-1 rounded-full text-xs border border-amber-700">Off Stream</span>';
    }
    return '<span class="bg-zinc-800 text-zinc-400 px-2 py-1 rounded-full text-xs">—</span>';
}

function badgeTakenDown(valor) {
    return valor === true
        ? '<span class="bg-red-900/80 text-red-200 px-2 py-1 rounded-full text-xs border border-red-700">Sim</span>'
        : '<span class="bg-zinc-800 text-zinc-400 px-2 py-1 rounded-full text-xs">Não</span>';
}

function badgePodeLancar(valor) {
    if (valor === true) {
        return '<span class="bg-purple-900/80 text-purple-200 px-2 py-1 rounded-full text-xs border border-purple-700">Sim</span>';
    }
    if (valor === false) {
        return '<span class="bg-zinc-800 text-zinc-400 px-2 py-1 rounded-full text-xs">Não</span>';
    }
    return '<span class="bg-zinc-800 text-zinc-500 px-2 py-1 rounded-full text-xs">—</span>';
}

// --- GERAÇÃO DAS OPÇÕES DE PRATELEIRA ---
function gerarOpcoesPrateleiras() {
    const selectFilter = filterPrateleira;
    const selectAdd = document.getElementById('addPrateleira');

    if (!selectFilter || !selectAdd) return;
    if (selectFilter.dataset.ready === 'true' && selectAdd.dataset.ready === 'true') return;

    const regras = {
        1: 'J', 2: 'L', 3: 'L', 4: 'L', 5: 'L', 6: 'K', 7: 'F', 8: 'F'
    };

    for (let num = 1; num <= 8; num++) {
        const maxLetra = regras[num];
        const maxCodigo = maxLetra.charCodeAt(0);

        let optGroupFilter = document.createElement('optgroup');
        optGroupFilter.label = `Prateleira ${num}`;

        let optGroupAdd = document.createElement('optgroup');
        optGroupAdd.label = `Prateleira ${num}`;

        for (let c = 'A'.charCodeAt(0); c <= maxCodigo; c++) {
            const letra = String.fromCharCode(c);
            const valorStr = `${num}${letra}`;
            optGroupFilter.innerHTML += `<option value="${valorStr}">${valorStr}</option>`;
            optGroupAdd.innerHTML += `<option value="${valorStr}">${valorStr}</option>`;
        }

        selectFilter.appendChild(optGroupFilter);
        selectAdd.appendChild(optGroupAdd);
    }

    selectFilter.dataset.ready = 'true';
    selectAdd.dataset.ready = 'true';
}

function gerarOptionsPrateleiraHTML(valorAtual) {
    let html = '<option value="">— Limpar —</option>';
    const regras = { 1: 'J', 2: 'L', 3: 'L', 4: 'L', 5: 'L', 6: 'K', 7: 'F', 8: 'F' };

    for (let num = 1; num <= 8; num++) {
        const maxLetra = regras[num];
        const maxCodigo = maxLetra.charCodeAt(0);

        for (let c = 'A'.charCodeAt(0); c <= maxCodigo; c++) {
            const letra = String.fromCharCode(c);
            const valorStr = `${num}${letra}`;
            html += `<option value="${valorStr}" ${valorAtual === valorStr ? 'selected' : ''}>${valorStr}</option>`;
        }
    }

    return html;
}

// --- GRAVADORAS / LABELS ---
async function carregarOpcoesGravadoras() {
    if (!filterGravadora) return;

    const { data, error } = await supabase
        .from('catalogo')
        .select('gravadora')
        .not('gravadora', 'is', null);

    if (error) {
        console.error('Erro ao carregar gravadoras:', error);
        return;
    }

    const gravadorasUnicas = [...new Set(
        (data || [])
            .map(item => (item.gravadora || '').trim())
            .filter(Boolean)
    )].sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }));

    filterGravadora.innerHTML = '<option value="">Gravadora / Label (Todas)</option>';

    gravadorasUnicas.forEach(nome => {
        const option = document.createElement('option');
        option.value = nome;
        option.textContent = nome;
        filterGravadora.appendChild(option);
    });
}

// --- DASHBOARD ---
async function carregarDashboard() {
    const { count: total } = await supabase.from('catalogo').select('*', { count: 'exact', head: true });
    document.getElementById('totalItems').innerText = total || 0;

    const { count: onStream } = await supabase.from('catalogo').select('*', { count: 'exact', head: true }).eq('stream_status', 'On');
    document.getElementById('onStreamCount').innerText = onStream || 0;

    const { count: offStream } = await supabase.from('catalogo').select('*', { count: 'exact', head: true }).eq('stream_status', 'Off');
    document.getElementById('offStreamCount').innerText = offStream || 0;

    const { count: takenDown } = await supabase.from('catalogo').select('*', { count: 'exact', head: true }).eq('taken_down', true);
    document.getElementById('takenDownCount').innerText = takenDown || 0;

    const { count: podeLancar } = await supabase.from('catalogo').select('*', { count: 'exact', head: true }).eq('pode_lancar', true);
    document.getElementById('podeLancarCount').innerText = podeLancar || 0;

    const { data: formatoData } = await supabase.from('catalogo').select('formato');
    if (formatoData) {
        const counts = {};
        formatoData.forEach(item => {
            const fmt = item.formato || 'Desconhecido';
            counts[fmt] = (counts[fmt] || 0) + 1;
        });

        const container = document.getElementById('formatoStats');
        container.innerHTML = '';

        Object.entries(counts)
            .sort((a, b) => b[1] - a[1])
            .forEach(([formato, count]) => {
                const percent = total ? ((count / total) * 100).toFixed(1) : 0;
                container.innerHTML += `
                    <div class="flex justify-between items-center">
                        <span class="text-zinc-300">${escapeHtml(formato)}</span>
                        <span class="text-zinc-400">${count} (${percent}%)</span>
                    </div>
                    <div class="w-full bg-zinc-800 rounded-full h-2">
                        <div class="bg-labelAccent h-2 rounded-full" style="width: ${percent}%"></div>
                    </div>
                `;
            });
    }

    const { data: prateleiraData } = await supabase.from('catalogo').select('prateleira').not('prateleira', 'is', null);
    if (prateleiraData) {
        const counts = {};
        prateleiraData.forEach(item => {
            const shelf = item.prateleira;
            if (shelf) counts[shelf] = (counts[shelf] || 0) + 1;
        });

        const container = document.getElementById('prateleiraStats');
        container.innerHTML = '';

        Object.entries(counts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .forEach(([shelf, count]) => {
                container.innerHTML += `<div class="flex justify-between"><span>Prateleira ${escapeHtml(shelf)}</span><span>${count} itens</span></div>`;
            });

        if (Object.keys(counts).length === 0) {
            container.innerHTML = '<p class="text-zinc-500">Nenhuma prateleira definida</p>';
        }
    }
}

// --- NAVEGAÇÃO ENTRE ABAS ---
function mostrarCatalogo() {
    document.getElementById('catalogoContainer').classList.remove('hidden');
    document.getElementById('dashboardContainer').classList.add('hidden');
    document.getElementById('tabCatalogo').classList.add('active');
    document.getElementById('tabDashboard').classList.remove('active');
    buscarProdutos(true);
}

function mostrarDashboard() {
    document.getElementById('catalogoContainer').classList.add('hidden');
    document.getElementById('dashboardContainer').classList.remove('hidden');
    document.getElementById('tabDashboard').classList.add('active');
    document.getElementById('tabCatalogo').classList.remove('active');
    carregarDashboard();
}

// --- TOTAL DE REGISTOS COM FILTROS ---
async function fetchTotalCount() {
    let query = supabase.from('catalogo').select('*', { count: 'exact', head: true });

    if (currentSearch) {
        query = query.or(`artista.ilike.%${currentSearch}%,titulo.ilike.%${currentSearch}%,gravadora.ilike.%${currentSearch}%`);
    }

    if (currentFormato) query = query.eq('formato', currentFormato);
    if (currentPrateleira) query = query.eq('prateleira', currentPrateleira);
    if (currentStream) query = query.eq('stream_status', currentStream);
    if (currentPodeLancar !== '') query = query.eq('pode_lancar', currentPodeLancar === 'true');
    if (currentGravadora) query = query.eq('gravadora', currentGravadora);

    const { count } = await query;
    return count || 0;
}

// --- BUSCAR PRODUTOS ---
async function buscarProdutos(resetPage = true) {
    if (resetPage) currentPage = 1;

    currentSearch = searchInput.value.trim();
    currentFormato = filterFormato.value;
    currentPrateleira = filterPrateleira.value;
    currentStream = filterStream.value;
    currentPodeLancar = filterPodeLancar.value;
    currentGravadora = filterGravadora ? filterGravadora.value : '';
    currentSort = sortBy ? sortBy.value : 'created_desc';

    totalRecords = await fetchTotalCount();
    totalPages = Math.ceil(totalRecords / itemsPerPage) || 1;
    if (currentPage > totalPages) currentPage = totalPages;

    document.getElementById('currentPage').innerText = currentPage;
    document.getElementById('totalPages').innerText = totalPages;
    document.getElementById('prevPage').disabled = (currentPage <= 1);
    document.getElementById('nextPage').disabled = (currentPage >= totalPages);
    document.getElementById('goToPage').max = totalPages;
    document.getElementById('goToPage').value = currentPage;

    tableBody.innerHTML = `
        <tr>
            <td colspan="9" class="p-8 text-center text-zinc-500 animate-pulse">
                A carregar registos...
            </td>
        </tr>
    `;

    noResultsMsg.classList.add('hidden');
    addSection.classList.add('hidden');

    const start = (currentPage - 1) * itemsPerPage;

    let query = supabase.from('catalogo').select('*');

    if (currentSearch) {
        query = query.or(`artista.ilike.%${currentSearch}%,titulo.ilike.%${currentSearch}%,gravadora.ilike.%${currentSearch}%`);
    }

    if (currentFormato) query = query.eq('formato', currentFormato);
    if (currentPrateleira) query = query.eq('prateleira', currentPrateleira);
    if (currentStream) query = query.eq('stream_status', currentStream);
    if (currentPodeLancar !== '') query = query.eq('pode_lancar', currentPodeLancar === 'true');
    if (currentGravadora) query = query.eq('gravadora', currentGravadora);

    switch (currentSort) {
        case 'titulo_asc':
            query = query.order('titulo', { ascending: true });
            break;
        case 'titulo_desc':
            query = query.order('titulo', { ascending: false });
            break;
        case 'artista_asc':
            query = query.order('artista', { ascending: true });
            break;
        case 'artista_desc':
            query = query.order('artista', { ascending: false });
            break;
        default:
            query = query.order('created_at', { ascending: false });
            break;
    }

    query = query.range(start, start + itemsPerPage - 1);

    const { data, error } = await query;

    if (error) {
        console.error('Erro ao buscar catálogo:', error);
        tableBody.innerHTML = `
            <tr>
                <td colspan="9" class="p-8 text-center text-red-400">
                    Falha ao carregar os dados.
                </td>
            </tr>
        `;
        return;
    }

    renderTable(data || []);
}

// --- RENDERIZAÇÃO DA TABELA ---
function renderTable(data) {
    tableBody.innerHTML = '';

    if (data.length === 0) {
        noResultsMsg.classList.remove('hidden');
        document.getElementById('addTitulo').value = currentSearch;
        if (currentFormato) document.getElementById('addFormato').value = currentFormato;
        if (currentPrateleira) document.getElementById('addPrateleira').value = currentPrateleira;
        if (currentStream) document.getElementById('addStream').value = currentStream;
        return;
    }

    data.forEach(item => {
        const tr = document.createElement('tr');
        tr.className = "block md:table-row bg-zinc-900 md:bg-transparent border border-zinc-800 md:border-none rounded-xl md:rounded-none mb-4 md:mb-0 hover:bg-zinc-800/50 transition-colors shadow-sm md:shadow-none";
        tr.dataset.id = item.id;

        const gravadoraLabel = item.gravadora || '-';

        tr.innerHTML = `
            <td class="block md:table-cell p-4 border-b border-zinc-800/50 md:border-b md:border-zinc-800">
                <span class="md:hidden block text-xs font-semibold text-zinc-500 uppercase mb-1">Título</span>
                <span class="editable-field" data-field="titulo" data-id="${item.id}" data-value="${escapeAttr(item.titulo || '')}">
                    <span class="titulo-display text-white">${escapeHtml(item.titulo || '')}</span>
                </span>
            </td>

            <td class="block md:table-cell p-4 border-b border-zinc-800/50 md:border-b md:border-zinc-800">
                <span class="md:hidden block text-xs font-semibold text-zinc-500 uppercase mb-1">Artista</span>
                <span class="editable-field" data-field="artista" data-id="${item.id}" data-value="${escapeAttr(item.artista || '')}">
                    <span class="artista-display text-zinc-300">${escapeHtml(item.artista || '')}</span>
                </span>
            </td>

            <td class="block md:table-cell p-4 border-b border-zinc-800/50 md:border-b md:border-zinc-800">
                <span class="md:hidden block text-xs font-semibold text-zinc-500 uppercase mb-1">Gravadora / Label</span>
                <span class="text-zinc-400">${escapeHtml(gravadoraLabel)}</span>
            </td>

            <td class="block md:table-cell p-4 border-b border-zinc-800/50 md:border-b md:border-zinc-800">
                <span class="md:hidden block text-xs font-semibold text-zinc-500 uppercase mb-1">Prateleira</span>
                <span class="editable-field" data-field="prateleira" data-id="${item.id}" data-value="${escapeAttr(item.prateleira || '')}">
                    <span class="prateleira-display bg-zinc-800 px-2 py-1 rounded text-xs text-zinc-300 border border-zinc-700">${escapeHtml(item.prateleira || '-')}</span>
                </span>
            </td>

            <td class="block md:table-cell p-4 border-b border-zinc-800/50 md:border-b md:border-zinc-800">
                <span class="md:hidden block text-xs font-semibold text-zinc-500 uppercase mb-1">Formato</span>
                <span class="editable-field" data-field="formato" data-id="${item.id}" data-value="${escapeAttr(item.formato || '')}">
                    <span class="formato-display bg-zinc-800 px-2 py-1 rounded text-xs text-zinc-300 border border-zinc-700">${escapeHtml(item.formato || '-')}</span>
                </span>
            </td>

            <td class="block md:table-cell p-4 border-b border-zinc-800/50 md:border-b md:border-zinc-800">
                <span class="md:hidden block text-xs font-semibold text-zinc-500 uppercase mb-1">Nº do Tape</span>
                <span class="editable-field" data-field="numero" data-id="${item.id}" data-value="${escapeAttr(item.numero || '')}">
                    <span class="numero-display bg-zinc-800 px-2 py-1 rounded text-xs text-zinc-300 border border-zinc-700">${escapeHtml(item.numero || '-')}</span>
                </span>
            </td>

            <td class="block md:table-cell p-4 border-b border-zinc-800/50 md:border-b md:border-zinc-800">
                <span class="md:hidden block text-xs font-semibold text-zinc-500 uppercase mb-1">Stream Status</span>
                <span class="editable-field inline-block" data-field="stream_status" data-id="${item.id}" data-value="${escapeAttr(item.stream_status ?? '')}">
                    <span class="stream-status-display">${badgeStreamStatus(item.stream_status ?? null)}</span>
                </span>
            </td>

            <td class="block md:table-cell p-4 border-b border-zinc-800/50 md:border-b md:border-zinc-800">
                <span class="md:hidden block text-xs font-semibold text-zinc-500 uppercase mb-1">Taken Down</span>
                <span class="editable-field inline-block" data-field="taken_down" data-id="${item.id}" data-value="${item.taken_down === true ? 'true' : 'false'}">
                    <span class="taken-down-display">${badgeTakenDown(item.taken_down === true)}</span>
                </span>
            </td>

            <td class="block md:table-cell p-4 border-b border-zinc-800/50 md:border-b md:border-zinc-800">
                <span class="md:hidden block text-xs font-semibold text-zinc-500 uppercase mb-1">Pode Lançar</span>
                <span class="editable-field inline-block" data-field="pode_lancar" data-id="${item.id}" data-value="${item.pode_lancar === true ? 'true' : item.pode_lancar === false ? 'false' : ''}">
                    <span class="pode-lancar-display">${badgePodeLancar(item.pode_lancar)}</span>
                </span>
            </td>
        `;

        tableBody.appendChild(tr);
    });

    document.querySelectorAll('.editable-field').forEach(el => {
        el.addEventListener('click', (e) => {
            e.stopPropagation();
            iniciarEdicao(el);
        });
    });
}

// --- EDIÇÃO INLINE ---
function iniciarEdicao(elemento) {
    if (!elemento || elemento.dataset.editando === 'true') return;

    const field = elemento.dataset.field;
    const id = elemento.dataset.id;
    let currentValue = elemento.dataset.value ?? '';

    elemento.dataset.editando = 'true';

    let inputElement;

    switch (field) {
        case 'prateleira':
            inputElement = document.createElement('select');
            inputElement.className = 'edit-select';
            inputElement.innerHTML = gerarOptionsPrateleiraHTML(currentValue);
            break;

        case 'formato':
            inputElement = document.createElement('select');
            inputElement.className = 'edit-select';
            inputElement.innerHTML = `
                <option value="">— Limpar —</option>
                <option value="TAPE">TAPE</option>
                <option value="CD">CD</option>
                <option value="Vinil">Vinil</option>
                <option value="DATE">DATE</option>
            `;
            inputElement.value = currentValue;
            break;

        case 'stream_status':
            inputElement = document.createElement('select');
            inputElement.className = 'edit-select';
            inputElement.innerHTML = `
                <option value="">— Limpar —</option>
                <option value="On">On Stream</option>
                <option value="Off">Off Stream</option>
            `;
            inputElement.value = currentValue;
            break;

        case 'taken_down':
            inputElement = document.createElement('select');
            inputElement.className = 'edit-select';
            inputElement.innerHTML = `
                <option value="false">Não</option>
                <option value="true">Sim</option>
            `;
            inputElement.value = currentValue === '' ? 'false' : currentValue;
            break;

        case 'pode_lancar':
            inputElement = document.createElement('select');
            inputElement.className = 'edit-select';
            inputElement.innerHTML = `
                <option value="">— Limpar —</option>
                <option value="true">Sim</option>
                <option value="false">Não</option>
            `;
            inputElement.value = currentValue;
            break;

        default:
            inputElement = document.createElement('input');
            inputElement.type = 'text';
            inputElement.className = 'edit-input';
            inputElement.value = currentValue;
            break;
    }

    const cancelar = () => {
        elemento.dataset.editando = 'false';
        buscarProdutos(false);
    };

    const salvar = async () => {
        if (salvandoInline) return;
        salvandoInline = true;

        let novoValor;

        if (field === 'taken_down') {
            novoValor = inputElement.value === 'true';
        } else if (field === 'pode_lancar') {
            novoValor = inputElement.value === 'true'
                ? true
                : inputElement.value === 'false'
                    ? false
                    : null;
        } else if (field === 'stream_status') {
            novoValor = inputElement.value || null;
        } else {
            novoValor = inputElement.value || null;
        }

        const { error } = await supabase
            .from('catalogo')
            .update({ [field]: novoValor })
            .eq('id', id);

        salvandoInline = false;
        elemento.dataset.editando = 'false';

        if (error) {
            console.error(`Erro ao atualizar ${field}:`, error);
            alert(`Erro ao atualizar ${field}. Veja o console.`);
            buscarProdutos(false);
            return;
        }

        buscarProdutos(false);
    };

    elemento.innerHTML = '';
    elemento.appendChild(inputElement);

    setTimeout(() => {
        inputElement.focus();
        if (inputElement.tagName !== 'SELECT' && typeof inputElement.select === 'function') {
            inputElement.select();
        }
    }, 0);

    if (inputElement.tagName === 'SELECT') {
        inputElement.addEventListener('change', salvar);
        inputElement.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') cancelar();
        });
    } else {
        inputElement.addEventListener('blur', salvar);
        inputElement.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') salvar();
            if (e.key === 'Escape') cancelar();
        });
    }
}

// --- SALVAR NOVO PRODUTO ---
async function salvarProduto() {
    const titulo = document.getElementById('addTitulo').value.trim();
    const artista = document.getElementById('addArtista').value.trim();

    if (!titulo || !artista) {
        alert("Título e Artista são obrigatórios!");
        return;
    }

    const btn = document.getElementById('btnSalvar');
    btn.innerText = "A guardar...";
    btn.disabled = true;

    let podeLancarVal = document.getElementById('addPodeLancar').value;
    if (podeLancarVal === '') podeLancarVal = null;
    else if (podeLancarVal === 'true') podeLancarVal = true;
    else podeLancarVal = false;

    const novoProduto = {
        titulo,
        artista,
        gravadora: document.getElementById('addGravadora').value || null,
        prateleira: document.getElementById('addPrateleira').value || null,
        formato: document.getElementById('addFormato').value || null,
        numero: document.getElementById('addNumero').value || null,
        stream_status: document.getElementById('addStream').value || null,
        taken_down: document.getElementById('addTakenDown').value === 'true',
        pode_lancar: podeLancarVal
    };

    const { error } = await supabase.from('catalogo').insert([novoProduto]);

    btn.innerText = "Salvar no Catálogo";
    btn.disabled = false;

    if (error) {
        console.error('Erro ao inserir produto:', error);
        alert("Erro ao registar.");
        return;
    }

    addSection.classList.add('hidden');
    document.getElementById('addTitulo').value = '';
    document.getElementById('addArtista').value = '';
    document.getElementById('addGravadora').value = '';
    document.getElementById('addNumero').value = '';
    document.getElementById('addPrateleira').value = '';
    document.getElementById('addFormato').value = '';
    document.getElementById('addStream').value = 'On';
    document.getElementById('addTakenDown').value = 'false';
    document.getElementById('addPodeLancar').value = '';

    buscarProdutos(false);
    carregarOpcoesGravadoras();
}

// --- EXPORTAÇÕES ---
async function exportarCSV() {
    let query = supabase.from('catalogo').select('*');

    if (currentSearch) query = query.or(`artista.ilike.%${currentSearch}%,titulo.ilike.%${currentSearch}%,gravadora.ilike.%${currentSearch}%`);
    if (currentFormato) query = query.eq('formato', currentFormato);
    if (currentPrateleira) query = query.eq('prateleira', currentPrateleira);
    if (currentStream) query = query.eq('stream_status', currentStream);
    if (currentPodeLancar !== '') query = query.eq('pode_lancar', currentPodeLancar === 'true');
    if (currentGravadora) query = query.eq('gravadora', currentGravadora);

    switch (currentSort) {
        case 'titulo_asc':
            query = query.order('titulo', { ascending: true });
            break;
        case 'titulo_desc':
            query = query.order('titulo', { ascending: false });
            break;
        case 'artista_asc':
            query = query.order('artista', { ascending: true });
            break;
        case 'artista_desc':
            query = query.order('artista', { ascending: false });
            break;
        default:
            query = query.order('created_at', { ascending: false });
            break;
    }

    const { data } = await query;
    if (!data) return;

    const headers = ['Título','Artista','Gravadora','Prateleira','Formato','Nº do Tape','Stream Status','Taken Down','Pode Lançar'];
    const rows = data.map(item => [
        item.titulo,
        item.artista,
        item.gravadora || '',
        item.prateleira || '',
        item.formato || '',
        item.numero || '',
        item.stream_status || '',
        item.taken_down ? 'Sim' : 'Não',
        item.pode_lancar === true ? 'Sim' : (item.pode_lancar === false ? 'Não' : '')
    ]);

    const csvContent = [headers, ...rows]
        .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\n');

    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `catalogo_${new Date().toISOString().slice(0,19)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
}

async function exportarPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape' });

    let query = supabase.from('catalogo').select('*');

    if (currentSearch) query = query.or(`artista.ilike.%${currentSearch}%,titulo.ilike.%${currentSearch}%,gravadora.ilike.%${currentSearch}%`);
    if (currentFormato) query = query.eq('formato', currentFormato);
    if (currentPrateleira) query = query.eq('prateleira', currentPrateleira);
    if (currentStream) query = query.eq('stream_status', currentStream);
    if (currentPodeLancar !== '') query = query.eq('pode_lancar', currentPodeLancar === 'true');
    if (currentGravadora) query = query.eq('gravadora', currentGravadora);

    switch (currentSort) {
        case 'titulo_asc':
            query = query.order('titulo', { ascending: true });
            break;
        case 'titulo_desc':
            query = query.order('titulo', { ascending: false });
            break;
        case 'artista_asc':
            query = query.order('artista', { ascending: true });
            break;
        case 'artista_desc':
            query = query.order('artista', { ascending: false });
            break;
        default:
            query = query.order('created_at', { ascending: false });
            break;
    }

    const { data } = await query;
    if (!data) return;

    const headers = ['Título','Artista','Gravadora','Prateleira','Formato','Nº Tape','Stream','Taken Down','Pode Lançar'];
    const rows = data.map(item => [
        item.titulo,
        item.artista,
        item.gravadora || '',
        item.prateleira || '',
        item.formato || '',
        item.numero || '',
        item.stream_status || '',
        item.taken_down ? 'Sim' : 'Não',
        item.pode_lancar === true ? 'Sim' : (item.pode_lancar === false ? 'Não' : '')
    ]);

    doc.text('Catálogo Somax', 14, 10);
    doc.setFontSize(10);
    doc.text(`Gerado em: ${new Date().toLocaleString()}`, 14, 18);
    doc.autoTable({
        head: [headers],
        body: rows,
        startY: 25,
        theme: 'striped',
        headStyles: { fillColor: [99, 102, 241] },
        styles: { fontSize: 8 }
    });
    doc.save(`catalogo_${new Date().toISOString().slice(0,19)}.pdf`);
}

// --- ABRIR FORMULÁRIO ---
function abrirFormularioComPreenchimento() {
    addSection.classList.remove('hidden');
    noResultsMsg.classList.add('hidden');
    document.getElementById('addTitulo').value = currentSearch;
    document.getElementById('addTitulo').focus();
}

// --- EVENTOS ---
let timeoutId = null;

function debounceBuscar() {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => buscarProdutos(true), 400);
}

searchInput.addEventListener('input', debounceBuscar);
filterFormato.addEventListener('change', () => buscarProdutos(true));
filterPrateleira.addEventListener('change', () => buscarProdutos(true));
filterStream.addEventListener('change', () => buscarProdutos(true));
filterPodeLancar.addEventListener('change', () => buscarProdutos(true));

if (filterGravadora) {
    filterGravadora.addEventListener('change', () => buscarProdutos(true));
}

if (sortBy) {
    sortBy.addEventListener('change', () => buscarProdutos(true));
}

btnBuscar.addEventListener('click', () => buscarProdutos(true));
btnNovoGlobal.addEventListener('click', abrirFormularioComPreenchimento);

if (btnShowAddNoResults) {
    btnShowAddNoResults.addEventListener('click', abrirFormularioComPreenchimento);
}

document.getElementById('btnCancelar').addEventListener('click', () => addSection.classList.add('hidden'));
document.getElementById('btnSalvar').addEventListener('click', salvarProduto);

document.getElementById('prevPage').addEventListener('click', () => {
    if (currentPage > 1) {
        currentPage--;
        buscarProdutos(false);
    }
});

document.getElementById('nextPage').addEventListener('click', () => {
    if (currentPage < totalPages) {
        currentPage++;
        buscarProdutos(false);
    }
});

document.getElementById('btnGoToPage').addEventListener('click', () => {
    let page = parseInt(document.getElementById('goToPage').value);
    if (isNaN(page)) page = 1;
    page = Math.min(Math.max(page, 1), totalPages);
    if (page !== currentPage) {
        currentPage = page;
        buscarProdutos(false);
    }
});

document.getElementById('btnExportCSV').addEventListener('click', exportarCSV);
document.getElementById('btnExportPDF').addEventListener('click', exportarPDF);
document.getElementById('tabCatalogo').addEventListener('click', mostrarCatalogo);
document.getElementById('tabDashboard').addEventListener('click', mostrarDashboard);

// Inicialização
gerarOpcoesPrateleiras();
carregarOpcoesGravadoras();
buscarProdutos(true);
