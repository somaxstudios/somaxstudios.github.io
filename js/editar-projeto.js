import { supabase } from './supabase-config.js';

// ==================== VARIÁVEIS DO DOM ====================
const statusGeral = document.getElementById('status_geral');
const statusGeralDataInicioDiv = document.getElementById('status-geral-data-inicio');
const statusGeralDataConclusaoDiv = document.getElementById('status-geral-data-conclusao');
const statusGeralDataInicio = document.getElementById('status_geral_data_inicio');
const statusGeralDataConclusao = document.getElementById('status_geral_data_conclusao');

const capaStatus = document.getElementById('capa_status');
const capaDataInicioDiv = document.getElementById('capa-data-inicio');
const capaDataConclusaoDiv = document.getElementById('capa-data-conclusao');
const capaDataInicio = document.getElementById('capa_data_inicio');
const capaDataConclusao = document.getElementById('capa_data_conclusao');

const formatoSelect = document.getElementById('formato');
const configFaixas = document.getElementById('config-faixas');
const faixasContainer = document.getElementById('faixas-container');
const numFaixasInput = document.getElementById('num-faixas');
const gerarFaixasBtn = document.getElementById('gerar-faixas');
const faixaTemplate = document.getElementById('faixa-template');

// ==================== FUNÇÕES AUXILIARES ====================
async function obterOuCriarPessoa(dadosPessoa) {
    const { nome_completo, nome_artistico, cpf } = dadosPessoa;

    if (cpf && cpf.trim() !== '') {
        const { data, error } = await supabase
            .from('pessoas')
            .select('id')
            .eq('cpf', cpf)
            .maybeSingle();
        if (error) throw error;
        if (data) return data.id;
    }

    if (nome_completo && nome_completo.trim() !== '') {
        const { data, error } = await supabase
            .from('pessoas')
            .select('id')
            .eq('nome_completo', nome_completo)
            .maybeSingle();
        if (error) throw error;
        if (data) return data.id;
    }

    const { data, error } = await supabase
        .from('pessoas')
        .insert({
            nome_completo: nome_completo || null,
            nome_artistico: nome_artistico || null,
            cpf: cpf || null,
        })
        .select('id')
        .single();

    if (error) throw error;
    return data.id;
}

function validarStatusComDatas() {
    const statusGeralVal = document.getElementById('status_geral')?.value;
    const statusGeralInicio = document.getElementById('status_geral_data_inicio')?.value;
    const statusGeralConclusao = document.getElementById('status_geral_data_conclusao')?.value;

    const capaStatusVal = document.getElementById('capa_status')?.value;
    const capaInicio = document.getElementById('capa_data_inicio')?.value;
    const capaConclusao = document.getElementById('capa_data_conclusao')?.value;

    if (statusGeralVal === 'EM_ANDAMENTO' && !statusGeralInicio) {
        throw new Error('Informe a data de início do projeto.');
    }

    if (statusGeralVal === 'CONCLUIDO') {
        if (!statusGeralInicio || !statusGeralConclusao) {
            throw new Error('Informe a data de início e conclusão do projeto.');
        }
        if (statusGeralConclusao < statusGeralInicio) {
            throw new Error('A data de conclusão do projeto não pode ser menor que a data de início.');
        }
    }

    if (capaStatusVal === 'EM_ANDAMENTO' && !capaInicio) {
        throw new Error('Informe a data de início da capa.');
    }

    if (capaStatusVal === 'CONCLUIDO') {
        if (!capaInicio || !capaConclusao) {
            throw new Error('Informe a data de início e conclusão da capa.');
        }
        if (capaConclusao < capaInicio) {
            throw new Error('A data de conclusão da capa não pode ser menor que a data de início.');
        }
    }

    const faixas = document.querySelectorAll('.faixa-item');

    for (let i = 0; i < faixas.length; i++) {
        const faixa = faixas[i];
        const titulo = faixa.querySelector('input[name^="faixa_titulo"]')?.value || `Faixa ${i + 1}`;
        const status = faixa.querySelector('select[name^="faixa_audio_status"]')?.value;
        const inicio = faixa.querySelector('input[name^="faixa_audio_inicio"]')?.value;
        const conclusao = faixa.querySelector('input[name^="faixa_audio_conclusao"]')?.value;

        if (status === 'EM_ANDAMENTO' && !inicio) {
            throw new Error(`Informe a data de início do áudio da faixa "${titulo}".`);
        }

        if (status === 'CONCLUIDO') {
            if (!inicio || !conclusao) {
                throw new Error(`Informe a data de início e conclusão do áudio da faixa "${titulo}".`);
            }
            if (conclusao < inicio) {
                throw new Error(`A data de conclusão do áudio da faixa "${titulo}" não pode ser menor que a data de início.`);
            }
        }
    }
}

