import { createClient } from './whatsapp/client.js';
import { parseExpense, getCommandType, isCommand } from './utils/messageParser.js';
import { transcribeWhatsAppAudio } from './services/audioService.js';
import {
    registerExpense,
    registerIncome,
    getSummary,
    getMonthSummary,
    getHistory,
    getHelp,
    getCategoriesList,
    undoLast,
    clearAll,
    getBalanceSummary,
    getMonthReport,
    getWeekReport,
    parseMonthName,
    getDayReport,
    parseDayText
} from './services/expenseService.js';
import { setBudget, listBudgets } from './services/budgetService.js';
import {
    addRecurringExpense,
    listRecurringExpenses,
    removeRecurringExpense,
    checkAndProcessRecurring
} from './services/recurringService.js';
import { addGoal, listGoals, removeGoal } from './services/goalService.js';
import { generateTextChart } from './services/chartService.js';

console.log('╔════════════════════════════════════════════╗');
console.log('║     💰 WhatsFinance - Controle Financeiro  ║');
console.log('║          via WhatsApp                      ║');
console.log('╚════════════════════════════════════════════╝\n');

console.log(`📋 Node.js ${process.version} | PID: ${process.pid}`);
console.log(`🕐 Iniciado em: ${new Date().toLocaleString('pt-BR')}\n`);

// Estado para confirmação de limpeza
let pendingClear = new Set();
let myNumber = null;
let processedMessages = new Set();

// Criar cliente WhatsApp
console.log('🔌 Criando cliente WhatsApp...');
const client = createClient();

// Capturar o número do usuário quando conectar
client.on('ready', () => {
    myNumber = client.info.wid._serialized;
    console.log(`📱 Seu número: ${myNumber}`);
});

/**
 * Processa uma mensagem de texto
 * @param {string} text - Texto da mensagem
 * @param {string} from - Remetente
 * @returns {Promise<string>} Resposta
 */
