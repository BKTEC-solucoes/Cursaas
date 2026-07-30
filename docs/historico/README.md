# docs/historico

Documentos de implementação escritos durante o desenvolvimento de features
específicas, movidos da raiz do repositório (eram 10 arquivos soltos lá).

**São registros de época, não documentação corrente.** Descrevem o estado do
código no momento em que foram escritos e não foram atualizados desde então.
Vários se sobrepõem — três tratam do mesmo upload de vídeo.

Ao consultar qualquer um, confirme contra o código antes de agir.

| Arquivo | Assunto |
|---|---|
| `ESTRUTURA_ENTREGA_FINAL.md` | Panorama de entrega do projeto |
| `FLUXO_INSTITUICOES.md` | Fluxo de cadastro e aprovação de instituições |
| `SOLUCAO_INSTITUICOES_EMAIL_DUPLICADO.md` | **Decisão de design ainda válida:** `usuarios.email` é UNIQUE global de propósito; um usuário gerencia várias instituições via `instituicoes.user_id` |
| `REGISTRO_ALUNO_IMPLEMENTATION.md` | Implementação do registro de aluno |
| `QUICK_START_REGISTRO.md` | Guia rápido do fluxo de registro |
| `HTTP_REQUESTS_REGISTRO.rest` | Requests de exemplo (registro) |
| `README_VIDEO_UPLOAD.md` | Upload de vídeo — visão geral |
| `VIDEO_UPLOAD_GUIA_RAPIDO.md` | Upload de vídeo — guia rápido |
| `VIDEO_UPLOAD_SUMARIO_EXECUTIVO.md` | Upload de vídeo — resumo executivo |
| `INDEX_VIDEO_UPLOAD_COMPONENTS.md` | Índice dos componentes de upload |

⚠️ Os três documentos de upload de vídeo estão **desatualizados**: descrevem os
vídeos sendo servidos publicamente por `/uploads/videos/`. Isso mudou —
o endpoint agora é `/api/aulas/video/{filename}`, exige `Authorization` e checa
o tenant do curso. Ver `frontend/src/app/core/services/video.service.ts`.

Documentação corrente do projeto: `docs/ARCHITECTURE.md` e `CLAUDE.md`.
