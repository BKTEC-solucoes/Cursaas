"""
Test Registro de Alunos - Exemplos Práticos
==============================================

Estes são exemplos que você pode usar para testar a funcionalidade de registro
"""

# ============================================================================
# 1. TESTE DO BACKEND COM cURL
# ============================================================================

"""
TESTE 1: Validar Email Disponível
----------------------------------
"""
# GET para verificar se email está disponível

curl -X GET \
  "http://localhost:8000/api/auth/check-email/novo@example.com" \
  -H "Content-Type: application/json"

# Resposta esperada (email disponível):
# {"disponivel": true, "email": "novo@example.com"}


"""
TESTE 2: Registrar Novo Aluno (Sucesso)
----------------------------------------
"""

curl -X POST \
  "http://localhost:8000/api/auth/registro" \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "João Silva",
    "email": "joao123@example.com",
    "senha": "senha123456"
  }'

# Resposta esperada (201 Created):
# {
#   "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
#   "token_type": "bearer",
#   "usuario": {
#     "id": 123,
#     "nome": "João Silva",
#     "email": "joao123@example.com",
#     "role": "aluno",
#     "admin_role": null,
#     "ativo": true,
#     "data_criacao": "2025-03-30T10:30:00"
#   }
# }


"""
TESTE 3: Email Duplicado (Erro)
--------------------------------
"""

curl -X POST \
  "http://localhost:8000/api/auth/registro" \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Outro João",
    "email": "joao123@example.com",
    "senha": "outrasenha"
  }'

# Resposta esperada (400 Bad Request):
# {"detail": "Email já registrado"}


"""
TESTE 4: Dados Inválidos - Email Mal Formatado
-----------------------------------------------
"""

curl -X POST \
  "http://localhost:8000/api/auth/registro" \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Maria",
    "email": "email_invalido",
    "senha": "senha123"
  }'

# Resposta esperada (422 Unprocessable Entity):
# {"detail": [...validation errors...]}


"""
TESTE 5: Dados Inválidos - Senha Muito Curta
---------------------------------------------
"""

curl -X POST \
  "http://localhost:8000/api/auth/registro" \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Maria",
    "email": "maria@example.com",
    "senha": "123"
  }'

# Resposta esperada (422 Unprocessable Entity):
# {"detail": [{"loc": ["body", "senha"], "msg": "ensure this value has at least 6 characters", ...}]}


# ============================================================================
# 2. TESTE DO FRONTEND
# ============================================================================

"""
EM SEU NAVEGADOR:

1. Acesse: http://localhost:4200/auth/register/aluno

2. Preencha os campos:
   - Nome Completo: "João Silva"
   - Email: "joao@test.com"
   - Senha: "senha123456"
   - Confirmar Senha: "senha123456"

3. Comportamento esperado:
   ✓ Ao sair do campo email (blur), aparecerá:
     - "Verificando..." (enquanto valida)
     - Então "✓ Email disponível" (verde) se novo
   
   ✓ Botão "Criar Conta" fica habilitado se email estiver disponível

4. Clique em "Criar Conta"

5. Esperado:
   ✓ Botão mostra "Criando conta..." e fica desabilitado
   ✓ Após sucesso: Tela mostra "Bem-vindo!"
   ✓ Após 1.5s: Redireciona para /aluno/dashboard
   ✓ Token JWT salvo em localStorage

6. Para verificar token no console do navegador:
   > localStorage.getItem('access_token')
   "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
"""


# ============================================================================
# 3. TESTE DE ERRO: EMAIL DUPLICADO NO FRONTEND
# ============================================================================

"""
SE VOCÊ REGISTROU "joao@test.com" ANTES:

1. Tente registrar novamente com o mesmo email

2. Esperado:
   ✓ Ao sair do campo email, mostrará:
     - "✗ Email em uso" (vermelho)
   
   ✓ Botão "Criar Conta" fica desabilitado
   
   ✓ Se tentar forçar submit (JS), recebe erro do backend:
     - "Email já registrado"
"""


# ============================================================================
# 4. TESTE COM PYTHON REQUESTS (Backend interno)
# ============================================================================

import requests
import json

BASE_URL = "http://localhost:8000/api"

