import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from 'qrcode-terminal';

/**
 * Cria e configura o cliente WhatsApp com melhorias de estabilidade
 * @returns {Client} Cliente WhatsApp configurado
 */
export function createClient() {
    const client = new Client({
        authStrategy: new LocalAuth({
            dataPath: './data/whatsapp-session'
        }),
        puppeteer: {
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--disable-gpu',
                '--single-process',
                '--disable-extensions',
                '--disable-background-timer-throttling',
                '--disable-backgrounding-occluded-windows',
                '--disable-renderer-backgrounding'
            ],
            timeout: 120000 // 2 minutos para o Puppeteer iniciar
        },
        webVersionCache: {
            type: 'remote',
            remotePath: 'https://raw.githubusercontent.com/nicedude11/nicedude/main/user_agent/userAgent.json'
        }
    });

    // Timeout de segurança: se não conectar em 3 minutos, avisar
    let connectionTimeout = null;
    let isReady = false;

    const startTimeout = () => {
        connectionTimeout = setTimeout(() => {
            if (!isReady) {
                console.log('\n⚠️  Timeout de conexão atingido (3 minutos).');
                console.log('💡 Tente:');
                console.log('   1. Fechar e abrir novamente (Ctrl+C e npm run dev)');
                console.log('   2. Deletar a pasta data/whatsapp-session e tentar de novo');
                console.log('   3. Verificar sua conexão com a internet\n');
            }
        }, 180000); // 3 minutos
    };

    // Evento: Progresso do carregamento
    client.on('loading_screen', (percent, message) => {
        console.log(`⏳ Carregando WhatsApp Web... ${percent}% - ${message}`);
    });

    // Evento: Mudança de estado da conexão
    client.on('change_state', (state) => {
        console.log(`🔄 Estado da conexão: ${state}`);
    });

    // Evento: QR Code para autenticação
    client.on('qr', (qr) => {
        if (connectionTimeout) clearTimeout(connectionTimeout);
        console.log('\n📱 Escaneie o QR Code abaixo com seu WhatsApp:\n');
        qrcode.generate(qr, { small: true });
        console.log('\n⏳ Aguardando você escanear o QR Code...\n');
        startTimeout();
    });

    // Evento: Autenticado com sucesso
    client.on('authenticated', () => {
        console.log('✅ Autenticado com sucesso!');
        console.log('⏳ Carregando dados do WhatsApp...');
    });

    // Evento: Falha na autenticação
    client.on('auth_failure', (msg) => {
        console.error('❌ Falha na autenticação:', msg);
        console.log('💡 Tente deletar a pasta data/whatsapp-session e reiniciar.');
    });

    // Evento: Cliente pronto
    client.on('ready', () => {
        isReady = true;
        if (connectionTimeout) clearTimeout(connectionTimeout);
        console.log('\n🚀 WhatsFinance está pronto!\n');
        console.log('📱 Envie mensagens para registrar seus gastos.');
        console.log('💡 Digite "ajuda" para ver os comandos disponíveis.\n');
        console.log('─'.repeat(50));
    });

    // Evento: Desconectado
    client.on('disconnected', (reason) => {
        isReady = false;
        console.log('❌ Desconectado:', reason);
        console.log('🔄 Tentando reconectar...');
    });

    // Iniciar timeout ao criar o client
    startTimeout();

    return client;
}

export default createClient;
