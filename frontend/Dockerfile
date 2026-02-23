FROM node:18-alpine

WORKDIR /app

# Instalar Angular CLI
RUN npm install -g @angular/cli@18

# Copiar arquivos de dependências
COPY package.json package-lock.json ./

# Instalar dependências
RUN npm install

# Copiar código
COPY . .

# Expor porta
EXPOSE 4200

# Comando para iniciar o servidor de desenvolvimento
CMD ["ng", "serve", "--host", "0.0.0.0", "--poll", "2000"]
