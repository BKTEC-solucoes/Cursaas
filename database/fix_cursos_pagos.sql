-- Script para corrigir cursos pagos sem valor válido
-- Isso garante que todos os cursos marcados como pago (pago = 1) possuem um valor > 0

UPDATE cursos 
SET valor = 0.01 
WHERE pago = 1 AND (valor IS NULL OR valor <= 0);

-- Verificar resultado
SELECT COUNT(*) as 'Cursos corrigidos'
FROM cursos 
WHERE pago = 1 AND valor > 0;

-- Listar todos os cursos que foram corrigidos (se houver)
SELECT id, nome, pago, valor FROM cursos WHERE pago = 1 AND valor > 0 ORDER BY id DESC;
