import { config } from '../config/config.js';
import https from 'https';

// Lista de categorias disponíveis
const expenseCategories = [
    '🍞 Alimentação',
    '� Mercado',
    '�🚗 Transporte',
    '🏠 Moradia',
    '🎬 Lazer',
    '💊 Saúde',
    '📚 Educação',
    '👕 Vestuário',
    '📱 Tecnologia',
    '🐕 Pet',
    '🎁 Presentes',
    '💰 Outros'
];

const incomeCategories = [
    '💼 Salário',
    '🔧 Freelance',
    '📅 Diária',
    '🎨 Design',
    '💻 Programação',
    '📦 Vendas',
    '🏦 Investimentos',
    '🎁 Presente',
    '💵 Outros'
];

/**
 * Usa IA (Groq LLM) para categorizar um gasto ou ganho
 * @param {string} description - Descrição do gasto/ganho
 * @param {string} type - 'expense' ou 'income'
 * @returns {Promise<string>} Categoria identificada
 */
export async function categorizeWithAI(description, type = 'expense') {
    try {
        const categories = type === 'expense' ? expenseCategories : incomeCategories;
        const typeLabel = type === 'expense' ? 'gasto' : 'ganho';

        const prompt = `Você é um assistente financeiro. Analise a descrição de ${typeLabel} abaixo e retorne APENAS o nome da categoria mais apropriada.

Descrição: "${description}"

Categorias disponíveis:
${categories.map(c => `- ${c}`).join('\n')}

Responda APENAS com o nome da categoria (incluindo o emoji), sem explicações.`;

        const requestBody = JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [
                {
                    role: 'user',
                    content: prompt
                }
            ],
            temperature: 0.1,
            max_tokens: 50
        });

        const response = await new Promise((resolve, reject) => {
            const req = https.request({
                hostname: 'api.groq.com',
                path: '/openai/v1/chat/completions',
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${config.groq.apiKey}`,
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(requestBody)
                }
            }, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        resolve({ status: res.statusCode, data: JSON.parse(data) });
                    } catch (e) {
                        resolve({ status: res.statusCode, data: null });
                    }
                });
            });

            req.on('error', reject);
            req.write(requestBody);
            req.end();
        });

        if (response.status === 200 && response.data?.choices?.[0]?.message?.content) {
            const aiCategory = response.data.choices[0].message.content.trim();

            // Verificar se a categoria retornada é válida
            const validCategory = categories.find(c =>
                c.toLowerCase() === aiCategory.toLowerCase() ||
                aiCategory.toLowerCase().includes(c.toLowerCase().substring(2))
            );

            if (validCategory) {
                console.log(`🤖 IA categorizou "${description}" como: ${validCategory}`);
                return validCategory;
            }
        }

        // Fallback para categoria padrão
        return type === 'expense' ? '💰 Outros' : '💵 Outros';

    } catch (error) {
        console.error('❌ Erro na categorização com IA:', error.message);
        return type === 'expense' ? '💰 Outros' : '💵 Outros';
    }
}

/**
 * Verifica se a IA está configurada e disponível
 * @returns {boolean}
 */
export function isAIAvailable() {
    return !!config.groq?.apiKey;
}
