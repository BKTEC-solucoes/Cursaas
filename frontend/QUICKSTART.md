# ⚡ Frontend Quick Start

## 🚀 Começar em 5 minutos

### 1. Instalar dependências
```bash
cd c:\projetos\Cursaas\frontend
npm install
```

### 2. Iniciar servidor
```bash
npm start
```

Acesso automático em: **http://localhost:4200**

### 3. Fazer Login
- **Admin:** admin@example.com / senha123
- **Aluno:** aluno1@example.com / senha123

---

## 📂 Estrutura Entender

```
frontend/src/app/
├── auth/              ✅ Tela de login (completa)
├── core/              ✅ Serviços, guards, interceptors (pronto)
├── features/
│   ├── admin/         🟡 Estrutura pronta (components pendentes)
│   └── aluno/         🟡 Estrutura pronta (components pendentes)
├── shared/            ✅ API Service (pronto)
└── app.component.*    ✅ Root component (pronto)
```

---

## ✅ Já Implementado

- ✅ Sistema de autenticação JWT
- ✅ Guardas de rota (auth + role-based)
- ✅ HTTP interceptor (token automático)
- ✅ API Service com métodos para todos endpoints
- ✅ Routing estruturado para admin/aluno
- ✅ Login component functional
- ✅ Dark-to-light gradient styling

---

## 🛠️ Criar Primeiro Componente (Admin Dashboard)

### Comando
```bash
cd frontend
ng generate component features/admin/pages/dashboard
```

### Template Básico
```typescript
// dashboard.component.ts
import { Component } from '@angular/core';
import { ApiService } from '@shared/services/api.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  template: `
    <h1>Dashboard Admin</h1>
    <p>{{ totalCursos }} cursos cadastrados</p>
  `
})
export class AdminDashboardComponent {
  totalCursos = 0;

  constructor(private api: ApiService) {
    this.api.getCursos().subscribe(cursos => {
      this.totalCursos = cursos.length;
    });
  }
}
```

---

## 📝 Por Fazer (Prioridade)

### Alta (Essencial)
- [ ] Admin Dashboard - Resumo geral
- [ ] Admin Cursos CRUD - Listar/criar/editar cursos
- [ ] Aluno Cursos - Listar cursos inscritos
- [ ] Aluno Dashboard - Resumo progresso

### Média (Importante)
- [ ] Admin Aulas - Gerenciar aulas + upload
- [ ] Admin Provas - CRUD completo
- [ ] Aluno Player - Vídeo com rastreamento
- [ ] Aluno Provas - Respondedor interativo

### Baixa (Nice-to-have)
- [ ] Admin Notas - Visualizar/atualizar
- [ ] Admin Presença - Relatórios
- [ ] Aluno Notas - Visualizar minhas notas
- [ ] Navbar/Sidebar compartilhado

---

## 🔌 Testar API Connection

Abrir Browser DevTools (F12) e executar:

```javascript
// Testar token
localStorage.getItem('access_token')

// Fazer requisição API
fetch('http://localhost:8000/api/cursos', {
  headers: {
    'Authorization': 'Bearer ' + localStorage.getItem('access_token')
  }
}).then(r => r.json()).then(data => console.log(data))
```

---

## 🎨 Adicionar Styling

### Global (src/styles.css)
```css
body {
  font-family: Arial, sans-serif;
  background: #f5f5f5;
}
```

### Component (ex: dashboard.component.css)
```css
h1 {
  color: #667eea;
  margin-bottom: 20px;
}
```

---

## 🐛 Troubleshooting

| Problema | Solução |
|----------|---------|
| "Can't resolve '@app/...'" | Verificar import path |
| CORS error | Backend deve estar rodando |
| 401 Unauthorized | Login novamente |
| Port 4200 em uso | `ng serve --port 4300` |
| Dependências não instalam | `npm cache clean --force && npm install` |

---

## 🚀 Deploy Rápido

```bash
# Build produção
npm run build:prod

# Resultado: dist/cursaas-frontend/
# Upload para servidor web (Apache, Nginx, etc)
```

---

## 📊 Progresso Fase 2

```
Frontend Angular: 20% ████░░░░░░░░░░░░░░░░
├── Estrutura:     100% ✅
├── Auth:          100% ✅
├── Routing:       100% ✅
├── Admin Pages:   0%   ⏳
├── Aluno Pages:   0%   ⏳
├── Styling:       10%  🟡
└── Deployment:    0%   ⏳
```

---

**Desenvolvido com Angular 18+**  
**Cursaas EAD Platform 2026**

