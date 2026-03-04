import {
    addExpense,
    addIncome,
    getTotal,
    getTotalExpenses,
    getTotalIncome,
    getBalance,
    getExpensesByCategory,
    getIncomeByCategory,
    getTotalThisMonth,
    getIncomeThisMonth,
    getRecentTransactions,
    clearAllTransactions,
    deleteLastTransaction,
    getExpensesByMonth,
    getIncomeByMonth,
    getExpensesByCategoryForMonth,
    getExpensesByDay,
    getIncomeByDay,
    getExpensesByCategoryForDay,
    getPendingRecurringThisMonth,
    getRecurringExpenses
} from '../database/db.js';
import { categorize, categorizeIncome, getAllCategories, categorizeByKeywords, categorizeIncomeByKeywords } from './categoryService.js';
import { checkBudgetAlert } from './budgetService.js';
import { categorizeWithAI, isAIAvailable } from './aiCategoryService.js';
import { config } from '../config/config.js';

/**
 * Formata valor em reais
 * @param {number} value - Valor numérico
 * @returns {string} Valor formatado
 */
function formatCurrency(value) {
    return value.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });
}

/**
 * Registra um novo gasto (versão assíncrona para suporte à IA)
 * @param {number} amount - Valor do gasto
 * @param {string} description - Descrição do gasto
 * @returns {Promise<string>} Mensagem de confirmação
 */
export async function registerExpense(amount, description) {
    let category;
    let usedAI = false;

    // Tentar usar IA se habilitada
    if (config.ai?.enabled && isAIAvailable()) {
        category = await categorizeWithAI(description, 'expense');
        usedAI = true;

        // Se IA retornou 'Outros' e fallback está habilitado, tentar keywords
        if (category === '💰 Outros' && config.ai?.fallbackToKeywords) {
            const keywordCategory = categorizeByKeywords(description);
            if (keywordCategory !== '💰 Outros') {
                category = keywordCategory;
                usedAI = false;
            }
        }
    } else {
        category = categorize(description);
    }

    addExpense(amount, description, category);

    const total = getTotalExpenses();

    let response = `✅ *Gasto registrado!*\n\n` +
        `💸 *Valor:* ${formatCurrency(amount)}\n` +
        `📝 *Descrição:* ${description}\n` +
        `🏷️ *Categoria:* ${category}${usedAI ? ' 🤖' : ''}\n\n` +
        `📊 *Total gastos:* ${formatCurrency(total)}`;

    // Verificar alertas de orçamento
    const alert = checkBudgetAlert(amount, category);
    if (alert) {
        response += `\n\n${alert}`;
    }

    return response;
}

/**
 * Registra um novo ganho/receita (versão assíncrona para suporte à IA)
 * @param {number} amount - Valor do ganho
 * @param {string} description - Descrição do ganho
 * @returns {Promise<string>} Mensagem de confirmação
 */
export async function registerIncome(amount, description) {
    let category;
    let usedAI = false;

    // Tentar usar IA se habilitada
    if (config.ai?.enabled && isAIAvailable()) {
        category = await categorizeWithAI(description, 'income');
        usedAI = true;

        // Se IA retornou 'Outros' e fallback está habilitado, tentar keywords
        if (category === '💵 Outros' && config.ai?.fallbackToKeywords) {
            const keywordCategory = categorizeIncomeByKeywords(description);
            if (keywordCategory !== '💵 Outros') {
                category = keywordCategory;
                usedAI = false;
            }
        }
    } else {
        category = categorizeIncome(description);
    }

    addIncome(amount, description, category);

    const totalIncome = getTotalIncome();
    const balance = getBalance();

    return `✅ *Ganho registrado!*\n\n` +
        `💰 *Valor:* ${formatCurrency(amount)}\n` +
        `📝 *Descrição:* ${description}\n` +
        `🏷️ *Categoria:* ${category}${usedAI ? ' 🤖' : ''}\n\n` +
        `📈 *Total ganhos:* ${formatCurrency(totalIncome)}\n` +
        `💵 *Saldo:* ${formatCurrency(balance)}`;
}

/**
 * Retorna resumo geral de gastos
 * @returns {string} Resumo formatado
 */
