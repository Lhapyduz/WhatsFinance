import { config } from '../config/config.js';
import { writeFileSync, unlinkSync, existsSync, mkdirSync, readFileSync, createReadStream } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import FormData from 'form-data';
import https from 'https';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const tempDir = join(__dirname, '../../temp');

// Criar diretório temp se não existir
if (!existsSync(tempDir)) {
    mkdirSync(tempDir, { recursive: true });
}

/**
 * Transcreve um áudio usando a API do Groq (Whisper)
 * @param {Buffer} audioBuffer - Buffer do arquivo de áudio
 * @param {string} mimetype - Tipo MIME do áudio (ex: audio/ogg)
 * @returns {Promise<string|null>} Texto transcrito ou null se falhar
 */
export async function transcribeAudio(audioBuffer, mimetype = 'audio/ogg') {
    try {
        // Determinar extensão do arquivo
        const extension = mimetype.includes('ogg') ? 'ogg' :
            mimetype.includes('mp4') ? 'm4a' :
                mimetype.includes('mpeg') ? 'mp3' : 'ogg';

        // Salvar áudio temporariamente
        const tempPath = join(tempDir, `audio_${Date.now()}.${extension}`);
        writeFileSync(tempPath, audioBuffer);

        // Criar FormData para envio
        const formData = new FormData();
        formData.append('file', createReadStream(tempPath), {
            filename: `audio.${extension}`,
            contentType: mimetype
        });
        formData.append('model', config.groq.model);
        formData.append('language', config.groq.language);
        formData.append('response_format', 'text');

        // Fazer requisição para API do Groq usando https nativo
        const response = await new Promise((resolve, reject) => {
            const req = https.request({
                hostname: 'api.groq.com',
                path: '/openai/v1/audio/transcriptions',
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${config.groq.apiKey}`,
                    ...formData.getHeaders()
                }
            }, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => resolve({ status: res.statusCode, data }));
            });

            req.on('error', reject);
            formData.pipe(req);
        });

        // Limpar arquivo temporário
        try {
            unlinkSync(tempPath);
        } catch (e) {
            // Ignorar erro ao deletar
        }

        if (response.status !== 200) {
            console.error(`❌ Erro na API Groq: ${response.status} - ${response.data}`);
            return null;
        }

        return response.data.trim();

    } catch (error) {
        console.error('❌ Erro ao transcrever áudio:', error.message);
        return null;
    }
}

/**
 * Baixa e transcreve uma mensagem de áudio do WhatsApp
 * @param {object} message - Objeto da mensagem do WhatsApp
 * @returns {Promise<string|null>} Texto transcrito ou null se falhar
 */
export async function transcribeWhatsAppAudio(message) {
    try {
        console.log('🎤 Baixando áudio...');

        // Baixar mídia da mensagem
        const media = await message.downloadMedia();

        if (!media) {
            console.error('❌ Não foi possível baixar o áudio');
            return null;
        }

        // Converter base64 para Buffer
        const audioBuffer = Buffer.from(media.data, 'base64');

        console.log('🔄 Transcrevendo áudio...');
        const transcription = await transcribeAudio(audioBuffer, media.mimetype);

        if (transcription) {
            console.log(`✅ Transcrição: "${transcription}"`);
        }

        return transcription;

    } catch (error) {
        console.error('❌ Erro ao processar áudio do WhatsApp:', error.message);
        return null;
    }
}