// ==================== FUNÇÕES DE ATUALIZAÇÃO DE DATAS ====================
function atualizarDatasStatusGeral() {
    const status = statusGeral.value;
    statusGeralDataInicioDiv.classList.add('hidden');
    statusGeralDataConclusaoDiv.classList.add('hidden');

    if (status === 'AINDA_NAO_TEM') {
        statusGeralDataInicio.value = '';
        statusGeralDataConclusao.value = '';
    } else if (status === 'EM_ANDAMENTO') {
        statusGeralDataInicioDiv.classList.remove('hidden');
        statusGeralDataConclusao.value = '';
    } else if (status === 'CONCLUIDO') {
        statusGeralDataInicioDiv.classList.remove('hidden');
        statusGeralDataConclusaoDiv.classList.remove('hidden');
    }
}

function atualizarDatasCapa() {
    const status = capaStatus.value;
    capaDataInicioDiv.classList.add('hidden');
    capaDataConclusaoDiv.classList.add('hidden');

    if (status === 'AINDA_NAO_TEM') {
        capaDataInicio.value = '';
        capaDataConclusao.value = '';
    } else if (status === 'EM_ANDAMENTO') {
        capaDataInicioDiv.classList.remove('hidden');
        capaDataConclusao.value = '';
    } else if (status === 'CONCLUIDO') {
        capaDataInicioDiv.classList.remove('hidden');
        capaDataConclusaoDiv.classList.remove('hidden');
    }
}

function atualizarDatasAudio(selectElement) {
    const parent = selectElement.closest('.faixa-item');
    const inicioDiv = parent.querySelector('.audio-data-inicio');
    const conclusaoDiv = parent.querySelector('.audio-data-conclusao');
    const inputInicio = inicioDiv.querySelector('input');
    const inputConclusao = conclusaoDiv.querySelector('input');

    inicioDiv.classList.add('hidden');
    conclusaoDiv.classList.add('hidden');

    if (selectElement.value === 'AINDA_NAO_TEM') {
        inputInicio.value = '';
        inputConclusao.value = '';
    } else if (selectElement.value === 'EM_ANDAMENTO') {
        inicioDiv.classList.remove('hidden');
        inputConclusao.value = '';
    } else if (selectElement.value === 'CONCLUIDO') {
        inicioDiv.classList.remove('hidden');
        conclusaoDiv.classList.remove('hidden');
    }
}

// ==================== FUNÇÕES PARA CÁLCULO DO STATUS DO PROJETO ====================
function calcularStatusAudioProjeto(faixas) {
    const statuses = [...faixas].map(faixa =>
        faixa.querySelector('select[name^="faixa_audio_status"]')?.value || 'AINDA_NAO_TEM'
    );

    if (statuses.length > 0 && statuses.every(s => s === 'CONCLUIDO')) {
        return 'CONCLUIDO';
    }

    if (statuses.some(s => s === 'EM_ANDAMENTO' || s === 'CONCLUIDO')) {
        return 'EM_ANDAMENTO';
    }

    return 'AINDA_NAO_TEM';
}

function calcularDatasAudioProjeto(faixas) {
    const inicios = [];
    const conclusoes = [];

    [...faixas].forEach(faixa => {
        const status = faixa.querySelector('select[name^="faixa_audio_status"]')?.value;
        const inicio = faixa.querySelector('input[name^="faixa_audio_inicio"]')?.value;
        const conclusao = faixa.querySelector('input[name^="faixa_audio_conclusao"]')?.value;

        if ((status === 'EM_ANDAMENTO' || status === 'CONCLUIDO') && inicio) {
            inicios.push(inicio);
        }

        if (status === 'CONCLUIDO' && conclusao) {
            conclusoes.push(conclusao);
        }
    });

    return {
        audio_data_inicio: inicios.length ? inicios.sort()[0] : null,
        audio_data_conclusao: conclusoes.length === faixas.length && conclusoes.length > 0
            ? conclusoes.sort().slice(-1)[0]
            : null
    };
}