async function processMessage(text, from) {
    // Verificar se é um comando
    if (isCommand(text)) {
        const commandType = getCommandType(text);

        switch (commandType) {
            case 'TOTAL':
                return getSummary();

            case 'BALANCE':
                return getBalanceSummary();

            case 'TOTAL_MONTH':
                return getMonthSummary();

            case 'HISTORY':
                return getHistory();

            case 'HELP':
                return getHelp();

            case 'CATEGORIES':
                return getCategoriesList();

            case 'UNDO':
                return undoLast();

            // === ORÇAMENTO ===
            case 'SET_BUDGET': {
                // Extrair valor e categoria do texto
                const budgetMatch = text.match(/(?:definir\s+)?limite\s+(\d+(?:[.,]\d{1,2})?)\s*(.*)?/i);
                if (budgetMatch) {
                    const amount = parseFloat(budgetMatch[1].replace(',', '.'));
                    const category = budgetMatch[2]?.trim() || 'geral';
                    return setBudget(amount, category);
                }
                return `❌ Formato inválido.\n\nExemplos:\n• "definir limite 2000"\n• "definir limite 500 alimentação"`;
            }

            case 'VIEW_BUDGETS':
                return listBudgets();

            // === CONSULTA POR PERÍODO ===
            case 'MONTH_REPORT': {
                const monthMatch = text.match(/(?:gastos|total)\s+(?:de|do|da)\s+(\w+)/i);
                if (monthMatch) {
                    const monthNumber = parseMonthName(monthMatch[1]);
                    if (monthNumber) {
                        return getMonthReport(monthNumber);
                    }
                }
                return `❌ Mês não reconhecido.\n\nExemplo: "gastos de dezembro"`;
            }

            case 'WEEK_REPORT':
                return getWeekReport();

            case 'DAY_REPORT': {
                // Extrair o dia do texto: "ontem", "hoje", "dia 15", etc.
                let dayText = 'hoje';
                const ontemMatch = text.match(/ontem/i);
                const hojeMatch = text.match(/hoje/i);
                const anteontemMatch = text.match(/anteontem/i);
                const diaMatch = text.match(/dia\s+(\d{1,2})/i);

                if (ontemMatch) dayText = 'ontem';
                else if (anteontemMatch) dayText = 'anteontem';
                else if (hojeMatch) dayText = 'hoje';
                else if (diaMatch) dayText = diaMatch[1];

                const date = parseDayText(dayText);
                if (date) {
                    return getDayReport(date);
                }
                return `❌ Não consegui identificar o dia.\n\nExemplos:\n• "total de ontem"\n• "gastos do dia 15"`;
            }

            // === GASTOS RECORRENTES ===
            case 'ADD_RECURRING': {
                // Formato: "conta fixa 150 netflix dia 15"
                const recurringMatch = text.match(/(?:conta fixa|gasto fixo)\s+(\d+(?:[.,]\d{1,2})?)\s+(.+?)\s+dia\s+(\d{1,2})/i);
                if (recurringMatch) {
                    const amount = parseFloat(recurringMatch[1].replace(',', '.'));
                    const description = recurringMatch[2].trim();
                    const dayOfMonth = parseInt(recurringMatch[3]);

                    if (dayOfMonth >= 1 && dayOfMonth <= 31) {
                        return addRecurringExpense(amount, description, dayOfMonth);
                    }
                }
                return `❌ Formato inválido.\n\nExemplo:\n"conta fixa 150 netflix dia 15"`;
            }

            case 'LIST_RECURRING':
                return listRecurringExpenses();

            case 'REMOVE_RECURRING': {
                const removeMatch = text.match(/(?:remover|cancelar)\s+conta\s+fixa\s+(.+)/i);
                if (removeMatch) {
                    return removeRecurringExpense(removeMatch[1].trim());
                }
                return `❌ Especifique qual conta remover.\n\nExemplo: "remover conta fixa netflix"`;
            }

            // === METAS ===
            case 'ADD_GOAL': {
                // Formato: "meta guardar 1000 viagem" ou "meta 500 reserva"
                const goalMatch = text.match(/(?:meta|guardar)\s+(?:guardar\s+)?(\d+(?:[.,]\d{1,2})?)\s*(.+)?/i);
                if (goalMatch) {
                    const amount = parseFloat(goalMatch[1].replace(',', '.'));
                    const name = goalMatch[2]?.trim() || 'Meta de economia';
                    return addGoal(name, amount);
                }
                return `❌ Formato inválido.\n\nExemplos:\n• "meta guardar 1000 viagem"\n• "meta 500 reserva"`;
            }

            case 'LIST_GOALS':
                return listGoals();

            case 'REMOVE_GOAL': {
                const removeGoalMatch = text.match(/(?:remover|deletar)\s+meta\s+(.+)/i);
                if (removeGoalMatch) {
                    return removeGoal(removeGoalMatch[1].trim());
                }
                return `❌ Especifique qual meta remover.\n\nExemplo: "remover meta viagem"`;
            }

            // === GRÁFICOS ===
            case 'CHART':
                return generateTextChart();


            case 'CLEAR_ALL':
                pendingClear.add(from);
                return `⚠️ *Atenção!*\n\n` +
                    `Isso irá apagar TODOS os seus registros.\n\n` +
                    `Para confirmar, digite: *confirmar* ou *sim*`;

            case 'CONFIRM_CLEAR':
                if (pendingClear.has(from)) {
                    const result = clearAll();
                    pendingClear.delete(from);
                    return result;
                } else {
                    return `❌ Nenhuma limpeza pendente.\n\nDigite "limpar tudo" primeiro.`;
                }

            case 'CANCEL':
                if (pendingClear.has(from)) {
                    pendingClear.delete(from);
                    return `✅ Limpeza cancelada.`;
                }
                return `❌ Nenhuma ação para cancelar.`;

            default:
                return `❓ Comando não reconhecido.\n\nDigite *ajuda* para ver os comandos.`;
        }
    } else {
        // Tentar interpretar como gasto ou ganho
        const transaction = parseExpense(text);

        if (transaction) {
            if (transaction.type === 'income') {
                return await registerIncome(transaction.amount, transaction.description);
            } else {
                return await registerExpense(transaction.amount, transaction.description);
            }
        } else {
            return `🤔 Não entendi.\n\n` +
                `*Exemplos:*\n` +
                `• "gastei 50 com mercado"\n` +
                `• "ganhei 100 na diária"\n\n` +
                `Digite *ajuda* para mais.`;
        }
    }
}

