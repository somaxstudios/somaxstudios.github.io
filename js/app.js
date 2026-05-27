import { inicializarDashboard } from './dashboard.js';
import { supabase } from './supabase-client.js';

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

// Filtros
let currentSearch = '';
let currentFormato = '';
let currentPrateleira = '';
let currentStream = '';
let currentPodeLancar = '';
let currentGravadora = '';
let currentSort = 'created_desc';

let salvandoInline = false;

// Helpers
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

// Prateleiras
function gerarOpcoesPrateleiras() {
    const selectFilter = filterPrateleira;
    const selectAdd = document.getElementById('addPrateleira');

    if (!selectFilter || !selectAdd) return;
    if (selectFilter.dataset.ready === 'true' && selectAdd.dataset.ready === 'true') return;

    const regras = {
        1: 'J', 2: 'L', 3: 'L', 4: 'L', 5: 'L', 6: 'K', 7: 'M', 8: 'F'
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
    const regras = { 1: 'J', 2: 'L', 3: 'L', 4: 'L', 5: 'L', 6: 'K', 7: 'M', 8: 'F' };

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

// Gravadoras
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

// Dashboard
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

    let todosOsDados = [];
    let step = 1000;
    let inicio = 0;
    let temMaisDados = true;

    while (temMaisDados) {
        const { data, error } = await supabase
            .from('catalogo')
            .select('titulo, artista, formato, prateleira')
            .range(inicio, inicio + step - 1);

        if (error) {
            console.error("Erro ao carregar dados do dashboard", error);
            break;
        }

        if (data && data.length > 0) {
            todosOsDados = todosOsDados.concat(data);
            inicio += step;
            if (data.length < step) temMaisDados = false;
        } else {
            temMaisDados = false;
        }
    }

    inicializarDashboard(todosOsDados);
}

// Navegação
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

// Total com filtros
async function fetchTotalCount() {
    let query = supabase.from('catalogo').select('*', { count: 'exact', head: true });

    if (currentSearch) {
        const termoLimpo = currentSearch.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
        query = query.ilike('texto_busca', `%${termoLimpo}%`);
    }

    if (currentFormato) query = query.eq('formato', currentFormato);
    if (currentPrateleira) query = query.eq('prateleira', currentPrateleira);
    if (currentStream) query = query.eq('stream_status', currentStream);
    if (currentPodeLancar !== '') query = query.eq('pode_lancar', currentPodeLancar === 'true');
    if (currentGravadora) query = query.eq('gravadora', currentGravadora);

    const { count } = await query;
    return count || 0;
}

// Buscar produtos
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
            <td colspan="10" class="p-8 text-center text-zinc-500 animate-pulse">
                A carregar registos...
            </td>
        </tr>
    `;

    noResultsMsg.classList.add('hidden');
    addSection.classList.add('hidden');

    const start = (currentPage - 1) * itemsPerPage;

    let query = supabase.from('catalogo').select('*');

    if (currentSearch) {
        const termoLimpo = currentSearch.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
        query = query.ilike('texto_busca', `%${termoLimpo}%`);
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
                <td colspan="10" class="p-8 text-center text-red-400">
                    Falha ao carregar os dados.
                </td>
            </tr>
        `;
        return;
    }

    renderTable(data || []);
}