// ==================== MANIPULAÇÃO DE LINHAS ====================
function adicionarLinhaParticipante(container, tipo, faixaIndex, pessoa = {}) {
    const div = document.createElement('div');
    div.className = 'grid grid-cols-1 md:grid-cols-4 gap-2 items-end';
    div.innerHTML = `
        <input type="text" placeholder="Nome artístico" name="${tipo}_artistico[${faixaIndex}][]" value="${pessoa.nome_artistico || ''}" class="w-full px-3 py-2 border border-gray-300 rounded-lg">
        <input type="text" placeholder="Nome completo" name="${tipo}_completo[${faixaIndex}][]" value="${pessoa.nome_completo || ''}" class="w-full px-3 py-2 border border-gray-300 rounded-lg">
        <input type="text" placeholder="CPF" name="${tipo}_cpf[${faixaIndex}][]" value="${pessoa.cpf || ''}" class="w-full px-3 py-2 border border-gray-300 rounded-lg">
        <button type="button" class="remover-${tipo} text-red-500 text-sm px-2">Remover</button>
    `;
    container.appendChild(div);
    div.querySelector(`.remover-${tipo}`).addEventListener('click', () => div.remove());
}

function adicionarLinhaGlobal(container, tipo, pessoa = {}) {
    const div = document.createElement('div');
    div.className = 'grid grid-cols-1 md:grid-cols-4 gap-2 items-end';
    div.innerHTML = `
        <input type="text" placeholder="Nome artístico" name="${tipo}_artistico[]" value="${pessoa.nome_artistico || ''}" class="w-full px-3 py-2 border border-gray-300 rounded-lg">
        <input type="text" placeholder="Nome completo" name="${tipo}_completo[]" value="${pessoa.nome_completo || ''}" class="w-full px-3 py-2 border border-gray-300 rounded-lg">
        <input type="text" placeholder="CPF" name="${tipo}_cpf[]" value="${pessoa.cpf || ''}" class="w-full px-3 py-2 border border-gray-300 rounded-lg">
        <button type="button" class="remover-${tipo} text-red-500 text-sm px-2">Remover</button>
    `;
    container.appendChild(div);
    div.querySelector(`.remover-${tipo}`).addEventListener('click', () => div.remove());
}

function adicionarLinhaMusico(container, pessoa = {}, instrumento = '') {
    const div = document.createElement('div');
    div.className = 'grid grid-cols-1 md:grid-cols-5 gap-2 items-end';
    div.innerHTML = `
        <input type="text" placeholder="Nome artístico" name="musico_artistico[]" value="${pessoa.nome_artistico || ''}" class="w-full px-3 py-2 border border-gray-300 rounded-lg">
        <input type="text" placeholder="Nome completo" name="musico_completo[]" value="${pessoa.nome_completo || ''}" class="w-full px-3 py-2 border border-gray-300 rounded-lg">
        <input type="text" placeholder="CPF" name="musico_cpf[]" value="${pessoa.cpf || ''}" class="w-full px-3 py-2 border border-gray-300 rounded-lg">
        <input type="text" placeholder="Instrumento" name="musico_instrumento[]" value="${instrumento || ''}" class="w-full px-3 py-2 border border-gray-300 rounded-lg">
        <button type="button" class="remover-musico text-red-500 text-sm px-2">Remover</button>
    `;
    container.appendChild(div);
    div.querySelector('.remover-musico').addEventListener('click', () => div.remove());
}

