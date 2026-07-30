/**
 * Ambiente de PRODUCAO — trocado por fileReplacements em angular.json.
 *
 * URLs relativas: o nginx serve o SPA e faz proxy de /api, /uploads e /auth
 * para os respectivos servicos, tudo na mesma origem. Isso elimina o CORS e faz
 * o build funcionar em qualquer dominio sem recompilar.
 *
 * Antes deste arquivo existir, o build de producao embarcava
 * `http://localhost:8000/api` — ou seja, o navegador de cada usuario tentava
 * falar com o proprio localhost.
 */
export const environment = {
  production: true,
  apiUrl: '/api',
  uploadsUrl: '/uploads',
  baseUrl: '',
  // Preenchido no build; ver scripts/set-google-client-id.ps1
  googleClientId: 'SEU_GOOGLE_CLIENT_ID.apps.googleusercontent.com',
  googleAuthBackendUrl: '/auth/google',
};
