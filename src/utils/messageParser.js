/**
 * Parser de mensagens em português para extrair valor e descrição de gastos e ganhos
 */

// Padrões de regex para extrair GASTOS
const expensePatterns = [
    // "gastei 50 reais em mercado" ou "gastei 50 no mercado" ou "gastei 50 com mercado"
    /gastei\s+(?:r\$?\s*)?(\d+(?:[.,]\d{1,2})?)\s*(?:reais?|r\$)?\s*(?:em|no|na|de|com)?\s*(.+)/i,

    // "paguei 100 de luz"
    /paguei\s+(?:r\$?\s*)?(\d+(?:[.,]\d{1,2})?)\s*(?:reais?|r\$)?\s*(?:de|em|no|na|com|pro|pra)?\s*(.+)/i,

    // "comprei café por 20 reais" ou "comprei café 20 reais"
    /comprei\s+(.+?)\s+(?:por\s+)?(?:r\$?\s*)?(\d+(?:[.,]\d{1,2})?)\s*(?:reais?|r\$)?/i,

    // "50 reais de uber" ou "50 de uber" ou "50 gasolina"
    /^(?:r\$?\s*)?(\d+(?:[.,]\d{1,2})?)\s*(?:reais?|r\$)?\s*(?:de|em|no|na|com|pro|pra)?\s+(.+)/i,

    // "R$ 50 mercado"
    /^(?:r\$\s*)(\d+(?:[.,]\d{1,2})?)\s+(.+)/i,

    // "gasto: 50 mercado" ou "gasto 50 mercado"
    /gasto:?\s*(?:r\$?\s*)?(\d+(?:[.,]\d{1,2})?)\s*(?:reais?|r\$)?\s*(?:em|no|na|de|com)?\s*(.+)/i,

    // NOVOS: Formato simplificado "comida 35" ou "mercado 50,90"
    /^([a-zA-ZÀ-ÿ\s]+?)\s+(?:r\$?\s*)?(\d+(?:[.,]\d{1,2})?)\s*(?:reais?|r\$)?$/i,
];

// Padrões de regex para extrair GANHOS/RECEITAS
const incomePatterns = [
    // "ganhei 100 reais na diária" ou "ganhei 100 com banner"
    /ganhei\s+(?:r\$?\s*)?(\d+(?:[.,]\d{1,2})?)\s*(?:reais?|r\$)?\s*(?:na|no|com|de|em)?\s*(.+)/i,

    // "recebi 200 reais do cliente"
    /recebi\s+(?:r\$?\s*)?(\d+(?:[.,]\d{1,2})?)\s*(?:reais?|r\$)?\s*(?:do|da|de|com|no|na)?\s*(.+)/i,

    // "entrou 500 reais"
    /entrou\s+(?:r\$?\s*)?(\d+(?:[.,]\d{1,2})?)\s*(?:reais?|r\$)?\s*(?:de|do|da|com)?\s*(.+)?/i,

    // "fiz 150 reais com freelance"
    /fiz\s+(?:r\$?\s*)?(\d+(?:[.,]\d{1,2})?)\s*(?:reais?|r\$)?\s*(?:com|de|no|na)?\s*(.+)/i,

    // "vendi por 300 reais"
    /vendi\s+(.+?)\s+(?:por\s+)?(?:r\$?\s*)?(\d+(?:[.,]\d{1,2})?)\s*(?:reais?|r\$)?/i,

    // "ganho: 100 diária"
    /ganho:?\s*(?:r\$?\s*)?(\d+(?:[.,]\d{1,2})?)\s*(?:reais?|r\$)?\s*(?:de|com|no|na)?\s*(.+)/i,

    // "receita 500 venda"
    /receita:?\s*(?:r\$?\s*)?(\d+(?:[.,]\d{1,2})?)\s*(?:reais?|r\$)?\s*(?:de|com)?\s*(.+)/i,
];