// ==================== MANIPULAÇÃO DE FAIXAS ====================
function criarFaixa(index) {
    const clone = faixaTemplate.content.cloneNode(true);
    const faixaDiv = clone.querySelector('.faixa-item');
    faixaDiv.dataset.index = index;

    faixaDiv.querySelectorAll('[name*="[]"]').forEach(el => {
        const name = el.getAttribute('name');
        const newName = name.replace(/\[\]$/, `[${index}]`);
        el.setAttribute('name', newName);
    });

    faixaDiv.querySelectorAll('.audio-status-select').forEach(select => {
        select.addEventListener('change', function () {
            atualizarDatasAudio(this);
        });
    });

    const removerBtn = faixaDiv.querySelector('.remover-faixa');
    removerBtn.addEventListener('click', function() {
        faixaDiv.remove();
        reindexarFaixas();
    });

    faixaDiv.querySelector('.adicionar-compositor').addEventListener('click', function(e) {
        const container = faixaDiv.querySelector('.compositores-container');
        adicionarLinhaParticipante(container, 'compositor', index);
    });

    faixaDiv.querySelector('.adicionar-interprete').addEventListener('click', function(e) {
        const container = faixaDiv.querySelector('.interpretes-container');
        adicionarLinhaParticipante(container, 'interprete', index);
    });

    return faixaDiv;
}

function reindexarFaixas() {
    const faixas = document.querySelectorAll('.faixa-item');
    faixas.forEach((faixa, idx) => {
        faixa.dataset.index = idx;
        const tituloH3 = faixa.querySelector('h3');
        if (tituloH3) tituloH3.innerText = `Faixa ${idx + 1}`;

        faixa.querySelectorAll('[name*="["]').forEach(el => {
            const name = el.getAttribute('name');
            const newName = name.replace(/\[\d+\]/, `[${idx}]`);
            el.setAttribute('name', newName);
        });

        const removerBtn = faixa.querySelector('.remover-faixa');
        if (faixas.length > 1) {
            removerBtn.classList.remove('hidden');
        } else {
            removerBtn.classList.add('hidden');
        }
    });
}

function gerarFaixas(quantidade) {
    faixasContainer.innerHTML = '';
    for (let i = 0; i < quantidade; i++) {
        const novaFaixa = criarFaixa(i);
        faixasContainer.appendChild(novaFaixa);
    }
    reindexarFaixas();
}

// ==================== LÓGICA DE CARREGAMENTO DOS DADOS PARA EDIÇÃO ====================
const urlParams = new URLSearchParams(window.location.search);
const projetoId = urlParams.get('id');

if (!projetoId) {
    alert('ID do projeto não informado.');
    window.location.href = 'gerenciar-projetos.html';
}

let projetoData = null;
let faixasData = [];
let participantesData = [];

async function carregarDados() {
    try {
        const { data: projeto, error: erroProj } = await supabase
            .from('projetos')
            .select('*')
            .eq('id', projetoId)
            .single();
        if (erroProj) throw erroProj;
        projetoData = projeto;

        const { data: faixas, error: erroFaixas } = await supabase
            .from('faixas')
            .select('*')
            .eq('projeto_id', projetoId)
            .order('numero_faixa');
        if (erroFaixas) throw erroFaixas;
        faixasData = faixas;

        const { data: participantes, error: erroPart } = await supabase
            .from('projeto_participantes')
            .select('*, pessoas(*)')
            .eq('projeto_id', projetoId);
        if (erroPart) throw erroPart;
        participantesData = participantes;

        preencherFormulario();
    } catch (error) {
        console.error(error);
        alert('Erro ao carregar dados: ' + error.message);
        window.location.href = 'gerenciar-projetos.html';
    }
}

