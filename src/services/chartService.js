import { getExpensesByCategory } from '../database/db.js';

/**
 * Formata valor em reais
 */
function formatCurrency(value) {
    return value.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });
}

/**
 * Gera um gráfico de texto (ASCII art) para as categorias
 * @returns {string} Gráfico formatado
 */
export function generateTextChart() {
    const categories = getExpensesByCategory();

    if (categories.length === 0) {
        return `📊 *Gráfico de Gastos*\n\nNenhum gasto registrado ainda.`;
    }

    const total = categories.reduce((sum, cat) => sum + cat.total, 0);
    const maxBarLength = 15;

    // Emojis para as categorias
    const categoryEmojis = {
        '🍞 Alimentação': '🍞',
        '🛒 Mercado': '🛒',
        '🚗 Transporte': '🚗',
        '🏠 Moradia': '🏠',
        '🎬 Lazer': '🎬',
        '💊 Saúde': '💊',
        '📚 Educação': '📚',
        '👕 Vestuário': '👕',
        '📱 Tecnologia': '📱',
        '🐕 Pet': '🐕',
        '🎁 Presentes': '🎁',
        '💰 Outros': '💰'
    };

    let response = `📊 *Gráfico de Gastos*\n\n`;
    response += `💰 Total: ${formatCurrency(total)}\n\n`;

    for (const cat of categories) {
        const percentage = (cat.total / total) * 100;
        const barLength = Math.round((percentage / 100) * maxBarLength);
        const bar = '█'.repeat(barLength) + '░'.repeat(maxBarLength - barLength);

        // Encontrar emoji da categoria
        let emoji = '📦';
        for (const [key, value] of Object.entries(categoryEmojis)) {
            if (cat.category.includes(key.substring(2))) {
                emoji = value;
                break;
            }
        }

        // Extrair nome limpo da categoria
        const catName = cat.category.replace(/^[^\s]+\s*/, '');

        response += `${emoji} *${catName}*\n`;
        response += `[${bar}] ${percentage.toFixed(1)}%\n`;
        response += `${formatCurrency(cat.total)}\n\n`;
    }

    return response.trim();
}

/**
 * Gera gráfico de pizza em texto
 * @returns {string} Gráfico de pizza textual
 */
export function generatePieChartText() {
    const categories = getExpensesByCategory();

    if (categories.length === 0) {
        return `🥧 *Distribuição de Gastos*\n\nNenhum gasto registrado ainda.`;
    }

    const total = categories.reduce((sum, cat) => sum + cat.total, 0);

    // Símbolos para representar fatias
    const sliceSymbols = ['🔴', '🟡', '🟢', '🔵', '🟣', '🟠', '⚪', '⚫', '🟤', '🩷'];

    let response = `🥧 *Distribuição de Gastos*\n\n`;

    // Criar "pizza" visual
    let pizza = '';
    for (let i = 0; i < categories.length && i < sliceSymbols.length; i++) {
        const percentage = (categories[i].total / total) * 100;
        const sliceCount = Math.max(1, Math.round(percentage / 5)); // Cada 5% = 1 símbolo
        pizza += sliceSymbols[i].repeat(sliceCount);
    }
    response += `${pizza}\n\n`;

    // Legenda
    response += `*Legenda:*\n`;
    for (let i = 0; i < categories.length && i < sliceSymbols.length; i++) {
        const cat = categories[i];
        const percentage = (cat.total / total) * 100;
        const catName = cat.category.replace(/^[^\s]+\s*/, '');
        response += `${sliceSymbols[i]} ${catName}: ${percentage.toFixed(1)}% (${formatCurrency(cat.total)})\n`;
    }

    return response;
}

/**
 * Gera relatório visual completo
 * @returns {string} Relatório formatado
 */
export function generateVisualReport() {
    return generateTextChart();
}
