/**
 * Ambiente de DESENVOLVIMENTO (`ng serve`).
 *
 * Aqui as URLs sao absolutas porque o `ng serve` roda em :4200 e fala com o
 * FastAPI em :8000 e com o side-car Google em :3000 — processos separados.
 *
 * Em producao (environment.prod.ts) tudo vira caminho relativo, servido pelo
 * nginx na mesma origem. Ver docker/nginx/default.conf.
 */
export const environment = {
  production: false,
  apiUrl: 'http://localhost:8000/api',
  uploadsUrl: 'http://localhost:8000/uploads',
  baseUrl: 'http://localhost:8000',
  googleClientId: 'SEU_GOOGLE_CLIENT_ID.apps.googleusercontent.com',
  googleAuthBackendUrl: 'http://localhost:3000/auth/google',
};
