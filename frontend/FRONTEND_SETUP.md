# 🚀 Angular Frontend - Cursaas EAD Platform

## 📋 Overview

Frontend Angular 18+ para a plataforma Cursaas de Educação a Distância.

**Status:** ✅ Estrutura Base Implementada (Pronto para components)  
**Fase:** 2 (Desenvolvimento UI)  
**Stack:** Angular 18+, TypeScript 5.2, RxJS 7.8+  

---

## 📁 Estrutura do Projeto

```
frontend/
├── src/
│   ├── app/
│   │   ├── auth/                    # Módulo de Autenticação
│   │   │   ├── pages/
│   │   │   │   ├── login.component.ts
│   │   │   │   ├── login.component.html
│   │   │   │   └── login.component.css
│   │   │   └── auth.routes.ts
│   │   │
│   │   ├── core/                    # Serviços centrais e Guards
│   │   │   ├── services/
│   │   │   │   └── auth.service.ts
│   │   │   ├── guards/
│   │   │   │   ├── auth.guard.ts
│   │   │   │   └── role.guard.ts
│   │   │   └── interceptors/
│   │   │       └── auth.interceptor.ts
│   │   │
│   │   ├── features/
│   │   │   ├── admin/               # Painel Administrativo
│   │   │   │   ├── pages/
│   │   │   │   ├── components/
│   │   │   │   └── admin.routes.ts
│   │   │   │
│   │   │   └── aluno/               # Painel do Aluno
│   │   │       ├── pages/
│   │   │       ├── components/
│   │   │       └── aluno.routes.ts
│   │   │
│   │   ├── shared/                  # Componentes Compartilhados
│   │   │   ├── components/
│   │   │   └── services/
│   │   │       └── api.service.ts
│   │   │
│   │   ├── app.component.ts
│   │   ├── app.component.html
│   │   ├── app.routes.ts            # Routing Principal
│   │   └── main.ts
│   │
│   ├── styles.css                   # Estilos Globais
│   ├── index.html
│   └── tsconfig.app.json
│
├── angular.json                      # Configuração Angular CLI
├── tsconfig.json                     # Configuração TypeScript
├── package.json                      # Dependências
└── README.md
```

---

## 🔧 Instalação e Setup

### Pré-requisitos
- Node.js 18+ (includes npm)
- Angular CLI 18+

### Instalação Rápida

```bash
cd c:\projetos\Cursaas\frontend

# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento
npm start

# Aguarde o navegador abrir automaticamente em http://localhost:4200
```

### Build para Produção

```bash
npm run build:prod

# Output: dist/cursaas-frontend/
```

---

## 🎫 Autenticação

### Componentes Implementados

#### 1. **AuthService** (`core/services/auth.service.ts`)
- Login com email/senha
- JWT token management
- User info decoding
- Role checking
- Logout

#### 2. **Auth Guards** (`core/guards/`)
- `authGuard`: Verifica se usuário está autenticado
- `roleGuard`: Verifica role (admin vs aluno)

#### 3. **HTTP Interceptor** (`core/interceptors/auth.interceptor.ts`)
- Automaticamente adiciona token JWT em requisições
- Bearer token format

#### 4. **Login Component** (`auth/pages/login.component.ts`)
- Interface de login com email/senha
- Routing automático por role (admin → /admin, aluno → /aluno)
- Error handling

### Fluxo de Autenticação

```
1. Usuário preenche email/senha → Login Component
                                     ↓
2. AuthService.login() → POST /api/auth/login
                                     ↓
3. Backend valida → Retorna JWT token
                                     ↓
4. Frontend armazena em localStorage
                                     ↓
5. Auth Guard valida token
                                     ↓
6. Rota para painel (admin ou aluno)
```

### Teste de Login

**Admin:**
- Email: `admin@example.com`
- Senha: `senha123`

**Aluno:**
- Email: `aluno1@example.com`
- Senha: `senha123`

---

## 🛣️ Roteamento

### Estrutura de Rotas

```
/ (raiz)
├── /auth/login                  → Login page
├── /admin                       → Admin dashboard (admin only)
│   ├── /admin/dashboard         → Dashboard
│   ├── /admin/cursos            → CRUD Cursos
│   ├── /admin/aulas             → CRUD Aulas
│   ├── /admin/provas            → CRUD Provas
│   ├── /admin/notas             → Gerenciamento Notas
│   └── /admin/presenca          → Relatório Presença
│
└── /aluno                       → Aluno dashboard (aluno only)
    ├── /aluno/dashboard         → Dashboard
    ├── /aluno/cursos            → Cursos Inscritos
    ├── /aluno/aulas/:id         → Detalhes Aula (com player)
    ├── /aluno/provas            → Provas Disponíveis
    ├── /aluno/notas             → Minhas Notas
    └── /aluno/presenca          → Minha Presença
```

### Guardas de Rota

Cada rota para admin/aluno passa por:
1. `authGuard` - Verifica autenticação
2. `roleGuard` - Verifica role específica

---

## 🔌 API Service

### Implementado em `shared/services/api.service.ts`

#### Métodos Disponíveis

```typescript
// CURSOS
getCursos(): Observable<any[]>
getCurso(id): Observable<any>
createCurso(data): Observable<any>
updateCurso(id, data): Observable<any>
deleteCurso(id): Observable<any>

// AULAS
getAulas(cursoId?): Observable<any[]>
getAula(id): Observable<any>
createAula(data): Observable<any>
updateAula(id, data): Observable<any>
deleteAula(id): Observable<any>

// PROVAS
getProvas(cursoId?): Observable<any[]>
getProva(id): Observable<any>
submitProva(id, respostas): Observable<any>

// NOTAS
getNotas(alunoId?): Observable<any[]>
getNotaCurso(alunoId, cursoId): Observable<any>

// PRESENÇA
getPresenca(alunoId): Observable<any[]>
updatePresenca(alunoId, aulaId, data): Observable<any>
```