// Duplicar produto
async function duplicarProduto(item) {
    const tipo = prompt(
        "Escolha o tipo de duplicação:\n\n1 = Duplicar como Lado B\n2 = Duplicar para outro formato/número/prateleira"
    );

    if (!tipo) return;

    if (tipo === "1") {
        const tituloBase = (item.titulo || "Sem identificação")
            .replace(/\s*\(Lado A\)\s*$/i, "")
            .replace(/\s*\(Lado B\)\s*$/i, "")
            .trim();

        const tituloLadoA = `${tituloBase} (Lado A)`;
        const tituloLadoB = `${tituloBase} (Lado B)`;

        const confirmar = confirm(
            `O produto atual será atualizado para:\n${tituloLadoA}\n\nE será criada uma cópia como:\n${tituloLadoB}\n\nContinuar?`
        );

        if (!confirmar) return;

        const { error: erroUpdate } = await supabase
            .from("catalogo")
            .update({ titulo: tituloLadoA })
            .eq("id", item.id);

        if (erroUpdate) {
            console.error("Erro ao atualizar Lado A:", erroUpdate);
            alert("Erro ao atualizar o produto atual como Lado A.");
            return;
        }

        const novoProduto = {
            titulo: tituloLadoB,
            artista: item.artista || "Sem identificação",
            gravadora: item.gravadora || null,
            prateleira: item.prateleira || null,
            formato: item.formato || null,
            numero: item.numero || null,
            stream_status: item.stream_status || null,
            taken_down: item.taken_down === true,
            pode_lancar: item.pode_lancar
        };

        const { error: erroInsert } = await supabase
            .from("catalogo")
            .insert([novoProduto]);

        if (erroInsert) {
            console.error("Erro ao criar Lado B:", erroInsert);
            alert("Erro ao criar o produto como Lado B.");
            return;
        }
    } else if (tipo === "2") {
        const novoFormato = prompt(
            "Informe o novo formato.\nEx: TAPE, CD, LP, Vinil, DATE",
            item.formato || ""
        );

        if (!novoFormato) return;

        const novoNumero = prompt(
            "Informe o novo Nº do Tape/Código:",
            item.numero || ""
        );

        if (novoNumero === null) return;

        const novaPrateleira = prompt(
            "Informe a nova prateleira:",
            item.prateleira || ""
        );

        if (novaPrateleira === null) return;

        const novoProduto = {
            titulo: item.titulo || "Sem identificação",
            artista: item.artista || "Sem identificação",
            gravadora: item.gravadora || null,
            prateleira: novaPrateleira || null,
            formato: novoFormato || null,
            numero: novoNumero || null,
            stream_status: item.stream_status || null,
            taken_down: item.taken_down === true,
            pode_lancar: item.pode_lancar
        };

        const { error } = await supabase
            .from("catalogo")
            .insert([novoProduto]);

        if (error) {
            console.error("Erro ao duplicar produto:", error);
            alert("Erro ao duplicar produto.");
            return;
        }
    } else {
        alert("Opção inválida.");
        return;
    }

    buscarProdutos(false);
    carregarDashboard();
    carregarOpcoesGravadoras();
}

