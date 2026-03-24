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

RUN printf 'server {\n\
    listen 8080;\n\
    root /usr/share/nginx/html;\n\
    index index.html;\n\
    location / {\n\
        try_files $uri $uri/ /index.html;\n\
    }\n\
}\n' > /etc/nginx/conf.d/default.conf

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