// Processar APENAS mensagens enviadas por mim mesmo
client.on('message_create', async (message) => {
    // Evitar processar a mesma mensagem duas vezes
    if (processedMessages.has(message.id._serialized)) {
        return;
    }

    // Só processar mensagens que EU enviei
    if (!message.fromMe) {
        return;
    }

    // Ignorar mensagens de grupo
    if (message.from.includes('@g.us')) {
        return;
    }

    // Só responder se for para mim mesmo (Notas Pessoais)
    const isToMyself = message.to === myNumber;
    if (!isToMyself) {
        return;
    }

    // Marcar como processada
    processedMessages.add(message.id._serialized);

    // Limpar mensagens antigas do Set (manter apenas as últimas 100)
    if (processedMessages.size > 100) {
        const arr = Array.from(processedMessages);
        processedMessages = new Set(arr.slice(-50));
    }

    try {
        let text = '';

        // Verificar se é mensagem de áudio (suporte a voz)
        if (message.type === 'ptt' || message.type === 'audio') {
            console.log(`🎤 Áudio recebido - tipo: ${message.type}`);

            // Transcrever áudio automaticamente com Groq Whisper
            await message.reply(`🎤 *Áudio recebido!*\n\n🔄 Transcrevendo...`);

            const transcription = await transcribeWhatsAppAudio(message);

            if (transcription) {
                text = transcription;
                console.log(`✅ Transcrição: "${text}"`);
            } else {
                await message.reply(
                    `❌ *Não consegui transcrever o áudio.*\n\n` +
                    `Tente novamente ou digite sua mensagem.`
                );
                return;
            }
        } else {
            // Verificar se message.body é uma string válida
            if (typeof message.body !== 'string') {
                return;
            }
            text = message.body.trim();
        }

        // Ignorar mensagens vazias
        if (!text) return;

        // IMPORTANTE: Ignorar mensagens que são respostas do bot (evita loop infinito)
        const botResponsePatterns = ['✅', '📊', '📅', '📜', '📱', '🏷️', '⚠️', '❌', '❓', '🤔', '↩️', '🗑️', '💰', '💸', '💵', '📈', '📉', '🎤'];
        if (botResponsePatterns.some(pattern => text.startsWith(pattern))) {
            return;
        }

        // Ignorar mensagens que são citações/replies
        if (message.hasQuotedMsg) {
            return;
        }

        // Log da mensagem recebida
        console.log(`📩 Mensagem: "${text}"`);

        // Processar mensagem
        const response = await processMessage(text, message.from);

        // Enviar resposta (verificar se é string válida)
        if (response && typeof response === 'string') {
            await message.reply(response);
            console.log(`✅ Resposta enviada`);
        }

    } catch (error) {
        console.error('❌ Erro ao processar mensagem:', error);
        await message.reply('❌ Ocorreu um erro. Tente novamente.');
    }
});

// Iniciar cliente com tratamento de erro
console.log('🔄 Inicializando WhatsApp...\n');

async function startClient() {
    try {
        await client.initialize();
    } catch (error) {
        if (error.message && error.message.includes('already running')) {
            console.log('⚠️  Browser anterior ainda rodando. Limpando...');
            // Limpar locks do Puppeteer
            const fs = await import('fs');
            const path = await import('path');
            const lockFile = path.join('./data/whatsapp-session', 'session', 'SingletonLock');
            try { fs.unlinkSync(lockFile); } catch { /* intentional */ }
            const lockFile2 = path.join('./data/whatsapp-session', 'session', 'SingletonSocket');
            try { fs.unlinkSync(lockFile2); } catch { /* intentional */ }
            const lockFile3 = path.join('./data/whatsapp-session', 'session', 'SingletonCookie');
            try { fs.unlinkSync(lockFile3); } catch { /* intentional */ }
            console.log('🔄 Tentando novamente em 3 segundos...');
            await new Promise(r => setTimeout(r, 3000));
            try {
                await client.initialize();
            } catch (retryError) {
                console.error('❌ Falha ao inicializar:', retryError.message);
                console.log('💡 Tente: npm run reset && npm run dev');
                process.exit(1);
            }
        } else {
            console.error('❌ Erro ao inicializar:', error.message);
            console.log('💡 Tente: npm run reset && npm run dev');
            process.exit(1);
        }
    }
}

startClient();

// Tratamento de erros não capturados
process.on('unhandledRejection', (reason) => {
    console.error('❌ Unhandled Rejection:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n\n🛑 Encerrando WhatsFinance...');
    await client.destroy();
    process.exit(0);
});
