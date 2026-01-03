import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from 'qrcode-terminal';

/**
 * Cria e configura o cliente WhatsApp
 * @returns {Client} Cliente WhatsApp configurado
 */
export function createClient() {
    const client = new Client({
        authStrategy: new LocalAuth({
            dataPath: './data/whatsapp-session'
        }),
        puppeteer: {
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--disable-gpu'
            ]
        }
    });

    // Evento: QR Code para autenticação
    client.on('qr', (qr) => {
        console.log('\n📱 Escaneie o QR Code abaixo com seu WhatsApp:\n');
        qrcode.generate(qr, { small: true });
        console.log('\n⏳ Aguardando conexão...\n');
    });

    // Evento: Autenticado com sucesso
    client.on('authenticated', () => {
        console.log('✅ Autenticado com sucesso!');
    });

    // Evento: Falha na autenticação
    client.on('auth_failure', (msg) => {
        console.error('❌ Falha na autenticação:', msg);
    });

    // Evento: Cliente pronto
    client.on('ready', () => {
        console.log('\n🚀 WhatsFinance está pronto!\n');
        console.log('📱 Envie mensagens para registrar seus gastos.');
        console.log('💡 Digite "ajuda" para ver os comandos disponíveis.\n');
        console.log('─'.repeat(50));
    });

    // Evento: Desconectado
    client.on('disconnected', (reason) => {
        console.log('❌ Desconectado:', reason);
    });

    return client;
}

export default createClient;
