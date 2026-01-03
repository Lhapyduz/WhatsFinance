import {
    addGoal as dbAddGoal,
    getGoals as dbGetGoals,
    updateGoalProgress as dbUpdateProgress,
    removeGoalByName as dbRemoveGoal,
    getBalance
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
 * Gera uma barra de progresso visual
 */
function getProgressBar(current, max) {
    const percentage = Math.min(100, Math.max(0, (current / max) * 100));
    const filled = Math.round(percentage / 10);
    const empty = 10 - filled;

    let bar = '▓'.repeat(filled) + '░'.repeat(empty);
    return `[${bar}]`;
}

/**
 * Adiciona uma meta de economia
 * @param {string} name - Nome da meta
 * @param {number} targetAmount - Valor alvo
 * @returns {string} Mensagem de confirmação
 */
export function addGoal(name, targetAmount) {
    dbAddGoal(name, targetAmount);

    const balance = getBalance();
    const percentage = balance > 0 ? Math.min(100, (balance / targetAmount) * 100) : 0;

    return `🎯 *Meta criada!*\n\n` +
        `📝 *Meta:* ${name}\n` +
        `💰 *Objetivo:* ${formatCurrency(targetAmount)}\n\n` +
        `📊 *Progresso atual:*\n` +
        `${getProgressBar(balance, targetAmount)} ${percentage.toFixed(0)}%\n` +
        `💵 Saldo: ${formatCurrency(balance)} / ${formatCurrency(targetAmount)}\n\n` +
        `_Acompanhe seu progresso com "ver metas"_`;
}

/**
 * Lista metas de economia
 * @returns {string} Lista formatada
 */
export function listGoals() {
    const goals = dbGetGoals();

    if (goals.length === 0) {
        return `🎯 *Metas de Economia*\n\n` +
            `Nenhuma meta definida.\n\n` +
            `💡 *Exemplo:*\n` +
            `"meta guardar 1000 viagem"`;
    }

    const balance = getBalance();
    let response = `🎯 *Suas Metas*\n\n`;
    response += `💵 *Saldo atual:* ${formatCurrency(balance)}\n\n`;

    for (const goal of goals) {
        // Para metas de economia, usamos o saldo como progresso
        const progress = Math.min(balance, goal.target_amount);
        const percentage = (progress / goal.target_amount * 100);
        const remaining = goal.target_amount - progress;

        let emoji = '🔵';
        if (percentage >= 100) emoji = '🏆';
        else if (percentage >= 75) emoji = '🟢';
        else if (percentage >= 50) emoji = '🟡';
        else if (percentage >= 25) emoji = '🟠';
        else emoji = '🔴';

        response += `${emoji} *${goal.name}*\n`;
        response += `${getProgressBar(progress, goal.target_amount)} ${percentage.toFixed(0)}%\n`;
        response += `💰 ${formatCurrency(progress)} / ${formatCurrency(goal.target_amount)}\n`;

        if (remaining > 0) {
            response += `📉 Faltam: ${formatCurrency(remaining)}\n`;
        } else {
            response += `🎉 *Meta atingida!*\n`;
        }
        response += `\n`;
    }

    return response.trim();
}

/**
 * Remove uma meta
 * @param {string} name - Nome da meta
 * @returns {string} Mensagem de confirmação
 */
export function removeGoal(name) {
    const removed = dbRemoveGoal(name);

    if (removed > 0) {
        return `✅ Meta "${name}" removida.`;
    }
    return `❌ Meta "${name}" não encontrada.`;
}

/**
 * Adiciona valor a uma meta específica (para depósitos manuais)
 * @param {number} goalId - ID da meta
 * @param {number} amount - Valor a adicionar
 * @returns {string} Mensagem de confirmação
 */
export function depositToGoal(goalId, amount) {
    const updated = dbUpdateProgress(goalId, amount);

    if (updated) {
        return `✅ ${formatCurrency(amount)} adicionados à meta!`;
    }
    return `❌ Meta não encontrada.`;
}
