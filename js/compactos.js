import { supabase } from './supabase-client.js';

export async function criarGrupoCompacto(produtosIds, prateleira) {
    if (!produtosIds || produtosIds.length < 2) {
        return { sucesso: false, mensagem: 'Selecione pelo menos 2 produtos.' };
    }

    // Validar prateleiras
    const { data: produtos, error: fetchError } = await supabase
        .from('catalogo')
        .select('id, prateleira')
        .in('id', produtosIds);

    if (fetchError) {
        console.error(fetchError);
        return { sucesso: false, mensagem: 'Erro ao validar prateleiras.' };
    }

    const prateleiras = [...new Set(produtos.map(p => p.prateleira).filter(Boolean))];
    if (prateleiras.length !== 1 || prateleiras[0] !== prateleira) {
        return { sucesso: false, mensagem: `Todos os produtos devem pertencer à prateleira "${prateleira}".` };
    }

    // Verificar se já pertencem a algum grupo
    const { data: gruposExistentes, error: grupoError } = await supabase
        .from('grupos_compactos')
        .select('produtos_ids')
        .contains('produtos_ids', produtosIds.map(id => Number(id)));

    if (grupoError) {
        console.error(grupoError);
        return { sucesso: false, mensagem: 'Erro ao verificar grupos existentes.' };
    }

    if (gruposExistentes && gruposExistentes.length > 0) {
        return { sucesso: false, mensagem: 'Um ou mais produtos já pertencem a um grupo compacto.' };
    }

    // Buscar títulos para descrição
    const { data: detalhesProdutos } = await supabase
        .from('catalogo')
        .select('titulo')
        .in('id', produtosIds);
    const titulos = (detalhesProdutos || []).map(p => (p.titulo || 'Sem título').split('/')[0].trim());
    const descricao = titulos.join(' / ');

    // Código temporário (evita NOT NULL)
    const codigoTemp = `TEMP-${Date.now()}`;

    const { data: novoGrupo, error: insertError } = await supabase
        .from('grupos_compactos')
        .insert({
            produtos_ids: produtosIds.map(id => Number(id)),
            descricao,
            prateleira,
            codigo: codigoTemp
        })
        .select()
        .single();

    if (insertError) {
        console.error(insertError);
        return { sucesso: false, mensagem: 'Erro ao criar grupo. Verifique se a tabela existe e as permissões RLS.' };
    }

    // Gerar código definitivo baseado no ID
    const codigoFinal = `CMP-${String(novoGrupo.id).padStart(8, '0')}`;
    const { error: updateError } = await supabase
        .from('grupos_compactos')
        .update({ codigo: codigoFinal })
        .eq('id', novoGrupo.id);

    if (updateError) {
        console.warn('Erro ao atualizar código final:', updateError);
    }

    return { sucesso: true, mensagem: `Grupo compacto criado! Código: ${codigoFinal}`, grupo: { ...novoGrupo, codigo: codigoFinal } };
}

export async function removerGrupoCompacto(grupoId) {
    const { error } = await supabase
        .from('grupos_compactos')
        .delete()
        .eq('id', grupoId);
    if (error) {
        console.error(error);
        return false;
    }
    return true;
}

export async function listarGruposCompactos(prateleira = null) {
    let query = supabase.from('grupos_compactos').select('*');
    if (prateleira) query = query.eq('prateleira', prateleira);
    const { data, error } = await query.order('id', { ascending: false });
    if (error) {
        console.error(error);
        return [];
    }
    return data || [];
}