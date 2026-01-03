import {
    addRecurringExpense as dbAddRecurring,
    getRecurringExpenses as dbGetRecurring,
    removeRecurringExpenseByDescription as dbRemoveRecurring,
    getRecurringToProcess,
    markRecurringAsProcessed,
    addExpense
} from '../database/db.js';
import { categorize } from './categoryService.js';

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
 * Adiciona um gasto recorrente
 * @param {number} amount - Valor
 * @param {string} description - Descrição
 * @param {number} dayOfMonth - Dia do mês (1-31)
 * @returns {string} Mensagem de confirmação
 */
export function addRecurringExpense(amount, description, dayOfMonth) {
    const category = categorize(description);
    dbAddRecurring(amount, description, category, dayOfMonth);

    return `✅ *Conta fixa adicionada!*\n\n` +
        `💸 *Valor:* ${formatCurrency(amount)}\n` +
        `📝 *Descrição:* ${description}\n` +
        `📅 *Dia:* ${dayOfMonth} de cada mês\n` +
        `🏷️ *Categoria:* ${category}\n\n` +
        `_Será registrada automaticamente todo mês._`;
}

/**
 * Lista gastos recorrentes
 * @returns {string} Lista formatada
 */
export function listRecurringExpenses() {
    const expenses = dbGetRecurring();

    if (expenses.length === 0) {
        return `🔄 *Contas Fixas*\n\n` +
            `Nenhuma conta fixa cadastrada.\n\n` +
            `💡 *Exemplo:*\n` +
            `"conta fixa 150 netflix dia 15"`;
    }

    let response = `🔄 *Suas Contas Fixas*\n\n`;
    let totalMensal = 0;

    for (const expense of expenses) {
        response += `📌 *${expense.description}*\n`;
        response += `   💸 ${formatCurrency(expense.amount)} - Dia ${expense.day_of_month}\n\n`;
        totalMensal += expense.amount;
    }

    response += `📊 *Total mensal:* ${formatCurrency(totalMensal)}`;

    return response;
}

/**
 * Remove um gasto recorrente
 * @param {string} description - Nome/descrição parcial
 * @returns {string} Mensagem de confirmação
 */
export function removeRecurringExpense(description) {
    const removed = dbRemoveRecurring(description);

    if (removed > 0) {
        return `✅ Conta fixa "${description}" removida.`;
    }
    return `❌ Conta fixa "${description}" não encontrada.`;
}

/**
 * Processa gastos recorrentes pendentes
 * @returns {Array} Lista de gastos processados
 */
export function processRecurringExpenses() {
    const toProcess = getRecurringToProcess();
    const processed = [];

    for (const expense of toProcess) {
        // Registrar o gasto
        addExpense(expense.amount, expense.description, expense.category);
        // Marcar como processado
        markRecurringAsProcessed(expense.id);
        processed.push(expense);
    }

    return processed;
}

/**
 * Verifica e processa gastos recorrentes (para chamar no startup)
 * @returns {string|null} Mensagem se houve processamento
 */
export function checkAndProcessRecurring() {
    const processed = processRecurringExpenses();

    if (processed.length === 0) {
        return null;
    }

    let response = `🔄 *Contas fixas processadas automaticamente:*\n\n`;
    let total = 0;

    for (const expense of processed) {
        response += `• ${expense.description}: ${formatCurrency(expense.amount)}\n`;
        total += expense.amount;
    }

    response += `\n📊 *Total:* ${formatCurrency(total)}`;

    return response;
}
