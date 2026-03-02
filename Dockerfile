FROM node:22-slim

# Instalar dependências necessárias para o Puppeteer/Chromium
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf libxss1 \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Configurar variáveis de ambiente do Puppeteer
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app

# Copiar arquivos de dependências
COPY package*.json ./

# Instalar dependências (incluindo produção)
RUN npm install

# Copiar o resto do código
COPY . .

# Criar pasta de dados se não existir
RUN mkdir -p data/whatsapp-session

# Comando para rodar o app
CMD ["npm", "start"]
