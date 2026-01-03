// Configurações do WhatsFinance
// Use variáveis de ambiente para segredos

export const config = {
    // Groq API para transcrição de áudio (Whisper) e IA
    groq: {
        apiKey: process.env.GROQ_API_KEY || '',
        model: 'whisper-large-v3-turbo',
        language: 'pt' // Português
    },

    // Categorização com IA
    ai: {
        enabled: true, // true para usar IA, false para usar keywords
        fallbackToKeywords: true // Se IA falhar, usar keywords
    }
};
