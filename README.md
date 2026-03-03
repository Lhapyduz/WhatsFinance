# 💰 WhatsFinance

Controle seus gastos pessoais enviando mensagens pelo WhatsApp!

> 🤖 **Powered by AI** - Categorização inteligente com IA (Groq LLM)

## 🚀 Como usar

### 1. Instalar dependências
```bash
npm install
```

### 2. Iniciar o app
```bash
npm start
```

### 3. Escanear QR Code
Quando o app iniciar, um QR Code aparecerá no terminal. Escaneie com seu WhatsApp:
1. Abra o WhatsApp no celular
2. Vá em **Configurações** > **Dispositivos conectados**
3. Clique em **Conectar dispositivo**
4. Escaneie o QR Code

### 4. Começar a registrar gastos!
Envie mensagens para **você mesmo** (Notas Pessoais) ou para o número conectado.

---

## 📱 Comandos

### Registrar gastos
- `gastei 50 no mercado`
- `paguei 100 de luz`
- `comprei café por 20`
- `uber 30`
- `R$ 150 farmácia`

### Consultar
| Comando | Descrição |
|---------|-----------|
| `total` | Resumo geral de gastos |
| `saldo` | Ver saldo atual |
| `total do mês` | Gastos do mês atual |
| `gastos de dezembro` | Gastos de um mês específico |
| `gastos da semana` | Últimos 7 dias |
| `últimos` | Histórico dos últimos gastos |
| `categorias` | Lista de categorias |

### 💰 Orçamento
| Comando | Descrição |
|---------|-----------|
| `definir limite 2000` | Define limite mensal geral |
| `definir limite 500 alimentação` | Define limite para categoria |
| `ver limites` | Mostra seus orçamentos |

> 🔔 **Alertas automáticos:** O bot avisa quando você atinge 80% ou 100% do limite!

### 🔄 Contas Fixas
| Comando | Descrição |
|---------|-----------|
| `conta fixa 150 netflix dia 15` | Gasto mensal automático |
| `ver contas fixas` | Lista suas contas fixas |
| `remover conta fixa netflix` | Remove uma conta fixa |

> 💡 As contas fixas são registradas automaticamente no dia configurado!

### 🎯 Metas de Economia
| Comando | Descrição |
|---------|-----------|
| `meta guardar 1000 viagem` | Cria meta de economia |
| `ver metas` | Progresso das suas metas |
| `remover meta viagem` | Remove uma meta |

### 📊 Gráficos
| Comando | Descrição |
|---------|-----------|
| `gráfico` | Gráfico de gastos por categoria |

### Outros
| Comando | Descrição |
|---------|-----------|
| `desfazer` | Remove o último gasto |
| `limpar tudo` | Apaga todos os registros |
| `ajuda` | Exibe menu de ajuda |

### 🎤 Comandos por Áudio
Envie um **áudio** dizendo o que você gastou ou ganhou!

Exemplos:
- 🎤 *"Gastei cinquenta reais no mercado"*
- 🎤 *"Ganhei duzentos reais de freelance"*
- 🎤 *"Total do mês"*

O bot usa inteligência artificial (Whisper) para transcrever e processar automaticamente!

---

## 🏷️ Categorias automáticas

O app categoriza automaticamente seus gastos:

- 🛒 **Mercado**: supermercado, feira, açougue, atacado, etc.
- 🍞 **Alimentação**: restaurante, ifood, café, almoço, etc.
- 🚗 **Transporte**: uber, gasolina, estacionamento, etc.
- 🏠 **Moradia**: aluguel, luz, água, internet, etc.
- 🎬 **Lazer**: netflix, cinema, viagem, etc.
- 💊 **Saúde**: farmácia, médico, academia, etc.
- 📚 **Educação**: curso, livro, escola, etc.
- 👕 **Vestuário**: roupa, sapato, etc.
- 📱 **Tecnologia**: celular, computador, etc.
- 🐕 **Pet**: ração, veterinário, etc.
- 🎁 **Presentes**: presente, aniversário, etc.
- 💰 **Outros**: gastos não categorizados

---

## 📁 Estrutura do projeto

```
Whatsfinance/
├── package.json
├── src/
│   ├── index.js              # Ponto de entrada
│   ├── whatsapp/
│   │   └── client.js         # Cliente WhatsApp
│   ├── database/
│   │   └── db.js             # Banco SQLite
│   ├── services/
│   │   ├── expenseService.js # Lógica de gastos
│   │   └── categoryService.js# Categorização
│   └── utils/
│       └── messageParser.js  # Parser de mensagens
└── data/
    └── expenses.db           # Banco de dados (criado automaticamente)
```

---

## ⚠️ Requisitos

- Node.js 18+
- WhatsApp no celular

---

## 📝 Licença

MIT