function preencherFormulario() {
    document.getElementById('nome_projeto').value = projetoData.nome_projeto || '';
    document.getElementById('titulo_principal').value = projetoData.titulo || '';
    document.getElementById('feat_projeto').value = projetoData.feat_projeto || '';
    document.getElementById('formato').value = projetoData.formato || 'SINGLE';
    document.getElementById('data_lancamento').value = projetoData.data_lancamento || '';
    
    const generoSub = projetoData.genero_subgenero || '';
    const partes = generoSub.split(' / ');
    document.getElementById('genero').value = partes[0] || '';
    document.getElementById('subgenero').value = partes[1] || '';
    
    document.getElementById('label').value = projetoData.label || '';
    document.getElementById('status_geral').value = projetoData.status_geral || 'AINDA_NAO_TEM';
    document.getElementById('status_geral_data_inicio').value = projetoData.status_geral_data_inicio || '';
    document.getElementById('status_geral_data_conclusao').value = projetoData.status_geral_data_conclusao || '';
    document.getElementById('is_prioridade').checked = projetoData.is_prioridade || false;
    document.getElementById('capa_status').value = projetoData.capa_status || 'AINDA_NAO_TEM';
    document.getElementById('capa_data_inicio').value = projetoData.capa_data_inicio || '';
    document.getElementById('capa_data_conclusao').value = projetoData.capa_data_conclusao || '';
    document.getElementById('spotify_id').value = projetoData.spotify_id || '';
    document.getElementById('apple_music_id').value = projetoData.apple_music_id || '';
    document.getElementById('backup_url').value = projetoData.backup_url || '';
    document.getElementById('release_texto').value = projetoData.release_texto || '';
    document.getElementById('notas').value = projetoData.notas || '';
    document.getElementById('distribuidora').value = projetoData.distribuidora || '';

    atualizarDatasStatusGeral();
    atualizarDatasCapa();

    const formato = projetoData.formato;
    if (formato === 'SINGLE') {
        gerarFaixas(1);
    } else {
        document.getElementById('config-faixas').classList.remove('hidden');
        document.getElementById('num-faixas').value = faixasData.length || 2;
        gerarFaixas(faixasData.length || 2);
    }

    faixasData.forEach((faixa, index) => {
        const faixaDiv = document.querySelector(`.faixa-item[data-index="${index}"]`);
        if (!faixaDiv) return;

        faixaDiv.querySelector('input[name^="faixa_titulo"]').value = faixa.titulo || '';
        faixaDiv.querySelector('input[name^="faixa_isrc"]').value = faixa.isrc || '';
        faixaDiv.querySelector('input[name^="faixa_hook"]').value = faixa.hook_tiktok || '';
        faixaDiv.querySelector('input[name^="faixa_feat"]').value = faixa.feat || '';
        faixaDiv.querySelector('textarea[name^="faixa_letra"]').value = faixa.letra || '';
        const audioSelect = faixaDiv.querySelector('select[name^="faixa_audio_status"]');
        audioSelect.value = faixa.audio_status || 'AINDA_NAO_TEM';
        
        atualizarDatasAudio(audioSelect);
        faixaDiv.querySelector('input[name^="faixa_audio_inicio"]').value = faixa.audio_data_inicio || '';
        faixaDiv.querySelector('input[name^="faixa_audio_conclusao"]').value = faixa.audio_data_conclusao || '';

        const compositores = participantesData.filter(p => p.faixa_id === faixa.id && p.papel === 'AUTOR');
        const compContainer = faixaDiv.querySelector('.compositores-container');
        compositores.forEach(comp => {
            adicionarLinhaParticipante(compContainer, 'compositor', index, comp.pessoas);
        });

        const interpretes = participantesData.filter(p => p.faixa_id === faixa.id && p.papel === 'INTERPRETE');
        const interpContainer = faixaDiv.querySelector('.interpretes-container');
        interpretes.forEach(interp => {
            adicionarLinhaParticipante(interpContainer, 'interprete', index, interp.pessoas);
        });
    });

    const produtores = participantesData.filter(p => !p.faixa_id && p.papel === 'PRODUTOR_MUSICAL');
    const prodContainer = document.getElementById('produtores-container');
    produtores.forEach(prod => {
        adicionarLinhaGlobal(prodContainer, 'produtor', prod.pessoas);
    });

    const musicos = participantesData.filter(p => !p.faixa_id && p.papel === 'MUSICO');
    const musContainer = document.getElementById('musicos-container');
    musicos.forEach(mus => {
        adicionarLinhaMusico(musContainer, mus.pessoas, mus.instrumento);
    });
}

