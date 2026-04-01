# 📋 Solução: Instituições com E-mails Duplicados (Vinculação com Usuários)

## **Problema Original**
```
❌ Email já existe em Usuários
❌ Não pode criar Instituição com mesmo email
❌ Regra de negócio: Admin pode gerenciar múltiplas instituições com seu email
```

---

## **Arquitetura da Solução**

### **1️⃣ Banco de Dados - Relacionamento**
```
┌─────────────────┐
│    Usuários     │
│   (id:PK)       │
│   email:UNIQUE  │
└────────┬────────┘
         │ 1
         │ (FK)
         │ N
┌────────▼─────────────────┐
│    Instituições         │
│  (id:PK)                │
│  user_id:FK (nullable)  │  ← Novo!
│  email (sem UNIQUE)     │  ← Modificado!
│  cnpj + user_id: UQ     │  ← Novo!
└─────────────────────────┘
```

**Então:**
- ✅ Um usuário pode ter **múltiplas instituições**
- ✅ Múltiplas instituições podem usar o **mesmo email**
- ✅ Número único: combinação `(cnpj, user_id)`

---

## **Componentes Implementados**

### **A) Banco de Dados (`migration_add_user_id_instituicoes.sql`)**
```sql
-- Adiciona coluna user_id
ALTER TABLE instituicoes 
ADD COLUMN user_id INT NULL,
ADD FOREIGN KEY (user_id) REFERENCES usuarios(id) ON DELETE CASCADE;

-- Remove UNIQUE de email (permite duplicatas)
ALTER TABLE instituicoes DROP INDEX email;

-- Cria UNIQUE composto
ALTER TABLE instituicoes 
ADD UNIQUE INDEX unique_cnpj_user (cnpj, user_id);

-- Colunas adicionais para rastreamento
ALTER TABLE instituicoes 
ADD COLUMN motivo_rejeicao VARCHAR(500) NULL,
ADD COLUMN observacoes TEXT NULL;
```

### **B) Modelo SQLAlchemy (`backend/app/models/__init__.py`)**
```python
class Instituicao(Base):
    __tablename__ = "instituicoes"
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, FK("usuarios.id"), nullable=True)  # Novo
    cnpj = Column(String(18), nullable=False)  # Removido unique=True
    email = Column(String(255), nullable=False)  # Removido unique=True
    # ... outros campos ...
    
    __table_args__ = (
        UniqueConstraint('cnpj', 'user_id', name='unique_cnpj_user'),  # Novo
    )
    
    usuario = relationship("Usuario", foreign_keys=[user_id])  # Novo
```

### **C) Schema Pydantic (`backend/app/schemas/__init__.py`)**
```python
class InstituicaoResponse(InstituicaoBase):
    id: int
    user_id: Optional[int] = None  # Novo
    ativo: bool
    aprovada: bool
    motivo_rejeicao: Optional[str] = None  # Novo
    observacoes: Optional[str] = None  # Novo
    data_criacao: datetime
```

### **D) Lógica de Negócio (Backend)**

**Endpoint: `POST /instituicoes/registrar`**

**Fluxo:**
```
1. Usuário envia: CNPJ + Email + Dados

2. Sistema busca usuário com esse email
   ├─ SE ENCONTRADO:
   │  ├─ Valida se o mesmo user_id + cnpj já existe
   │  ├─ Se não existe, cria Instituição vinculada (user_id = encontrado.id)
   │  └─ Retorna token do usuário existente
   │
   └─ SE NÃO ENCONTRADO:
      ├─ Cria Usuário NOVO (admin)
      ├─ Cria Instituição vinculada a esse novo usuário
      └─ Retorna token do novo usuário

3. ✅ Sem erro de UNIQUE constraint!
```

### **E) Frontend - Serviço Angular (`InstituicaoService`)**
```typescript
registrarInstituicao(dados: InstituicaoCreate): Observable<TokenResponse> {
  const dadosFormatados = {
    ...dados,
    cnpj: this.formatarCNPJ(dados.cnpj),  // Formata para XX.XXX.XXX/XXXX-XX
    email: dados.email.toLowerCase().trim()
  };

  return this.http.post<TokenResponse>(
    `${this.apiUrl}/registrar`,
    dadosFormatados
  ).pipe(
    tap(response => {
      localStorage.setItem('access_token', response.access_token);
    })
  );
}

// Formatar CNPJ automaticamente
formatarCNPJ(cnpj: string): string {
  const limpo = cnpj.replace(/\D/g, '');
  if (limpo.length !== 14) throw new Error('CNPJ inválido');
  return `${limpo.slice(0, 2)}.${limpo.slice(2, 5)}.${limpo.slice(5, 8)}/${limpo.slice(8, 12)}-${limpo.slice(12, 14)}`;
}
```

### **F) Frontend - Componente (`CriarInstituicaoComponent`)**
- Formulário com validações
- Formatação automática de CNPJ
- Verificação de senhas iguais
- Mensagens de erro/sucesso

---

## **Casos de Uso Cobertos**

| Cenário | Resultado |
|---------|-----------|
| Admin novo + email novo | ✅ Cria usuário + instituição |
| Admin existente + mesmo email | ✅ Vincula instituição ao usuário |
| Mesmo CNPJ + user_id diferentes | ✅ Permitido (cada admin tem seus CNPJs) |
| Mesmo CNPJ + **mesmo user_id** | ❌ Bloqueado (UNIQUE constraint) |
| Email em múltiplas instituições | ✅ Permitido (sem UNIQUE em email da tabela) |

---

## **Passos de Implementação**

1. **Executar migração SQL:**
```bash
cd backend
mysql -u root -p cursaas < ../database/migration_add_user_id_instituicoes.sql
```

2. **Reiniciar backend:**
```bash
python -m uvicorn app.main:app --reload
```

3. **Testar com cURL:**
```bash
curl -X POST http://localhost:8000/instituicoes/registrar \
  -H "Content-Type: application/json" \
  -d '{
    "nome_instituicao": "Escola ABC",
    "cnpj": "12.222.222/0001-99",
    "email": "admin@example.com",
    "nome_responsavel": "João Silva",
    "contato_responsavel": "11987654321",
    "endereco": "Rua X, 123 - São Paulo",
    "senha": "senha123"
  }'
```

---

## **Melhorias Adicionais Implementadas**

✅ Campos `motivo_rejeicao` e `observacoes` para rastrear rejeições  
✅ Relacionamento bidirecional (`Usuario.instituicoes`)  
✅ Formatação automática de CNPJ no frontend  
✅ Validações kompletas de formulário  
✅ Tratamento de erros detalhado  

---

## **Próximos Passos Recomendados**

1. **Criar rota de gerenciamento:**  
   - `GET /instituicoes` - Listar instituições do usuário autenticado
   - `PUT /instituicoes/{id}` - Atualizar instituição
   - `DELETE /instituicoes/{id}` - Remover instituição

2. **Dashboard admin:**  
   - Mostrar lista de instituições vinculadas
   - Aprovar/rejeitar instituições pendentes

3. **Testes:**  
   - Testes E2E para validar vinculação de usuário
   - Testes de constraint UNIQUE composto
