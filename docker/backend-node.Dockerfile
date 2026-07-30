FROM node:20-alpine

ARG NODE_DIR=backend-node

WORKDIR /app

ENV NODE_ENV=production

COPY ${NODE_DIR}/package*.json ./
RUN npm ci --omit=dev

COPY ${NODE_DIR}/ /app/

EXPOSE 3000

CMD ["node", "src/server.js"]
