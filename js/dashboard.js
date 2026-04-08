// dashboard.js

// Variável para guardar os dados globais e usar no modal
let produtosGlobais = [];

export function inicializarDashboard(produtos) {
    produtosGlobais = produtos; // Salva para o modal
    
    const formatoCount = {};
    const prateleiraCount = {};

    produtos.forEach(produto => {
        // CORREÇÃO DO FORMATO: Remove espaços e padroniza para maiúsculo
        if (produto.formato) {
            const formato = produto.formato.trim().toUpperCase();
            formatoCount[formato] = (formatoCount[formato] || 0) + 1;
        }

        // Contagem de prateleiras
        if (produto.prateleira) {
            const prateleira = produto.prateleira.trim().toUpperCase();
            prateleiraCount[prateleira] = (prateleiraCount[prateleira] || 0) + 1;
        }
    });

    renderizarFormatos(formatoCount);
    renderizarPrateleiras(prateleiraCount);
}

function renderizarFormatos(formatoCount) {
    const container = document.getElementById('formatoStats');
    if (!container) return;
    
    container.innerHTML = '';
    // Ordena do maior para o menor
    const formatosOrdenados = Object.entries(formatoCount).sort((a, b) => b[1] - a[1]);

    formatosOrdenados.forEach(([formato, total]) => {
        container.innerHTML += `
            <div class="flex justify-between items-center bg-zinc-800 p-2 rounded">
                <span class="text-zinc-300">${formato}</span>
                <span class="font-bold text-labelAccent">${total}</span>
            </div>
        `;
    });
}

function renderizarPrateleiras(prateleiraCount) {
    const container = document.getElementById('prateleiraStats');
    if (!container) return;
    
    container.innerHTML = '';
    const prateleirasOrdenadas = Object.entries(prateleiraCount).sort((a, b) => b[1] - a[1]);

    prateleirasOrdenadas.forEach(([prateleira, total]) => {
        // Adicionamos a classe 'cursor-pointer' e o evento de clique (onclick)
        container.innerHTML += `
            <div onclick="window.abrirModalPrateleira('${prateleira}')" 
                 class="flex justify-between items-center bg-zinc-800 p-2 rounded cursor-pointer hover:bg-zinc-700 transition-colors">
                <span class="text-zinc-300">Prateleira ${prateleira}</span>
                <span class="font-bold text-purple-400">${total}</span>
            </div>
        `;
    });
}

// Função global para ser chamada pelo HTML gerado dinamicamente
window.abrirModalPrateleira = function(prateleiraClicada) {
    const modal = document.getElementById('modalPrateleira');
    const listContainer = document.getElementById('modalPrateleiraList');
    const title = document.getElementById('modalPrateleiraTitle');
    
    title.textContent = `Produtos - Prateleira ${prateleiraClicada}`;
    listContainer.innerHTML = '';

    // Filtra os produtos da prateleira específica
    const produtosFiltrados = produtosGlobais.filter(p => 
        p.prateleira && p.prateleira.trim().toUpperCase() === prateleiraClicada
    );

    if (produtosFiltrados.length === 0) {
        listContainer.innerHTML = '<li class="text-zinc-400 p-2">Nenhum produto encontrado.</li>';
    } else {
        produtosFiltrados.forEach(produto => {
            // Ajuste os campos (artista, titulo) conforme as colunas do seu banco Supabase
            listContainer.innerHTML += `
                <li class="bg-zinc-800 p-3 rounded-lg flex justify-between items-center">
                    <div>
                        <p class="text-white font-semibold">${produto.artista || 'Artista Desconhecido'}</p>
                        <p class="text-zinc-400 text-sm">${produto.titulo || 'Sem título'}</p>
                    </div>
                    <span class="bg-zinc-700 text-zinc-300 text-xs px-2 py-1 rounded">
                        ${produto.formato || '-'}
                    </span>
                </li>
            `;
        });
    }

    modal.classList.remove('hidden');
};

// Fechar o modal
document.addEventListener('DOMContentLoaded', () => {
    const closeModalBtn = document.getElementById('closeModalBtn');
    const modal = document.getElementById('modalPrateleira');
    
    if (closeModalBtn && modal) {
        closeModalBtn.addEventListener('click', () => {
            modal.classList.add('hidden');
        });

        // Fechar clicando fora da caixa
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.add('hidden');
            }
        });
    }
});