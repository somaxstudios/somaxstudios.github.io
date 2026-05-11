import { supabase } from './supabase-client.js';

/**
 * Inicialização ao carregar a página
 */
document.addEventListener('DOMContentLoaded', () => {
    // 1. Dispara o modal de novidades/avisos assim que a página abre
    verificarNovidades();

    // 2. Atalho: Login ao pressionar a tecla Enter no campo de senha
    const senhaInput = document.getElementById('senha');
    if (senhaInput) {
        senhaInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') window.realizarLogin();
        });
    }
});

/**
 * Busca o arquivo JSON e decide se exibe o modal
 */
async function verificarNovidades() {
    try {
        const response = await fetch('novidades.json');
        if (!response.ok) throw new Error('Não foi possível carregar o arquivo de novidades.');
        
        const novidades = await response.json();
        const info = novidades[0];

        // Obtém a última versão que o usuário visualizou neste navegador
        const versaoVista = localStorage.getItem('somax_news_version');

        // Exibe o modal se estiver ativo E se for uma versão que o usuário ainda não confirmou
        if (info && info.ativo && info.versao !== versaoVista) {
            exibirModalNovidades(info);
        }
    } catch (err) {
        console.error("Erro ao carregar avisos iniciais:", err);
    }
}

/**
 * Preenche e exibe o modal na tela
 */
function exibirModalNovidades(info) {
    const modal = document.getElementById('modal-novidades');
    const lista = document.getElementById('news-list');
    const titleElem = document.getElementById('news-title');
    const messageElem = document.getElementById('news-message');
    const footerElem = document.getElementById('news-footer');

    // Título e Mensagem Principal
    if (titleElem) titleElem.innerText = info.titulo;
    if (messageElem) messageElem.innerText = info.mensagem;
    
    // Construção do Rodapé Duplo (Agradecimento + Suporte Administrativo)
    if (footerElem) {
        footerElem.innerHTML = `
            <div class="font-bold text-gold-400 mb-2">${info.rodape.agradecimento}</div>
            <div class="text-[10px] text-gray-500 italic border-t border-white/5 pt-3 leading-relaxed">
                ${info.rodape.suporte}
            </div>
        `;
    }

    // Preenchimento da Lista de Novidades
    if (lista) {
        lista.innerHTML = '';
        info.itens.forEach(item => {
            lista.innerHTML += `
                <li class="flex items-start gap-3 text-gray-300 text-sm">
                    <i data-lucide="check-circle-2" class="w-5 h-5 text-gold-500 shrink-0"></i>
                    <span>${item}</span>
                </li>
            `;
        });
    }

    // Renderiza os ícones do Lucide que foram injetados no HTML
    if (window.lucide) lucide.createIcons();

    // Remove o 'hidden' para mostrar o modal
    modal.classList.remove('hidden');
}

/**
 * Fecha o modal e grava a versão no localStorage
 */
window.fecharNovidades = function() {
    const modal = document.getElementById('modal-novidades');
    
    // Grava no navegador que esta versão já foi lida (para não mostrar no próximo refresh)
    // Se quiser que apareça SEMPRE até o login, basta comentar a linha abaixo.
    localStorage.setItem('somax_news_version', "2.1"); 
    
    modal.classList.add('hidden');
}

/**
 * Lógica Principal de Autenticação
 */
window.realizarLogin = async function() {
    const usuario = document.getElementById('usuario').value.trim();
    const senha = document.getElementById('senha').value;

    // Validação básica de campos vazios
    if (!usuario || !senha) {
        alert('Preencha o seu usuário e a senha fornecida pelo administrativo.');
        return;
    }

    // Concatena o domínio da empresa para o Supabase Auth
    const emailCompleto = `${usuario}@somax.com.br`;

    // Tentativa de login via Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
        email: emailCompleto,
        password: senha
    });

    if (error) {
        // Exibe erro amigável (ex: senha incorreta ou usuário inexistente)
        alert('Erro no acesso: ' + error.message);
    } else {
        // Sucesso! Armazena metadados de login
        localStorage.setItem('somax_last_login_date', new Date().toISOString());

        // Redireciona para o destino pretendido ou para a index
        const redirectTo = sessionStorage.getItem('redirect_after_login') || 'index.html';
        sessionStorage.removeItem('redirect_after_login');
        
        window.location.href = redirectTo;
    }
};