// Palavras de comando para não interpretar como gasto/ganho
const commandWords = [
    'total', 'quanto', 'ajuda', 'help', 'limpar', 'deletar', 'apagar',
    'ultimos', 'últimos', 'historico', 'histórico', 'cancelar', 'desfazer',
    'confirmar', 'sim', 'não', 'nao', 'categorias', 'saldo', 'balanço', 'balanco',
    'definir', 'limite', 'limites', 'orçamento', 'orcamento', 'ver', 'gastos', 'semana',
    'conta', 'fixa', 'fixas', 'recorrente', 'meta', 'metas', 'guardar', 'gráfico', 'grafico',
    'remover', 'ontem', 'hoje', 'anteontem', 'dia'
];

/**
 * Verifica se a mensagem é um comando
 * @param {string} message - Mensagem recebida
 * @returns {boolean}
 */
export function isCommand(message) {
    const lowerMsg = message.toLowerCase().trim();
    return commandWords.some(cmd => lowerMsg.startsWith(cmd));
}

/**
 * Extrai valor e descrição de uma mensagem de GASTO
 * @param {string} message - Mensagem recebida
 * @returns {{ amount: number, description: string, type: string } | null}
 */
export function parseExpense(message) {
    if (isCommand(message)) {
        return null;
    }

    const cleanMessage = message.trim();

    // Primeiro, tentar identificar como GANHO
    for (const pattern of incomePatterns) {
        const match = cleanMessage.match(pattern);
        if (match) {
            let amount, description;

            // Padrão "vendi X por Y" tem ordem invertida
            if (pattern.source.startsWith('vendi')) {
                description = match[1];
                amount = match[2];
            } else {
                amount = match[1];
                description = match[2] || 'receita';
            }

            const numAmount = parseFloat(amount.replace(',', '.'));
            const cleanDesc = (description || 'receita')
                .trim()
                .replace(/^(na|no|com|de|do|da|em)\s+/i, '')
                .replace(/\s+/g, ' ');

            if (numAmount > 0) {
                return {
                    amount: numAmount,
                    description: cleanDesc || 'receita',
                    type: 'income'
                };
            }
        }
    }

    // Depois, tentar identificar como GASTO
    for (const pattern of expensePatterns) {
        const match = cleanMessage.match(pattern);
        if (match) {
            let amount, description;

            // Padrão "comprei café por 20" ou "comida 35" tem ordem invertida (descrição primeiro)
            if (pattern.source.startsWith('comprei') || pattern.source.startsWith('^([a-zA-Z')) {
                description = match[1];
                amount = match[2];
            } else {
                amount = match[1];
                description = match[2];
            }

            const numAmount = parseFloat(amount.replace(',', '.'));
            const cleanDesc = description
                .trim()
                .replace(/^(em|no|na|de|com|pro|pra)\s+/i, '')
                .replace(/\s+/g, ' ');

            if (numAmount > 0 && cleanDesc.length > 0) {
                return {
                    amount: numAmount,
                    description: cleanDesc,
                    type: 'expense'
                };
            }
        }
    }

    return null;
}

/**
 * Identifica o tipo de comando da mensagem
 * @param {string} message - Mensagem recebida
 * @returns {string} Tipo de comando
 */
