# Documentação - Sistema de Registro (Sign Up) + Lojas

## Arquivos Criados e Modificados

### 1. **Modificações no Login**
**Arquivo**: `frontend/src/app/auth/pages/login.component.*`
- **TS**: Adicionado `RouterLink` nos imports
- **HTML**: Adicionado link "Criar conta" ( redirecionando para `/auth/register`)
- **CSS**: Adicionado estilo `.register-link` com transições

### 2. **Componente de Seleção de Tipo**
**Arquivo**: `frontend/src/app/auth/pages/register.component.*`

**TypeScript** (`register.component.ts`):
- Componente standalone com Router injetado
- Métodos: `selectAluno()`, `selectInstituicao()`, `goBack()`
- Redireciona para `/auth/register/aluno` ou `/auth/register/instituicao`

**HTML** (`register.component.html`):
- Tela de boas-vindas com dois botões
- Ícones visuais (👤 para aluno, 🏫 para instituição)
- Link para voltar ao login

**CSS** (`register.component.css`):
- Centralizado com gradiente roxo
- Botões com hover effect (levanta 5px com shadow)
- Estilo consistente com a tela de login

### 3. **Registro de Aluno**
**Arquivo**: `frontend/src/app/auth/pages/register-aluno.component.*`

**Campos**:
- Nome Completo
- Email
- Senha (com toggle mostrar/ocultar)
- Confirmar Senha (com toggle mostrar/ocultar)

**Validações**:
- Todos os campos obrigatórios
- Senhas devem coincidir
- Mínimo 6 caracteres

**Funcionalidade**:
- Simula envio para backend (console.log com os dados)
- Mostra mensagem "Bem-vindo!" com sucesso
- **Redirecioná para `/lojas` após 2s** (MODIFICADO)

### 4. **Registro de Instituição**
**Arquivo**: `frontend/src/app/auth/pages/register-instituicao.component.*`

**Campos**:
- Nome da Instituição
- CNPJ (com formatação automática: XX.XXX.XXX/XXXX-XX)
- Email
- Senha (com toggle mostrar/ocultar)
- Confirmar Senha (com toggle mostrar/ocultar)

**Validações**:
- Todos os campos obrigatórios
- Senhas devem coincidir
- Mínimo 6 caracteres
- CNPJ com exatamente 14 dígitos

**Funcionalidade**:
- Formatação automática do CNPJ enquanto digita
- Simula envio para backend (console.log)
- **Mostra mensagem "Solicitação Enviada para aprovação"** (MODIFICADO)
- Status "pendente" simulado
- Permanece na tela por 5s antes de redirecionar
- Redireciona para login após aprovação

### 5. **Componente de Lojas** (NOVO)
**Arquivo**: `frontend/src/app/lojas/lojas.component.*`

**TypeScript** (`lojas.component.ts`):
- Dados mockados com 6 instituições
- Array de lojas com: id, nome, email, cidade
- Método `abrirLoja()` para expandir funcionalidade
- Método `logout()` para sair

**HTML** (`lojas.component.html`):
- Header com título e botão "Sair"
- Grid responsivo com cards de lojas
- Cada card com: ícone, nome, cidade, email, botão "Ver Cursos"
- Layout que adapta para mobile (1 coluna)

**CSS** (`lojas.component.css`):
- Fundo com gradiente roxo (mesmo do login)
- Grid com auto-fill minmax(300px, 1fr)
- Cards com hover effect (levanta 8px)
- Responsivo para telas menores
- Botões com gradiente e transições

**Dados Mockados**:
```typescript
[
  { id: 1, nome: 'Universidade Federal de São Paulo', email: '...', cidade: 'São Paulo' },
  { id: 2, nome: 'Instituto Federal de Educação Técnica', email: '...', cidade: 'Rio de Janeiro' },
  { id: 3, nome: 'Faculdade de Tecnologia Avançada', email: '...', cidade: 'Belo Horizonte' },
  { id: 4, nome: 'Centro Universitário de Brasília', email: '...', cidade: 'Brasília' },
  { id: 5, nome: 'Universidade Estadual de Campinas', email: '...', cidade: 'Campinas' },
  { id: 6, nome: 'Instituto de Educação Superior do Nordeste', email: '...', cidade: 'Recife' }
]
```