export function getSummary() {
    const totalExpenses = getTotalExpenses();
    const totalIncome = getTotalIncome();
    const balance = getBalance();
    const expensesByCategory = getExpensesByCategory();
    const monthExpenses = getTotalThisMonth();
    const monthIncome = getIncomeThisMonth();

    if (totalExpenses === 0 && totalIncome === 0) {
        return `📊 *Resumo Financeiro*\n\n` +
            `Você ainda não registrou nada.\n\n` +
            `💡 Exemplos:\n` +
            `• "gastei 50 no mercado"\n` +
            `• "ganhei 100 na diária"`;
    }

    // Integração das contas fixas pendentes
    const pendingRecurring = getPendingRecurringThisMonth();
    let totalPending = 0;

    // Preparar categorias mescladas com os pendentes
    let mergedCategories = [...expensesByCategory];

    if (pendingRecurring.length > 0) {
        totalPending = pendingRecurring.reduce((acc, curr) => acc + curr.amount, 0);

        // Mesclar nas categorias
        for (const pending of pendingRecurring) {
            const existingCat = mergedCategories.find(c => c.category === pending.category);
            if (existingCat) {
                existingCat.total += pending.amount;
                existingCat.count += 1;
            } else {
                mergedCategories.push({
                    category: pending.category,
                    total: pending.amount,
                    count: 1
                });
            }
        }

        // Reordenar decrescente
        mergedCategories.sort((a, b) => b.total - a.total);
    }

    const projectedTotalExpenses = totalExpenses + totalPending;
    const projectedBalance = totalIncome - projectedTotalExpenses;

    let response = `📊 *Resumo Financeiro*\n\n`;
    response += `💰 *Total ganhos:* ${formatCurrency(totalIncome)}\n`;
    response += `💸 *Total gastos (+ pendentes):* ${formatCurrency(projectedTotalExpenses)}\n`;
    response += `💵 *Saldo projetado:* ${formatCurrency(projectedBalance)}\n\n`;

    response += `📅 *Neste mês (já consolidado):*\n`;
    response += `   Ganhos: ${formatCurrency(monthIncome)}\n`;
    response += `   Gastos: ${formatCurrency(monthExpenses)}\n\n`;

    // Exibir o status de TODAS as contas fixas do mês
    const allRecurring = getRecurringExpenses();
    if (allRecurring.length > 0) {
        response += `🔄 *Contas Fixas do Mês:*\n`;
        const currentMonthStr = new Date().toISOString().slice(0, 7);
        for (const rec of allRecurring) {
            const isPaid = rec.last_processed === currentMonthStr;
            const statusIcon = isPaid ? '✅' : '⏳';
            response += `${statusIcon} ${rec.description}: ${formatCurrency(rec.amount)}\n`;
        }
        response += `\n`;
    }

    if (mergedCategories.length > 0) {
        response += `*Gastos por categoria (projetado):*\n`;
        for (const cat of mergedCategories) {
            const percentage = projectedTotalExpenses > 0 ? ((cat.total / projectedTotalExpenses) * 100).toFixed(1) : 0;
            response += `${cat.category}: ${formatCurrency(cat.total)} (${percentage}%)\n`;
        }
    }

    return response;
}

/**
 * Retorna saldo atual
 * @returns {string} Saldo formatado
 */
export function getBalanceSummary() {
    const totalIncome = getTotalIncome();
    const totalExpenses = getTotalExpenses();
    const balance = getBalance();

    let emoji = balance >= 0 ? '✅' : '⚠️';

    return `💵 *Seu Saldo*\n\n` +
        `📈 Ganhos: ${formatCurrency(totalIncome)}\n` +
        `📉 Gastos: ${formatCurrency(totalExpenses)}\n\n` +
        `${emoji} *Saldo:* ${formatCurrency(balance)}`;
}

/**
 * Retorna resumo do mês atual
 * @returns {string} Resumo formatado
 */
export function getMonthSummary() {
    const monthExpenses = getTotalThisMonth();
    const monthIncome = getIncomeThisMonth();
    const expensesByCategory = getExpensesByCategory();

    const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const currentMonth = months[new Date().getMonth()];

    if (monthExpenses === 0 && monthIncome === 0) {
        return `📅 *${currentMonth}*\n\n` +
            `Você ainda não registrou nada este mês.`;
    }

    const pendingRecurring = getPendingRecurringThisMonth();
    let totalPending = 0;

    // Preparar categorias mescladas com os pendentes
    let mergedCategories = [...expensesByCategory];

    if (pendingRecurring.length > 0) {
        totalPending = pendingRecurring.reduce((acc, curr) => acc + curr.amount, 0);

        for (const pending of pendingRecurring) {
            const existingCat = mergedCategories.find(c => c.category === pending.category);
            if (existingCat) {
                existingCat.total += pending.amount;
                existingCat.count += 1;
            } else {
                mergedCategories.push({
                    category: pending.category,
                    total: pending.amount,
                    count: 1
                });
            }
        }

        mergedCategories.sort((a, b) => b.total - a.total);
    }

    const projectedTotalExpenses = monthExpenses + totalPending;
    const projectedBalance = monthIncome - projectedTotalExpenses;

    let response = `📅 *${currentMonth}*\n\n`;
    response += `📈 *Ganhos:* ${formatCurrency(monthIncome)}\n`;
    response += `📉 *Gastos (+ pendentes):* ${formatCurrency(projectedTotalExpenses)}\n`;
    response += `💵 *Saldo projetado do mês:* ${formatCurrency(projectedBalance)}\n\n`;

    // Exibir o status de TODAS as contas fixas do mês
    const allRecurring = getRecurringExpenses();
    if (allRecurring.length > 0) {
        response += `🔄 *Contas Fixas do Mês:*\n`;
        const currentMonthStr = new Date().toISOString().slice(0, 7);
        for (const rec of allRecurring) {
            const isPaid = rec.last_processed === currentMonthStr;
            const statusIcon = isPaid ? '✅' : '⏳';
            response += `${statusIcon} ${rec.description}: ${formatCurrency(rec.amount)}\n`;
        }
        response += `\n`;
    }

    if (mergedCategories.length > 0) {
        response += `*Gastos por categoria (projetado):*\n`;
        for (const cat of mergedCategories) {
            response += `${cat.category}: ${formatCurrency(cat.total)}\n`;
        }
    }

    return response;
}

