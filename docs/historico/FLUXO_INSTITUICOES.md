# 🏢 Fluxo Completo de Solicitações de Instituições

## 📊 Resumo Executivo

O projeto possui **2 caminhos distintos** para cadastro de instituições:

1. **`/api/instituicoes/registrar`** - Registro direto (aprovado automaticamente)
2. **`/api/faculdades/`** - Solicitação com aprovação manual (requer super admin)

---

## ❓ Resposta às Perguntas

### 1️⃣ Existem múltiplos endpoints de cadastro de instituição? Quais são?

**SIM**. Existem 2 principais:

| Endpoint | Método | Autenticação | Status Inicial | Uso |
|----------|--------|--------------|----------------|-----|
| `/api/instituicoes/registrar` | `POST` | ❌ Pública | `aprovada=True` | Registro direto (sem aprovação) |
| `/api/faculdades/` | `POST` | ❌ Pública | `aprovada=False` | Solicitação que requer aprovação |

---

### 2️⃣ Como uma instituição fica "pendente" versus "aprovada"?

**Campo do banco:** `Instituicao.aprovada` (Boolean)

| Status | Valor | Como Fica |
|--------|-------|----------|
| **PENDENTE** | `aprovada = False` | Criada via `POST /api/faculdades/` |
| **APROVADO** | `aprovada = True` | Super admin executa `PUT /api/faculdades/{id}/aprovar` |
| **RECUSADO** | `aprovada = False` | Super admin executa `PUT /api/faculdades/{id}/recusar` |

---

### 3️⃣ Onde o super admin vê as solicitações pendentes?

**Frontend:**
- Rota: `/admin/faculdades`
- Componente: [frontend/src/app/features/admin/pages/instituicoes.component.ts](frontend/src/app/features/admin/pages/instituicoes.component.ts)
- Interface com filtro por status (pendente/aprovado/recusado)

**Backend (API):**
- `GET /api/faculdades/pendentes` - Retorna só as pendentes (requer super admin)
- `GET /api/faculdades/?status=pendente` - Retorna com paginação e filtro

---

### 4️⃣ O que diferencia `/api/instituicoes/registrar` de `/api/faculdades/`?

#### **`POST /api/instituicoes/registrar`** (InstitutionRegistrationService)

```
Fluxo:
1. Recebe: { nome_instituicao, cnpj, email, senha, etc }
2. **Cria instituição com aprovada=True, ativa=True** ✅
3. Cria usuário ADMIN para instituição
4. **Retorna JWT token** (acesso imediato)
5. Hash do CNPJ é validado e formatado

Status Resultado:
- Instituição: APROVADA + ATIVA
- Usuário: Admin da instituição, já autenticado
```

**Arquivo:** [backend/app/services/institution_registration_service.py](backend/app/services/institution_registration_service.py)

---

#### **`POST /api/faculdades/`** (InstituicaoService.criar_solicitacao)

```
Fluxo:
1. Recebe: { nome, email, cnpj, descricao }
2. **Cria instituição com aprovada=False** (PENDENTE)
3. **Não cria usuário automaticamente**
4. **Não retorna JWT**
5. Super admin deve aprovar depois

Status Resultado:
- Instituição: PENDENTE (aguardando aprovação)
- Sem acesso até aprovação
```

**Arquivo:** [backend/app/services/instituicao_service.py](backend/app/services/instituicao_service.py) linhas 25-47

---

## 🔄 Endpoints Completos

### **Para Criar/Registrar Instituição**

#### 📝 Opção 1: Registro Direto (Aprovado Automaticamente)

```http
POST /api/instituicoes/registrar
Content-Type: application/json

{
  "nome_instituicao": "Faculdade XYZ",
  "cnpj": "12.345.678/0001-90",
  "email": "admin@xyz.edu.br",
  "senha": "senha123",
  "nome_responsavel": "João Silva",
  "contato": "(11) 99999-9999",
  "endereco": "Rua XYZ, 100"
}

✅ Response 201:
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "token_type": "bearer",
  "usuario": {
    "id": 1,
    "email": "admin@xyz.edu.br",
    "nome": "João Silva",
    "role": "admin",
    "instituicao_id": 1
  }
}
```

---

#### 📝 Opção 2: Solicitação com Aprovação Manual