def test_register_aluno():
    """Teste completo de registro"""
    
    # Dados do novo aluno
    payload = {
        "nome": "Maria Santos",
        "email": f"maria{int(time.time())}@example.com",  # Email único
        "senha": "senhaSegura123"
    }
    
    # POST para registro
    response = requests.post(f"{BASE_URL}/auth/registro", json=payload)
    
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    
    # Se sucesso, extrair token
    if response.status_code == 201:
        token = response.json()["access_token"]
        print(f"\n✓ Token JWT: {token[:50]}...")
        return token
    else:
        print(f"\n✗ Erro: {response.json()}")
        return None


def test_check_email(email):
    """Teste de validação de email"""
    
    response = requests.get(f"{BASE_URL}/auth/check-email/{email}")
    
    print(f"Email: {email}")
    print(f"Disponível: {response.json()['disponivel']}")


# Usar:
# test_register_aluno()
# test_check_email("joao@test.com")
# test_check_email("novoemail@test.com")


# ============================================================================
# 5. TESTE DO BANCO DE DADOS
# ============================================================================

"""
SQL: Verificar novo usuário no banco

1. Acesse o banco de dados:
   (MySQL, PostgreSQL, etc conforme seu config)

2. Execute:
"""

SELECT 
  id,
  nome,
  email,
  role,
  ativo,
  data_criacao
FROM usuarios
WHERE email = 'joao@test.com'
LIMIT 1;

# Esperado:
# id    | nome        | email         | role  | ativo | data_criacao
# ------|-------------|---------------|-------|-------|---------------------
# 123   | João Silva  | joao@test.com | aluno | true  | 2025-03-30 10:30:00


"""
3. Verificar que senha está hasheada:
"""

SELECT email, senha FROM usuarios WHERE email = 'joao@test.com';

# Esperado:
# Coluna 'senha' mostrará algo como:
# $2b$12$KIXYLDz.BQLxVqVXhNmNae7y3CqzknlDqDNz/HVlFjPWOPfWEXnUm
# (Hash bcrypt, nunca o texto plano)


# ============================================================================
# 6. TESTE: FAZER LOGIN COM O NOVO USUÁRIO
# ============================================================================

"""
Agora que registrou, você pode fazer login com as mesmas credenciais
"""

curl -X POST \
  "http://localhost:8000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "joao@test.com",
    "senha": "senha123456"
  }'

# Resposta esperada (200 OK):
# {
#   "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
#   "token_type": "bearer",
#   "usuario": {...}
# }


# ============================================================================
# 7. VALIDAÇÕES QUE DEVEM FALHAR
# ============================================================================

"""
Estes testes devem retornar erro:
"""

# ✗ Nome vazio
{
  "nome": "",
  "email": "teste@example.com",
  "senha": "senha123"
}
# Erro: 422

# ✗ Email vazio
{
  "nome": "Teste",
  "email": "",
  "senha": "senha123"
}
# Erro: 422

# ✗ Senha vazia
{
  "nome": "Teste",
  "email": "teste@example.com",
  "senha": ""
}
# Erro: 422

# ✗ Senha muito curta
{
  "nome": "Teste",
  "email": "teste@example.com",
  "senha": "123"
}
# Erro: 422 (min_length=6)

# ✗ Email inválido
{
  "nome": "Teste",
  "email": "nao-eh-email",
  "senha": "senha123"
}
# Erro: 422 (EmailStr validation)


# ============================================================================
# RESUMO DO QUE TESTAR
# ============================================================================

CHECKLIST DE TESTES:
====================

✓ [ ] Registrar novo aluno com sucesso
✓ [ ] Token JWT retornado e salvo
✓ [ ] Email está no banco de dados
✓ [ ] Senha está hasheada (não em texto plano)
✓ [ ] Validação de email duplicado funciona
✓ [ ] Melhor indicador visual no frontend (✓ ✗)
✓ [ ] Botão desabilitado quando email em uso
✓ [ ] Redireciona para /aluno/dashboard após sucesso
✓ [ ] Validações de campos vazios funcionam
✓ [ ] Validação de senha mínimo 6 caracteres
✓ [ ] Mensagem de erro clara ao usuário
✓ [ ] Login funciona com nova conta registrada
✓ [ ] Dados persistem no banco (teste SELECT)

"""
