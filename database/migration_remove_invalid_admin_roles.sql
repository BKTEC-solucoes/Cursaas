-- Migration: Remove invalid admin roles (financeiro, suporte)
-- Converts financeiro and suporte admin_role values to NULL (legacy admin)

UPDATE usuarios 
SET admin_role = NULL 
WHERE admin_role IN ('financeiro', 'suporte');

-- Verify the update
SELECT admin_role, COUNT(*) as count FROM usuarios WHERE role = 'admin' GROUP BY admin_role;