```http
POST /api/faculdades/
Content-Type: application/json

{
  "nome": "Faculdade ABC",
  "email": "contato@abc.edu.br",
  "cnpj": "98.765.432/0001-10",
  "descricao": "Descrição da instituição"
}

✅ Response 201:
{
  "id": 5,
  "nome": "Faculdade ABC",
  "email": "contato@abc.edu.br",
  "cnpj": "98.765.432/0001-10",
  "status": "pendente",
  "ativa": false,
  "data_criacao": "2026-04-07T10:30:00"
}
```

---

### **Para Gerenciar (Super Admin)**

#### ✅ Aprovar Instituição

```http
PUT /api/faculdades/{id}/aprovar
Authorization: Bearer {token_super_admin}

✅ Response 200:
{
  "id": 5,
  "nome": "Faculdade ABC",
  "status": "aprovado",
  "ativa": false
}

Nota: Marca aprovada=True e converte usuários admin em admin_role="instrutor"
```

**Arquivo:** [backend/app/services/instituicao_service.py](backend/app/services/instituicao_service.py#L47-L68) (linhas 47-68)

---

#### ❌ Recusar Instituição

```http
PUT /api/faculdades/{id}/recusar
Authorization: Bearer {token_super_admin}

✅ Response 200:
{
  "id": 5,
  "nome": "Faculdade ABC",
  "status": "recusado",
  "ativa": false
}
```

---

#### 🔓 Dar/Remover Acesso

```http
PATCH /api/faculdades/{id}/acesso
Authorization: Bearer {token_super_admin}
Content-Type: application/json

{
  "ativa": true
}

⚠️ Só funciona se status = "aprovado"
Erro se tentar ativar instituição pendente/recusada
```

---

#### 📋 Listar Pendentes

```http
GET /api/faculdades/pendentes
Authorization: Bearer {token_super_admin}

✅ Response 200:
[
  {
    "id": 5,
    "nome": "Faculdade ABC",
    "status": "pendente",
    "data_criacao": "2026-04-07T10:30:00"
  }
]
```

**Arquivo:** [backend/app/routes/faculdades.py](backend/app/routes/faculdades.py#L59-L74) (linhas 59-74)

---

#### 📋 Listar com Paginação e Filtro

```http
GET /api/faculdades/?status=pendente&page=1&limit=20
Authorization: Bearer {token_super_admin}

Query Parameters:
- status: pendente | aprovado | recusado | (vazio = todas)
- page: número da página (default 1)
- limit: itens por página (default 20, máx 100)

✅ Response 200:
{
  "items": [...],
  "total": 15,
  "page": 1,
  "limit": 20,
  "total_pages": 1
}
```

---

#### 📖 Detalhe da Instituição

```http
GET /api/faculdades/{id}
Authorization: Bearer {token_super_admin}

✅ Response 200:
{
  "id": 5,
  "nome": "Faculdade ABC",
  "email": "contato@abc.edu.br",
  "cnpj": "98.765.432/0001-10",
  "status": "pendente",
  "ativa": false,
  "data_criacao": "2026-04-07T10:30:00"
}
```

---

## 📦 Modelo de Dados

### Instituicao (Banco de Dados)

```python
class Instituicao(Base):
    __tablename__ = "instituicoes"

    id = Column(Integer, primary_key=True)
    nome_instituicao = Column(String(255), nullable=False)
    cnpj = Column(String(18), unique=True, nullable=False, index=True)
    contato = Column(String(255), nullable=False)
    endereco = Column(String(500), nullable=False)
    ativa = Column(Boolean, default=False)              # ❌ Sem acesso inicial
    aprovada = Column(Boolean, default=False)          # ❌ Pendente inicial
    data_criacao = Column(DateTime, default=utcnow)
    data_atualizacao = Column(DateTime, onupdate=utcnow)
```

**Arquivo:** [backend/app/models/__init__.py](backend/app/models/__init__.py#L339-L360) (linhas 339-360)

---

### StatusInstituicaoEnum

```python
class StatusInstituicaoEnum(str, enum.Enum):
    pendente = "pendente"      # aprovada=False, ativa geralmente=False
    aprovado = "aprovado"      # aprovada=True
    recusado = "recusado"      # aprovada=False (explicitamente rejeitado)
```

**Arquivo:** [backend/app/models/__init__.py](backend/app/models/__init__.py#L34-L37) (linhas 34-37)

---

## 🔍 Lógica de Criação/Aprovação

### Criar Solicitação (Pendente)

**Código:** [backend/app/services/instituicao_service.py](backend/app/services/instituicao_service.py#L25-L47)

```python
@staticmethod
def criar_solicitacao(db: Session, payload: InstituicaoCreate) -> Instituicao:
    # 1. Normaliza CNPJ
    cnpj_normalizado = _normalizar_cnpj(payload.cnpj)
    
    # 2. Verifica se já existe
    if InstituicaoRepository.get_by_cnpj(db, cnpj_normalizado):
        raise HTTPException(409, "Já existe instituição com este CNPJ")
    
    # 3. Cria com aprovada=False (PENDENTE)
    return InstituicaoRepository.create(
        db,
        nome=payload.nome,
        email=payload.email,
        cnpj=cnpj_normalizado,
        descricao=payload.descricao,
    )
```

---

### Aprovar Instituição

**Código:** [backend/app/services/instituicao_service.py](backend/app/services/instituicao_service.py#L47-L68)

```python
@staticmethod
def aprovar(db: Session, instituicao_id: int) -> Instituicao:
    inst = _get_or_404(db, instituicao_id)
    
    if inst.aprovada:
        raise HTTPException(400, "Já está aprovada")
    
    # Converte usuarios admin da instituição em admin_role="instrutor"
    usuarios = db.query(Usuario).filter(
        Usuario.instituicao_id == instituicao_id,
        Usuario.role == RoleEnum.admin
    ).all()
    
    for usuario in usuarios:
        usuario.admin_role = AdminRoleEnum.instrutor
        db.add(usuario)
    
    # Marca como aprovada
    return InstituicaoRepository.set_status(
        db, inst, StatusInstituicaoEnum.aprovado
    )
```

---

### Recusar Instituição

**Código:** [backend/app/services/instituicao_service.py](backend/app/services/instituicao_service.py#L70-L82)

```python
@staticmethod
def recusar(db: Session, instituicao_id: int) -> Instituicao:
    inst = _get_or_404(db, instituicao_id)
    
    if not inst.aprovada:
        raise HTTPException(400, "Já está recusada")
    
    # Marca como recusada
    return InstituicaoRepository.set_status(
        db, inst, StatusInstituicaoEnum.recusado
    )
```

---

## 🖼️ Diagrama de Estados

```
┌─────────────────────────────────────────────────────────────┐
│                   INSTITUIÇÃO CRIADA                        │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ├─ Via POST /api/instituicoes/registrar
                       │  └─> aprovada=True, ativa=True ✅ PRONTO
                       │
                       └─ Via POST /api/faculdades/
                          └─> aprovada=False ❌ PENDENTE
                             │
                             ├─ Super Admin aprova
                             │  └─> PUT /faculdades/{id}/aprovar
                             │     └─> aprovada=True ✅
                             │        └─ Pode ativar: PATCH /faculdades/{id}/acesso
                             │           └─> ativa=True ✅ ACESSO PERMITIDO
                             │
                             └─ Super Admin recusa
                                └─> PUT /faculdades/{id}/recusar
                                   └─> aprovada=False (recusada) ❌
```

---

## 🎯 Fluxo de Aprovação no Frontend

**Arquivo:** [frontend/src/app/features/admin/pages/instituicoes.component.ts](frontend/src/app/features/admin/pages/instituicoes.component.ts)

```html
<!-- Super Admin vê lista em /admin/faculdades -->

<!-- Filtrar por status -->
<select [(ngModel)]="filtroStatus">
  <option value="">Todos</option>
  <option value="pendente">Pendente</option>
  <option value="aprovado">Aprovado</option>
  <option value="recusado">Recusado</option>
</select>

<!-- Tabela com ações -->
<table>
  <tr *ngFor="let inst of instituicoes">
    <td>{{ inst.nome }}</td>
    <td>
      <span class="badge">{{ inst.status }}</span>
    </td>
    <td>
      <!-- Botões de ação -->
      <button (click)="atualizarStatus('aprovado')">✓ Aprovar</button>
      <button (click)="atualizarStatus('recusado')">✕ Recusar</button>
    </td>
  </tr>
</table>
```

**Endpoints chamados:**
- `GET /api/faculdades/?status={filtroStatus}`
- `PUT /api/faculdades/{id}/aprovar`
- `PUT /api/faculdades/{id}/recusar`
- `PATCH /api/faculdades/{id}/acesso`

---

## 📂 Arquivos Relevantes

### Backend

| Arquivo | Responsabilidade |
|---------|-----------------|
| [backend/app/routes/instituicao.py](backend/app/routes/instituicao.py) | Endpoints: `/api/instituicoes/registrar` |
| [backend/app/routes/faculdades.py](backend/app/routes/faculdades.py) | Endpoints: `/api/faculdades/*` |
| [backend/app/services/instituicao_service.py](backend/app/services/instituicao_service.py) | Lógica: criar, aprovar, recusar |
| [backend/app/services/institution_registration_service.py](backend/app/services/institution_registration_service.py) | Lógica: registro direto com usuário |
| [backend/app/repositories/instituicao_repository.py](backend/app/repositories/instituicao_repository.py) | BD: queries de instituição |
| [backend/app/models/__init__.py](backend/app/models/__init__.py) | Modelo: classe Instituicao |

### Frontend

| Arquivo | Responsabilidade |
|---------|-----------------|
| [frontend/src/app/features/admin/pages/instituicoes.component.ts](frontend/src/app/features/admin/pages/instituicoes.component.ts) | Lista e filtra instituições |
| [frontend/src/app/features/admin/pages/instituicao-detalhe.component.ts](frontend/src/app/features/admin/pages/instituicao-detalhe.component.ts) | Detalhe + aprova/recusa |
| [frontend/src/app/auth/pages/register-instituicao.component.ts](frontend/src/app/auth/pages/register-instituicao.component.ts) | Registro público (via `/api/faculdades/`) |

---

## 🔐 Permissões

| Endpoint | Requer Auth | Perfil | 
|----------|-------------|--------|
| `POST /api/instituicoes/registrar` | ❌ Não | - |
| `POST /api/faculdades/` | ❌ Não | - |
| `GET /api/faculdades/` | ✅ Sim | Super Admin |
| `GET /api/faculdades/pendentes` | ✅ Sim | Super Admin |
| `PUT /api/faculdades/{id}/aprovar` | ✅ Sim | Super Admin |
| `PUT /api/faculdades/{id}/recusar` | ✅ Sim | Super Admin |
| `PATCH /api/faculdades/{id}/acesso` | ✅ Sim | Super Admin |

---

## 🎬 Cenário Prático

### Cenário 1: Instituição Registra Diretamente
```
1. Instituição acessa: http://localhost:4200/auth/register
2. Preenche dados e clica "Enviar Solicitação"
3. POST /api/instituicoes/registrar
   ├─ Cria instituição com aprovada=True ✅
   ├─ Cria usuário admin
   ├─ Retorna JWT
   └─ Usuário já tem acesso
```

### Cenário 2: Instituição Faz Solicitação (Requer Aprovação)
```
1. Instituição acessa: http://localhost:4200/auth/register
2. Preenche dados (sem senha/usuário)
3. POST /api/faculdades/
   └─ Cria instituição com aprovada=False ❌ PENDENTE
4. Super Admin acessa: http://localhost:4200/admin/faculdades
5. Vê instituição em status "pendente"
6. Clica "Aprovar" → PUT /api/faculdades/{id}/aprovar
   ├─ Marca aprovada=True ✅
   └─ Pode ativar depois
7. Clica "Ativar" → PATCH /api/faculdades/{id}/acesso
   └─ ativa=True → Acesso liberado ✅
```

---

## ⚙️ Validações

### CNPJ
- 14 dígitos obrigatório
- Validação de dígito verificador (algoritmo)
- Não pode repetir (ex: 11111111111111)
- Formatado: `XX.XXX.XXX/XXXX-XX`

### Email
- Deve ser único (usuário admin)
- Validação de formato

### Contato (Telefone)
- Mínimo 10 dígitos

---

## 🚨 PROBLEMA IDENTIFICADO

⚠️ **Há inconsistência no modelo:**

O modelo `Instituicao` tem apenas um campo booleano `aprovada`, mas há 3 estados possíveis:
- `pendente` (aprovada=False, não rejeitada)
- `aprovado` (aprovada=True)
- `recusado` (aprovada=False, rejeitada)

**Solução:** Seria melhor adicionar um enum `status` como campo direto no banco, não apenas booleanos.

