# 🚀 Guia Rápido - Sistema de Registro de Alunos

## ✅ O que foi implementado

### Backend (Python/FastAPI)
- ✅ Novo schema `UsuarioCreateSimples` para registro simplificado
- ✅ Endpoint `POST /api/auth/registro` - Cria novo aluno
- ✅ Endpoint `GET /api/auth/check-email/{email}` - Valida email disponível
- ✅ Hash bcrypt automático para senha
- ✅ Validação de email duplicado
- ✅ JWT token gerado automaticamente

### Frontend (Angular)
- ✅ Método `register()` no AuthService
- ✅ Método `checkEmailAvailability()` no AuthService
- ✅ Componente integrado com validação de email em tempo real
- ✅ Indicadores visuais (✓ ✗ de email)
- ✅ Botão desabilitado enquanto valida ou carrega
- ✅ Redirecionamento para `/aluno/dashboard` após sucesso
- ✅ Mensagens de erro personalizadas

---

## 🎯 Funcionalidade Principal

**Fluxo:**
```
Usuario preenche nome/email/senha 
    ↓
Sai do campo email → Valida em tempo real
    ↓
Clica "Criar Conta"
    ↓
POST /api/auth/registro
    ↓
Sucesso: Token JWT salvo + Redireciona
Erro: Mostra mensagem
```

---

## 🏃 Como Começar

### 1. **Inicie o Backend**
```bash
cd backend
python run_server.py
```
Ou com Docker:
```bash
docker-compose up -d
```

### 2. **Inicie o Frontend** (em outro terminal)
```bash
cd frontend
npm start
```

### 3. **Acesse a Tela de Registro**
```
http://localhost:4200/auth/register/aluno
```

---

## 📝 Preencha Assim

| Campo | Exemplo | Validação |
|-------|---------|-----------|
| Nome | João Silva | Obrigatório, min 1 char |
| Email | joao@example.com | Obrigatório, válido, não duplicado |
| Senha | senha123456 | Obrigatório, min 6 chars |
| Confirmar | senha123456 | Deve coincidir com Senha |

---

## ✨ Recursos

### ✓ Validação em Tempo Real
- Ao sair do campo email, aparece:
  - 🔄 "Verificando..."
  - ✓ "Email disponível" (verde)
  - ✗ "Email em uso" (vermelho)

### ✓ Botão Inteligente
- Desabilitado se:
  - Algum campo está vazio
  - Email não está disponível
  - Está fazendo requisição
  
- Habilitado se:
  - Todos os campos preenchidos
  - Email disponível
  - Não está carregando

### ✓ Mensagens de Erro
- Email duplicado
- Senha diferente
- Dados inválidos
- Erros de conexão

---

## 🔒 Dados Salvos no Banco

Quando registra, estes dados são salvos:
- `nome` - Seu nome completo
- `email` - Seu email (único)
- `senha` - Hash bcrypt (nunca texto plano)
- `role` - Sempre "aluno"
- `ativo` - true
- `data_criacao` - Timestamp

---

## 🧪 Teste ao Menos Uma Vez

1. **Acesse:** http://localhost:4200/auth/register/aluno
2. **Preencha:**
   - Nome: "Seu Nome"
   - Email: "seu@email.com"
   - Senha: "teste123456"
   - Confirmar: "teste123456"
3. **Clique:** "Criar Conta"
4. **Resultado esperado:**
   - Mensagem "Bem-vindo!"
   - Redireciona para `/aluno/dashboard`

---

## 📊 Resposta da API

### Sucesso (201 Created)
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "usuario": {
    "id": 123,
    "nome": "João Silva",
    "email": "joao@example.com",
    "role": "aluno",
    "ativo": true
  }
}
```

### Erro (400 Bad Request)
```json
{
  "detail": "Email já registrado"
}
```

---

## 🔧 Configurações (se precisar alterar)

### Senha Mínima
**Backend:** `backend/app/schemas/__init__.py`
```python
senha: str = Field(..., min_length=6)  # ← Altere aqui
```

### URL da API
**Frontend:** `frontend/src/app/core/services/auth.service.ts`
```typescript
private apiUrl = 'http://localhost:8000/api';  // ← Altere aqui
```

### Expiração de Token
**Backend:** `backend/app/services/auth_service.py`
```python
EXPIRES_DELTA = timedelta(hours=24)  # ← Altere aqui
```

---

## 🐛 Se Algo Não Funcionar

### "Erro ao buscar email"
- ✓ Backend está rodando? (`http://localhost:8000/docs`)
- ✓ Email é válido? (contem @)

### "Email já registrado" quando é novo
- ✓ Limpe localStorage: `localStorage.clear()` no console
- ✓ Tente outro email

### "Redireciona mas volta à tela de login"
- ✓ Token JWT pode estar inválido
- ✓ Verifique em `localStorage.getItem('access_token')`

### Frontend não faz requisição
- ✓ Abra Dev Tools (F12) → Network
- ✓ Veja se a requisição está sendo feita
- ✓ Verifique a resposta do backend

---

## 📚 Documentação Completa

Para mais detalhes, veja:
- `REGISTRO_ALUNO_IMPLEMENTATION.md` - Implementação técnica completa
- `backend/test_registro_alunos.py` - Exemplos de testes
- `backend/app/routes/auth.py` - Código do backend
- `frontend/src/app/core/services/auth.service.ts` - Código do frontend

---

## ✅ Checklist de Sucesso

- [ ] Backend rodando em `localhost:8000`
- [ ] Frontend rodando em `localhost:4200`
- [ ] Acesso a `/auth/register/aluno`
- [ ] Validação de email em tempo real funciona
- [ ] Registro bem-sucedido com novo email
- [ ] Redireciona para `/aluno/dashboard`
- [ ] Token JWT salvo em localStorage
- [ ] Dados aparecem no banco de dados
- [ ] Login funciona com nova conta
- [ ] Não permite email duplicado

---

## 💡 Próximas Melhorias (Opcional)

- [ ] Email de confirmação
- [ ] Recovery de senha
- [ ] Dados adicionais progressivos
- [ ] Rate limiting
- [ ] Autenticação social (Google, GitHub)
- [ ] 2FA (SMS/Authenticator)

---

**Status:** ✅ Pronto para usar! 🎉
