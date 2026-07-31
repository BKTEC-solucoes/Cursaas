FROM node:20-alpine AS build

ARG FRONTEND_DIR=frontend

WORKDIR /src

COPY ${FRONTEND_DIR}/package*.json ./
RUN npm ci

COPY ${FRONTEND_DIR}/ ./
RUN npm run build

# The Angular outputPath is defined in angular.json.
# For this project it is: dist/cursaas-frontend
# If you change the project name or outputPath, update the COPY line below accordingly.
# Examples:
#   dist/my-app       -> COPY --from=build /src/dist/my-app /usr/share/nginx/html
#   dist/browser      -> COPY --from=build /src/dist/browser /usr/share/nginx/html

FROM nginx:1.27-alpine

COPY --from=build /src/dist/cursaas-frontend /usr/share/nginx/html

# Arquivo de verdade, e nao um `printf` embutido: a config precisa de regras
# distintas para assets com hash e para rotas do SPA, e escapar tudo isso numa
# string de shell tornava a diferenca invisivel. Ver docker/nginx/spa.conf.
COPY docker/nginx/spa.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