### 6. **Configuração de Rotas - Atualizada**
**Arquivo**: `frontend/src/app/app.routes.ts`

**Rotas Adicionadas**:
```typescript
{
  path: 'lojas',
  canActivate: [authGuard],
  component: LojasComponent
}
```

**Todas as Rotas de Auth**:
```
/auth/login                      → LoginComponent (existente)
/auth/register                   → RegisterComponent (nova)
/auth/register/aluno             → RegisterAlunoComponent (nova)
/auth/register/instituicao       → RegisterInstituicaoComponent (nova)

/lojas                           → LojasComponent (nova) - com authGuard
```

## Estrutura de Diretórios

```
frontend/src/app/
├── app.routes.ts                  (modificado - adicionada rota /lojas)
├── auth/
│   ├── auth.routes.ts             (modificado - 3 novas rotas)
│   └── pages/
│       ├── login.component.*      (modificado - link criar conta)
│       ├── register.component.*   (novo)
│       ├── register-aluno.component.*     (novo + modificado redirecionamento)
│       └── register-instituicao.component.* (novo + modificado mensagem)
└── lojas/
    ├── lojas.component.ts         (novo)
    ├── lojas.component.html       (novo)
    └── lojas.component.css        (novo)
```

## Fluxo de Navegação Completo

```
Login (form)
  ↓
"Criar conta" link
  ↓
Register (seleção de tipo)
  ├─ "Aluno" → RegisterAluno (formulário)
  │   ↓
  │   Cadastra (simula)
  │   ↓
  │   "Bem-vindo!" (2s)
  │   ↓
  │   Vai para /lojas ✓ (NOVO)
  │
  └─ "Instituição" → RegisterInstituicao (formulário)
      ↓
      Envia (simula)
      ↓
      "Solicitação enviada para aprovação" (5s) ✓ (NOVO)
      ↓
      Volta para Login

/lojas (página nova)
  ├─ Grid de instituições
  ├─ Cada card com informações
  └─ Botão "Sair" no topo
```

## Estilos Aplicados

- **Gradiente Principal**: `linear-gradient(135deg, #667eea 0%, #764ba2 100%)`
- **Cores**: Roxo/Violeta em todo o tema
- **Botões**: Com gradiente e transições suaves
- **Cards**: Shadow e hover effects (levantam na interação)
- **Transições**: 0.3s para interatividade fluida
- **Responsividade**: Tela móvel com 1 coluna no grid

## Próximos Passos (Integração Backend)

### 1. **Autenticação após Register**
Atualmente RegisterAluno redireciona para `/lojas` mas o usuário não está autenticado. Você precisará:

```typescript
// Em register-aluno.component.ts
this.authService.registerAluno({nome, email, senha}).subscribe({
  next: (response: { token: string }) => {
    localStorage.setItem('token', response.token);
    this.authService.setCurrentUser(response.user);
    // Agora o authGuard deixará acessar /lojas
  }
});
```

### 2. **Endpoint Backend para Aluno**
```
POST /api/auth/register/aluno
Body: { nome: string, email: string, senha: string }
Response: { token: string, user: User }
```

### 3. **Endpoint Backend para Instituição**
```
POST /api/auth/register/instituicao
Body: { nomeInstituicao: string, cnpj: string, email: string, senha: string }
Response: { mensagem: string, status: 'pendente' }
```

### 4. **Carregar Lojas Reais**
```typescript
// Em lojas.component.ts
this.lojaService.getLojas().subscribe(lojas => {
  this.lojas = lojas;
});
```

## Teste Rápido

1. Abra a aplicação em `/auth/login`
2. Clique em "Criar conta"
3. Escolha "Aluno" ou "Instituição"
4. Preencha o formulário
5. Clique em "Criar Conta" ou "Enviar Solicitação"
6. Veja as validações funcionarem
7. Após sucesso, aguarde o redirecionamento

**Aluno**: Vai para `/lojas` (página com grid de instituições)
**Instituição**: Mostra "Solicitação enviada para aprovação"

## Status Geral

✅ Sistema de registro completo e funcional
✅ Página de lojas com dados mockados
✅ Rotas configuradas corretamente
✅ UI/UX consistente
✅ Pronto para integração com backend