### Uso em Componentes

```typescript
import { ApiService } from '@services/api.service';

export class MyComponent {
  constructor(private apiService: ApiService) {}

  loadCursos() {
    this.apiService.getCursos().subscribe(
      cursos => console.log(cursos),
      error => console.error(error)
    );
  }
}
```

---

## 📦 Componentes a Criar (Próximos Passos)

### Admin Panel

#### Pages
- [ ] **Dashboard** - Resumo de alunos, cursos, provas
- [ ] **Cursos** - CRUD com listagem e criação
- [ ] **Aulas** - Gerenciar aulas por curso + Upload vídeo
- [ ] **Provas** - CRUD de provas + questões
- [ ] **Notas** - Visualizar e atualizar notas
- [ ] **Presença** - Relatório de presença por curso

#### Componentes Shared
- [ ] **NavBar** - Navegação superior
- [ ] **Sidebar** - Menu lateral com rotas
- [ ] **DataTable** - Tabela reutilizável
- [ ] **Modal/Dialog** - Para criar/editar

### Aluno Panel

#### Pages
- [ ] **Dashboard** - Resumo de cursos, notas, presença
- [ ] **Cursos** - Listar cursos inscritos
- [ ] **Aula Details** - Player de vídeo com rastreamento
- [ ] **Provas** - Listar provas para responder
- [ ] **Prova Respondedor** - Formulário interativo
- [ ] **Notas** - Visualizar minhas notas por curso
- [ ] **Presença** - Meu rastreamento de presença

---

## 🎨 Estilos

### Configuração Atual
- CSS puro (sem framework CSS por enquanto)
- Global styles em `src/styles.css`
- Component-level styles em `.component.css` files
- Tema: Purple/Blue gradient

### Próximas Melhorias
- [ ] Angular Material (opcional)
- [ ] Bootstrap ou Tailwind CSS
- [ ] Tema customizável (light/dark mode)

---

## 🧪 Testes

Estrutura preparada para testes. Adicionar conforme componentes forem criados:

```bash
npm test
```

---

## 📝 Desenvolvimento

### Criar Novo Componente

```bash
ng generate component features/admin/pages/dashboard
```

### Criar Novo Service

```bash
ng generate service shared/services/my-service
```

### Criar Novo Guard

```bash
ng generate guard core/guards/my-guard
```

---

## 🚀 Deploy

### Docker

```bash
docker build -t cursaas-frontend:1.0 .
docker run -p 80:80 cursaas-frontend:1.0
```

### Nginx (Produção)

```bash
npm run build:prod
# Copiar dist/cursaas-frontend para /var/www/html no servidor nginx
```

---

## 🔗 Backend Integration

O frontend se conecta ao backend FastAPI em:
- **Base URL:** `http://localhost:8000/api`
- **Autenticação:** JWT Bearer Token
- **Interceptor:** Adiciona automaticamente nas requisições

### Configurar Backend URL

Modificar em `shared/services/api.service.ts` e `core/services/auth.service.ts`:

```typescript
private apiUrl = 'http://localhost:8000/api'; // Mudar conforme necessário
```

Para produção, usar variável de ambiente:

```typescript
private apiUrl = environment.apiUrl;
```

---

## 📚 Referências

- [Angular 18 Documentation](https://angular.io/)
- [RxJS Documentation](https://rxjs.dev/)
- [Backend API Docs](http://localhost:8000/docs)

---

## 🤝 Estrutura Angular 18+ Standalone

Projeto usa **Standalone Components** (novo padrão Angular 18+):

- ✅ Sem NgModules
- ✅ Importações diretas em componentes
- ✅ Routes como arrays simples
- ✅ Mais flexível e moderno

---

## 📊 Status Checklist

### Fase 2 - Frontend Estrutura
- [x] Estrutura de projeto criada
- [x] Routing base implementado
- [x] Autenticação (login/guards/interceptor)
- [x] API Service estruturado
- [ ] Componentes Admin (em breve)
- [ ] Componentes Aluno (em breve)
- [ ] Estilos/Templates (em breve)

---

## 🐛 Troubleshooting

### Erro: "Cannot find module '@angular/core'"
```bash
npm install
```

### Porta 4200 já em uso
```bash
ng serve --port 4300
```

### Token expirado
- Fazer login novamente
- Token é armazenado em localStorage

### CORS Error
- Backend deve estar rodando em http://localhost:8000
- Verificar se CORS está configurado no FastAPI

---

## 📝 Próximas Tarefas

1. **Criar Admin Dashboard** - Listagem de cursos, alunos, provas
2. **Criar Admin CRUD Pages** - Formulários para editar recursos
3. **Criar Aluno Dashboard** - Resumo de progresso
4. **Implementar Player de Vídeo** - Com rastreamento (presença)
5. **Criar Formulário de Prova** - Respondedor interativo
6. **Estilos Responsivos** - Mobile-friendly UI
7. **Testes Unitários** - Coverage dos serviços/componentes
8. **Deploy** - Docker + Kubernetes pronto

---

**Projeto:** Cursaas - Portal EAD  
**Versão:** 1.0.0  
**Criado em:** 2026-02-23  
**Status:** 🟡 Em Desenvolvimento (Estrutura Pronta)  

