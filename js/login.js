import { supabase } from './supabase-client.js';

function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

document.addEventListener('DOMContentLoaded', () => {
    verificarNovidades();

    const senhaInput = document.getElementById('senha');
    if (senhaInput) {
        senhaInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') window.realizarLogin();
        });
    }
});

async function verificarNovidades() {
    try {
        const response = await fetch('novidades.json');
        if (!response.ok) throw new Error('Não foi possível carregar o arquivo de novidades.');
        
        const novidades = await response.json();
        const info = novidades[0];

        const versaoVista = localStorage.getItem('somax_news_version');

        if (info && info.ativo && info.versao !== versaoVista) {
            exibirModalNovidades(info);
        }
    } catch (err) {
        console.error("Erro ao carregar avisos iniciais:", err);
    }
}

function exibirModalNovidades(info) {
    const modal = document.getElementById('modal-novidades');
    const lista = document.getElementById('news-list');
    const titleElem = document.getElementById('news-title');
    const messageElem = document.getElementById('news-message');
    const footerElem = document.getElementById('news-footer');

    if (titleElem) titleElem.innerText = info.titulo;
    if (messageElem) messageElem.innerText = info.mensagem;
    
    // Corrigido: usa agradecimento, contato e informativo
    if (footerElem) {
        footerElem.innerHTML = `
            <div class="font-bold text-gold-400 mb-2">${escapeHtml(info.rodape.agradecimento)}</div>
            <div class="text-[10px] text-gray-500 italic border-t border-white/5 pt-3 leading-relaxed">
                ${escapeHtml(info.rodape.contato)}<br>
                <span class="text-gray-600 text-[9px]">${escapeHtml(info.rodape.informativo)}</span>
            </div>
        `;
    }

    if (lista) {
        lista.innerHTML = '';
        info.itens.forEach(item => {
            lista.innerHTML += `
                <li class="flex items-start gap-3 text-gray-300 text-sm">
                    <i data-lucide="check-circle-2" class="w-5 h-5 text-gold-500 shrink-0"></i>
                    <span>${escapeHtml(item)}</span>
                </li>
            `;
        });
    }

    if (window.lucide) lucide.createIcons();
    modal.classList.remove('hidden');
}

window.fecharNovidades = function() {
    const modal = document.getElementById('modal-novidades');
    // Salva a versão. Ajuste se quiser que apareça apenas uma vez por versão
    localStorage.setItem('somax_news_version', "2.1"); 
    modal.classList.add('hidden');
}

window.realizarLogin = async function() {
    const usuario = document.getElementById('usuario').value.trim();
    const senha = document.getElementById('senha').value;

    if (!usuario || !senha) {
        alert('Preencha o seu usuário e a senha fornecida pelo administrativo.');
        return;
    }

    const emailCompleto = `${usuario}@somax.com.br`;

    const { data, error } = await supabase.auth.signInWithPassword({
        email: emailCompleto,
        password: senha
    });

    if (error) {
        alert('Erro no acesso: ' + error.message);
    } else {
        localStorage.setItem('somax_last_login_date', new Date().toISOString());
        const redirectTo = sessionStorage.getItem('redirect_after_login') || 'index.html';
        sessionStorage.removeItem('redirect_after_login');
        window.location.href = redirectTo;
    }
};