// ==================== SUBMISSÃO DO FORMULÁRIO (UPDATE) ====================
document.getElementById('form-lancamento').addEventListener('submit', async function (event) {
    event.preventDefault();
    const btnSalvar = document.getElementById('btn-salvar');
    btnSalvar.innerText = 'Atualizando...';
    btnSalvar.disabled = true;

    try {
        validarStatusComDatas();

        const faixas = document.querySelectorAll('.faixa-item');
        const audio_status = calcularStatusAudioProjeto(faixas);
        const { audio_data_inicio, audio_data_conclusao } = calcularDatasAudioProjeto(faixas);

        const statusGeralVal = document.getElementById('status_geral').value;

        const projetoUpdate = {
            nome_projeto: document.getElementById('nome_projeto').value,
            titulo: document.getElementById('titulo_principal').value || null,
            feat_projeto: document.getElementById('feat_projeto')?.value || null,
            formato: document.getElementById('formato').value,
            data_lancamento: document.getElementById('data_lancamento').value || null,
            genero_subgenero: (document.getElementById('genero').value + (document.getElementById('subgenero').value ? ' / ' + document.getElementById('subgenero').value : '')).trim() || null,
            label: document.getElementById('label').value || null,
            is_prioridade: document.getElementById('is_prioridade').checked,
            status_geral: statusGeralVal,
            status_geral_data_inicio: document.getElementById('status_geral_data_inicio').value || null,
            status_geral_data_conclusao: document.getElementById('status_geral_data_conclusao').value || null,
            distribuidora: document.getElementById('distribuidora').value || null,
            spotify_id: document.getElementById('spotify_id').value || null,
            apple_music_id: document.getElementById('apple_music_id').value || null,
            backup_url: document.getElementById('backup_url').value || null,
            release_texto: document.getElementById('release_texto').value || null,
            notas: document.getElementById('notas').value || null,
            capa_status: document.getElementById('capa_status').value,
            capa_data_inicio: document.getElementById('capa_data_inicio').value || null,
            capa_data_conclusao: document.getElementById('capa_data_conclusao').value || null,
            audio_status,
            audio_data_inicio,
            audio_data_conclusao,
            // NOVO: definir ja_lancado com base no status_geral
            ja_lancado: statusGeralVal === 'CONCLUIDO' ? true : false
        };

        const { error: erroUpdate } = await supabase
            .from('projetos')
            .update(projetoUpdate)
            .eq('id', projetoId);

        if (erroUpdate) throw erroUpdate;

        await supabase.from('projeto_participantes').delete().eq('projeto_id', projetoId);
        await supabase.from('faixas').delete().eq('projeto_id', projetoId);

        for (let i = 0; i < faixas.length; i++) {
            const faixa = faixas[i];
            const titulo = faixa.querySelector('input[name^="faixa_titulo"]').value;
            const isrc = faixa.querySelector('input[name^="faixa_isrc"]')?.value || null;
            const hook = faixa.querySelector('input[name^="faixa_hook"]')?.value || null;
            const feat = faixa.querySelector('input[name^="faixa_feat"]')?.value || null;
            const letra = faixa.querySelector('textarea[name^="faixa_letra"]')?.value || null;
            const audioStatus = faixa.querySelector('select[name^="faixa_audio_status"]').value;
            const audioInicio = faixa.querySelector('input[name^="faixa_audio_inicio"]')?.value || null;
            const audioConclusao = faixa.querySelector('input[name^="faixa_audio_conclusao"]')?.value || null;

            const { data: faixaInserida, error: erroFaixa } = await supabase
                .from('faixas')
                .insert({
                    projeto_id: projetoId,
                    titulo: titulo,
                    isrc: isrc,
                    hook_tiktok: hook,
                    feat: feat,
                    letra: letra,
                    audio_status: audioStatus,
                    audio_data_inicio: audioInicio,
                    audio_data_conclusao: audioConclusao,
                    numero_faixa: i + 1
                })
                .select('id')
                .single();

            if (erroFaixa) throw erroFaixa;
            const faixaId = faixaInserida.id;

            const compositoresRows = faixa.querySelectorAll('.compositores-container .grid');
            for (let row of compositoresRows) {
                const nomeArtistico = row.querySelector('input[name^="compositor_artistico"]')?.value;
                const nomeCompleto = row.querySelector('input[name^="compositor_completo"]')?.value;
                const cpf = row.querySelector('input[name^="compositor_cpf"]')?.value;

                if (!nomeCompleto && !cpf) continue;

                const pessoaId = await obterOuCriarPessoa({ nome_completo: nomeCompleto, nome_artistico: nomeArtistico, cpf: cpf });

                await supabase.from('projeto_participantes').insert({
                    projeto_id: projetoId,
                    faixa_id: faixaId,
                    pessoa_id: pessoaId,
                    papel: 'AUTOR',
                });
            }

            const interpretesRows = faixa.querySelectorAll('.interpretes-container .grid');
            for (let row of interpretesRows) {
                const nomeArtistico = row.querySelector('input[name^="interprete_artistico"]')?.value;
                const nomeCompleto = row.querySelector('input[name^="interprete_completo"]')?.value;
                const cpf = row.querySelector('input[name^="interprete_cpf"]')?.value;

                if (!nomeCompleto && !cpf) continue;

                const pessoaId = await obterOuCriarPessoa({ nome_completo: nomeCompleto, nome_artistico: nomeArtistico, cpf: cpf });

                await supabase.from('projeto_participantes').insert({
                    projeto_id: projetoId,
                    faixa_id: faixaId,
                    pessoa_id: pessoaId,
                    papel: 'INTERPRETE',
                });
            }
        }

        const produtoresRows = document.querySelectorAll('#produtores-container .grid');
        for (let row of produtoresRows) {
            const nomeArtistico = row.querySelector('input[name="produtor_artistico[]"]')?.value;
            const nomeCompleto = row.querySelector('input[name="produtor_completo[]"]')?.value;
            const cpf = row.querySelector('input[name="produtor_cpf[]"]')?.value;

            if (!nomeCompleto && !cpf) continue;

            const pessoaId = await obterOuCriarPessoa({ nome_completo: nomeCompleto, nome_artistico: nomeArtistico, cpf: cpf });

            await supabase.from('projeto_participantes').insert({
                projeto_id: projetoId,
                faixa_id: null,
                pessoa_id: pessoaId,
                papel: 'PRODUTOR_MUSICAL',
            });
        }

        const musicosRows = document.querySelectorAll('#musicos-container .grid');
        for (let row of musicosRows) {
            const nomeArtistico = row.querySelector('input[name="musico_artistico[]"]')?.value;
            const nomeCompleto = row.querySelector('input[name="musico_completo[]"]')?.value;
            const cpf = row.querySelector('input[name="musico_cpf[]"]')?.value;
            const instrumento = row.querySelector('input[name="musico_instrumento[]"]')?.value;

            if (!nomeCompleto && !cpf) continue;

            const pessoaId = await obterOuCriarPessoa({ nome_completo: nomeCompleto, nome_artistico: nomeArtistico, cpf: cpf });

            await supabase.from('projeto_participantes').insert({
                projeto_id: projetoId,
                faixa_id: null,
                pessoa_id: pessoaId,
                papel: 'MUSICO',
                instrumento: instrumento || null
            });
        }

        alert('Projeto atualizado com sucesso!');
        window.location.href = 'gerenciar-projetos.html';

    } catch (error) {
        console.error('Erro ao atualizar:', error);
        alert('Erro ao atualizar o projeto: ' + error.message);
        btnSalvar.innerText = 'Atualizar Projeto';
        btnSalvar.disabled = false;
    }
});

// ==================== INICIALIZAÇÃO E LISTENERS ====================
statusGeral.addEventListener('change', atualizarDatasStatusGeral);
capaStatus.addEventListener('change', atualizarDatasCapa);

formatoSelect.addEventListener('change', function() {
    if (this.value === 'SINGLE') {
        configFaixas.classList.add('hidden');
        gerarFaixas(1);
    } else {
        configFaixas.classList.remove('hidden');
        if (faixasContainer.children.length === 0) {
            gerarFaixas(2);
        }
    }
});

gerarFaixasBtn.addEventListener('click', function() {
    const num = parseInt(numFaixasInput.value) || 2;
    gerarFaixas(num);
});

document.getElementById('adicionar-produtor').addEventListener('click', function() {
    const container = document.getElementById('produtores-container');
    adicionarLinhaGlobal(container, 'produtor');
});

document.getElementById('adicionar-musico').addEventListener('click', function() {
    const container = document.getElementById('musicos-container');
    adicionarLinhaMusico(container);
});

// Carregar os dados ao iniciar a página
carregarDados();