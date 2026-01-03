import {
    setBudget as dbSetBudget,
    getBudgets as dbGetBudgets,
    getBudgetByCategory,
    removeBudget as dbRemoveBudget,
    getTotalThisMonth,
    getExpensesByCategory
} from '../database/db.js';

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
 * Define um orçamento mensal
 * @param {number} amount - Valor limite
 * @param {string} category - Categoria (opcional, padrão: geral)
 * @returns {string} Mensagem de confirmação
 */
export function setBudget(amount, category = 'geral') {
    const budget = dbSetBudget(amount, category);

    const catDisplay = category === 'geral' ? 'geral (todas as categorias)' : category;

    return `✅ *Limite definido!*\n\n` +
        `📊 *Categoria:* ${catDisplay}\n` +
        `💰 *Limite mensal:* ${formatCurrency(amount)}\n\n` +
        `_Você será alertado ao atingir 80% e 100% do limite._`;
}

/**
 * Lista todos os orçamentos do mês
 * @returns {string} Lista formatada
 */
export function listBudgets() {
    const budgets = dbGetBudgets();

    if (budgets.length === 0) {
        return `📊 *Orçamentos*\n\n` +
            `Você não definiu nenhum limite ainda.\n\n` +
            `💡 *Exemplos:*\n` +
            `• "definir limite 2000"\n` +
            `• "definir limite 500 alimentação"`;
    }

    let response = `📊 *Seus Limites Mensais*\n\n`;

    const expensesByCategory = getExpensesByCategory();
    const totalExpenses = getTotalThisMonth();

    for (const budget of budgets) {
        let spent = 0;

        if (budget.category === 'geral') {
            spent = totalExpenses;
        } else {
            const cat = expensesByCategory.find(c =>
                c.category.toLowerCase().includes(budget.category.toLowerCase())
            );
            spent = cat ? cat.total : 0;
        }

        const percentage = (spent / budget.amount * 100).toFixed(1);
        const remaining = budget.amount - spent;
        const progressBar = getProgressBar(spent, budget.amount);

        let emoji = '✅';
        if (percentage >= 100) emoji = '🚨';
        else if (percentage >= 80) emoji = '⚠️';

        const catDisplay = budget.category === 'geral' ? '📦 Geral' : `🏷️ ${budget.category}`;

        response += `${catDisplay}\n`;
        response += `${progressBar} ${percentage}%\n`;
        response += `${emoji} ${formatCurrency(spent)} / ${formatCurrency(budget.amount)}\n`;
        response += `💵 Restam: ${formatCurrency(remaining > 0 ? remaining : 0)}\n\n`;
    }

    return response.trim();
}

/**
 * Gera uma barra de progresso visual
 */
function getProgressBar(current, max) {
    const percentage = Math.min(100, (current / max) * 100);
    const filled = Math.round(percentage / 10);
    const empty = 10 - filled;

    let bar = '▓'.repeat(filled) + '░'.repeat(empty);
    return `[${bar}]`;
}

/**
 * Verifica se algum limite foi atingido após um gasto
 * @param {number} amount - Valor do gasto
 * @param {string} category - Categoria do gasto
 * @returns {string|null} Alerta ou null
 */
export function checkBudgetAlert(amount, category) {
    const alerts = [];

    // Verificar limite geral
    const generalBudget = getBudgetByCategory('geral');
    if (generalBudget) {
        const totalSpent = getTotalThisMonth();
        const percentage = (totalSpent / generalBudget.amount) * 100;

        if (percentage >= 100) {
            alerts.push(`🚨 *ALERTA!* Você ultrapassou seu limite geral!\n` +
                `📊 Gasto: ${formatCurrency(totalSpent)} / ${formatCurrency(generalBudget.amount)}`);
        } else if (percentage >= 80) {
            alerts.push(`⚠️ *Atenção!* Você já usou ${percentage.toFixed(0)}% do limite geral.\n` +
                `📊 Gasto: ${formatCurrency(totalSpent)} / ${formatCurrency(generalBudget.amount)}`);
        }
    }

    // Verificar limite da categoria específica
    const categoryBudget = getBudgetByCategory(category);
    if (categoryBudget) {
        const expensesByCategory = getExpensesByCategory();
        const catExpense = expensesByCategory.find(c =>
            c.category.toLowerCase().includes(category.toLowerCase())
        );
        const catSpent = catExpense ? catExpense.total : 0;
        const percentage = (catSpent / categoryBudget.amount) * 100;

        if (percentage >= 100) {
            alerts.push(`🚨 *ALERTA!* Limite de "${category}" ultrapassado!\n` +
                `📊 Gasto: ${formatCurrency(catSpent)} / ${formatCurrency(categoryBudget.amount)}`);
        } else if (percentage >= 80) {
            alerts.push(`⚠️ *Atenção!* ${percentage.toFixed(0)}% do limite de "${category}".\n` +
                `📊 Gasto: ${formatCurrency(catSpent)} / ${formatCurrency(categoryBudget.amount)}`);
        }
    }

    return alerts.length > 0 ? alerts.join('\n\n') : null;
}

/**
 * Remove um orçamento
 */
export function removeBudget(category = 'geral') {
    const removed = dbRemoveBudget(category);

    if (removed) {
        return `✅ Limite de "${category}" removido.`;
    }
    return `❌ Nenhum limite encontrado para "${category}".`;
}