/**
 * Retorna histórico de transações recentes
 * @param {number} limit - Quantidade de registros
 * @returns {string} Histórico formatado
 */
export function getHistory(limit = 10) {
    const transactions = getRecentTransactions(limit);

    if (transactions.length === 0) {
        return `📜 *Histórico*\n\nNenhum registro ainda.`;
    }

    let response = `📜 *Últimas ${transactions.length} transações:*\n\n`;

    for (const tx of transactions) {
        const date = new Date(tx.created_at).toLocaleDateString('pt-BR');
        const emoji = tx.type === 'income' ? '📈' : '📉';
        const sign = tx.type === 'income' ? '+' : '-';
        response += `${emoji} ${sign}${formatCurrency(tx.amount)} - ${tx.description}\n`;
        response += `   ${tx.category} | ${date}\n\n`;
    }

    return response;
}

/**
 * Limpa todos os registros
 * @returns {string} Mensagem de confirmação
 */
export function clearAll() {
    const count = clearAllTransactions();
    return `🗑️ *Dados limpos!*\n\n${count} registro(s) removido(s).`;
}

/**
 * Desfaz a última transação
 * @returns {string} Mensagem de confirmação
 */
export function undoLast() {
    const deleted = deleteLastTransaction();

    if (deleted) {
        const emoji = deleted.type === 'income' ? '📈' : '📉';
        const tipo = deleted.type === 'income' ? 'Ganho' : 'Gasto';
        return `↩️ *${tipo} removido!*\n\n` +
            `${emoji} ${formatCurrency(deleted.amount)} - ${deleted.description}\n\n` +
            `💵 *Novo saldo:* ${formatCurrency(getBalance())}`;
    }

    return `❌ Não há registros para remover.`;
}

/**
 * Retorna mensagem de ajuda
 * @returns {string} Mensagem de ajuda
 */
export function getHelp() {
    return `📱 *WhatsFinance - Comandos*\n\n` +
        `*💸 Registrar:*\n` +
        `• "gastei 50 no mercado"\n` +
        `• "ganhei 100 na diária"\n\n` +
        `*📊 Consultar:*\n` +
        `• *total* | *saldo* | *gráfico* | *categorias*\n` +
        `• *gastos de dezembro* | *semana*\n\n` +
        `*💰 Orçamento:*\n` +
        `• "definir limite 2000"\n` +
        `• *ver limites*\n\n` +
        `*🔄 Contas Fixas:*\n` +
        `• "conta fixa 150 netflix dia 15"\n` +
        `• *ver contas fixas*\n\n` +
        `*🎯 Metas:*\n` +
        `• "meta guardar 1000 viagem"\n` +
        `• *ver metas*\n\n` +
        `*⚙️ Outros:*\n` +
        `• *desfazer* | *limpar tudo* | *ajuda*`;
}

/**
 * Retorna lista de categorias
 * @returns {string} Lista formatada
 */
export function getCategoriesList() {
    const categories = getAllCategories();

    let response = `🏷️ *Categorias:*\n\n`;
    for (const cat of categories) {
        response += `• ${cat}\n`;
    }
    response += `\n_Detectadas automaticamente!_`;

    return response;
}

// ==========================================
// CONSULTA POR PERÍODO
// ==========================================

const monthNames = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

/**
 * Retorna resumo de um mês específico
 * @param {number} monthNumber - Número do mês (1-12)
 * @param {number} year - Ano (opcional)
 * @returns {string} Resumo formatado
 */
