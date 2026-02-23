# ⚡ QuickStart - Validar Implementação Notas

## 1️⃣ Verificar Arquivos Criados/Modificados

```powershell
# Verificar que Notas endpoints existem
Get-Content c:\projetos\Cursaas\backend\app\routes\notas.py | Select-String "def " | Select-Object -First 10

# Verificar que testes foram criados
Test-Path c:\projetos\Cursaas\backend\test_notas.py

# Verificar que documentação foi atualizada
Select-String "Notas.*COMPLETO" c:\projetos\Cursaas\PROJECT_OVERVIEW.md
```

---

## 2️⃣ Iniciar Servidor FastAPI

```bash
cd c:\projetos\Cursaas\backend

# Opção 1: Com uvicorn direto
uvicorn app.main:app --reload

# Opção 2: Com script existente
python run_server.py

# Opção 3: Com start_server.py
python start_server.py
```

**Esperado:** Servidor inicia em http://localhost:8000  
**Logs:** Ver "Uvicorn running on http://127.0.0.1:8000"

---

## 3️⃣ Verificar API Docs

Abrir em navegador: **http://localhost:8000/docs**

Procurar pela seção **"Notas"** com os seguintes endpoints:
- ✅ GET /api/notas
- ✅ GET /api/notas/{aluno_id}
- ✅ GET /api/notas/{aluno_id}/{prova_id}
- ✅ PUT /api/notas/{nota_id}
- ✅ GET /api/notas/curso/{curso_id}
- ✅ GET /api/notas/aluno/{aluno_id}/curso/{curso_id}
- ✅ POST /api/notas/{aluno_id}/{curso_id}/calcular-media

---

## 4️⃣ Executar Testes de Notas

```bash
cd c:\projetos\Cursaas\backend

# Com o servidor rodando em outro terminal:
python test_notas.py
```

**Esperado:**
```
============================================================
TESTES DE NOTAS - CURSAAS EAD
============================================================

=== Teste 1: Listar todas as notas (admin) ===
Status: 200
✓ Admin conseguiu listar notas

=== Teste 2: Aluno negado - listar todas as notas ===
Status: 403
✓ Aluno foi negado corretamente

[... 10 mais testes ...]

✓ TODOS OS TESTES COMPLETADOS
============================================================
```

---

## 5️⃣ Testar Manualmente via Swagger

### Login como Admin
1. Abrir http://localhost:8000/docs
2. Clicar em "POST /api/auth/login"
3. Clicar "Try it out"
4. Preencher:
   ```json
   {
     "email": "admin@example.com",
     "password": "senha123"
   }
   ```
5. Clicar "Execute"
6. Copiar o `access_token` da resposta

### Autorizar com Token
1. Clicar no botão verde "Authorize" no topo
2. Cole: `Bearer {access_token}` (substitua {access_token} pelo token copiado)
3. Clicar "Authorize"

### Testar Endpoints
1. Abrir seção "Notas"
2. Expandir "GET /api/notas"
3. Clicar "Try it out"
4. Clicar "Execute"
5. Verificar que retorna lista vazia `[]` (esperado se não há notas)

---

## 6️⃣ Teste Completo - Criar Cenário

### Setup Inicial (fazer como admin)

```bash
# 1. Criar Curso
curl -X POST "http://localhost:8000/api/cursos" \
  -H "Authorization: Bearer {admin_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Curso Teste Notas",
    "descricao": "Para validar endpoints",
    "data_inicio": "2026-02-23T00:00:00",
    "data_fim": "2026-02-28T23:59:59"
  }'
# Resposta: curso_id = 1

# 2. Criar Aula
curl -X POST "http://localhost:8000/api/aulas" \
  -H "Authorization: Bearer {admin_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "curso_id": 1,
    "titulo": "Aula 1",
    "descricao": "Para teste",
    "numero_aula": 1,
    "data": "2026-02-23T10:00:00",
    "duracao_minutos": 60,
    "video_url": "https://example.com/video.mp4"
  }'
# Resposta: aula_id = 1

# 3. Criar Prova
curl -X POST "http://localhost:8000/api/provas" \
  -H "Authorization: Bearer {admin_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "curso_id": 1,
    "aula_id": 1,
    "titulo": "Prova 1",
    "descricao": "Teste",
    "tipo": "objetiva",
    "pontuacao_maxima": 10,
    "is_obrigatoria": true,
    "data_inicio": "2026-02-23T00:00:00",
    "data_fim": "2026-02-28T23:59:59"
  }'
# Resposta: prova_id = 1
```