export function getCommandType(message) {
    const lowerMsg = message.toLowerCase().trim();

    // Comandos de confirmação - verificar PRIMEIRO
    if (lowerMsg === 'confirmar' || lowerMsg === 'confirmar limpar' || lowerMsg === 'sim' || lowerMsg === 'sim, limpar') {
        return 'CONFIRM_CLEAR';
    }

    // === ORÇAMENTO ===
    if (lowerMsg.startsWith('definir limite') || lowerMsg.startsWith('limite ')) {
        return 'SET_BUDGET';
    }

    if (lowerMsg === 'ver limites' || lowerMsg === 'limites' || lowerMsg.includes('meus limites') || lowerMsg.includes('orçamento') || lowerMsg.includes('orcamento')) {
        return 'VIEW_BUDGETS';
    }

    // === CONSULTA POR PERÍODO ===
    if (lowerMsg.includes('gastos de ') || lowerMsg.includes('total de ')) {
        // Extrair nome do mês
        const monthMatch = lowerMsg.match(/(?:gastos|total)\s+(?:de|do|da)\s+(\w+)/i);
        if (monthMatch) {
            return 'MONTH_REPORT';
        }
    }

    if (lowerMsg.includes('semana') || lowerMsg.includes('últimos 7 dias') || lowerMsg.includes('ultimos 7 dias')) {
        return 'WEEK_REPORT';
    }

    // === CONSULTA POR DIA ===
    // "quanto gastei ontem", "total de ontem", "total do dia 15", "gastos de hoje"
    if (lowerMsg.includes('ontem') || lowerMsg.includes('hoje') || lowerMsg.includes('anteontem') ||
        lowerMsg.match(/(?:total|gastos?|quanto)\s+(?:do|de|no)?\s*dia\s+\d{1,2}/i) ||
        lowerMsg.match(/dia\s+\d{1,2}/i)) {
        return 'DAY_REPORT';
    }

    // === GASTOS RECORRENTES ===
    if (lowerMsg.startsWith('conta fixa') || lowerMsg.startsWith('gasto fixo') ||
        lowerMsg.includes('adicionar conta fixa')) {
        return 'ADD_RECURRING';
    }

    if (lowerMsg === 'ver contas fixas' || lowerMsg === 'contas fixas' ||
        lowerMsg.includes('minhas contas fixas') || lowerMsg === 'ver fixas') {
        return 'LIST_RECURRING';
    }

    if (lowerMsg.startsWith('remover conta fixa') || lowerMsg.startsWith('cancelar conta fixa')) {
        return 'REMOVE_RECURRING';
    }

    // === METAS ===
    if (lowerMsg.startsWith('meta ') || lowerMsg.startsWith('criar meta') ||
        lowerMsg.includes('guardar ')) {
        return 'ADD_GOAL';
    }

    if (lowerMsg === 'ver metas' || lowerMsg === 'metas' || lowerMsg.includes('minhas metas')) {
        return 'LIST_GOALS';
    }

    if (lowerMsg.startsWith('remover meta') || lowerMsg.startsWith('deletar meta')) {
        return 'REMOVE_GOAL';
    }

    // === GRÁFICOS ===
    if (lowerMsg === 'gráfico' || lowerMsg === 'grafico' || lowerMsg.includes('ver gráfico') ||
        lowerMsg.includes('ver grafico') || lowerMsg === 'pizza') {
        return 'CHART';
    }

    if (lowerMsg === 'total' || lowerMsg.includes('quanto gastei') || lowerMsg === 'resumo') {
        return 'TOTAL';
    }

    if (lowerMsg === 'saldo' || lowerMsg.includes('balanço') || lowerMsg.includes('balanco') || lowerMsg.includes('quanto tenho')) {
        return 'BALANCE';
    }

    if (lowerMsg.includes('total do mês') || lowerMsg.includes('total do mes') || lowerMsg.includes('este mês') || lowerMsg.includes('este mes')) {
        return 'TOTAL_MONTH';
    }

    if (lowerMsg.includes('últimos') || lowerMsg.includes('ultimos') || lowerMsg.includes('histórico') || lowerMsg.includes('historico')) {
        return 'HISTORY';
    }

    if (lowerMsg === 'ajuda' || lowerMsg === 'help' || lowerMsg === 'comandos') {
        return 'HELP';
    }

    if (lowerMsg.includes('limpar tudo') || lowerMsg.includes('apagar tudo') || lowerMsg.includes('deletar tudo')) {
        return 'CLEAR_ALL';
    }

    if (lowerMsg === 'desfazer' || lowerMsg === 'cancelar' || lowerMsg.includes('apagar último') || lowerMsg.includes('apagar ultimo')) {
        return 'UNDO';
    }

    if (lowerMsg.includes('categorias')) {
        return 'CATEGORIES';
    }

    if (lowerMsg === 'não' || lowerMsg === 'nao' || lowerMsg === 'cancelar limpeza') {
        return 'CANCEL';
    }

    return 'UNKNOWN';
}