// Render tabela
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
                <span class="editable-field" data-field="gravadora" data-id="${item.id}" data-value="${escapeAttr(item.gravadora || '')}">
                    <span class="gravadora-display text-zinc-400">${escapeHtml(gravadoraLabel)}</span>
                </span>
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

            <td class="block md:table-cell p-4 border-b border-zinc-800/50 md:border-b md:border-zinc-800">
                <span class="md:hidden block text-xs font-semibold text-zinc-500 uppercase mb-1">Ações</span>

                <button class="duplicar-btn bg-indigo-800/40 hover:bg-indigo-700 text-white text-xs px-3 py-1 rounded transition mr-2 mb-2 md:mb-0" data-id="${item.id}">
                    📄 Duplicar
                </button>

                <button class="delete-btn bg-red-800/40 hover:bg-red-700 text-white text-xs px-3 py-1 rounded transition" data-id="${item.id}">
                    🗑️ Excluir
                </button>
            </td>
        `;

        tableBody.appendChild(tr);

        tr.querySelector('.duplicar-btn')?.addEventListener('click', async (e) => {
            e.stopPropagation();
            await duplicarProduto(item);
        });

        tr.querySelector('.delete-btn')?.addEventListener('click', async (e) => {
            e.stopPropagation();
            const id = e.currentTarget.dataset.id;
            const confirmar = confirm("Tem certeza que deseja excluir este produto permanentemente?");
            if (confirmar) {
                const { error } = await supabase.from('catalogo').delete().eq('id', id);
                if (error) {
                    alert("Erro ao excluir: " + error.message);
                } else {
                    buscarProdutos(true);
                    carregarDashboard();
                }
            }
        });
    });

    document.querySelectorAll('.editable-field').forEach(el => {
        el.addEventListener('click', (e) => {
            e.stopPropagation();
            iniciarEdicao(el);
        });
    });
}

// Edição inline
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
                <option value="LP">LP</option>
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

// Salvar novo produto
async function salvarProduto() {
    const tituloInput = document.getElementById('addTitulo').value.trim();
    const artistaInput = document.getElementById('addArtista').value.trim();

    const titulo = tituloInput !== '' ? tituloInput : "Sem identificação";
    const artista = artistaInput !== '' ? artistaInput : "Sem identificação";

    const btn = document.getElementById('btnSalvar');
    btn.innerText = "A guardar...";
    btn.disabled = true;

    let podeLancarVal = document.getElementById('addPodeLancar').value;
    if (podeLancarVal === '') podeLancarVal = null;
    else if (podeLancarVal === 'true') podeLancarVal = true;
    else podeLancarVal = false;

    const gravadora = document.getElementById('addGravadora').value || null;

    const novoProduto = {
        titulo,
        artista,
        gravadora,
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
        alert("Erro ao registar. Veja o console.");
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
    carregarDashboard();
}

// Exportar CSV
async function exportarCSV() {
    let query = supabase.from('catalogo').select('*');

    if (currentSearch) {
        const termoLimpo = currentSearch.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
        query = query.ilike('texto_busca', `%${termoLimpo}%`);
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

// Exportar PDF
async function exportarPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape' });

    let query = supabase.from('catalogo').select('*');

    if (currentSearch) {
        const termoLimpo = currentSearch.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
        query = query.ilike('texto_busca', `%${termoLimpo}%`);
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

// Abrir formulário
function abrirFormularioComPreenchimento() {
    addSection.classList.remove('hidden');
    noResultsMsg.classList.add('hidden');
    document.getElementById('addTitulo').value = currentSearch;
    document.getElementById('addTitulo').focus();
}

// Eventos
let timeoutId = null;

function debounceBuscar() {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => buscarProdutos(true), 400);
}

async function buscarUltimoND() {
    const el = document.getElementById('ultimoNDInfo');
    if (!el) return;

    const prefixos = {
        'ND-TP': 'Tape',
        'ND-CD': 'CD',
        'ND-LP': 'LP',
        'ND-VN': 'Vinil',
        'ND-DT': 'DATE'
    };

    const { data, error } = await supabase
        .from('catalogo')
        .select('numero')
        .ilike('numero', 'ND-%');

    if (error) {
        console.error('Erro ao buscar último ND:', error);
        el.textContent = 'Erro ao carregar';
        return;
    }

    const maiores = {};

    Object.keys(prefixos).forEach(prefixo => {
        maiores[prefixo] = 0;
    });

    (data || []).forEach(item => {
        const numero = (item.numero || '').trim();

        Object.keys(prefixos).forEach(prefixo => {
            const regex = new RegExp(`^${prefixo}(\\d+)$`, 'i');
            const match = numero.match(regex);

            if (match) {
                const valor = parseInt(match[1], 10);

                if (valor > maiores[prefixo]) {
                    maiores[prefixo] = valor;
                }
            }
        });
    });

    const html = Object.entries(prefixos)
        .map(([prefixo, label]) => {
            const maior = maiores[prefixo];

            if (!maior) {
                return `
                    <span class="inline-flex items-center gap-1 bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1 mr-2 mb-2">
                        <span class="text-zinc-400">${label}:</span>
                        <strong class="text-zinc-500">Nenhum</strong>
                    </span>
                `;
            }

            return `
                <span class="inline-flex items-center gap-1 bg-zinc-800 border border-yellow-700/40 rounded-lg px-2 py-1 mr-2 mb-2">
                    <span class="text-zinc-400">${label}:</span>
                    <strong class="text-yellow-400">${prefixo}${String(maior).padStart(4, '0')}</strong>
                </span>
            `;
        })
        .join('');

    el.innerHTML = html;
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

// Filtros recolhíveis
const filterContent = document.getElementById('filterContent');
const toggleBtn = document.getElementById('toggleFiltersBtn');

if (filterContent && toggleBtn) {
    let filtersVisible = false;

    toggleBtn.addEventListener('click', () => {
        if (filtersVisible) {
            filterContent.style.display = 'none';
            toggleBtn.innerHTML = '<span>🔍</span> Filtros';
        } else {
            filterContent.style.display = 'block';
            toggleBtn.innerHTML = '<span>✖</span> Fechar';
        }

        filtersVisible = !filtersVisible;
    });

    filterContent.style.display = 'none';
}

// Inicialização
gerarOpcoesPrateleiras();
carregarOpcoesGravadoras();
buscarProdutos(true);
buscarUltimoND();
