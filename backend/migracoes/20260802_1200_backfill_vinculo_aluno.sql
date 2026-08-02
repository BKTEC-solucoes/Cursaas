-- ---------------------------------------------------------------------------
-- Backfill de vinculos_aluno_faculdade
--
-- Alunos criados por POST /api/alunos (tela Admin > Alunos) nasciam com
-- usuarios.faculdade_id preenchido, mas SEM linha em vinculos_aluno_faculdade.
-- GET /api/cursos/ exige vinculo ativo, entao esses alunos logavam e nao viam
-- curso nenhum -- a tela /aluno/cursos ficava presa no estado vazio, mesmo com
-- inscricoes em cursos.
--
-- A rota ja cria o vinculo; este script conserta as contas existentes.
-- Idempotente: NOT EXISTS + a UNIQUE (usuario_id, faculdade_id) impedem duplicata.
-- ---------------------------------------------------------------------------

INSERT INTO vinculos_aluno_faculdade (usuario_id, faculdade_id, matricula, status, data_vinculo, data_atualizacao)
SELECT u.id, u.faculdade_id, u.numero_matricula, 'ativo', NOW(), NOW()
  FROM usuarios u
 WHERE u.role = 'aluno'
   AND u.faculdade_id IS NOT NULL
   AND NOT EXISTS (
         SELECT 1
           FROM vinculos_aluno_faculdade v
          WHERE v.usuario_id = u.id
            AND v.faculdade_id = u.faculdade_id
       );
