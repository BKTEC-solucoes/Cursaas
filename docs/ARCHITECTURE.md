# Documentação Técnica - Cursaas Portal EAD

## 1. Arquitetura Geral

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│   Angular 18+   │◄────────►│  FastAPI Python  │◄────────►│    MySQL 8.0    │
│   (Frontend)    │ HTTP/JWT │   (Backend)      │   SQLAlchemy   (DB)     │
└─────────────────┘         └──────────────────┘         └─────────────────┘
   Port: 4200          Port: 8000                            Port: 3306
```

## 2. Modelos de Dados (Banco MySQL)

### Tabelas Principais

#### `usuarios`
- Armazena admin e alunos
- Campos: id, nome, email, senha (hashed), role (admin/aluno), ativo, timestamps

#### `cursos`
- Cursos cadastrados por admin
- Campos: id, nome, descricao, percentual_presenca_minima (padrão 75%), ativo, timestamps

#### `inscricoes_cursos`
- Relaciona usuários a cursos (muitos para muitos)
- Campos: id, usuario_id, curso_id, data_inscricao

#### `aulas`
- Aulas dentro de um curso
- Campos: id, curso_id, titulo, descricao, data_aula, duracao_minutos, ativo, timestamps

#### `videos`
- Vídeos uploadados das aulas
- Campos: id, aula_id, arquivo_nome, caminho_arquivo, tamanho_bytes, duracao_segundos, formato, status (processando/disponivel/erro), data_upload

#### `presenca`
- Rastreamento de presença de alunos em aulas
- Campos: id, usuario_id, aula_id, percentual_assistido, registrada_automaticamente (bool), tempo_total_segundos, data_acesso, data_conclusao
- **Regra:** Quando `percentual_assistido >= percentual_presenca_minima` do curso, `registrada_automaticamente = true` e `data_conclusao` é preenchida

#### `provas`
- Provas com questões
- Campos: id, curso_id, titulo, descricao, data_inicio, data_fim, tempo_limite_minutos, tentativas_permitidas, ativo, timestamps

#### `questoes`
- Questões das provas
- Campos: id, prova_id, tipo (multipla_escolha/dissertativa), enunciado, ordem, pontos, data_criacao

#### `opcoes_resposta`
- Opções de resposta para questões de múltipla escolha
- Campos: id, questao_id, texto, correta (bool), ordem, data_criacao

#### `respostas`
- Respostas dos alunos às questões
- Campos: id, usuario_id, prova_id, questao_id, texto_resposta, opcao_id, correta (bool), data_resposta

#### `notas`
- Notas dos alunos em provas
- Campos: id, usuario_id, prova_id, nota_final, tentativa, data_submissao, data_correcao, observacoes, timestamps

#### `notas_cursos`
- Média final do aluno em cada curso
- Campos: id, usuario_id, curso_id, media_final, aprovado (bool), data_atualizacao

## 3. Autenticação e Autorização

### Fluxo de Login
1. Aluno submete email + senha no formulário de login
2. Backend valida credenciais contra `usuarios` (senha com bcrypt)
3. Se válido: gera JWT token com payload `{email, role}` válido por 8 horas
4. Frontend armazena token no localStorage
5. Todas as requisições subsequentes incluem `Authorization: Bearer <token>`

### Roles e Permissões
- **admin:** Acesso a todos os endpoints `/api/*`
  - CRUD completo de cursos, alunos, aulas, provas
  - Visualizar e editar notas
  - Visualizar presença

- **aluno:** Acesso limitado aos próprios dados
  - GET `/api/cursos` (apenas inscritos)
  - GET `/api/aulas` (apenas do curso inscrito)
  - POST `/api/presenca/{id}/atualizar-progresso`
  - GET `/api/notas/{id}` (próprias notas)

## 4. Fluxos Principales

### Fluxo de Aula com Rastreamento de Presença

```
1. Aluno clica em "Assistir Aula"
   ↓
2. Angular carrega player de vídeo (HTML5 <video> ou similar)
   - Renderiza video URL de /uploads/videos/{video_id}
   ↓
3. Enquanto aluno assiste:
   - Player rastreia currentTime
   - A cada 10 segundos (ou intervalo) envia POST /api/presenca/{aluno_id}/{aula_id}/atualizar-progresso
   - Payload: { percentual_assistido: (currentTime / duracaoTotal) * 100, tempo_total_segundos: currentTime }
   ↓
4. Backend recebe e atualiza tabela `presenca`:
   - Se percentual_assistido >= curso.percentual_presenca_minima:
     - registrada_automaticamente = TRUE
     - data_conclusao = NOW()
   - Se percentual < limite:
     - registrada_automaticamente = FALSE
   - Atualiza tempo_total_segundos
   ↓
5. Aluno vê badge de "Presença Registrada" no painel de aluno
```

### Fluxo de Prova

```
1. Admin cria prova:
   POST /api/provas { titulo, data_inicio, data_fim, ... }
   → Cria registros em `provas`
   
2. Admin adiciona questões:
   POST /api/provas/{prova_id}/questoes { enunciado, tipo, opcoes, pontos }
   → Cria registros em `questoes` e `opcoes_resposta`

3. Aluno vê prova disponível no seu painel
   - Se data_atual está entre data_inicio e data_fim: pode fazer
   - Se data_atual < data_inicio: "Aguardando disponibilidade"
   - Se data_atual > data_fim: "Prova fechada"

4. Aluno responde prova:
   POST /api/provas/{prova_id}/responder
   {
     "respostas": [
       { "questao_id": 1, "opcao_id": 3 },
       { "questao_id": 2, "opcao_id": 1 }
     ]
   }

5. Backend processa:
   - Para cada resposta, valida se opcao_id é correta
   - Calcula nota_final = (acertos / total_questoes) * 10
   - Cria registro em `notas` com nota_final e data_submissao

6. Admin pode:
   - Visualizar respostas em /api/notas/{curso_id}
   - Editar nota manualmente (para questões dissertativas fase 2)

7. Aluno vê resultado no seu painel
```

## 5. API Endpoints

### 5.1 Autenticação

```
POST /api/auth/login
Body: { email: string, senha: string }
Response: { access_token: string, token_type: "bearer", usuario: {...} }

POST /api/auth/registro
Body: { email: string, nome: string, senha: string }
Response: TokenResponse (cria aluno automaticamente)

POST /api/auth/admin-registro [ADMIN]
Body: { email: string, nome: string, senha: string }
Response: TokenResponse (cria admin)
```

### 5.2 Cursos

```
GET /api/cursos
Response: List[CursoResponse]

GET /api/cursos/{curso_id}
Response: CursoDetailResponse (inclui aulas e provas)

POST /api/cursos [ADMIN]
Body: { nome, descricao, percentual_presenca_minima }
Response: CursoResponse

PUT /api/cursos/{curso_id} [ADMIN]
Body: { nome?, descricao?, percentual_presenca_minima?, ativo? }
Response: CursoResponse

DELETE /api/cursos/{curso_id} [ADMIN]
Response: { message: "Deletado com sucesso" }

POST /api/cursos/{curso_id}/inscrever [ALUNO]
Response: InscricaoCursoResponse

GET /api/cursos/{curso_id}/alunos [ADMIN]
Response: List[UsuarioResponse]
```

### 5.3 Aulas

```
GET /api/aulas?curso_id={id}
Response: List[AulaResponse]

GET /api/aulas/{aula_id}
Response: AulaDetailResponse

POST /api/aulas [ADMIN]
Body: { curso_id, titulo, descricao, data_aula, duracao_minutos }
Response: AulaResponse

PUT /api/aulas/{aula_id} [ADMIN]
Body: { titulo?, descricao?, data_aula?, duracao_minutos?, ativo? }
Response: AulaResponse

DELETE /api/aulas/{aula_id} [ADMIN]
Response: { message: "Deletado com sucesso" }

POST /api/aulas/{aula_id}/upload-video [ADMIN]
Body: multipart/form-data (video file)
Response: VideoResponse

GET /api/aulas/{aula_id}/video
Response: streams video file
```

### 5.4 Provas

```
GET /api/provas?curso_id={id}
Response: List[ProvaResponse]

GET /api/provas/{prova_id}
Response: ProvaDetailResponse (inclui questões)

POST /api/provas [ADMIN]
Body: { curso_id, titulo, descricao, data_inicio, data_fim, tempo_limite_minutos, tentativas_permitidas }
Response: ProvaResponse

PUT /api/provas/{prova_id} [ADMIN]
Body: { titulo?, ... }
Response: ProvaResponse

DELETE /api/provas/{prova_id} [ADMIN]
Response: { message: "Deletado com sucesso" }

POST /api/provas/{prova_id}/questoes [ADMIN]
Body: { tipo, enunciado, ordem, pontos, opcoes: [{ texto, correta }] }
Response: QuestaoResponse

POST /api/provas/{prova_id}/responder [ALUNO]
Body: { respostas: [{ questao_id, opcao_id }] }
Response: { nota_final, respostas_corretas }
```

### 5.5 Presença

```
GET /api/presenca/{aluno_id}
Response: List[PresencaResponse]

GET /api/presenca/{aluno_id}/{aula_id}
Response: PresencaResponse

POST /api/presenca/{aluno_id}/{aula_id}/atualizar-progresso [ALUNO]
Body: { percentual_assistido, tempo_total_segundos }
Response: PresencaResponse

GET /api/presenca/curso/{curso_id} [ADMIN]
Response: List[PresencaResponse] (presença de todos alunos do curso)
```

### 5.6 Notas

```
GET /api/notas/{aluno_id}
Response: List[NotaResponse]

GET /api/notas/{aluno_id}/{prova_id}
Response: NotaResponse

PUT /api/notas/{nota_id} [ADMIN]
Body: { nota_final, observacoes }
Response: NotaResponse

GET /api/notas/curso/{curso_id} [ADMIN]
Response: List[NotaCursoResponse]

POST /api/notas/calcular-media/{aluno_id}/{curso_id} [ADMIN]
Response: NotaCursoResponse
```

## 6. Estrutura de Pastas Backend

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                 # Entrada principal FastAPI
│   ├── config.py               # Configurações (settings)
│   ├── database.py             # Conexão SQLAlchemy
│   │
│   ├── models/
│   │   ├── __init__.py         # Exports dos modelos
│   │   └── models.py           # Todos os modelos SQLAlchemy
│   │
│   ├── schemas/
│   │   └── __init__.py         # Todos os schemas Pydantic
│   │
│   ├── routes/
│   │   ├── __init__.py
│   │   ├── auth.py             # /api/auth
│   │   ├── cursos.py           # /api/cursos
│   │   ├── aulas.py            # /api/aulas
│   │   ├── provas.py           # /api/provas
│   │   ├── alunos.py           # /api/alunos
│   │   ├── presenca.py         # /api/presenca
│   │   └── notas.py            # /api/notas
│   │
│   ├── services/
│   │   ├── __init__.py
│   │   ├── auth_service.py     # Lógica de autenticação
│   │   ├── curso_service.py    # Lógica de cursos
│   │   └── ... (services específicos)
│   │
│   └── middleware/
│       ├── auth.py             # Middleware de autenticação
│       └── ... (outros middlewares)
│
├── uploads/
│   └── videos/                 # Armazena vídeos das aulas
│
├── requirements.txt            # Dependências Python
├── .env.example                # Exemplo de variáveis de ambiente
├── Dockerfile                  # Docker image for backend
└── main.py                     # Entry point alternativo
```

## 7. Estrutura de Pastas Frontend

```
frontend/
├── src/
│   ├── app/
│   │   ├── admin/
│   │   │   ├── dashboard/
│   │   │   ├── cursos/
│   │   │   ├── alunos/
│   │   │   ├── aulas/
│   │   │   ├── provas/
│   │   │   └── notas/
│   │   │
│   │   ├── student/
│   │   │   ├── dashboard/
│   │   │   ├── cursos/
│   │   │   ├── aula-player/
│   │   │   ├── provas/
│   │   │   └── notas/
│   │   │
│   │   ├── auth/
│   │   │   ├── login/
│   │   │   └── registro/
│   │   │
│   │   ├── shared/
│   │   │   ├── components/     # Componentes reutilizáveis
│   │   │   ├── services/       # Serviços HTTP (ApiService)
│   │   │   ├── guards/         # Route guards (AuthGuard)
│   │   │   ├── interceptors/   # HTTP interceptors (AuthInterceptor)
│   │   │   └── models/         # Interfaces TypeScript
│   │   │
│   │   └── app.module.ts
│   │
│   ├── assets/
│   └── main.ts
│
├── angular.json
├── package.json
└── Dockerfile
```

## 8. Fluxos de Requisições HTTP

### Requisição com Token
```
GET /api/cursos
Headers:
  Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Resposta com Erro
```
{
  "detail": "Não autorizado" | "Recurso não encontrado" | etc
}
```

## 9. Configuração de Ambiente

### Backend (.env)
```
DATABASE_URL=mysql+pymysql://user:pass@host:port/db
SECRET_KEY=super-secret-key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=480
UPLOAD_DIR=uploads
MAX_FILE_SIZE=524288000
ALLOWED_ORIGINS=["http://localhost:4200"]
PERCENTUAL_PRESENCA_MINIMA_PADRAO=75
```

### Frontend (environment.ts)
```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:8000/api'
};
```

## 10. Considerações de Segurança

- ✅ Senhas armazenadas com bcrypt (não em texto puro)
- ✅ JWT para autenticação stateless
- ✅ CORS configurado apenas para origem Angular
- ✅ Validação de entrada com Pydantic
- ✅ SQL Injection prevenido com SQLAlchemy ORM
- ✅ Arquivo `.env` não commitado no git
- 🔲 HTTPS deve ser usado em produção
- 🔲 Rate limiting a implementar
- 🔲 Audit logging de ações admin a implementar

## 11. Fase 2 - Funcionalidades Futuras

- [ ] Questões dissertativas com validação manual
- [ ] Relatórios em PDF/Excel
- [ ] Sistema de notificações por email
- [ ] Chat/Fórum de dúvidas
- [ ] Certificados automáticos após conclusão
- [ ] Integração de pagamento
- [ ] Integração com plataformas de streaming externas
- [ ] Sistema de pontos/gamificação