### Aluno Responde Prova

```bash
# Estudante automaticamente recebe nota quando responde
curl -X POST "http://localhost:8000/api/provas/1/responder" \
  -H "Authorization: Bearer {aluno_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "respostas": [
      {"questao_id": 1, "opcao_id": 101, "texto_resposta": null}
    ]
  }'
# Resposta: nota_final = 5.0 (automática)
# Efeito colateral: nota criada em tabela `notas`
```

### Admin Verifica e Calcula Média

```bash
# Ver notas do aluno
curl -X GET "http://localhost:8000/api/notas/2" \
  -H "Authorization: Bearer {admin_token}"
# Resposta: lista com 1 nota

# Calcular média do curso
curl -X POST "http://localhost:8000/api/notas/2/1/calcular-media" \
  -H "Authorization: Bearer {admin_token}"
# Resposta: media_final = 5.0, aprovado = false

# Ver nota do curso
curl -X GET "http://localhost:8000/api/notas/aluno/2/curso/1" \
  -H "Authorization: Bearer {admin_token}"
# Resposta: mostra media_final e status aprovado
```

---

## 7️⃣ Validar Controle de Acesso

### Tentar como Aluno (deve falhar)

```bash
# Isso deve retornar 403 Forbidden
curl -X GET "http://localhost:8000/api/notas" \
  -H "Authorization: Bearer {aluno_token}"

# Isso deve retornar 403 Forbidden
curl -X POST "http://localhost:8000/api/notas/2/1/calcular-media" \
  -H "Authorization: Bearer {aluno_token}"

# Isso deve retornar 403 Forbidden (não pode ver notas de outro)
curl -X GET "http://localhost:8000/api/notas/3" \
  -H "Authorization: Bearer {aluno_outro_token}"
```

**Esperado:** HTTP 403 (Forbidden) em todas

---

## 8️⃣ Checklist Final

- [ ] Servidor FastAPI inicia sem erros
- [ ] Swagger documentação carrega em http://localhost:8000/docs
- [ ] Seção "Notas" está visível no Swagger
- [ ] Login funciona e retorna token
- [ ] Admin consegue listar notas (GET /api/notas)
- [ ] Aluno negado em listar todas (GET /api/notas)
- [ ] Admin consegue atualizar nota (PUT /api/notas/{id})
- [ ] Aluno negado em atualizar (PUT /api/notas/{id})
- [ ] Cálculo de média funciona (POST .../calcular-media)
- [ ] Relatório de curso funciona (GET .../curso/{id})
- [ ] Todos os 12 testes em test_notas.py passam
- [ ] DATABASE_URL no .env está correto

---

## 🚨 Troubleshooting

### Erro: "ModuleNotFoundError: No module named 'app'"
**Solução:**
```bash
cd c:\projetos\Cursaas\backend
set PYTHONPATH=%CD%
python test_notas.py
```

### Erro: "Connection refused" ao conectar MySQL
**Verificar:**
```bash
# MySQL está rodando?
# Verificar variável DATABASE_URL em .env
# Padrão: mysql+pymysql://root:sqladmin@localhost:3306/cursaas
cat .env | grep DATABASE_URL
```

### Erro: "401 Unauthorized"
**Causa:** Token expirado ou credential inválido  
**Solução:** Fazer login novamente e usar novo token

### Erro: "404 Not Found" em nota específica
**Causa:** Aluno ainda não respondeu essa prova  
**Solução:** Aluno responder prova primeiro (POST /responder)

---

## 📊 Resumo de Validação

| Componente | Status | Verificar |
|------------|--------|-----------|
| Arquivo notas.py | ✅ | `Get-Content app\routes\notas.py` |
| Test file | ✅ | `Test-Path test_notas.py` |
| Schemas | ✅ | Buscar "NotaDetail" em schemas/__init__.py |
| Documentação | ✅ | PROJECT_OVERVIEW.md has Notas section |
| Servidor | ✅ | http://localhost:8000 responde |
| Swagger | ✅ | http://localhost:8000/docs carrega |
| Endpoints | ✅ | 7 endpoints visíveis em Notas section |
| Testes | ✅ | `python test_notas.py` passa |
| Acesso | ✅ | Admin acessa, aluno é negado |

---

## 🎯 Conclusão

✅ **Implementação de Notas validada e completa**

Próximo passo: Iniciar desenvolvimento Angular (Fase 2)