export function getMonthReport(monthNumber, year = new Date().getFullYear()) {
    const expenses = getExpensesByMonth(monthNumber, year);
    const income = getIncomeByMonth(monthNumber, year);
    const balance = income - expenses;
    const expensesByCategory = getExpensesByCategoryForMonth(monthNumber, year);

    const monthName = monthNames[monthNumber - 1];
    const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);

    if (expenses === 0 && income === 0) {
        return `📅 *${capitalizedMonth} ${year}*\n\nNenhum registro encontrado.`;
    }

    let response = `📅 *${capitalizedMonth} ${year}*\n\n`;
    response += `📈 *Ganhos:* ${formatCurrency(income)}\n`;
    response += `📉 *Gastos:* ${formatCurrency(expenses)}\n`;
    response += `💵 *Saldo:* ${formatCurrency(balance)}\n\n`;

    if (expensesByCategory.length > 0) {
        response += `*Gastos por categoria:*\n`;
        for (const cat of expensesByCategory) {
            const percentage = expenses > 0 ? ((cat.total / expenses) * 100).toFixed(1) : 0;
            response += `${cat.category}: ${formatCurrency(cat.total)} (${percentage}%)\n`;
        }
    }

    return response;
}

/**
 * Retorna resumo da última semana
 * @returns {string} Resumo formatado
 */
export function getWeekReport() {
    const expenses = getExpensesThisWeek();
    const income = getIncomeThisWeek();
    const balance = income - expenses;

    if (expenses === 0 && income === 0) {
        return `📆 *Última Semana*\n\nNenhum registro encontrado.`;
    }

    return `📆 *Última Semana*\n\n` +
        `📈 *Ganhos:* ${formatCurrency(income)}\n` +
        `📉 *Gastos:* ${formatCurrency(expenses)}\n` +
        `💵 *Saldo:* ${formatCurrency(balance)}`;
}

/**
 * Converte nome do mês para número
 * @param {string} monthName - Nome do mês
 * @returns {number|null} Número do mês ou null
 */
export function parseMonthName(monthName) {
    const normalized = monthName.toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, ''); // Remove acentos

    const monthsNormalized = monthNames.map(m =>
        m.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    );

    const index = monthsNormalized.findIndex(m => m.startsWith(normalized) || normalized.startsWith(m));
    return index !== -1 ? index + 1 : null;
}

/**
 * Retorna relatório de um dia específico
 * @param {Date} date - Data para consulta
 * @returns {string} Relatório formatado
 */
export function getDayReport(date) {
    const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
    const expenses = getExpensesByDay(dateStr);
    const income = getIncomeByDay(dateStr);
    const balance = income - expenses;
    const expensesByCategory = getExpensesByCategoryForDay(dateStr);

    // Formatar data para exibição
    const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    const dayName = dayNames[date.getDay()];
    const formattedDate = date.toLocaleDateString('pt-BR');

    if (expenses === 0 && income === 0) {
        return `📅 *${dayName}, ${formattedDate}*\n\nNenhum registro encontrado.`;
    }

    let response = `📅 *${dayName}, ${formattedDate}*\n\n`;
    response += `📈 *Ganhos:* ${formatCurrency(income)}\n`;
    response += `📉 *Gastos:* ${formatCurrency(expenses)}\n`;
    response += `💵 *Saldo do dia:* ${formatCurrency(balance)}\n\n`;

    if (expensesByCategory.length > 0) {
        response += `*Gastos por categoria:*\n`;
        for (const cat of expensesByCategory) {
            const percentage = expenses > 0 ? ((cat.total / expenses) * 100).toFixed(1) : 0;
            response += `${cat.category}: ${formatCurrency(cat.total)} (${percentage}%)\n`;
        }
    }

    return response;
}

/**
 * Converte texto para data
 * @param {string} dayText - "ontem", "hoje", "15", "dia 7", etc.
 * @returns {Date|null} Data ou null se não reconhecer
 */
export function parseDayText(dayText) {
    const normalized = dayText.toLowerCase().trim();
    const today = new Date();

    if (normalized === 'hoje') {
        return today;
    }

    if (normalized === 'ontem') {
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        return yesterday;
    }

    if (normalized === 'anteontem') {
        const dayBefore = new Date(today);
        dayBefore.setDate(today.getDate() - 2);
        return dayBefore;
    }

    // "dia 15" ou apenas "15"
    const dayMatch = normalized.match(/(?:dia\s*)?(\d{1,2})/);
    if (dayMatch) {
        const day = parseInt(dayMatch[1]);
        if (day >= 1 && day <= 31) {
            const date = new Date(today.getFullYear(), today.getMonth(), day);
            // Se o dia é maior que hoje, assume mês anterior
            if (day > today.getDate()) {
                date.setMonth(date.getMonth() - 1);
            }
            return date;
        }
    }

    return null;
}
