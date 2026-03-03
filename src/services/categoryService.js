// Mapeamento de palavras-chave para categorias de GASTOS
const expenseKeywords = {
    '🛒 Mercado': [
        'mercado', 'supermercado', 'feira', 'açougue', 'hortifruti', 'atacado', 'atacadao'
    ],
    '🍞 Alimentação': [
        'pão', 'cafe', 'café', 'almoço', 'almoco', 'jantar', 'lanche', 'restaurante', 'pizza',
        'hamburguer', 'comida', 'fruta', 'verdura', 'carne', 'leite', 'ovo',
        'arroz', 'feijão', 'feijao', 'ifood', 'delivery', 'marmita', 'salgado',
        'doce', 'sorvete', 'chocolate', 'biscoito', 'refrigerante', 'cerveja',
        'bebida', 'água', 'agua', 'suco', 'açaí', 'acai'
    ],
    '🚗 Transporte': [
        'uber', '99', 'gasolina', 'combustível', 'combustivel', 'estacionamento',
        'ônibus', 'onibus', 'metrô', 'metro', 'passagem', 'táxi', 'taxi',
        'pedágio', 'pedagio', 'lavagem', 'mecânico', 'mecanico', 'pneu',
        'óleo', 'oleo', 'moto', 'carro', 'bicicleta', 'bike', 'alcool', 'álcool'
    ],
    '🏠 Moradia': [
        'aluguel', 'luz', 'energia', 'água', 'agua', 'internet', 'wifi',
        'gás', 'gas', 'condomínio', 'condominio', 'iptu', 'seguro casa',
        'reforma', 'conserto', 'móveis', 'moveis', 'eletrodoméstico'
    ],
    '🎬 Lazer': [
        'cinema', 'netflix', 'spotify', 'jogo', 'game', 'bar', 'balada',
        'festa', 'show', 'teatro', 'museu', 'parque', 'viagem', 'hotel',
        'pousada', 'passeio', 'streaming', 'amazon', 'disney', 'hbo',
        'youtube', 'premium', 'assinatura'
    ],
    '💊 Saúde': [
        'farmácia', 'farmacia', 'remédio', 'remedio', 'médico', 'medico',
        'hospital', 'consulta', 'exame', 'dentista', 'psicólogo', 'psicologo',
        'academia', 'suplemento', 'vitamina', 'plano de saúde', 'plano de saude',
        'vacina', 'fisioterapia', 'terapia'
    ],
    '📚 Educação': [
        'curso', 'livro', 'escola', 'faculdade', 'universidade', 'apostila',
        'material escolar', 'caderno', 'caneta', 'mensalidade', 'inglês',
        'ingles', 'aula', 'treinamento', 'certificação', 'certificacao'
    ],
    '👕 Vestuário': [
        'roupa', 'sapato', 'tênis', 'tenis', 'camisa', 'calça', 'calca',
        'vestido', 'saia', 'blusa', 'jaqueta', 'casaco', 'meia', 'cueca',
        'calcinha', 'sutiã', 'sutia', 'bolsa', 'cinto', 'acessório', 'acessorio',
        'óculos', 'oculos', 'relógio', 'relogio', 'joias', 'brinco'
    ],
    '📱 Tecnologia': [
        'celular', 'smartphone', 'computador', 'notebook', 'tablet', 'fone',
        'carregador', 'cabo', 'mouse', 'teclado', 'monitor', 'impressora',
        'software', 'aplicativo', 'app'
    ],
    '🐕 Pet': [
        'ração', 'racao', 'pet', 'veterinário', 'veterinario', 'cachorro',
        'gato', 'petshop', 'banho', 'tosa', 'vacina pet', 'remedio pet'
    ],
    '🎁 Presentes': [
        'presente', 'gift', 'aniversário', 'aniversario', 'natal', 'dia das mães',
        'dia dos pais', 'lembrança', 'lembranca'
    ]
};

// Mapeamento de palavras-chave para categorias de GANHOS
const incomeKeywords = {
    '💼 Salário': [
        'salário', 'salario', 'pagamento', 'holerite', 'contracheque', 'trabalho'
    ],
    '🔧 Freelance': [
        'freelance', 'freela', 'job', 'projeto', 'cliente', 'serviço', 'servico'
    ],
    '📅 Diária': [
        'diária', 'diaria', 'dia de trabalho', 'dia trabalhado'
    ],
    '🎨 Design': [
        'banner', 'design', 'arte', 'logo', 'logotipo', 'identidade visual',
        'flyer', 'cartaz', 'panfleto'
    ],
    '💻 Programação': [
        'programação', 'programacao', 'código', 'codigo', 'site', 'sistema',
        'aplicativo', 'app', 'software', 'desenvolvimento', 'dev'
    ],
    '📦 Vendas': [
        'venda', 'vendeu', 'vendido', 'produto', 'mercadoria'
    ],
    '🏦 Investimentos': [
        'rendimento', 'dividendo', 'juros', 'investimento', 'ações', 'acoes',
        'fundo', 'tesouro', 'poupança', 'poupanca'
    ],
    '🎁 Presente': [
        'presente', 'gift', 'doação', 'doacao', 'herança', 'heranca'
    ]
};

/**
 * Categoriza um gasto baseado na descrição
 * @param {string} description - Descrição do gasto
 * @returns {string} Categoria identificada
 */
export function categorize(description) {
    const lowerDesc = description.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    for (const [category, keywords] of Object.entries(expenseKeywords)) {
        for (const keyword of keywords) {
            const normalizedKeyword = keyword.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            if (lowerDesc.includes(normalizedKeyword)) {
                return category;
            }
        }
    }

    return '💰 Outros';
}

/**
 * Categoriza um ganho baseado na descrição
 * @param {string} description - Descrição do ganho
 * @returns {string} Categoria identificada
 */
export function categorizeIncome(description) {
    const lowerDesc = description.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    for (const [category, keywords] of Object.entries(incomeKeywords)) {
        for (const keyword of keywords) {
            const normalizedKeyword = keyword.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            if (lowerDesc.includes(normalizedKeyword)) {
                return category;
            }
        }
    }

    return '💵 Outros';
}

/**
 * Retorna todas as categorias disponíveis
 * @returns {string[]} Lista de categorias
 */
export function getAllCategories() {
    return [
        ...Object.keys(expenseKeywords),
        '💰 Outros (gastos)',
        '---',
        ...Object.keys(incomeKeywords),
        '💵 Outros (ganhos)'
    ];
}

/**
 * Retorna apenas a categorização por keywords (para uso como fallback)
 */
export function categorizeByKeywords(description) {
    return categorize(description);
}

export function categorizeIncomeByKeywords(description) {
    return categorizeIncome(description);
}
