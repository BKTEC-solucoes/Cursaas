# Backend Node - Google Login

API Node.js + Express para autenticação com Google OAuth2/OpenID Connect.

## Endpoints

- `POST /auth/google`
  - Body:
    ```json
    {
      "token": "idToken"
    }
    ```
- `GET /auth/google/callback`
  - Endpoint de callback registrado no Google Cloud (compatibilidade).
  - O fluxo principal da SPA continua em `POST /auth/google` com `idToken`.
  - Response:
    ```json
    {
      "token": "jwt-da-aplicacao",
      "user": {
        "email": "usuario@gmail.com",
        "name": "Nome Sobrenome"
      }
    }
    ```

## Rodando localmente

1. Copie `.env.example` para `.env` e preencha as variáveis.
2. Instale dependências:
   - `npm install`
3. Execute:
   - `npm run dev`

Servidor padrão: `http://localhost:3000`.
